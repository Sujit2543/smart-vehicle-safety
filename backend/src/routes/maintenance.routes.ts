import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { uploadSingle } from '../middlewares/upload';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import * as maintenanceService from '../services/maintenance.service';
import { UserRole } from '@prisma/client';

const router = Router();

// Customer: get maintenance for a vehicle
router.get('/vehicle/:vehicleId', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const records = await maintenanceService.getMaintenanceHistory(req.params.vehicleId);
    sendSuccess(res, records);
  } catch (err) { next(err); }
});

// Customer: add record
router.post(
  '/vehicle/:vehicleId',
  authenticate,
  authorize(UserRole.CUSTOMER),
  uploadSingle,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await maintenanceService.addMaintenanceRecord({
        vehicleId: req.params.vehicleId,
        userId: req.user!.userId,
        serviceDate: new Date(req.body.serviceDate),
        odometer: req.body.odometer ? Number(req.body.odometer) : undefined,
        serviceType: req.body.serviceType,
        cost: req.body.cost ? Number(req.body.cost) : undefined,
        serviceCenter: req.body.serviceCenter,
        notes: req.body.notes,
        invoiceBuffer: req.file?.buffer,
        invoiceMime: req.file?.mimetype,
        invoiceName: req.file?.originalname,
      });
      sendCreated(res, record, 'Maintenance record added');
    } catch (err) { next(err); }
  }
);

// Customer: update record
router.patch('/:id', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await maintenanceService.updateMaintenanceRecord(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, updated, 'Record updated');
  } catch (err) { next(err); }
});

// Customer: delete record
router.delete('/:id', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await maintenanceService.deleteMaintenanceRecord(req.params.id, req.user!.userId);
    sendSuccess(res, null, 'Record deleted');
  } catch (err) { next(err); }
});

export default router;
