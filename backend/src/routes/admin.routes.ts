import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { sendSuccess, sendPaginated, buildPagination } from '../utils/apiResponse';
import { getPaginationParams } from '../utils/pagination';
import * as adminService from '../services/admin.service';
import * as expiryService from '../services/expiry.service';
import { UserRole } from '@prisma/client';
import { hashPassword } from '../utils/hash';
import { writeAuditLog } from '../middlewares/auditLogger';

const router = Router();

const adminAuth = [authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)];
const superAuth = [authenticate, authorize(UserRole.SUPER_ADMIN)];

// Dashboard stats
router.get('/dashboard', ...adminAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await adminService.getDashboardStats();
    sendSuccess(res, stats);
  } catch (err) { next(err); }
});

// Scan analytics
router.get('/scan-analytics', ...adminAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const analytics = await adminService.getScanAnalytics();
    sendSuccess(res, analytics);
  } catch (err) { next(err); }
});

// Audit logs
router.get('/audit-logs', ...adminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = getPaginationParams(req);
    const { logs, total } = await adminService.getAuditLogs(page, limit, {
      action: req.query.action as string,
      entity: req.query.entity as string,
    });
    sendPaginated(res, logs, buildPagination(page, limit, total));
  } catch (err) { next(err); }
});

// Expiry radar
router.get('/expiry-radar', ...adminAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await expiryService.getExpiryRadar();
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

// Create admin user
router.post('/users', ...superAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const { email, password, role } = req.body;
    if (!email || !password) { res.status(400).json({ success: false, message: 'email and password required' }); return; }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, role: role ?? UserRole.ADMIN },
    });
    await writeAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'ADMIN_USER_CREATED', entity: 'User', entityId: user.id });
    sendSuccess(res, { id: user.id, email: user.email, role: user.role }, 'Admin user created');
  } catch (err) { next(err); }
});

// All SOS
router.get('/sos', ...adminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const { page, limit } = getPaginationParams(req);
    const status = req.query.status as string | undefined;
    const where: any = status ? { status } : {};
    const [items, total] = await Promise.all([
      prisma.sOSEvent.findMany({ where, orderBy: { triggeredAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { vehicle: { select: { registrationNumber: true, customer: { select: { fullName: true, mobile: true } } } } } }),
      prisma.sOSEvent.count({ where }),
    ]);
    sendPaginated(res, items, buildPagination(page, limit, total));
  } catch (err) { next(err); }
});

// Notification logs
router.get('/notifications', ...adminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const { page, limit } = getPaginationParams(req);
    const status = req.query.status as string | undefined;
    const where: any = status ? { status } : {};
    const [items, total] = await Promise.all([
      prisma.notificationLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.notificationLog.count({ where }),
    ]);
    sendPaginated(res, items, buildPagination(page, limit, total));
  } catch (err) { next(err); }
});

// Scan logs
router.get('/scans', ...adminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const { page, limit } = getPaginationParams(req);
    const [items, total] = await Promise.all([
      prisma.scanLog.findMany({ orderBy: { scannedAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { tag: { select: { tagId: true } } } }),
      prisma.scanLog.count(),
    ]);
    sendPaginated(res, items, buildPagination(page, limit, total));
  } catch (err) { next(err); }
});

export default router;
