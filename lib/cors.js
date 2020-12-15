import Cors from 'cors';
import initMiddleware from './init-middleware';

const allowList = [
  'http://localhost:3000',
  'http://localhost:1234',
  'https://toggle-to-jira-api.idahogurl.vercel.app',
];
export default function cors() {
  const corsInstance = Cors({
    origin: (origin, cb) => {
      if (allowList.indexOf(origin) !== -1) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  return initMiddleware(
    // You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
    corsInstance,
  );
}
