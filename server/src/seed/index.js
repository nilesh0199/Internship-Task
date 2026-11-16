import { connectDB } from '../config/db.js';
import { initSeedData } from '../services/store.js';
import { logger } from '../utils/logger.js';

/**
 * CLI runner for npm run seed
 */
async function runSeed() {
  logger.info('[Seed] Initializing seed migration...');
  await connectDB();
  await initSeedData();
  logger.info('[Seed] Seed script completed successfully.');
  process.exit(0);
}

runSeed().catch((err) => {
  logger.error({ err: err.message }, '[Seed] Fatal error seeding database');
  process.exit(1);
});
