import 'reflect-metadata';
import '!/services/dotenv';
import '!/services/container';

import db from '!/services/db';
import server from '!/services/server';

void (async () => {
  if (!process.env.SECRET_B64) {
    console.log('[ERR] Environment variables not found, please setup your dotenv');
    process.exit(1);
  }
  await db();
  await server();
})();
