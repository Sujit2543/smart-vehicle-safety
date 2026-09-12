import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { daysUntil, getExpiryColor } from '../utils/dateUtils';

export async function getVehicleForOwner(vehicleId: string, userId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, customer: { userId }, deletedAt: null },
    include: {
      tag: true,
      emergencyContacts: true,
      insuranceRecord: true,
      pucRecord: true,
      maintenanceRecords: {
        where: { deletedAt: null },
        orderBy: { serviceDate: 'desc' },
        take: 5,
      },
      documents: {
        where: { isActive: true, deletedAt: null },
        select: { id: true, type: true, fileName: true, uploadedAt: true },
      },
    },
  });
  if (!vehicle) throw new NotFoundError('Vehicle not found');
  return vehicle;
}

export async function updateVehicle(
  vehicleId: string,
  userId: string,
  data: Partial<{ make: string; model: string; color: string; fuelType: any }>
) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, customer: { userId }, deletedAt: null },
  });
  if (!vehicle) throw new NotFoundError('Vehicle not found');
  return prisma.vehicle.update({ where: { id: vehicleId }, data });
}

export async function getExpiryStatus(vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { insuranceRecord: true, pucRecord: true },
  });
  if (!vehicle) throw new NotFoundError('Vehicle not found');

  return {
    insurance: vehicle.insuranceRecord
      ? {
          expiryDate: vehicle.insuranceRecord.expiryDate,
          daysRemaining: daysUntil(vehicle.insuranceRecord.expiryDate),
          color: getExpiryColor(vehicle.insuranceRecord.expiryDate),
        }
      : null,
    puc: vehicle.pucRecord
      ? {
          expiryDate: vehicle.pucRecord.expiryDate,
          daysRemaining: daysUntil(vehicle.pucRecord.expiryDate),
          color: getExpiryColor(vehicle.pucRecord.expiryDate),
        }
      : null,
  };
}
