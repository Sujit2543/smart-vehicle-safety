import { prisma } from '../config/database';
import { retryFailedNotification } from '../services/notification.service';
import { logger } from '../utils/logger';

export async function retryFailedNotifications(): Promise<void> {
  const failed = await prisma.notificationLog.findMany({
    where: { status: 'FAILED', retryCount: { lt: 3 } },
    take: 20,
    orderBy: { createdAt: 'asc' },
  });

  if (failed.length === 0) return;
  logger.info(`Retrying ${failed.length} failed notifications`);

  for (const n of failed) {
    await retryFailedNotification(n.id);
  }
}
