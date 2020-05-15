import { createConnection } from 'typeorm';

import entities from '!/entities';
import debug from '!/services/debug';

const { DATABASE_URL, NODE_ENV, TYPEORM_SSL } = process.env;

const isDev = NODE_ENV !== 'production';

const log = debug.extend('db');

// When synchronize is true data that use columns that were
// removed will be dropped, leading to the loss of data.
export default async () => {
  const connection = await createConnection({
    type: 'postgres',
    url: DATABASE_URL,
    ssl: TYPEORM_SSL === 'true',
    cache: true,
    dropSchema: false,
    entities,
    logging: isDev ? ['error', 'warn', 'migration'] : ['error', 'migration'],
    logger: 'debug',
    synchronize: isDev,
    migrations: ['migration/*.js'],
    cli: {
      migrationsDir: 'migration',
    },
  });

  log('connected');

  connection.runMigrations();

  return connection;
};
