import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { Request, Response, NextFunction } from 'express';

// In development, skip all rate limiting so testing is frictionless
const skipInDev = () => env.isDevelopment();

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max:      env.RATE_LIMIT_MAX,
  skip:     skipInDev,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

export const otpRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max:      env.OTP_RATE_LIMIT_MAX,
  skip:     skipInDev,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator: (req) => req.body?.mobile || req.ip || 'unknown',
  message: { success: false, message: 'Too many OTP requests. Please try again after 15 minutes.' },
});

export const documentAccessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      env.isDevelopment() ? 1000 : 10,
  skip:     skipInDev,
  keyGenerator: (req) => `${req.ip}-${req.params.docId ?? 'doc'}`,
  message: { success: false, message: 'Too many document access attempts.' },
});

export const callInitiateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      env.isDevelopment() ? 100 : 3,
  skip:     skipInDev,
  keyGenerator: (req) => req.ip || 'unknown',
  message: { success: false, message: 'Too many call attempts. Please wait before trying again.' },
});

export const sosLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max:      env.isDevelopment() ? 100 : 5,
  skip:     skipInDev,
  keyGenerator: (req) => `${req.ip}-${req.body?.tagId ?? 'sos'}`,
  message: { success: false, message: 'Too many SOS requests.' },
});
