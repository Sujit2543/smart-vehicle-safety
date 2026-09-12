import { prisma } from '../config/database';
import { NotFoundError, AppError } from '../utils/errors';
import { sendSOSAlert } from './notification.service';
import { writeAuditLog } from '../middlewares/auditLogger';
import { SOSStatus } from '@prisma/client';

export async function triggerSOS(params: {
  tagId: string;
  latitude?: number;
  longitude?: number;
  ip?: string;
}): Promise<{ sosId: string; status: string }> {
  const tag = await prisma.tag.findUnique({
    where: { tagId: params.tagId },
    include: {
      vehicle: {
        include: {
          emergencyContacts: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
  });

  if (!tag || tag.status !== 'ACTIVE') throw new NotFoundError('Active tag not found');
  if (!tag.vehicle) throw new AppError('No vehicle linked to this tag', 400);

  const mapLink =
    params.latitude && params.longitude
      ? `https://maps.google.com/maps?q=${params.latitude},${params.longitude}`
      : undefined;

  const sos = await prisma.sOSEvent.create({
    data: {
      tagId: params.tagId,
      vehicleId: tag.vehicle.id,
      latitude: params.latitude,
      longitude: params.longitude,
      mapLink,
      status: SOSStatus.TRIGGERED,
    },
  });

  // Notify emergency contact
  const contact = tag.vehicle.emergencyContacts[0];
  if (contact) {
    await sendSOSAlert({
      emergencyMobile: contact.mobile,
      carNumber: tag.vehicle.registrationNumber,
      lat: params.latitude,
      lng: params.longitude,
      sosEventId: sos.id,
      vehicleId: tag.vehicle.id,
    });

    await prisma.sOSEvent.update({
      where: { id: sos.id },
      data: { status: SOSStatus.NOTIFIED, notifiedAt: new Date() },
    });
  }

  await writeAuditLog({
    action: 'SOS_TRIGGERED',
    entity: 'SOSEvent',
    entityId: sos.id,
    ipAddress: params.ip,
    metadata: { tagId: params.tagId, vehicleId: tag.vehicle.id, lat: params.latitude, lng: params.longitude },
  });

  return { sosId: sos.id, status: contact ? SOSStatus.NOTIFIED : SOSStatus.TRIGGERED };
}

export async function updateSOSStatus(
  sosId: string,
  status: 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED',
  userId?: string
) {
  const sos = await prisma.sOSEvent.findUnique({ where: { id: sosId } });
  if (!sos) throw new NotFoundError('SOS event not found');

  const data: any = { status };
  if (status === 'ACKNOWLEDGED') data.acknowledgedAt = new Date();
  if (status === 'RESOLVED') { data.resolvedAt = new Date(); data.resolvedBy = userId; }
  if (status === 'CANCELLED') data.cancelledAt = new Date();

  return prisma.sOSEvent.update({ where: { id: sosId }, data });
}

export async function getSOSHistory(vehicleId?: string, page = 1, limit = 20) {
  const where = vehicleId ? { vehicleId } : {};
  const [items, total] = await Promise.all([
    prisma.sOSEvent.findMany({
      where,
      orderBy: { triggeredAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        vehicle: { select: { registrationNumber: true, make: true, model: true } },
      },
    }),
    prisma.sOSEvent.count({ where }),
  ]);
  return { items, total };
}
