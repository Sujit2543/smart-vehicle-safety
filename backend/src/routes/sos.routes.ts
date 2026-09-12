import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { sosLimiter } from '../middlewares/rateLimiter';
import { sendSuccess, sendCreated, sendPaginated, buildPagination } from '../utils/apiResponse';
import { getPaginationParams } from '../utils/pagination';
import * as sosService from '../services/sos.service';
import { UserRole } from '@prisma/client';

const router = Router();

// Public: trigger SOS
router.post('/', sosLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tagId, latitude, longitude } = req.body;
    if (!tagId) { res.status(400).json({ success: false, message: 'tagId required' }); return; }
    const result = await sosService.triggerSOS({ tagId, latitude, longitude, ip: req.ip });
    sendCreated(res, result, 'SOS triggered');
  } catch (err) { next(err); }
});

// Customer: acknowledge SOS
router.patch('/:id/acknowledge', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await sosService.updateSOSStatus(req.params.id, 'ACKNOWLEDGED', req.user!.userId);
    sendSuccess(res, updated, 'SOS acknowledged');
  } catch (err) { next(err); }
});

// Customer/Admin: resolve SOS
router.patch('/:id/resolve', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await sosService.updateSOSStatus(req.params.id, 'RESOLVED', req.user!.userId);
    sendSuccess(res, updated, 'SOS resolved');
  } catch (err) { next(err); }
});

// Customer: cancel SOS
router.patch('/:id/cancel', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await sosService.updateSOSStatus(req.params.id, 'CANCELLED', req.user!.userId);
    sendSuccess(res, updated, 'SOS cancelled');
  } catch (err) { next(err); }
});

// Customer: own SOS history
router.get('/mine', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
    if (!customer) { sendSuccess(res, []); return; }
    const vehicles = await prisma.vehicle.findMany({ where: { customerId: customer.id }, select: { id: true } });
    const vehicleIds = vehicles.map(v => v.id);
    const { page, limit } = getPaginationParams(req);
    const [items, total] = await Promise.all([
      prisma.sOSEvent.findMany({ where: { vehicleId: { in: vehicleIds } }, orderBy: { triggeredAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.sOSEvent.count({ where: { vehicleId: { in: vehicleIds } } }),
    ]);
    sendPaginated(res, items, buildPagination(page, limit, total));
  } catch (err) { next(err); }
});

// Admin: all SOS events
router.get(
  '/',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = getPaginationParams(req);
      const { items, total } = await sosService.getSOSHistory(undefined, page, limit);
      sendPaginated(res, items, buildPagination(page, limit, total));
    } catch (err) { next(err); }
  }
);

export default router;
