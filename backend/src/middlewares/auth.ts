import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { prisma } from '../config/database';
import { UserRole } from '@prisma/client';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { dbUser?: any };
    }
  }
}

/**
 * Extract and verify JWT from Authorization header
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional authentication — sets req.user if token present, doesn't fail if missing
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  try {
    const token = authHeader.slice(7);
    req.user = verifyAccessToken(token);
  } catch {
    // Silently ignore invalid tokens for optional auth
  }
  next();
}

/**
 * Role guard — use after authenticate()
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }
    if (!roles.includes(req.user.role as UserRole)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}

/**
 * Load full user from DB — attaches req.user.dbUser
 */
export async function loadUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.userId) return next();
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { customer: true },
    });
    if (!dbUser || !dbUser.isActive) {
      return next(new UnauthorizedError('Account is inactive or does not exist'));
    }
    req.user.dbUser = dbUser;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Admin-only shorthand
 */
export const adminOnly = [
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
];

/**
 * Super admin-only shorthand
 */
export const superAdminOnly = [
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
];

/**
 * Customer-only shorthand
 */
export const customerOnly = [
  authenticate,
  authorize(UserRole.CUSTOMER),
];
