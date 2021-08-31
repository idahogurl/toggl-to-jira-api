import Rollbar from 'rollbar';

const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true,
});

export function onError(err, req, res) {
  if (process.env.NODE_ENV === 'production') {
    rollbar.error(err, req);
  } else {
    console.error(err);
  }
  res.statusCode = 500;
  res.status(500).end(err.toString());
}

export function log(message) {
  if (process.env.NODE_ENV === 'production') {
    rollbar.log(message);
  } else {
    console.log(message);
  }
}
