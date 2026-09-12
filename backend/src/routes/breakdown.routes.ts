import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { sendSuccess, sendCreated, sendPaginated, buildPagination } from '../utils/apiResponse';
import { getPaginationParams } from '../utils/pagination';
import * as breakdownService from '../services/breakdown.service';
import { UserRole } from '@prisma/client';

const router = Router();

// Public: create breakdown request (anyone scanning QR)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tagId, breakdownType, serviceType, callerName, callerMobile,
            latitude, longitude, address, description } = req.body;

    if (!tagId || !breakdownType || !serviceType || !callerMobile) {
      res.status(400).json({ success: false, message: 'tagId, breakdownType, serviceType and callerMobile are required' });
      return;
    }
    const result = await breakdownService.createBreakdownRequest({
      tagId, breakdownType, serviceType, callerName, callerMobile,
      latitude, longitude, address, description, ip: req.ip,
    });
    sendCreated(res, result, result.message);
  } catch (err) { next(err); }
});

// Public: find nearby service providers
router.get('/providers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { serviceType, city } = req.query;
    if (!serviceType) { res.status(400).json({ success: false, message: 'serviceType required' }); return; }
    const providers = await breakdownService.findNearbyProviders(serviceType as any, city as string);
    sendSuccess(res, providers);
  } catch (err) { next(err); }
});

// Public: track a specific request by ID
router.get('/:id/track', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const req_ = await prisma.breakdownRequest.findUnique({
      where: { id: req.params.id },
      include: { vehicle: { select: { registrationNumber: true, make: true, model: true } }, rating: true },
    });
    if (!req_) { res.status(404).json({ success: false, message: 'Request not found' }); return; }
    sendSuccess(res, req_);
  } catch (err) { next(err); }
});

// Public: submit rating
router.post('/:id/rate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { score, comment } = req.body;
    if (!score || score < 1 || score > 5) { res.status(400).json({ success: false, message: 'Score 1-5 required' }); return; }
    const rating = await breakdownService.submitRating(req.params.id, score, comment);
    sendCreated(res, rating, 'Rating submitted. Thank you!');
  } catch (err) { next(err); }
});

// Customer: own breakdown history
router.get('/mine', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
    if (!customer) { sendSuccess(res, []); return; }
    const vehicles = await prisma.vehicle.findMany({ where: { customerId: customer.id }, select: { id: true } });
    const allHistory = [];
    for (const v of vehicles) {
      const h = await breakdownService.getBreakdownHistory(v.id);
      allHistory.push(...h);
    }
    allHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    sendSuccess(res, allHistory);
  } catch (err) { next(err); }
});

// Customer: get history for specific vehicle
router.get('/vehicle/:vehicleId', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = await breakdownService.getBreakdownHistory(req.params.vehicleId);
    sendSuccess(res, history);
  } catch (err) { next(err); }
});

// Admin: all requests
router.get('/', authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = getPaginationParams(req);
    const { items, total } = await breakdownService.getAllBreakdownRequests(page, limit, req.query.status as string);
    sendPaginated(res, items, buildPagination(page, limit, total));
  } catch (err) { next(err); }
});

// Admin: update status
router.patch('/:id/status', authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await breakdownService.updateBreakdownStatus(req.params.id, req.body.status, req.body);
    sendSuccess(res, updated, 'Status updated');
  } catch (err) { next(err); }
});

// Admin: manage service providers
router.post('/providers', authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const provider = await prisma.serviceProvider.create({ data: req.body });
    sendCreated(res, provider, 'Provider added');
  } catch (err) { next(err); }
});

router.patch('/providers/:id', authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const provider = await prisma.serviceProvider.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, provider, 'Provider updated');
  } catch (err) { next(err); }
});

export default router;
