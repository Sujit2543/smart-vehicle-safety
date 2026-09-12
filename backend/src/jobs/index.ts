import cron from 'node-cron';
import { runInsuranceExpiryCheck, runPUCExpiryCheck } from '../services/expiry.service';
import { retryFailedNotifications } from './retryNotifications.job';
import { cleanupOTPs } from './otpCleanup.job';
import { logger } from '../utils/logger';

const jobs: cron.ScheduledTask[] = [];

export function startJobs(): void {
  // Insurance & PUC expiry check — daily at 08:00
  jobs.push(
    cron.schedule('0 8 * * *', async () => {
      try { await runInsuranceExpiryCheck(); } catch (err) { logger.error('Insurance job failed', { err }); }
    }, { timezone: 'Asia/Kolkata' })
  );

  jobs.push(
    cron.schedule('0 8 * * *', async () => {
      try { await runPUCExpiryCheck(); } catch (err) { logger.error('PUC job failed', { err }); }
    }, { timezone: 'Asia/Kolkata' })
  );

  // Retry failed notifications — every 15 minutes
  jobs.push(
    cron.schedule('*/15 * * * *', async () => {
      try { await retryFailedNotifications(); } catch (err) { logger.error('Retry notifications job failed', { err }); }
    })
  );

  // OTP cleanup — every hour
  jobs.push(
    cron.schedule('0 * * * *', async () => {
      try { await cleanupOTPs(); } catch (err) { logger.error('OTP cleanup job failed', { err }); }
    })
  );

  logger.info('Background jobs started');
}

export function stopJobs(): void {
  jobs.forEach((job) => job.stop());
  logger.info('Background jobs stopped');
}
