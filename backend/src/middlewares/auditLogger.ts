import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface AuditOptions {
  action: string;
  entity: string;
  getEntityId?: (req: Request, res: Response) => string | undefined;
  getMetadata?: (req: Request, res: Response) => Record<string, unknown> | undefined;
}

/**
 * Middleware factory — creates an audit log after a successful response.
 */
export function auditLog(options: AuditOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Intercept response finish to log after success
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = options.getEntityId?.(req, res);
        const metadata = options.getMetadata?.(req, res);
        prisma.auditLog
          .create({
            data: {
              userId: req.user?.userId,
              userRole: req.user?.role,
              action: options.action,
              entity: options.entity,
              entityId,
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
              metadata: metadata as any,
            },
          })
          .catch((err) => logger.error('Audit log write failed', { err }));
      }
      return originalJson(body);
    };
    next();
  };
}

/**
 * Direct audit log write — use in service/controller when you need more control.
 */
export async function writeAuditLog(data: {
  userId?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({ data: data as any });
  } catch (err) {
    logger.error('Failed to write audit log', { err });
  }
}
