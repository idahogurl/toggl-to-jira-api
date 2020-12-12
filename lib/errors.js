import Rollbar from 'rollbar';
import initMiddleware from './init-middleware';

const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true,
});

export default function errors() {
  return initMiddleware(rollbar.errorHandler());
}
