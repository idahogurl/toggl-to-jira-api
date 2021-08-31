import JiraClient from 'jira-client';
import { groupBy, uniq } from 'lodash';
import dayjs from 'dayjs';
import decodeOptions from '../../lib/decode-options';
import cors from '../../lib/cors';
import { info, error } from '../../lib/rollbar';

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

    // issue may not exist in JIRA
    const updatedIssues = [];
    const failedIssues = [];
    const worklogs = await Promise.all(
      Object.keys(entriesByIssue).map(async (issue) => {
        try {
          const issueWorklogs = await client.getIssueWorklogs(issue);
          updatedIssues.push(issue);

          return { issue, ...issueWorklogs };
        } catch (err) {
          if (err.statusCode !== 404) {
            throw err;
          }
          // issue does not exist
          console.log(err.message);
          failedIssues.push(issue);
        }
      }),
    );

    await Promise.all(
      worklogs.filter(Boolean).map((log) => {
        const { started, timeSpentSeconds } = log;
        const found = entries.find(
          (e) => e.started === started && e.timeSpentSeconds === timeSpentSeconds,
        );
        if (!found) {
          return client.addWorklog(log, {
            started,
            timeSpentSeconds,
          });
        }
      }),
    );

    res.statusCode = 201;
    res.send({ updatedIssues, failedIssues });
  } catch (err) {
    error(err, req, res);
  }
}

function getIssueFilter(issueKeys) {
  if (issueKeys.length) {
    if (issueKeys.length === 1) {
      return `AND issueKey = ${issueKeys[0]}`;
    }
    return `AND issuekey IN (${issueKeys.join(',')})`;
  }
  return '';
}

export async function getWorklogs({ client, entries, author }) {
  if (entries.length) {
    // lowercase key to avoid deleted issue error
    const issueKeys = uniq(
      entries.map((e) => e.description && e.description.toLowerCase()).filter(Boolean),
    );
    const issueFilter = getIssueFilter(issueKeys);
    info(`Issue Filter: ${issueFilter}`);
    const { issues } = await client.searchJira(issueFilter, {
      fields: ['key'],
    });

    return Promise.all(
      issues.map((i) => client.getIssueWorklogs(i.key.toLowerCase()).then((result) => ({
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
