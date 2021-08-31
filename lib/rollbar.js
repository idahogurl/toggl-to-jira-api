import Rollbar from 'rollbar';

const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true,
});

export function error(err, req, res) {
  if (process.env.NODE_ENV === 'production') {
    rollbar.error(err, req);
  } else {
    rollbar.console.error(err);
  }
  res.statusCode = 500;
  res.status(500).end(err.toString());
}

export function info(message) {
  if (process.env.NODE_ENV === 'production') {
    rollbar.info(message);
  } else {
    console.log(message);
  }
}
