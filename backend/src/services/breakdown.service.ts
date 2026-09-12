import { prisma } from '../config/database';
import { NotFoundError, AppError } from '../utils/errors';
import { sendNotification } from './notification.service';
import { writeAuditLog } from '../middlewares/auditLogger';
import { BreakdownType, EmergencyServiceType, ServiceRequestStatus } from '@prisma/client';
import { logger } from '../utils/logger';

// Emergency service numbers (configurable per city/state)
const EMERGENCY_NUMBERS = {
  AMBULANCE:  '108',
  POLICE:     '100',
  FIRE:       '101',
  HIGHWAY:    '1033', // NHAI highway helpline
  WOMENSAFETY:'1091',
};

// ── Create Breakdown Request ──────────────────────────────────

export async function createBreakdownRequest(params: {
  tagId: string;
  breakdownType: BreakdownType;
  serviceType: EmergencyServiceType;
  callerName?: string;
  callerMobile: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  description?: string;
  ip?: string;
}) {
  const tag = await prisma.tag.findUnique({
    where: { tagId: params.tagId },
    include: {
      vehicle: {
        include: {
          customer: { select: { fullName: true, mobile: true } },
          emergencyContacts: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
  });

  if (!tag || tag.status !== 'ACTIVE') throw new NotFoundError('Active tag not found');
  if (!tag.vehicle) throw new AppError('No vehicle linked', 400);

  const mapLink = params.latitude && params.longitude
    ? `https://maps.google.com/maps?q=${params.latitude},${params.longitude}`
    : undefined;

  const request = await prisma.breakdownRequest.create({
    data: {
      tagId: params.tagId,
      vehicleId: tag.vehicle.id,
      breakdownType: params.breakdownType,
      serviceType: params.serviceType,
      callerName: params.callerName,
      callerMobile: params.callerMobile,
      latitude: params.latitude,
      longitude: params.longitude,
      mapLink,
      address: params.address,
      description: params.description,
      status: ServiceRequestStatus.PENDING,
    },
  });

  // Notify vehicle owner
  const ownerMobile = tag.vehicle.customer?.mobile;
  if (ownerMobile) {
    const locationText = mapLink ? `\n📍 Location: ${mapLink}` : '';
    const body = `🔧 Breakdown Alert for your vehicle *${tag.vehicle.registrationNumber}*\n\n`
      + `Issue: ${params.breakdownType.replace(/_/g, ' ')}\n`
      + `Service needed: ${params.serviceType.replace(/_/g, ' ')}\n`
      + `Reported by: ${params.callerName ?? params.callerMobile}${locationText}\n\n`
      + `Request ID: ${request.id.slice(-8).toUpperCase()}`;

    await sendNotification({
      channel: 'WHATSAPP',
      event: 'SOS_ALERT',
      recipient: ownerMobile,
      body,
      vehicleId: tag.vehicle.id,
    });
  }

  // Also notify emergency contact for serious issues
  if (['ACCIDENT', 'BRAKE_FAILURE', 'ENGINE_FAILURE'].includes(params.breakdownType)) {
    const ec = tag.vehicle.emergencyContacts[0];
    if (ec) {
      const body = `🚨 Your contact's vehicle *${tag.vehicle.registrationNumber}* needs urgent help!\n`
        + `Issue: ${params.breakdownType.replace(/_/g, ' ')}\n`
        + (mapLink ? `Location: ${mapLink}` : '');
      await sendNotification({
        channel: 'WHATSAPP',
        event: 'SOS_ALERT',
        recipient: ec.mobile,
        body,
        vehicleId: tag.vehicle.id,
      });
    }
  }

  await writeAuditLog({
    action: 'BREAKDOWN_REQUEST_CREATED',
    entity: 'BreakdownRequest',
    entityId: request.id,
    ipAddress: params.ip,
    metadata: { tagId: params.tagId, type: params.breakdownType, service: params.serviceType },
  });

  return {
    requestId: request.id,
    shortId: request.id.slice(-8).toUpperCase(),
    status: request.status,
    vehicle: {
      registrationNumber: tag.vehicle.registrationNumber,
      make: tag.vehicle.make,
      model: tag.vehicle.model,
    },
    emergencyNumbers: EMERGENCY_NUMBERS,
    mapLink,
    message: getServiceMessage(params.serviceType, params.breakdownType),
  };
}

// ── Find nearby service providers ────────────────────────────

export async function findNearbyProviders(
  serviceType: EmergencyServiceType,
  city?: string
) {
  const providers = await prisma.serviceProvider.findMany({
    where: {
      serviceType,
      isAvailable: true,
      isVerified: true,
      ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
    },
    orderBy: [{ rating: 'desc' }, { totalJobs: 'desc' }],
    take: 10,
  });
  return providers;
}

// ── Update request status ─────────────────────────────────────

export async function updateBreakdownStatus(
  requestId: string,
  status: ServiceRequestStatus,
  data?: { assignedTo?: string; estimatedArrival?: string; notes?: string; cancelReason?: string }
) {
  const req = await prisma.breakdownRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new NotFoundError('Request not found');

  const updateData: any = { status, ...data };
  if (status === ServiceRequestStatus.COMPLETED) updateData.completedAt = new Date();
  if (status === ServiceRequestStatus.CANCELLED) updateData.cancelledAt = new Date();

  return prisma.breakdownRequest.update({ where: { id: requestId }, data: updateData });
}

// ── Submit rating ─────────────────────────────────────────────

export async function submitRating(requestId: string, score: number, comment?: string) {
  const req = await prisma.breakdownRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new NotFoundError('Request not found');
  if (req.status !== ServiceRequestStatus.COMPLETED) throw new AppError('Can only rate completed requests', 400);

  return prisma.serviceRating.upsert({
    where: { breakdownRequestId: requestId },
    update: { score, comment },
    create: { breakdownRequestId: requestId, vehicleId: req.vehicleId, score, comment },
  });
}

// ── Owner: get breakdown history ──────────────────────────────

export async function getBreakdownHistory(vehicleId: string) {
  return prisma.breakdownRequest.findMany({
    where: { vehicleId },
    orderBy: { createdAt: 'desc' },
    include: { rating: true },
  });
}

// ── Admin: all requests ───────────────────────────────────────

export async function getAllBreakdownRequests(page = 1, limit = 20, status?: string) {
  const where: any = status ? { status } : {};
  const [items, total] = await Promise.all([
    prisma.breakdownRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        vehicle: { select: { registrationNumber: true, make: true, model: true, customer: { select: { fullName: true, mobile: true } } } },
        rating: true,
      },
    }),
    prisma.breakdownRequest.count({ where }),
  ]);
  return { items, total };
}

// ── Message helper ────────────────────────────────────────────

function getServiceMessage(serviceType: EmergencyServiceType, breakdownType: BreakdownType): string {
  const messages: Record<EmergencyServiceType, string> = {
    MECHANIC: '🔧 Your request has been sent. A mechanic will contact you shortly. Keep your hazard lights ON.',
    TOWING: '🚛 Towing request registered. Please stay with your vehicle in a safe location.',
    FUEL_DELIVERY: '⛽ Fuel delivery request sent. Stay near your vehicle.',
    AMBULANCE: '🚑 Emergency services have been notified. Call 108 for immediate ambulance.',
    POLICE: '🚔 Police assistance requested. You can also call 100 directly.',
    ROADSIDE_ASSISTANCE: '🛣️ Roadside assistance request sent. Help is on the way.',
  };
  return messages[serviceType];
}
