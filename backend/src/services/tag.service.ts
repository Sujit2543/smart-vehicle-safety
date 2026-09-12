import QRCode from 'qrcode';
import archiver from 'archiver';
import PDFDocument from 'pdfkit';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { ConflictError, NotFoundError, AppError } from '../utils/errors';
import { writeAuditLog } from '../middlewares/auditLogger';
import { TagStatus } from '@prisma/client';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface BulkGenerateOptions {
  quantity: number;      // 1 – 10000
  prefix: string;        // e.g. "CD"
  startNumber: number;   // e.g. 1001
}

export interface GenerateResult {
  tagIds: string[];
  count: number;
  prefix: string;
  startNumber: number;
  endNumber: number;
}

// ─────────────────────────────────────────────────────────────
// TAG ID GENERATION
// ─────────────────────────────────────────────────────────────

/**
 * Generate tags with explicit prefix + startNumber.
 * Falls back to env defaults when not provided.
 */
export async function bulkGenerateTags(
  options: BulkGenerateOptions,
  adminUserId: string,
  ip?: string
): Promise<GenerateResult> {
  const { quantity, prefix, startNumber } = options;

  if (quantity < 1 || quantity > 10000) {
    throw new AppError('Quantity must be between 1 and 10,000', 400);
  }
  if (!prefix.match(/^[A-Z0-9]{1,5}$/)) {
    throw new AppError('Prefix must be 1–5 uppercase letters/numbers', 400);
  }

  // Build candidate IDs
  const padLen = Math.max(4, String(startNumber + quantity - 1).length);
  const tagIds: string[] = Array.from({ length: quantity }, (_, i) =>
    `${prefix}-${String(startNumber + i).padStart(padLen, '0')}`
  );

  // Check for duplicates in DB
  const existing = await prisma.tag.findMany({
    where: { tagId: { in: tagIds } },
    select: { tagId: true },
  });
  if (existing.length > 0) {
    throw new ConflictError(
      `${existing.length} tag ID(s) already exist. ` +
      `First conflict: ${existing[0].tagId}. ` +
      `Try a different starting number.`
    );
  }

  // Build QR URLs for every tag
  const tagData = tagIds.map((tagId) => ({
    tagId,
    qrCodeUrl: `${env.BASE_URL}/tag/${tagId}`,
    status: TagStatus.UNASSIGNED,
  }));

  // Batch insert in transaction
  await prisma.$transaction(async (tx) => {
    await tx.tag.createMany({ data: tagData });
    // Record in audit log via TagActivation
    await tx.tagActivation.createMany({
      data: tagIds.map((tagId) => ({
        tagId,
        action: 'CREATED',
        performedBy: adminUserId,
        metadata: { bulkGenerated: true, prefix, startNumber, quantity },
      })),
    });
  });

  await writeAuditLog({
    userId: adminUserId,
    userRole: 'ADMIN',
    action: 'TAGS_BULK_GENERATED',
    entity: 'Tag',
    ipAddress: ip,
    metadata: { quantity, prefix, startNumber, endNumber: startNumber + quantity - 1 },
  });

  return {
    tagIds,
    count: tagIds.length,
    prefix,
    startNumber,
    endNumber: startNumber + quantity - 1,
  };
}

/**
 * Legacy helper used by old endpoint — wraps bulkGenerateTags with env defaults.
 */
export async function generateTagIds(count: number): Promise<string[]> {
  const last = await prisma.tag.findFirst({
    where: { tagId: { startsWith: `${env.TAG_ID_PREFIX}-` } },
    orderBy: { createdAt: 'desc' },
  });

  let nextNum = env.TAG_ID_START;
  if (last) {
    const parts = last.tagId.split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num)) nextNum = num + 1;
  }

  const result = await bulkGenerateTags(
    { quantity: count, prefix: env.TAG_ID_PREFIX, startNumber: nextNum },
    'system'
  );
  return result.tagIds;
}

// ─────────────────────────────────────────────────────────────
// QR CODE GENERATION
// ─────────────────────────────────────────────────────────────

export async function generateQRCode(tagId: string): Promise<Buffer> {
  const url = `${env.BASE_URL}/tag/${tagId}`;
  const buf = await QRCode.toBuffer(url, {
    errorCorrectionLevel: 'H',
    type: 'png',
    width: 400,
    margin: 2,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  });
  return buf;
}

export async function generateQRDataUrl(tagId: string): Promise<string> {
  const url = `${env.BASE_URL}/tag/${tagId}`;
  return QRCode.toDataURL(url, { errorCorrectionLevel: 'H', width: 300, margin: 2 });
}

// ─────────────────────────────────────────────────────────────
// BULK ZIP DOWNLOAD
// ─────────────────────────────────────────────────────────────

export async function buildQrZip(
  tagIds: string[],
  outputStream: NodeJS.WritableStream
): Promise<void> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', reject);
    archive.on('finish', resolve);
    archive.pipe(outputStream);

    // Process sequentially to avoid memory spikes
    const processNext = async (idx: number) => {
      if (idx >= tagIds.length) {
        archive.finalize();
        return;
      }
      const buf = await generateQRCode(tagIds[idx]);
      archive.append(buf as any, { name: `${tagIds[idx]}.png` });
      processNext(idx + 1);
    };
    processNext(0);
  });
}

// ─────────────────────────────────────────────────────────────
// PDF GENERATION  (printable QR sticker sheets)
// ─────────────────────────────────────────────────────────────

const PAGE_W  = 595.28;  // A4 width  (pts)
const PAGE_H  = 841.89;  // A4 height (pts)
const COLS    = 3;
const ROWS    = 4;
const MARGIN  = 30;
const CELL_W  = (PAGE_W - MARGIN * 2) / COLS;
const CELL_H  = (PAGE_H - MARGIN * 2) / ROWS;
const QR_SIZE = 120;

export async function buildQrPdf(
  tagIds: string[],
  outputStream: NodeJS.WritableStream
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
    doc.on('error', reject);
    doc.on('finish', resolve);
    doc.pipe(outputStream);

    const renderTag = async (tagId: string, idx: number) => {
      const pageIdx = Math.floor(idx / (COLS * ROWS));
      const posOnPage = idx % (COLS * ROWS);
      const col = posOnPage % COLS;
      const row = Math.floor(posOnPage / COLS);

      // New page when needed
      if (posOnPage === 0 && idx > 0) {
        doc.addPage();
      }

      const x = MARGIN + col * CELL_W;
      const y = MARGIN + row * CELL_H;
      const cx = x + CELL_W / 2;

      // Cell border
      doc
        .rect(x, y, CELL_W, CELL_H)
        .stroke('#e5e7eb');

      // App name header
      doc
        .fontSize(7)
        .fillColor('#6b7280')
        .text('CAR DEAL SAFETY TAG', x, y + 8, { width: CELL_W, align: 'center' });

      // QR Code
      const qrBuf = await generateQRCode(tagId);
      const qrX = cx - QR_SIZE / 2;
      const qrY = y + 20;
      doc.image(qrBuf, qrX, qrY, { width: QR_SIZE, height: QR_SIZE });

      // Tag ID below QR
      doc
        .fontSize(12)
        .fillColor('#1f2937')
        .font('Helvetica-Bold')
        .text(tagId, x, qrY + QR_SIZE + 6, { width: CELL_W, align: 'center' });

      // Scan instruction
      doc
        .fontSize(6.5)
        .fillColor('#9ca3af')
        .font('Helvetica')
        .text('Scan for emergency assistance', x, qrY + QR_SIZE + 22, {
          width: CELL_W,
          align: 'center',
        });

      // URL below
      const tagUrl = `${env.BASE_URL}/tag/${tagId}`;
      doc
        .fontSize(5.5)
        .fillColor('#d1d5db')
        .text(tagUrl, x, qrY + QR_SIZE + 33, { width: CELL_W, align: 'center' });
    };

    const processAll = async () => {
      for (let i = 0; i < tagIds.length; i++) {
        await renderTag(tagIds[i], i);
      }
      doc.end();
    };
    processAll().catch(reject);
  });
}

// ─────────────────────────────────────────────────────────────
// TAG DETAIL
// ─────────────────────────────────────────────────────────────

export async function getTagDetail(tagId: string) {
  const tag = await prisma.tag.findUnique({
    where: { tagId },
    include: {
      vehicle: {
        include: {
          customer: {
            select: { id: true, fullName: true, mobile: true, email: true, city: true },
          },
        },
      },
      activations: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!tag) throw new NotFoundError(`Tag ${tagId} not found`);

  // Scan counts
  const [totalScans, lastScan] = await Promise.all([
    prisma.scanLog.count({ where: { tagId } }),
    prisma.scanLog.findFirst({ where: { tagId }, orderBy: { scannedAt: 'desc' } }),
  ]);

  return { ...tag, totalScans, lastScan };
}

// ─────────────────────────────────────────────────────────────
// TAG SCAN  (public page)
// ─────────────────────────────────────────────────────────────

export async function getTagForScan(tagId: string) {
  const tag = await prisma.tag.findUnique({
    where: { tagId },
    include: {
      vehicle: {
        include: {
          customer: { select: { fullName: true, mobile: true } },
          emergencyContacts: { where: { isPrimary: true }, take: 1 },
          insuranceRecord:   { select: { expiryDate: true, expiryColor: true } },
          pucRecord:         { select: { expiryDate: true, expiryColor: true } },
        },
      },
    },
  });
  if (!tag) throw new NotFoundError('Tag not found');
  return tag;
}

// ─────────────────────────────────────────────────────────────
// STATUS CHANGE  (admin)
// ─────────────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  UNASSIGNED: [],                          // Only activation flow can change this
  ACTIVE:     ['INACTIVE', 'BLOCKED'],
  INACTIVE:   ['ACTIVE'],
  BLOCKED:    [],                          // Only SUPER_ADMIN can unblock via explicit endpoint
  EXPIRED:    [],
};

export async function changeTagStatus(
  tagId: string,
  newStatus: TagStatus,
  adminUserId: string,
  reason?: string,
  ip?: string,
  isSuperAdmin = false
): Promise<void> {
  const tag = await prisma.tag.findUnique({ where: { tagId } });
  if (!tag) throw new NotFoundError(`Tag ${tagId} not found`);

  const allowed = ALLOWED_TRANSITIONS[tag.status] ?? [];
  const canUnblockBlocked = isSuperAdmin && tag.status === 'BLOCKED' && newStatus === TagStatus.INACTIVE;

  if (!allowed.includes(newStatus) && !canUnblockBlocked) {
    throw new AppError(
      `Cannot change status from ${tag.status} to ${newStatus}. ` +
      (allowed.length ? `Allowed: ${allowed.join(', ')}` : 'No transitions allowed from this state.'),
      400
    );
  }

  const updateData: any = { status: newStatus, updatedAt: new Date() };
  if (newStatus === TagStatus.BLOCKED)  { updateData.blockedAt = new Date(); updateData.blockReason = reason ?? null; }
  if (newStatus === TagStatus.INACTIVE) { updateData.deactivatedAt = new Date(); }
  if (newStatus === TagStatus.ACTIVE && tag.status === TagStatus.INACTIVE) { updateData.deactivatedAt = null; }

  await prisma.$transaction([
    prisma.tag.update({ where: { tagId }, data: updateData }),
    prisma.tagActivation.create({
      data: {
        tagId,
        action: newStatus,
        performedBy: adminUserId,
        reason,
        metadata: { previousStatus: tag.status } as any,
      },
    }),
  ]);

  await writeAuditLog({
    userId: adminUserId,
    userRole: isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN',
    action: `TAG_${newStatus}`,
    entity: 'Tag',
    entityId: tagId,
    ipAddress: ip,
    metadata: { previousStatus: tag.status, reason },
  });
}

// ─────────────────────────────────────────────────────────────
// SCAN LOG
// ─────────────────────────────────────────────────────────────

export async function recordScan(params: {
  tagId: string;
  vehicleId?: string;
  scanType?: 'QR' | 'NFC';
  purpose?: 'ACTIVATION' | 'PUBLIC_VIEW' | 'DOCUMENT_ACCESS' | 'ADMIN_VIEW';
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await prisma.scanLog
    .create({
      data: {
        tagId:     params.tagId,
        vehicleId: params.vehicleId,
        scanType:  params.scanType  ?? 'QR',
        purpose:   params.purpose   ?? 'PUBLIC_VIEW',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })
    .catch(() => {}); // Non-blocking
}
