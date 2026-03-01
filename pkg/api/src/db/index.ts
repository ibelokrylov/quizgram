import { DefaultLogger, type LogWriter } from 'drizzle-orm/logger';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { logger } from '../lib/logger';

export * from 'pkg-types';
export * from './helper';

let dbInstance: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const env = typeof Bun !== 'undefined' ? Bun.env : process.env;
  const {
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_DB,
    POSTGRES_HOST = 'localhost',
    POSTGRES_PORT = '5432',
    DATABASE_URL,
  } = env;

  const connectionString =
    DATABASE_URL ??
    `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

  const client = postgres(connectionString, {
    max: 10,
  });

  const drizzleLogWriter: LogWriter = {
    write: (message: string) => {
      logger.debug('SQL запрос', { query: message });
    },
  };

  const drizzleLogger = new DefaultLogger({ writer: drizzleLogWriter });

  dbInstance = drizzle({
    client,
    logger: drizzleLogger,
  });
  return dbInstance;
}

export { getDb };

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  },
});
