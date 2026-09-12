import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import { getExpiryColor } from '../utils/dateUtils';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/vehicle/:vehicleId', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const record = await prisma.insuranceRecord.findUnique({ where: { vehicleId: req.params.vehicleId } });
    sendSuccess(res, record);
  } catch (err) { next(err); }
});

router.post('/vehicle/:vehicleId', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const { policyNumber, provider, startDate, expiryDate, premiumAmount } = req.body;
    const expiry = new Date(expiryDate);
    const record = await prisma.insuranceRecord.upsert({
      where: { vehicleId: req.params.vehicleId },
      update: { policyNumber, provider, startDate: startDate ? new Date(startDate) : undefined, expiryDate: expiry, premiumAmount: premiumAmount ? Number(premiumAmount) : undefined, expiryColor: getExpiryColor(expiry) },
      create: { vehicleId: req.params.vehicleId, policyNumber, provider, startDate: startDate ? new Date(startDate) : undefined, expiryDate: expiry, premiumAmount: premiumAmount ? Number(premiumAmount) : undefined, expiryColor: getExpiryColor(expiry) },
    });
    sendCreated(res, record, 'Insurance record saved');
  } catch (err) { next(err); }
});

export default router;
