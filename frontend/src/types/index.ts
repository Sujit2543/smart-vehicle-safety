// ─── Core enums ──────────────────────────────────────────────

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';
export type TagStatus = 'UNASSIGNED' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'EXPIRED';
export type ScanType = 'QR' | 'NFC';
export type SOSStatus = 'TRIGGERED' | 'NOTIFIED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED';
export type DocumentType = 'RC' | 'INSURANCE' | 'PUC' | 'OTHER';
export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
export type NotificationChannel = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'PUSH';
export type ExpiryColor = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'EXPIRED';
export type FuelType = 'PETROL' | 'DIESEL' | 'CNG' | 'ELECTRIC' | 'HYBRID' | 'LPG';
export type VehicleType = 'TWO_WHEELER' | 'THREE_WHEELER' | 'CAR' | 'SUV' | 'MUV' | 'TRUCK' | 'BUS' | 'COMMERCIAL' | 'OTHER';
export type CallStatus = 'INITIATED' | 'RINGING' | 'CONNECTED' | 'COMPLETED' | 'FAILED' | 'MISSED';

// ─── User ──────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  role: UserRole;
  mobile?: string | null;
  email?: string | null;
  isNewUser: boolean;
  customerId?: string | null;
}

// ─── Customer ─────────────────────────────────────────────

export interface Customer {
  id: string;
  userId: string;
  fullName: string;
  mobile: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  isActive: boolean;
  createdAt: string;
  vehicles?: Vehicle[];
}

// ─── Vehicle ─────────────────────────────────────────────

export interface Vehicle {
  id: string;
  customerId: string;
  registrationNumber: string;
  vehicleType: VehicleType;
  make: string;
  model: string;
  color: string;
  manufacturingYear: number;
  fuelType: FuelType;
  isActive: boolean;
  createdAt: string;
  tag?: Tag;
  insuranceRecord?: InsuranceRecord;
  pucRecord?: PUCRecord;
  customer?: Pick<Customer, 'fullName' | 'mobile'>;
}

// ─── Tag ──────────────────────────────────────────────────

export interface Tag {
  id: string;
  tagId: string;
  status: TagStatus;
  vehicleId?: string;
  activatedAt?: string;
  createdAt: string;
  vehicle?: Vehicle;
}

// ─── Document ─────────────────────────────────────────────

export interface Document {
  id: string;
  vehicleId: string;
  type: DocumentType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

// ─── Insurance ────────────────────────────────────────────

export interface InsuranceRecord {
  id: string;
  vehicleId: string;
  policyNumber?: string;
  provider?: string;
  startDate?: string;
  expiryDate: string;
  premiumAmount?: number;
  expiryColor: ExpiryColor;
}

// ─── PUC ──────────────────────────────────────────────────

export interface PUCRecord {
  id: string;
  vehicleId: string;
  certificateNo?: string;
  testCenter?: string;
  testDate?: string;
  expiryDate: string;
  expiryColor: ExpiryColor;
}

// ─── Maintenance ──────────────────────────────────────────

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  serviceDate: string;
  odometer?: number;
  serviceType: string;
  cost?: number;
  serviceCenter?: string;
  notes?: string;
  createdAt: string;
}

// ─── SOS ──────────────────────────────────────────────────

export interface SOSEvent {
  id: string;
  tagId: string;
  vehicleId: string;
  latitude?: number;
  longitude?: number;
  mapLink?: string;
  status: SOSStatus;
  triggeredAt: string;
  notifiedAt?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  vehicle?: { registrationNumber: string; make: string; model: string; customer?: { fullName: string; mobile: string } };
}

// ─── Notification ─────────────────────────────────────────

export interface NotificationLog {
  id: string;
  channel: NotificationChannel;
  event: string;
  recipient: string;
  body: string;
  status: NotificationStatus;
  retryCount: number;
  sentAt?: string;
  createdAt: string;
}

// ─── Audit ────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  userId?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user?: { mobile?: string; email?: string; role?: string };
}

// ─── Scan ─────────────────────────────────────────────────

export interface ScanLog {
  id: string;
  tagId: string;
  scanType: ScanType;
  purpose: string;
  ipAddress?: string;
  userAgent?: string;
  scannedAt: string;
}

// ─── API Response ─────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ─── Dashboard stats ─────────────────────────────────────

export interface DashboardStats {
  totalTags: number;
  unassignedTags: number;
  activeTags: number;
  inactiveTags: number;
  blockedTags: number;
  totalCustomers: number;
  totalVehicles: number;
  insuranceExpiring: number;
  pucExpiring: number;
  sosToday: number;
  unresolvedSOS: number;
  totalScans: number;
  dailyScans: Array<{ date: string; count: number }>;
}

export interface ScanAnalytics {
  today: number;
  thisWeek: number;
  thisMonth: number;
  qrScans: number;
  nfcScans: number;
  activationScans: number;
}
