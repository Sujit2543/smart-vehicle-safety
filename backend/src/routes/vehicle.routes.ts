import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { sendSuccess, sendPaginated, buildPagination } from '../utils/apiResponse';
import { getPaginationParams } from '../utils/pagination';
import * as vehicleService from '../services/vehicle.service';
import * as adminService from '../services/admin.service';
import { UserRole } from '@prisma/client';

const router = Router();

// Customer: own vehicles
router.get('/mine', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
    if (!customer) { sendSuccess(res, []); return; }
    const vehicles = await prisma.vehicle.findMany({
      where: { customerId: customer.id, deletedAt: null },
      include: {
        tag: { select: { tagId: true, status: true } },
        insuranceRecord: true,
        pucRecord: true,
      },
    });
    sendSuccess(res, vehicles);
  } catch (err) { next(err); }
});

// Customer: single vehicle
router.get('/:id', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vehicle = await vehicleService.getVehicleForOwner(req.params.id, req.user!.userId);
    sendSuccess(res, vehicle);
  } catch (err) { next(err); }
});

// Customer: update vehicle
router.patch('/:id', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await vehicleService.updateVehicle(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, updated, 'Vehicle updated');
  } catch (err) { next(err); }
});

// Customer: expiry status
router.get('/:id/expiry', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await vehicleService.getExpiryStatus(req.params.id);
    sendSuccess(res, status);
  } catch (err) { next(err); }
});

// Customer: scan history
router.get('/:id/scans', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const scans = await prisma.scanLog.findMany({
      where: { vehicleId: req.params.id },
      orderBy: { scannedAt: 'desc' },
      take: 50,
    });
    sendSuccess(res, scans);
  } catch (err) { next(err); }
});

// Admin: list all vehicles
router.get(
  '/admin/all',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = getPaginationParams(req);
      const { vehicles, total } = await adminService.getAllVehicles(page, limit, req.query.search as string);
      sendPaginated(res, vehicles, buildPagination(page, limit, total));
    } catch (err) { next(err); }
  }
);

export default router;
