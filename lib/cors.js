import Cors from 'cors';
import initMiddleware from './init-middleware';

export default function cors() {
  return initMiddleware(
    // You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
    Cors({
      origin:
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:1234'
          : 'https://toggle-to-jira-api-barvgne8t.vercel.app',
      // Only allow requests with GET, POST and OPTIONS
      methods: ['GET', 'POST', 'OPTIONS'],
    }),
  );
}
