import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { callInitiateLimiter } from '../middlewares/rateLimiter';
import { sendSuccess, sendCreated, sendPaginated, buildPagination } from '../utils/apiResponse';
import { getPaginationParams } from '../utils/pagination';
import * as callService from '../services/call.service';
import { UserRole } from '@prisma/client';

const router = Router();

// Public: initiate masked call
router.post('/initiate', callInitiateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tagId, callerNumber } = req.body;
    if (!tagId || !callerNumber) {
      res.status(400).json({ success: false, message: 'tagId and callerNumber required' });
      return;
    }
    const result = await callService.initiateCall(tagId, callerNumber, req.ip);
    sendCreated(res, result, 'Call initiated');
  } catch (err) { next(err); }
});

// Admin: call logs
router.get(
  '/',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prisma } = await import('../config/database');
      const { page, limit } = getPaginationParams(req);
      const [calls, total] = await Promise.all([
        prisma.callLog.findMany({ orderBy: { initiatedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        prisma.callLog.count(),
      ]);
      sendPaginated(res, calls, buildPagination(page, limit, total));
    } catch (err) { next(err); }
  }
);

export default router;
