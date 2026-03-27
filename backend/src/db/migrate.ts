import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { getPool, closePool } from '../config/database';
import { logger } from '../config/logger';

async function migrate(): Promise<void> {
  const pool = getPool();

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    logger.info('Running database migration...');
    await pool.query(sql);

    // Apply additive migrations in lexical order.
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir)
        .filter((name) => name.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const migrationPath = path.join(migrationsDir, file);
        const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
        logger.info(`Applying migration ${file}...`);
        await pool.query(migrationSql);
      }
    }

    logger.info('Database migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await closePool();
  }
}

migrate().catch((err) => {
  logger.error('Migration error:', err);
  process.exit(1);
});
