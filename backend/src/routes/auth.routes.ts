import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { otpRateLimiter } from '../middlewares/rateLimiter';
import { authenticate } from '../middlewares/auth';
import {
  sendOtpSchema,
  verifyOtpSchema,
  adminLoginSchema,
} from '../validators/auth.validator';

const router = Router();

// Customer OTP flow
router.post('/send-otp', otpRateLimiter, validate(sendOtpSchema), authController.sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);

// Admin login
router.post('/admin/login', validate(adminLoginSchema), authController.adminLogin);

// Token management
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// Protected — get own profile
router.get('/me', authenticate, authController.getMe);

export default router;
