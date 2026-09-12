import { prisma } from '../config/database';
import { sendWhatsApp, TEMPLATES } from './whatsapp.service';
import { sendSms } from './sms.service';
import { logger } from '../utils/logger';
import { NotificationChannel, NotificationEvent } from '@prisma/client';

interface SendResult {
  success: boolean;
  providerRef?: string;
  failReason?: string;
}

export async function sendNotification(params: {
  channel: NotificationChannel;
  event: NotificationEvent;
  recipient: string;
  body: string;
  subject?: string;
  sosEventId?: string;
  vehicleId?: string;
  customerId?: string;
}): Promise<string> {
  const log = await prisma.notificationLog.create({
    data: {
      channel: params.channel,
      event: params.event,
      recipient: params.recipient,
      body: params.body,
      subject: params.subject,
      sosEventId: params.sosEventId,
      vehicleId: params.vehicleId,
      customerId: params.customerId,
      status: 'PENDING',
    },
  });

  let result: SendResult = { success: false };

  try {
    if (params.channel === 'WHATSAPP') {
      result = await sendWhatsApp(params.recipient, params.body);
    } else if (params.channel === 'SMS') {
      const ok = await sendSms(params.recipient, params.body);
      result = { success: ok };
    }

    await prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: result.success ? 'SENT' : 'FAILED',
        providerRef: result.providerRef,
        failReason: result.failReason,
        sentAt: result.success ? new Date() : undefined,
      },
    });
  } catch (err: any) {
    logger.error('Notification send error', { err });
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', failReason: err.message },
    });
  }

  return log.id;
}

export async function retryFailedNotification(id: string): Promise<void> {
  const log = await prisma.notificationLog.findUnique({ where: { id } });
  if (!log || log.status !== 'FAILED') return;

  if (log.retryCount >= 3) {
    logger.warn('Max retries reached for notification', { id });
    return;
  }

  await prisma.notificationLog.update({
    where: { id },
    data: { retryCount: { increment: 1 }, status: 'PENDING' },
  });

  await sendNotification({
    channel: log.channel,
    event: log.event,
    recipient: log.recipient,
    body: log.body,
    subject: log.subject ?? undefined,
    sosEventId: log.sosEventId ?? undefined,
    vehicleId: log.vehicleId ?? undefined,
    customerId: log.customerId ?? undefined,
  });
}

// ── Send SOS alert to emergency contact ───────────────────────
export async function sendSOSAlert(params: {
  emergencyMobile: string;
  carNumber: string;
  lat?: number | null;
  lng?: number | null;
  sosEventId: string;
  vehicleId: string;
}): Promise<void> {
  const mapLink = params.lat && params.lng
    ? `https://maps.google.com/maps?q=${params.lat},${params.lng}`
    : 'Location not available';

  const body = TEMPLATES.sosAlert({
    Car_Number: params.carNumber,
    Live_Location_Link: mapLink,
  });

  await sendNotification({
    channel: 'WHATSAPP',
    event: 'SOS_ALERT',
    recipient: params.emergencyMobile,
    body,
    sosEventId: params.sosEventId,
    vehicleId: params.vehicleId,
  });

  // Also send SMS as backup
  await sendNotification({
    channel: 'SMS',
    event: 'SOS_ALERT',
    recipient: params.emergencyMobile,
    body: `EMERGENCY: SOS triggered for vehicle ${params.carNumber}. Location: ${mapLink}`,
    sosEventId: params.sosEventId,
    vehicleId: params.vehicleId,
  });
}
