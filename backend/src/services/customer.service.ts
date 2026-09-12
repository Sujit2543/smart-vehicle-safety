import { prisma } from '../config/database';
import { NotFoundError, ConflictError, AppError } from '../utils/errors';
import { uploadToS3 } from './s3.service';
import { hashPin } from '../utils/hash';
import { sendNotification } from './notification.service';
import { TEMPLATES } from './whatsapp.service';
import { env } from '../config/env';
import { TagStatus, FuelType, VehicleType, DocumentType } from '@prisma/client';
import { writeAuditLog } from '../middlewares/auditLogger';

// ── Self-Activation ───────────────────────────────────────────

export interface ActivationInput {
  tagId: string;
  // Customer
  fullName: string;
  mobile: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  // Vehicle
  registrationNumber: string;
  vehicleType: VehicleType;
  make: string;
  model: string;
  color: string;
  manufacturingYear: number;
  fuelType: FuelType;
  // Emergency
  emergencyName: string;
  emergencyMobile: string;
  emergencyRelationship: string;
  // PIN
  pin: string;
  // Documents (optional buffers)
  rcBuffer?: Buffer;
  rcMime?: string;
  rcName?: string;
  insuranceBuffer?: Buffer;
  insuranceMime?: string;
  insuranceName?: string;
  pucBuffer?: Buffer;
  pucMime?: string;
  pucName?: string;
}

export async function selfActivate(input: ActivationInput, userId: string, ip?: string) {
  // Verify tag is unassigned
  const tag = await prisma.tag.findUnique({ where: { tagId: input.tagId } });
  if (!tag) throw new NotFoundError('Tag not found');
  if (tag.status !== TagStatus.UNASSIGNED) {
    throw new AppError('This tag is already activated', 400);
  }

  // Ensure vehicle reg number is unique
  const existing = await prisma.vehicle.findUnique({
    where: { registrationNumber: input.registrationNumber.toUpperCase() },
  });
  if (existing) throw new ConflictError('A vehicle with this registration number already exists');

  const pinHash = await hashPin(input.pin);

  return prisma.$transaction(async (tx) => {
    // Upsert customer
    let customer = await tx.customer.findUnique({ where: { userId } });
    if (!customer) {
      customer = await tx.customer.create({
        data: {
          userId,
          fullName: input.fullName,
          mobile: input.mobile,
          email: input.email,
          address: input.address,
          city: input.city,
          state: input.state,
          pinCode: input.pinCode,
        },
      });
    }

    // Create vehicle
    const vehicle = await tx.vehicle.create({
      data: {
        customerId: customer.id,
        registrationNumber: input.registrationNumber.toUpperCase(),
        vehicleType: input.vehicleType,
        make: input.make,
        model: input.model,
        color: input.color,
        manufacturingYear: input.manufacturingYear,
        fuelType: input.fuelType,
      },
    });

    // Emergency contact
    await tx.emergencyContact.create({
      data: {
        customerId: customer.id,
        vehicleId: vehicle.id,
        name: input.emergencyName,
        mobile: input.emergencyMobile,
        relationship: input.emergencyRelationship,
        isPrimary: true,
      },
    });

    // Activate tag
    await tx.tag.update({
      where: { tagId: input.tagId },
      data: {
        status: TagStatus.ACTIVE,
        vehicleId: vehicle.id,
        activatedAt: new Date(),
      },
    });

    await tx.tagActivation.create({
      data: {
        tagId: input.tagId,
        vehicleId: vehicle.id,
        customerId: customer.id,
        action: 'ACTIVATED',
        performedBy: userId,
        metadata: { ipAddress: ip },
      },
    });

    return { customer, vehicle };
  }).then(async ({ customer, vehicle }) => {
    // Upload documents after transaction
    const docUploads: Array<{ type: DocumentType; buf: Buffer; mime: string; name: string }> = [];
    if (input.rcBuffer) docUploads.push({ type: 'RC', buf: input.rcBuffer, mime: input.rcMime!, name: input.rcName! });
    if (input.insuranceBuffer) docUploads.push({ type: 'INSURANCE', buf: input.insuranceBuffer, mime: input.insuranceMime!, name: input.insuranceName! });
    if (input.pucBuffer) docUploads.push({ type: 'PUC', buf: input.pucBuffer, mime: input.pucMime!, name: input.pucName! });

    for (const doc of docUploads) {
      const s3Key = await uploadToS3(doc.buf, doc.mime, `documents/${vehicle.id}`, doc.name);
      await prisma.document.create({
        data: {
          vehicleId: vehicle.id,
          type: doc.type,
          fileName: doc.name,
          s3Key,
          mimeType: doc.mime,
          sizeBytes: doc.buf.length,
          pinHash,
        },
      });
    }

    // Send welcome WhatsApp
    await sendNotification({
      channel: 'WHATSAPP',
      event: 'WELCOME',
      recipient: customer.mobile,
      body: TEMPLATES.welcome({
        Customer_Name: customer.fullName,
        Car_Number: vehicle.registrationNumber,
        Dashboard_Link: `${env.BASE_URL}/dashboard`,
      }),
      vehicleId: vehicle.id,
      customerId: customer.id,
    });

    await writeAuditLog({
      userId,
      userRole: 'CUSTOMER',
      action: 'SELF_ACTIVATION',
      entity: 'Tag',
      entityId: input.tagId,
      ipAddress: ip,
      metadata: { vehicleId: vehicle.id, customerId: customer.id },
    });

    return { customer, vehicle };
  });
}

// ── Customer profile ──────────────────────────────────────────

export async function getCustomerByUserId(userId: string) {
  const customer = await prisma.customer.findUnique({
    where: { userId },
    include: {
      vehicles: {
        where: { deletedAt: null },
        include: {
          tag: { select: { tagId: true, status: true } },
          insuranceRecord: true,
          pucRecord: true,
        },
      },
    },
  });
  if (!customer) throw new NotFoundError('Customer profile not found');
  return customer;
}

export async function updateCustomer(
  userId: string,
  data: Partial<{ fullName: string; email: string; address: string; city: string; state: string; pinCode: string }>
) {
  return prisma.customer.update({ where: { userId }, data });
}
