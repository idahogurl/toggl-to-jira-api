import JiraClient from 'jira-client';
import { groupBy } from 'lodash';
import cors from '../../lib/cors';

export default async function handler(req, res) {
  await cors()(req, res);

  const entries = JSON.parse(req.body);
  const entriesByIssue = groupBy(entries, 'issue');
  const client = new JiraClient({
    protocol: process.env.JIRA_PROTOCOL,
    host: process.env.JIRA_HOST,
    username: process.env.JIRA_ACCOUNT,
    password: process.env.JIRA_TOKEN,
  });
  const worklogs = await Promise.all(
    Object.keys(entriesByIssue).map((issue) => client.getIssueWorklogs(issue).then((result) => ({
      issue,
      worklogs: result.worklogs,
    }))),
  );

  const worklogsByIssue = groupBy(worklogs, 'issue');

  await Promise.all(
    entries
      .map((entry) => {
        const { issue, started, timeSpentSeconds } = entry;
        const issueWorklogs = worklogsByIssue[issue];
        if (issueWorklogs.worklogs) {
          const found = issueWorklogs.worklogs.find(
            (log) => log.started === started && log.timeSpentSeconds === timeSpentSeconds,
          );
          if (!found) {
            return client.addWorklog(issue, {
              started,
              timeSpentSeconds,
            });
          }
        }
        return client.addWorklog(issue, {
          started,
          timeSpentSeconds,
        });
      })
      .filter((a) => a), // filter out undefined
  );

  res.statusCode = 201;
  res.end();
}
