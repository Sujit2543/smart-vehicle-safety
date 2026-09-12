import axios from 'axios';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { NotFoundError, AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function initiateCall(tagId: string, callerNumber: string, ip?: string) {
  const tag = await prisma.tag.findUnique({
    where: { tagId },
    include: {
      vehicle: {
        include: { customer: { select: { mobile: true } } },
      },
    },
  });

  if (!tag || tag.status !== 'ACTIVE') throw new NotFoundError('Active tag not found');
  if (!tag.vehicle?.customer) throw new AppError('Vehicle owner not found', 400);

  const ownerMobile = tag.vehicle.customer.mobile;

  const log = await prisma.callLog.create({
    data: {
      tagId,
      vehicleId: tag.vehicle.id,
      callerNumber,
      receiverNumber: ownerMobile,
      virtualNumber: env.EXOTEL_VIRTUAL_NUMBER,
      status: 'INITIATED',
    },
  });

  // In development — just log
  if (env.isDevelopment() || !env.EXOTEL_API_KEY) {
    logger.info(`[DEV] Masked call: ${callerNumber} → ${ownerMobile} via ${env.EXOTEL_VIRTUAL_NUMBER}`);
    return { callId: log.id, status: 'INITIATED', message: 'Call initiated (dev mode)' };
  }

  // Exotel API call
  try {
    const url = `https://${env.EXOTEL_API_KEY}:${env.EXOTEL_API_TOKEN}@${env.EXOTEL_SUBDOMAIN}/v1/Accounts/${env.EXOTEL_SID}/Calls/connect`;
    const response = await axios.post(url, null, {
      params: {
        From: callerNumber,
        To: ownerMobile,
        CallerId: env.EXOTEL_VIRTUAL_NUMBER,
      },
    });

    await prisma.callLog.update({
      where: { id: log.id },
      data: { status: 'RINGING', providerRef: response.data?.Call?.Sid },
    });

    return { callId: log.id, status: 'RINGING' };
  } catch (err: any) {
    logger.error('Masked call failed', { err: err.message });
    await prisma.callLog.update({
      where: { id: log.id },
      data: { status: 'FAILED' },
    });
    throw new AppError('Failed to initiate call. Please try again.', 500);
  }
}
