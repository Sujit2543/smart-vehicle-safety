import { prisma } from '../config/database';
import { AppError, NotFoundError } from '../utils/errors';
import { comparePin, hashPin } from '../utils/hash';
import { getPresignedUrl, uploadToS3, deleteFromS3 } from './s3.service';
import { env } from '../config/env';
import { DocumentType } from '@prisma/client';
import { writeAuditLog } from '../middlewares/auditLogger';

export async function verifyPinAndGetUrl(
  tagId: string,
  documentId: string,
  pin: string,
  ip?: string,
  userAgent?: string
): Promise<{ url: string; expiresIn: number }> {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, isActive: true, deletedAt: null },
  });
  if (!doc) throw new NotFoundError('Document not found');

  // Check lockout
  if (doc.pinLockedUntil && doc.pinLockedUntil > new Date()) {
    const minutes = Math.ceil((doc.pinLockedUntil.getTime() - Date.now()) / 60000);
    throw new AppError(`Too many attempts. Try again in ${minutes} minute(s).`, 429);
  }

  const isCorrect = await comparePin(pin, doc.pinHash);

  // Log attempt
  await prisma.documentAccessLog.create({
    data: {
      documentId: doc.id,
      tagId,
      ipAddress: ip,
      userAgent,
      success: isCorrect,
      failReason: isCorrect ? undefined : 'Invalid PIN',
    },
  });

  if (!isCorrect) {
    const newAttempts = doc.pinAttempts + 1;
    const updateData: any = { pinAttempts: newAttempts };
    if (newAttempts >= env.DOCUMENT_PIN_MAX_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + env.DOCUMENT_PIN_LOCKOUT_MINUTES * 60 * 1000);
      updateData.pinLockedUntil = lockUntil;
      updateData.pinAttempts = 0;
    }
    await prisma.document.update({ where: { id: doc.id }, data: updateData });

    const remaining = env.DOCUMENT_PIN_MAX_ATTEMPTS - newAttempts;
    throw new AppError(
      remaining > 0
        ? `Incorrect PIN. ${remaining} attempt(s) remaining.`
        : `Too many failed attempts. Locked for ${env.DOCUMENT_PIN_LOCKOUT_MINUTES} minutes.`,
      401
    );
  }

  // Reset attempts on success
  await prisma.document.update({
    where: { id: doc.id },
    data: { pinAttempts: 0, pinLockedUntil: null },
  });

  const url = await getPresignedUrl(doc.s3Key, env.AWS_S3_PRESIGNED_URL_TTL);

  await writeAuditLog({
    action: 'DOCUMENT_VIEWED',
    entity: 'Document',
    entityId: doc.id,
    ipAddress: ip,
    userAgent,
    metadata: { tagId, documentType: doc.type },
  });

  return { url, expiresIn: env.AWS_S3_PRESIGNED_URL_TTL };
}

export async function uploadDocument(params: {
  vehicleId: string;
  type: DocumentType;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  pin: string;
  userId?: string;
}) {
  const s3Key = await uploadToS3(params.buffer, params.mimeType, `documents/${params.vehicleId}`, params.fileName);
  const pinHash = await hashPin(params.pin);

  // Deactivate old document of same type
  await prisma.document.updateMany({
    where: { vehicleId: params.vehicleId, type: params.type, isActive: true },
    data: { isActive: false },
  });

  const doc = await prisma.document.create({
    data: {
      vehicleId: params.vehicleId,
      type: params.type,
      fileName: params.fileName,
      s3Key,
      mimeType: params.mimeType,
      sizeBytes: params.buffer.length,
      pinHash,
    },
  });

  await writeAuditLog({
    userId: params.userId,
    userRole: 'CUSTOMER',
    action: 'DOCUMENT_UPLOADED',
    entity: 'Document',
    entityId: doc.id,
    metadata: { type: params.type, vehicleId: params.vehicleId },
  });

  return doc;
}

export async function getDocumentsByVehicle(vehicleId: string) {
  return prisma.document.findMany({
    where: { vehicleId, isActive: true, deletedAt: null },
    select: { id: true, type: true, fileName: true, mimeType: true, sizeBytes: true, uploadedAt: true },
  });
}
