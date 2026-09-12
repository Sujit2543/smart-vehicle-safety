import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { uploadToS3 } from './s3.service';
import { writeAuditLog } from '../middlewares/auditLogger';

export async function addMaintenanceRecord(params: {
  vehicleId: string;
  userId: string;
  serviceDate: Date;
  odometer?: number;
  serviceType: string;
  cost?: number;
  serviceCenter?: string;
  notes?: string;
  invoiceBuffer?: Buffer;
  invoiceMime?: string;
  invoiceName?: string;
}) {
  // Verify ownership
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: params.vehicleId, customer: { userId: params.userId }, deletedAt: null },
  });
  if (!vehicle) throw new NotFoundError('Vehicle not found');

  let invoiceS3Key: string | undefined;
  if (params.invoiceBuffer) {
    invoiceS3Key = await uploadToS3(
      params.invoiceBuffer,
      params.invoiceMime!,
      `invoices/${params.vehicleId}`,
      params.invoiceName!
    );
  }

  const record = await prisma.maintenanceRecord.create({
    data: {
      vehicleId: params.vehicleId,
      serviceDate: params.serviceDate,
      odometer: params.odometer,
      serviceType: params.serviceType,
      cost: params.cost,
      serviceCenter: params.serviceCenter,
      notes: params.notes,
      invoiceS3Key,
    },
  });

  await writeAuditLog({
    userId: params.userId,
    action: 'MAINTENANCE_ADDED',
    entity: 'MaintenanceRecord',
    entityId: record.id,
    metadata: { vehicleId: params.vehicleId },
  });

  return record;
}

export async function getMaintenanceHistory(vehicleId: string) {
  return prisma.maintenanceRecord.findMany({
    where: { vehicleId, deletedAt: null },
    orderBy: { serviceDate: 'desc' },
  });
}

export async function updateMaintenanceRecord(
  id: string,
  userId: string,
  data: Partial<{ serviceType: string; cost: number; notes: string; serviceCenter: string; odometer: number }>
) {
  const record = await prisma.maintenanceRecord.findFirst({
    where: { id, vehicle: { customer: { userId } } },
  });
  if (!record) throw new NotFoundError('Record not found');
  return prisma.maintenanceRecord.update({ where: { id }, data });
}

export async function deleteMaintenanceRecord(id: string, userId: string) {
  const record = await prisma.maintenanceRecord.findFirst({
    where: { id, vehicle: { customer: { userId } } },
  });
  if (!record) throw new NotFoundError('Record not found');
  return prisma.maintenanceRecord.update({ where: { id }, data: { deletedAt: new Date() } });
}
