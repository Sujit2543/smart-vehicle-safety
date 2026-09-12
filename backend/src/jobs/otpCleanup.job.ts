import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export async function cleanupOTPs(): Promise<void> {
  const result = await prisma.oTPVerification.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  if (result.count > 0) {
    logger.info(`Cleaned up ${result.count} expired OTPs`);
  }
}
