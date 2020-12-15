import fetch from 'node-fetch';
import querystring from 'querystring';
import { encode } from 'base-64';
import dayjs from 'dayjs';
import countdown from 'countdown';
import cors from '../../lib/cors';
import onError from '../../lib/errors';
import decodeOptions from '../../lib/decode-options';
import { getJiraClient, getWorklogs } from './jira';

const API_URL = 'https://api.track.toggl.com/api/v8/time_entries?';
async function getEntries({ startDate, endDate, togglToken }) {
  const response = await fetch(
    API_URL + querystring.stringify({ start_date: startDate, end_date: endDate }),
    {
      headers: {
        Authorization: `Basic ${encode(`${togglToken}:api_token`)}`,
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

export default async function handler(req, res) {
  try {
    await cors()(req, res);
    const clientOptions = decodeOptions(req.headers);
    const { start_date: startDate, end_date: endDate } = req.query;
    const entries = await getEntries({ startDate, endDate, togglToken: clientOptions.togglToken });
    const client = getJiraClient(clientOptions);
    const issueWorklogs = await getWorklogs({
      client,
      entries,
      startDate,
      endDate,
      author: clientOptions.jiraUser,
    });

    // mark Toggl entries that already exist in Jira
    issueWorklogs.forEach((issue) => {
      issue.worklogs.forEach((log) => {
        // match Toggl entry to worklog item
        const entryIndex = entries.findIndex(
          (e) => e.description === issue.issueId
            && e.synced === undefined
            && e.duration === log.timeSpentSeconds
            && e.start === log.started,
        );
        if (entryIndex !== -1) {
          entries[entryIndex].synced = 'Yes';
        }
      });
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(entries));
  } catch (err) {
    onError(err, req, res);
  }
}
