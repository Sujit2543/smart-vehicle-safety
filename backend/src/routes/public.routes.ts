import { Router, Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';

const router = Router();

// Health-check style public ping
router.get('/ping', (_req, res) => res.json({ ok: true }));

export default router;
