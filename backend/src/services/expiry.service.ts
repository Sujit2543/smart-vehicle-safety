import { prisma } from '../config/database';
import { getExpiryColor, daysUntil } from '../utils/dateUtils';
import { sendNotification } from './notification.service';
import { TEMPLATES } from './whatsapp.service';
import { logger } from '../utils/logger';

const REMINDER_DAYS = [30, 15, 7, 3, 1, 0];

export async function runInsuranceExpiryCheck(): Promise<void> {
  logger.info('Running insurance expiry check...');
  const records = await prisma.insuranceRecord.findMany({
    where: { expiryDate: { gte: new Date() } },
    include: {
      vehicle: {
        include: { customer: { select: { fullName: true, mobile: true } } },
      },
    },
  });

  for (const record of records) {
    const days = daysUntil(record.expiryDate);
    const color = getExpiryColor(record.expiryDate);

    // Update color
    await prisma.insuranceRecord.update({
      where: { id: record.id },
      data: { expiryColor: color },
    });

    if (!REMINDER_DAYS.includes(days)) continue;

    // Check if already notified today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (record.lastNotifiedAt && record.lastNotifiedAt >= today) continue;

    const { customer, registrationNumber } = record.vehicle;
    if (!customer) continue;

    const expiryStr = record.expiryDate.toLocaleDateString('en-IN');
    const body = TEMPLATES.insuranceExpiry({
      Customer_Name: customer.fullName,
      Car_Number: registrationNumber,
      Expiry_Date: expiryStr,
      Days: String(days),
    });

    await sendNotification({
      channel: 'WHATSAPP',
      event: 'INSURANCE_EXPIRY',
      recipient: customer.mobile,
      body,
      vehicleId: record.vehicleId,
    });

    await prisma.insuranceRecord.update({
      where: { id: record.id },
      data: { lastNotifiedAt: new Date() },
    });
  }

  logger.info('Insurance expiry check done');
}

export async function runPUCExpiryCheck(): Promise<void> {
  logger.info('Running PUC expiry check...');
  const records = await prisma.pUCRecord.findMany({
    where: { expiryDate: { gte: new Date() } },
    include: {
      vehicle: {
        include: { customer: { select: { fullName: true, mobile: true } } },
      },
    },
  });

  for (const record of records) {
    const days = daysUntil(record.expiryDate);
    const color = getExpiryColor(record.expiryDate);

    await prisma.pUCRecord.update({
      where: { id: record.id },
      data: { expiryColor: color },
    });

    if (!REMINDER_DAYS.includes(days)) continue;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (record.lastNotifiedAt && record.lastNotifiedAt >= today) continue;

    const { customer, registrationNumber } = record.vehicle;
    if (!customer) continue;

    const body = TEMPLATES.pucExpiry({
      Customer_Name: customer.fullName,
      Car_Number: registrationNumber,
      Expiry_Date: record.expiryDate.toLocaleDateString('en-IN'),
      Days: String(days),
    });

    await sendNotification({
      channel: 'WHATSAPP',
      event: 'PUC_EXPIRY',
      recipient: customer.mobile,
      body,
      vehicleId: record.vehicleId,
    });

    await prisma.pUCRecord.update({
      where: { id: record.id },
      data: { lastNotifiedAt: new Date() },
    });
  }

  logger.info('PUC expiry check done');
}

export async function getExpiryRadar() {
  const thresholds = [7, 15, 30];
  const now = new Date();

  const results: any = { insurance: {}, puc: {} };

  for (const days of thresholds) {
    const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    results.insurance[`in_${days}_days`] = await prisma.insuranceRecord.findMany({
      where: { expiryDate: { gte: now, lte: targetDate } },
      include: {
        vehicle: {
          include: { customer: { select: { fullName: true, mobile: true } } },
        },
      },
    });

    results.puc[`in_${days}_days`] = await prisma.pUCRecord.findMany({
      where: { expiryDate: { gte: now, lte: targetDate } },
      include: {
        vehicle: {
          include: { customer: { select: { fullName: true, mobile: true } } },
        },
      },
    });
  }

  return results;
}
