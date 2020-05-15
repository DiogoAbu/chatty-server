import 'reflect-metadata';
import '!/services/dotenv';
import '!/services/container';

import db from '!/services/db';
import server from '!/services/server';

(async () => {
  await db();
  await server();
})();
