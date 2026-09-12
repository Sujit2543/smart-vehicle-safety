import { prisma } from '../config/database';

export async function getDashboardStats() {
  const [
    totalTags, unassignedTags, activeTags, inactiveTags, blockedTags,
    totalCustomers, totalVehicles,
    insuranceExpiring, pucExpiring,
    sosToday, unresolvedSOS,
    totalScans,
  ] = await Promise.all([
    prisma.tag.count(),
    prisma.tag.count({ where: { status: 'UNASSIGNED' } }),
    prisma.tag.count({ where: { status: 'ACTIVE' } }),
    prisma.tag.count({ where: { status: 'INACTIVE' } }),
    prisma.tag.count({ where: { status: 'BLOCKED' } }),
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.vehicle.count({ where: { deletedAt: null } }),
    prisma.insuranceRecord.count({
      where: { expiryDate: { gte: new Date(), lte: new Date(Date.now() + 30 * 86400000) } },
    }),
    prisma.pUCRecord.count({
      where: { expiryDate: { gte: new Date(), lte: new Date(Date.now() + 30 * 86400000) } },
    }),
    prisma.sOSEvent.count({
      where: { triggeredAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.sOSEvent.count({ where: { status: { in: ['TRIGGERED', 'NOTIFIED'] } } }),
    prisma.scanLog.count(),
  ]);

  // Daily scans for last 7 days
  // Daily scans for last 7 days — use Prisma's mapped column name
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rawScans = await prisma.scanLog.groupBy({
    by: ['scannedAt'],
    where: { scannedAt: { gte: sevenDaysAgo } },
    _count: { id: true },
  });

  // Group by date (day)
  const scansByDay: Record<string, number> = {};
  rawScans.forEach(row => {
    const date = row.scannedAt.toISOString().split('T')[0];
    scansByDay[date] = (scansByDay[date] ?? 0) + row._count.id;
  });
  const dailyScans = Object.entries(scansByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return {
    totalTags, unassignedTags, activeTags, inactiveTags, blockedTags,
    totalCustomers, totalVehicles,
    insuranceExpiring, pucExpiring,
    sosToday, unresolvedSOS, totalScans,
    dailyScans,
  };
}

export async function getScanAnalytics() {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const startOfWeek = new Date(Date.now() - 7 * 86400000);
  const startOfMonth = new Date(Date.now() - 30 * 86400000);

  const [today, thisWeek, thisMonth, qrScans, nfcScans, activationScans] = await Promise.all([
    prisma.scanLog.count({ where: { scannedAt: { gte: startOfDay } } }),
    prisma.scanLog.count({ where: { scannedAt: { gte: startOfWeek } } }),
    prisma.scanLog.count({ where: { scannedAt: { gte: startOfMonth } } }),
    prisma.scanLog.count({ where: { scanType: 'QR' } }),
    prisma.scanLog.count({ where: { scanType: 'NFC' } }),
    prisma.scanLog.count({ where: { purpose: 'ACTIVATION' } }),
  ]);

  return { today, thisWeek, thisMonth, qrScans, nfcScans, activationScans };
}

export async function getAuditLogs(page = 1, limit = 50, filters?: { action?: string; entity?: string }) {
  const where: any = {};
  if (filters?.action) where.action = { contains: filters.action, mode: 'insensitive' };
  if (filters?.entity) where.entity = filters.entity;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { mobile: true, email: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

export async function getAllCustomers(page = 1, limit = 20, search?: string) {
  const where: any = { deletedAt: null };
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { mobile: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicles: { select: { id: true, registrationNumber: true }, where: { deletedAt: null } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return { customers, total };
}

export async function getAllVehicles(page = 1, limit = 20, search?: string) {
  const where: any = { deletedAt: null };
  if (search) {
    where.OR = [
      { registrationNumber: { contains: search.toUpperCase() } },
      { make: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { fullName: true, mobile: true } },
        tag: { select: { tagId: true, status: true } },
        insuranceRecord: { select: { expiryDate: true, expiryColor: true } },
        pucRecord: { select: { expiryDate: true, expiryColor: true } },
      },
    }),
    prisma.vehicle.count({ where }),
  ]);

  return { vehicles, total };
}

export async function getAllTags(
  page = 1,
  limit = 20,
  search?: string,
  status?: string,
  sortBy = 'createdAt',
  sortDir: 'asc' | 'desc' = 'desc'
) {
  const where: any = {};
  if (search) where.tagId = { contains: search.toUpperCase() };
  if (status) where.status = status;

  // Only allow sorting on known fields to prevent injection
  const allowedSort = ['tagId', 'status', 'createdAt', 'activatedAt'];
  const orderField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';

  const [tags, total] = await Promise.all([
    prisma.tag.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [orderField]: sortDir },
      include: {
        vehicle: {
          select: {
            registrationNumber: true,
            make: true,
            model: true,
            customer: { select: { fullName: true, mobile: true } },
          },
        },
      },
    }),
    prisma.tag.count({ where }),
  ]);

  return { tags, total };
}
