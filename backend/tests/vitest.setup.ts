import { beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from './setup';
import { closePool } from '../src/config/db';

beforeAll(async () => {
  // Ensure env variables are test mode
  process.env.NODE_ENV = 'test';
  process.env.DB_SCHEMA = 'test_schema';
  
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
  await closePool();
});
