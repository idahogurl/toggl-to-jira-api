import fetch from 'node-fetch';
import querystring from 'querystring';
import { encode } from 'base-64';
import dayjs from 'dayjs';
import JiraClient from 'jira-client';
import countdown from 'countdown';
import cors from '../../lib/cors';

const API_URL = 'https://api.track.toggl.com/api/v8/time_entries?';
async function getEntries({ startDate, endDate }) {
  const response = await fetch(
    API_URL + querystring.stringify({ start_date: startDate, end_date: endDate }),
    {
      headers: {
        Authorization: `Basic ${encode(`${process.env.TOGGL_TOKEN}:api_token`)}`,
      },
    },
  );

  const json = await response.json();

  return json.map((item) => {
    const {
      id, description, duration, start: started, stop,
    } = item;
    const durationDisplay = countdown(
      new Date(started),
      new Date(stop),
      // eslint-disable-next-line no-bitwise
      countdown.HOURS | countdown.MINUTES,
    ).toString();

    // drop seconds from duration (Jira worklogs do not include seconds)
    const minutes = parseInt(Math.floor(duration / 60), 10);
    const seconds = minutes * 60;
    return {
      key: id,
      description,
      duration: seconds,
      durationDisplay,
      start: dayjs(started).toISOString(),
      stop: dayjs(stop).toISOString(),
    };
  });
}

async function getWorklogs({ startDate, endDate }) {
  const client = new JiraClient({
    protocol: process.env.JIRA_PROTOCOL,
    host: process.env.JIRA_HOST,
    username: process.env.JIRA_ACCOUNT,
    password: process.env.JIRA_TOKEN,
  });

  const assignee = 'Rebecca Vest';
  const project = 'HLFE';
  const start = dayjs(startDate).format('YYYY-MM-DD');
  const end = dayjs(endDate).format('YYYY-MM-DD');
  const { issues } = await client.searchJira(
    `assignee = '${assignee}' AND project = '${project}' AND updatedDate >= '${start}' AND updatedDate <= '${end}' AND timespent > 0`,
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

export default async function handler(req, res) {
  await cors()(req, res);
  const { start_date: startDate, end_date: endDate } = req.query;
  const entries = await getEntries({ startDate, endDate });
  const issueWorklogs = await getWorklogs({ startDate, endDate });

  // mark Toggl entries that already exist in Jira
  issueWorklogs.forEach((issue) => {
    issue.worklogs.forEach((log) => {
      // match Toggl entry to worklog item
      const entryIndex = entries.findIndex(
        (e) => e.description === issue.issueId
          && e.syncStatus === undefined
          && e.duration === log.timeSpentSeconds
          && e.start === log.started,
      );
      if (entryIndex !== -1) {
        entries[entryIndex].syncStatus = 'done';
      }
    });
  });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(entries));
}
