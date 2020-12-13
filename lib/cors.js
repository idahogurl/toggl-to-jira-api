import Cors from 'cors';
import initMiddleware from './init-middleware';

const allowList = ['http://localhost:1234', 'https://toggle-to-jira-api.idahogurl.vercel.app/'];
export default function cors() {
  return initMiddleware(
    // You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
    Cors({
      origin(origin, callback) {
        if (allowList.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      // Only allow requests with GET, POST and OPTIONS
      methods: ['GET', 'POST', 'OPTIONS'],
    }),
  );
}
