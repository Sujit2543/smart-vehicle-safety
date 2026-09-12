import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import { getExpiryColor } from '../utils/dateUtils';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/vehicle/:vehicleId', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const record = await prisma.pUCRecord.findUnique({ where: { vehicleId: req.params.vehicleId } });
    sendSuccess(res, record);
  } catch (err) { next(err); }
});

router.post('/vehicle/:vehicleId', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const { certificateNo, testCenter, testDate, expiryDate } = req.body;
    const expiry = new Date(expiryDate);
    const record = await prisma.pUCRecord.upsert({
      where: { vehicleId: req.params.vehicleId },
      update: { certificateNo, testCenter, testDate: testDate ? new Date(testDate) : undefined, expiryDate: expiry, expiryColor: getExpiryColor(expiry) },
      create: { vehicleId: req.params.vehicleId, certificateNo, testCenter, testDate: testDate ? new Date(testDate) : undefined, expiryDate: expiry, expiryColor: getExpiryColor(expiry) },
    });
    sendCreated(res, record, 'PUC record saved');
  } catch (err) { next(err); }
});

export default router;
