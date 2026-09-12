import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { uploadDocument } from '../middlewares/upload';
import * as tagService from '../services/tag.service';
import * as customerService from '../services/customer.service';
import * as adminService from '../services/admin.service';
import {
  sendSuccess, sendCreated, sendPaginated, buildPagination,
} from '../utils/apiResponse';
import { getPaginationParams } from '../utils/pagination';
import { UserRole, VehicleType, FuelType, TagStatus } from '@prisma/client';
import { AppError } from '../utils/errors';

const router = Router();

// ─── Validation Schemas ───────────────────────────────────────

const bulkGenerateSchema = z.object({
  quantity:    z.number().int().min(1).max(10000),
  prefix:      z.string().min(1).max(5).regex(/^[A-Z0-9]+$/, 'Prefix must be uppercase letters/numbers'),
  startNumber: z.number().int().min(1),
});

const changeStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']),
  reason: z.string().max(500).optional(),
});

const activationSchema = z.object({
  fullName:               z.string().min(2),
  mobile:                 z.string().regex(/^[6-9]\d{9}$/),
  email:                  z.string().email().optional().or(z.literal('')),
  address:                z.string().optional().default(''),
  city:                   z.string().optional().default(''),
  state:                  z.string().optional().default(''),
  pinCode:                z.string().optional().default(''),
  registrationNumber:     z.string().min(5).max(15),
  vehicleType:            z.nativeEnum(VehicleType),
  make:                   z.string().min(1),
  model:                  z.string().min(1),
  color:                  z.string().min(1),
  manufacturingYear:      z.number().int().min(1900).max(new Date().getFullYear() + 1),
  fuelType:               z.nativeEnum(FuelType),
  emergencyName:          z.string().min(2),
  emergencyMobile:        z.string().regex(/^[6-9]\d{9}$/),
  emergencyRelationship:  z.string().min(2),
  pin:                    z.string().length(4).regex(/^\d{4}$/),
});

// ─── PUBLIC ROUTES ────────────────────────────────────────────

/**
 * GET /tags/:tagId/scan
 * Public — called when a QR/NFC tag is scanned.
 */
router.get('/:tagId/scan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tag = await tagService.getTagForScan(req.params.tagId);
    // Record scan non-blocking
    tagService.recordScan({
      tagId:     req.params.tagId,
      vehicleId: tag.vehicleId ?? undefined,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendSuccess(res, tag, 'Tag data retrieved');
  } catch (err) { next(err); }
});

/**
 * POST /tags/:tagId/activate
 * Public (requires OTP auth) — customer self-activation.
 */
router.post(
  '/:tagId/activate',
  authenticate,
  uploadDocument,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBody = JSON.parse(req.body.data ?? '{}');

      // Pull mobile from the authenticated user's record — do NOT trust the JSON body alone
      const { prisma } = await import('../config/database');
      const authUser = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { mobile: true },
      });
      const mobileFromAuth = authUser?.mobile ?? '';

      // Merge: use authenticated mobile, fall back to body mobile
      rawBody.mobile = mobileFromAuth || rawBody.mobile || '';

      const body = activationSchema.parse(rawBody);
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const rc  = files?.rc?.[0];
      const ins = files?.insurance?.[0];
      const puc = files?.puc?.[0];

      const result = await customerService.selfActivate(
        {
          tagId: req.params.tagId,
          ...body,
          rcBuffer:        rc?.buffer,
          rcMime:          rc?.mimetype,
          rcName:          rc?.originalname,
          insuranceBuffer: ins?.buffer,
          insuranceMime:   ins?.mimetype,
          insuranceName:   ins?.originalname,
          pucBuffer:       puc?.buffer,
          pucMime:         puc?.mimetype,
          pucName:         puc?.originalname,
        },
        req.user!.userId,
        req.ip
      );
      sendCreated(res, result, 'Tag activated successfully');
    } catch (err) { next(err); }
  }
);

// ─── ADMIN ROUTES — require SUPER_ADMIN or ADMIN ──────────────

/**
 * POST /tags/bulk-generate
 * Generate N tags with given prefix + starting number.
 */
router.post(
  '/bulk-generate',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  validate(bulkGenerateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await tagService.bulkGenerateTags(
        {
          quantity:    req.body.quantity,
          prefix:      req.body.prefix.toUpperCase(),
          startNumber: req.body.startNumber,
        },
        req.user!.userId,
        req.ip
      );
      sendCreated(res, result, `${result.count} tag(s) generated successfully`);
    } catch (err) { next(err); }
  }
);

/**
 * POST /tags/generate  (legacy — kept for backward compat)
 */
router.post(
  '/generate',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  validate(z.object({ count: z.number().int().min(1).max(10000) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tags = await tagService.generateTagIds(req.body.count);
      sendCreated(res, { tags, count: tags.length }, `${tags.length} tag(s) generated`);
    } catch (err) { next(err); }
  }
);

/**
 * GET /tags
 * List all tags — search, filter by status, sort, paginate.
 */
router.get(
  '/',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = getPaginationParams(req);
      const search  = req.query.search  as string | undefined;
      const status  = req.query.status  as string | undefined;
      const sortBy  = (req.query.sortBy  as string) || 'createdAt';
      const sortDir = (req.query.sortDir as string) === 'asc' ? 'asc' : 'desc';

      const { tags, total } = await adminService.getAllTags(
        page, limit, search, status, sortBy, sortDir
      );
      sendPaginated(res, tags, buildPagination(page, limit, total));
    } catch (err) { next(err); }
  }
);

/**
 * GET /tags/stats
 * Dashboard stats for tags only (fast endpoint for dashboard cards).
 */
router.get(
  '/stats',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { prisma } = await import('../config/database');
      const [total, unassigned, active, inactive, blocked, expired] = await Promise.all([
        prisma.tag.count(),
        prisma.tag.count({ where: { status: 'UNASSIGNED' } }),
        prisma.tag.count({ where: { status: 'ACTIVE' } }),
        prisma.tag.count({ where: { status: 'INACTIVE' } }),
        prisma.tag.count({ where: { status: 'BLOCKED' } }),
        prisma.tag.count({ where: { status: 'EXPIRED' } }),
      ]);
      sendSuccess(res, { total, unassigned, active, inactive, blocked, expired });
    } catch (err) { next(err); }
  }
);

/**
 * GET /tags/next-number?prefix=CD
 * Returns the next available starting number for a given prefix.
 */
router.get(
  '/next-number',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prisma } = await import('../config/database');
      const prefix = (req.query.prefix as string ?? 'CD').toUpperCase();
      const last = await prisma.tag.findFirst({
        where:   { tagId: { startsWith: `${prefix}-` } },
        orderBy: { tagId: 'desc' },           // lexicographic desc works for zero-padded numbers
        select:  { tagId: true },
      });

      let nextNumber = 1001;
      if (last) {
        const parts = last.tagId.split('-');
        const n = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(n)) nextNumber = n + 1;
      }
      sendSuccess(res, { prefix, nextNumber });
    } catch (err) { next(err); }
  }
);

/**
 * GET /tags/:tagId
 * Tag detail — includes vehicle, customer, history, scan count.
 */
router.get(
  '/:tagId',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const detail = await tagService.getTagDetail(req.params.tagId);
      sendSuccess(res, detail);
    } catch (err) { next(err); }
  }
);

/**
 * PATCH /tags/:tagId/status
 * Change tag status (admin only, validates transitions).
 */
router.patch(
  '/:tagId/status',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  validate(changeStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isSuperAdmin = req.user!.role === UserRole.SUPER_ADMIN;
      await tagService.changeTagStatus(
        req.params.tagId,
        req.body.status as TagStatus,
        req.user!.userId,
        req.body.reason,
        req.ip,
        isSuperAdmin
      );
      sendSuccess(res, null, `Tag ${req.body.status.toLowerCase()} successfully`);
    } catch (err) { next(err); }
  }
);

/**
 * GET /tags/:tagId/history
 * Full activation / status-change history for a tag.
 */
router.get(
  '/:tagId/history',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prisma } = await import('../config/database');
      const history = await prisma.tagActivation.findMany({
        where:   { tagId: req.params.tagId },
        orderBy: { createdAt: 'desc' },
      });
      sendSuccess(res, history);
    } catch (err) { next(err); }
  }
);

/**
 * GET /tags/:tagId/qr  — download QR PNG
 */
router.get(
  '/:tagId/qr',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const buf = await tagService.generateQRCode(req.params.tagId);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.tagId}.png"`);
      res.send(buf);
    } catch (err) { next(err); }
  }
);

/**
 * POST /tags/bulk-qr-zip  — ZIP of QR PNGs for selected tagIds
 */
router.post(
  '/bulk-qr-zip',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tagIds } = req.body;
      if (!Array.isArray(tagIds) || tagIds.length === 0) {
        throw new AppError('tagIds array is required', 400);
      }
      if (tagIds.length > 10000) throw new AppError('Max 10,000 tags per ZIP', 400);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="qr-codes.zip"');
      await tagService.buildQrZip(tagIds, res);
    } catch (err) { next(err); }
  }
);

/**
 * POST /tags/bulk-qr-pdf  — A4 PDF sticker sheet of QR codes
 */
router.post(
  '/bulk-qr-pdf',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tagIds } = req.body;
      if (!Array.isArray(tagIds) || tagIds.length === 0) {
        throw new AppError('tagIds array is required', 400);
      }
      if (tagIds.length > 10000) throw new AppError('Max 10,000 tags per PDF', 400);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="qr-stickers.pdf"');
      await tagService.buildQrPdf(tagIds, res);
    } catch (err) { next(err); }
  }
);

// Alias: keep old route working
router.post('/bulk-qr', authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tagIds } = req.body;
      if (!Array.isArray(tagIds) || tagIds.length === 0) throw new AppError('tagIds required', 400);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="qr-codes.zip"');
      await tagService.buildQrZip(tagIds, res);
    } catch (err) { next(err); }
  }
);

export default router;
