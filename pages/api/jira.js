import JiraClient from 'jira-client';
import { groupBy, uniq } from 'lodash';
import dayjs from 'dayjs';
import decodeOptions from '../../lib/decode-options';
import cors from '../../lib/cors';
import onError from '../../lib/errors';

export function getJiraClient(options) {
  return new JiraClient({
    protocol: options.jiraProtocol,
    host: options.jiraHost,
    username: options.jiraUsername,
    password: options.jiraToken,
  });
}

export default async function handler(req, res) {
  try {
    await cors()(req, res);
    const entries = JSON.parse(req.body);
    const entriesByIssue = groupBy(entries, 'issue');

    const clientOptions = decodeOptions(req.headers);
    const client = getJiraClient(clientOptions);

    const worklogs = await Promise.all(
      Object.keys(entriesByIssue).map((issue) => client.getIssueWorklogs(issue)),
    );

    const worklogsByIssue = groupBy(worklogs, 'issue');

    await Promise.all(
      entries
        .map((entry) => {
          const { issue, started, timeSpentSeconds } = entry;
          const issueWorklogs = worklogsByIssue[issue];
          if (issueWorklogs && issueWorklogs.worklogs) {
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
  } catch (err) {
    onError(err, req, res);
  }
}

export async function getWorklogs({
  client, entries, startDate, endDate, author,
}) {
  if (entries.length) {
    const issueKeys = uniq(entries.map((e) => e.description));
    const issueFilter = `AND issuekey IN (${issueKeys.join(',')})`;

    const { issues } = await client.searchJira(
      `worklogAuthor = '${author}' ${issueFilter} AND timespent > 0`,
      {
        fields: ['key'],
      },
    );

    return Promise.all(
      issues.map((i) => client.getIssueWorklogs(i.key).then((result) => ({
        issueId: i.key,
        worklogs: result.worklogs.map(({ started, timeSpentSeconds }) => ({
          started: dayjs(started).toISOString(),
          timeSpentSeconds,
        })),
      }))),
    );
  }
  return Promise.resolve([]);
}