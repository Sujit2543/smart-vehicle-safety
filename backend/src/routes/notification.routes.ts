import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { sendSuccess, sendPaginated, buildPagination } from '../utils/apiResponse';
import { getPaginationParams } from '../utils/pagination';
import { retryFailedNotification } from '../services/notification.service';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/mine', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
    if (!customer) { sendSuccess(res, []); return; }
    const { page, limit } = getPaginationParams(req);
    const [items, total] = await Promise.all([
      prisma.notificationLog.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.notificationLog.count({ where: { customerId: customer.id } }),
    ]);
    sendPaginated(res, items, buildPagination(page, limit, total));
  } catch (err) { next(err); }
});

router.get('/', authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const { page, limit } = getPaginationParams(req);
    const [items, total] = await Promise.all([
      prisma.notificationLog.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.notificationLog.count(),
    ]);
    sendPaginated(res, items, buildPagination(page, limit, total));
  } catch (err) { next(err); }
});

router.post('/:id/retry', authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await retryFailedNotification(req.params.id);
    sendSuccess(res, null, 'Retry initiated');
  } catch (err) { next(err); }
});

export default router;
