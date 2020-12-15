import Rollbar from 'rollbar';

const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true,
});

export default function onError(err, req, res) {
  rollbar.error(err, req);
  res.statusCode = 500;
  res.status(500).end(err.toString());
}
