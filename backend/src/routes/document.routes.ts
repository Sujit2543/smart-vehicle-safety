import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { documentAccessLimiter } from '../middlewares/rateLimiter';
import { uploadSingle } from '../middlewares/upload';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import * as documentService from '../services/document.service';
import { UserRole, DocumentType } from '@prisma/client';

const router = Router();

// Public: list documents for a vehicle by tagId (returns metadata only — no s3 key exposed)
router.get('/public/:tagId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const tag = await prisma.tag.findUnique({
      where: { tagId: req.params.tagId },
      select: { vehicleId: true, status: true },
    });
    if (!tag || !tag.vehicleId) {
      res.status(404).json({ success: false, message: 'Tag or vehicle not found' });
      return;
    }
    const docs = await prisma.document.findMany({
      where: { vehicleId: tag.vehicleId, isActive: true, deletedAt: null },
      select: { id: true, type: true, fileName: true, mimeType: true, sizeBytes: true, uploadedAt: true },
    });
    sendSuccess(res, docs);
  } catch (err) { next(err); }
});

// Customer: get documents for own vehicle (auth required)
router.get('/vehicle/:vehicleId', authenticate, authorize(UserRole.CUSTOMER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Ownership check — vehicle must belong to this customer
    const { prisma } = await import('../config/database');
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: req.params.vehicleId, customer: { userId: req.user!.userId }, deletedAt: null },
    });
    if (!vehicle) { res.status(403).json({ success: false, message: 'Access denied' }); return; }
    const docs = await documentService.getDocumentsByVehicle(req.params.vehicleId);
    sendSuccess(res, docs);
  } catch (err) { next(err); }
});

// Customer: upload document
router.post(
  '/vehicle/:vehicleId',
  authenticate,
  authorize(UserRole.CUSTOMER),
  uploadSingle,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) { res.status(400).json({ success: false, message: 'File required' }); return; }
      const doc = await documentService.uploadDocument({
        vehicleId: req.params.vehicleId,
        type: req.body.type as DocumentType,
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        fileName: req.file.originalname,
        pin: req.body.pin,
        userId: req.user?.userId,
      });
      sendCreated(res, { id: doc.id, type: doc.type, fileName: doc.fileName }, 'Document uploaded');
    } catch (err) { next(err); }
  }
);

// Public: verify PIN and get pre-signed URL
router.post(
  '/:documentId/access',
  documentAccessLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tagId, pin } = req.body;
      if (!tagId || !pin) {
        res.status(400).json({ success: false, message: 'tagId and pin are required' });
        return;
      }
      const result = await documentService.verifyPinAndGetUrl(
        tagId,
        req.params.documentId,
        pin,
        req.ip,
        req.headers['user-agent']
      );
      sendSuccess(res, result, 'Access granted');
    } catch (err) { next(err); }
  }
);

export default router;
