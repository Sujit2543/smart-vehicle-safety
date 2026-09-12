import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { sendSuccess, sendCreated, sendPaginated, buildPagination } from '../utils/apiResponse';
import { getPaginationParams } from '../utils/pagination';
import * as customerService from '../services/customer.service';
import * as adminService from '../services/admin.service';
import { prisma } from '../config/database';
import { UserRole } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { writeAuditLog } from '../middlewares/auditLogger';

const router = Router();

// ── Validation schemas ────────────────────────────────────────

const updateProfileSchema = z.object({
  fullName:  z.string().min(2).max(100).optional(),
  email:     z.string().email().optional().or(z.literal('')),
  address:   z.string().max(500).optional(),
  city:      z.string().max(100).optional(),
  state:     z.string().max(100).optional(),
  pinCode:   z.string().regex(/^\d{6}$/).optional().or(z.literal('')),
});

// ── Helper: verify vehicle ownership ─────────────────────────

async function assertVehicleOwnership(vehicleId: string, userId: string): Promise<void> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, customer: { userId }, deletedAt: null },
  });
  if (!vehicle) throw new ForbiddenError('Access denied: vehicle not found or not yours');
}

// ─────────────────────────────────────────────────────────────
// CUSTOMER PROFILE
// ─────────────────────────────────────────────────────────────

/** GET /customers/me — own full profile including vehicles */
router.get(
  '/me',
  authenticate,
  authorize(UserRole.CUSTOMER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Return null gracefully if no customer profile yet (new user, hasn't activated a tag)
      const customer = await prisma.customer.findUnique({
        where: { userId: req.user!.userId },
        include: {
          vehicles: {
            where: { deletedAt: null },
            include: {
              tag: { select: { tagId: true, status: true } },
              insuranceRecord: true,
              pucRecord: true,
            },
          },
        },
      });
      sendSuccess(res, customer ?? null);
    } catch (err) { next(err); }
  }
);

/** PATCH /customers/me — update own profile */
router.patch(
  '/me',
  authenticate,
  authorize(UserRole.CUSTOMER),
  validate(updateProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await customerService.updateCustomer(req.user!.userId, req.body);
      await writeAuditLog({
        userId:    req.user!.userId,
        userRole:  'CUSTOMER',
        action:    'CUSTOMER_PROFILE_UPDATED',
        entity:    'Customer',
        entityId:  updated.id,
        ipAddress: req.ip,
      });
      sendSuccess(res, updated, 'Profile updated');
    } catch (err) { next(err); }
  }
);

// ─────────────────────────────────────────────────────────────
// CUSTOMER VEHICLES  (own only)
// ─────────────────────────────────────────────────────────────

/** GET /customers/me/vehicles — list own vehicles */
router.get(
  '/me/vehicles',
  authenticate,
  authorize(UserRole.CUSTOMER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
      if (!customer) { sendSuccess(res, []); return; }

      const vehicles = await prisma.vehicle.findMany({
        where: { customerId: customer.id, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: {
          tag:             { select: { tagId: true, status: true, activatedAt: true } },
          insuranceRecord: { select: { expiryDate: true, expiryColor: true, policyNumber: true, provider: true } },
          pucRecord:       { select: { expiryDate: true, expiryColor: true, certificateNo: true } },
          emergencyContacts: { where: { isPrimary: true }, take: 1, select: { name: true, mobile: true, relationship: true } },
          _count:          { select: { documents: true, maintenanceRecords: true } },
        },
      });
      sendSuccess(res, vehicles);
    } catch (err) { next(err); }
  }
);

/** GET /customers/me/vehicles/:vehicleId — single vehicle detail */
router.get(
  '/me/vehicles/:vehicleId',
  authenticate,
  authorize(UserRole.CUSTOMER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertVehicleOwnership(req.params.vehicleId, req.user!.userId);
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: req.params.vehicleId },
        include: {
          tag:               { select: { tagId: true, status: true, activatedAt: true, qrCodeUrl: true } },
          insuranceRecord:   true,
          pucRecord:         true,
          emergencyContacts: { where: { isPrimary: true }, take: 1 },
          documents: {
            where: { isActive: true, deletedAt: null },
            select: { id: true, type: true, fileName: true, mimeType: true, sizeBytes: true, uploadedAt: true },
          },
        },
      });
      sendSuccess(res, vehicle);
    } catch (err) { next(err); }
  }
);

/** PATCH /customers/me/vehicles/:vehicleId — update own vehicle */
router.patch(
  '/me/vehicles/:vehicleId',
  authenticate,
  authorize(UserRole.CUSTOMER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertVehicleOwnership(req.params.vehicleId, req.user!.userId);
      // Only allow updating non-structural fields
      const { make, model, color, fuelType, manufacturingYear } = req.body;
      const updated = await prisma.vehicle.update({
        where: { id: req.params.vehicleId },
        data: {
          ...(make             !== undefined && { make }),
          ...(model            !== undefined && { model }),
          ...(color            !== undefined && { color }),
          ...(fuelType         !== undefined && { fuelType }),
          ...(manufacturingYear !== undefined && { manufacturingYear: Number(manufacturingYear) }),
        },
      });
      await writeAuditLog({
        userId: req.user!.userId, userRole: 'CUSTOMER',
        action: 'VEHICLE_UPDATED', entity: 'Vehicle', entityId: updated.id, ipAddress: req.ip,
      });
      sendSuccess(res, updated, 'Vehicle updated');
    } catch (err) { next(err); }
  }
);

// ─────────────────────────────────────────────────────────────
// EMERGENCY CONTACTS
// ─────────────────────────────────────────────────────────────

/** PATCH /customers/me/emergency-contact/:vehicleId — update emergency contact */
router.patch(
  '/me/emergency-contact/:vehicleId',
  authenticate,
  authorize(UserRole.CUSTOMER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertVehicleOwnership(req.params.vehicleId, req.user!.userId);
      const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
      if (!customer) throw new NotFoundError('Customer not found');
      const { name, mobile, relationship } = req.body;
      const updated = await prisma.emergencyContact.updateMany({
        where: { vehicleId: req.params.vehicleId, customerId: customer.id, isPrimary: true },
        data: {
          ...(name         !== undefined && { name }),
          ...(mobile       !== undefined && { mobile }),
          ...(relationship !== undefined && { relationship }),
        },
      });
      sendSuccess(res, updated, 'Emergency contact updated');
    } catch (err) { next(err); }
  }
);

// ─────────────────────────────────────────────────────────────
// INSURANCE & PUC  (customer-side save)
// ─────────────────────────────────────────────────────────────

/** POST /customers/me/vehicles/:vehicleId/insurance */
router.post(
  '/me/vehicles/:vehicleId/insurance',
  authenticate,
  authorize(UserRole.CUSTOMER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertVehicleOwnership(req.params.vehicleId, req.user!.userId);
      const { getExpiryColor } = await import('../utils/dateUtils');
      const { policyNumber, provider, startDate, expiryDate, premiumAmount } = req.body;
      const expiry = new Date(expiryDate);
      const record = await prisma.insuranceRecord.upsert({
        where: { vehicleId: req.params.vehicleId },
        update: { policyNumber, provider, startDate: startDate ? new Date(startDate) : undefined, expiryDate: expiry, premiumAmount: premiumAmount ? Number(premiumAmount) : undefined, expiryColor: getExpiryColor(expiry) },
        create: { vehicleId: req.params.vehicleId, policyNumber, provider, startDate: startDate ? new Date(startDate) : undefined, expiryDate: expiry, premiumAmount: premiumAmount ? Number(premiumAmount) : undefined, expiryColor: getExpiryColor(expiry) },
      });
      sendCreated(res, record, 'Insurance saved');
    } catch (err) { next(err); }
  }
);

/** POST /customers/me/vehicles/:vehicleId/puc */
router.post(
  '/me/vehicles/:vehicleId/puc',
  authenticate,
  authorize(UserRole.CUSTOMER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertVehicleOwnership(req.params.vehicleId, req.user!.userId);
      const { getExpiryColor } = await import('../utils/dateUtils');
      const { certificateNo, testCenter, testDate, expiryDate } = req.body;
      const expiry = new Date(expiryDate);
      const record = await prisma.pUCRecord.upsert({
        where: { vehicleId: req.params.vehicleId },
        update: { certificateNo, testCenter, testDate: testDate ? new Date(testDate) : undefined, expiryDate: expiry, expiryColor: getExpiryColor(expiry) },
        create: { vehicleId: req.params.vehicleId, certificateNo, testCenter, testDate: testDate ? new Date(testDate) : undefined, expiryDate: expiry, expiryColor: getExpiryColor(expiry) },
      });
      sendCreated(res, record, 'PUC saved');
    } catch (err) { next(err); }
  }
);

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS  (own only)
// ─────────────────────────────────────────────────────────────

/** GET /customers/me/notifications */
router.get(
  '/me/notifications',
  authenticate,
  authorize(UserRole.CUSTOMER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = getPaginationParams(req);
      const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
      if (!customer) { sendSuccess(res, []); return; }
      const [items, total] = await Promise.all([
        prisma.notificationLog.findMany({
          where: { customerId: customer.id },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.notificationLog.count({ where: { customerId: customer.id } }),
      ]);
      sendPaginated(res, items, buildPagination(page, limit, total));
    } catch (err) { next(err); }
  }
);

// ─────────────────────────────────────────────────────────────
// ADMIN ROUTES  (admins only)
// ─────────────────────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = getPaginationParams(req);
      const { customers, total } = await adminService.getAllCustomers(page, limit, req.query.search as string);
      sendPaginated(res, customers, buildPagination(page, limit, total));
    } catch (err) { next(err); }
  }
);

router.get(
  '/:id',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: req.params.id },
        include: {
          vehicles: {
            include: { tag: true, insuranceRecord: true, pucRecord: true },
            where: { deletedAt: null },
          },
        },
      });
      if (!customer) { res.status(404).json({ success: false, message: 'Customer not found' }); return; }
      sendSuccess(res, customer);
    } catch (err) { next(err); }
  }
);

router.patch(
  '/:id/disable',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const c = await prisma.customer.findUnique({ where: { id: req.params.id } });
      if (!c) { res.status(404).json({ success: false, message: 'Customer not found' }); return; }
      await prisma.user.update({ where: { id: c.userId }, data: { isActive: false } });
      sendSuccess(res, null, 'Customer disabled');
    } catch (err) { next(err); }
  }
);

export default router;
