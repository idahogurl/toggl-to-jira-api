import Rollbar from 'rollbar';

const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true,
});

export default function onError(err, req, res) {
  if (process.env.NODE_ENV === 'production') {
    rollbar.error(err, req);
  } else {
    console.error(err);
  }
  res.statusCode = 500;
  res.status(500).end(err.toString());
}
