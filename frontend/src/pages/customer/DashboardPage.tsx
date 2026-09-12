import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { customerApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import {
  Car, Shield, FileText, Wrench, Bell, QrCode,
  ChevronRight, AlertTriangle, CheckCircle,
  Clock, XCircle, Tag, User, Phone
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatDate, daysUntil, expiryColorClass } from '../../utils/helpers';

// ── Expiry status helper ──────────────────────────────────────

function ExpiryBadge({ color, date }: { color: string; date: string }) {
  const days = daysUntil(date);
  const map: Record<string, string> = {
    GREEN:   'bg-green-100 text-green-700',
    YELLOW:  'bg-yellow-100 text-yellow-700',
    ORANGE:  'bg-orange-100 text-orange-700',
    RED:     'bg-red-100 text-red-700',
    EXPIRED: 'bg-red-200 text-red-800',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[color] ?? 'bg-gray-100 text-gray-600'}`}>
      {color === 'EXPIRED' ? 'Expired' : days <= 30 ? `${days}d left` : formatDate(date)}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-48 bg-gray-200 rounded" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="h-48 bg-gray-200 rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-32 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

export default function CustomerDashboardPage() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  const appBase   = import.meta.env.VITE_APP_BASE_URL ?? 'http://localhost:3000';

  const { data: customer, isLoading, error: customerError } = useQuery({
    queryKey: ['customer-me'],
    queryFn:  () => customerApi.getMe().then(r => r.data.data),
    retry: false, // don't retry on 404
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn:  () => customerApi.getMyVehicles().then(r => r.data.data).catch(() => []),
    retry: false,
  });

  if (isLoading || loadingVehicles) return <DashboardSkeleton />;

  // New user — no customer profile yet, show onboarding state
  const firstName = customer?.fullName?.split(' ')[0] ?? user?.mobile ?? 'there';

  const primary      = vehicles[0];
  const insurance    = primary?.insuranceRecord;
  const puc          = primary?.pucRecord;
  const tag          = primary?.tag;
  const emergency    = primary?.emergencyContacts?.[0];
  const tagUrl       = tag?.tagId ? `${appBase}/tag/${tag.tagId}` : null;

  return (
    <div className="space-y-5">
      {/* ── Welcome header ──────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's your vehicle safety overview</p>
        </div>
        <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
          {firstName[0]?.toUpperCase() ?? 'U'}
        </div>
      </div>

      {/* ── No vehicle yet ──────────────────────────────── */}
      {vehicles.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center space-y-4">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <QrCode className="w-7 h-7 text-gray-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-700">No vehicle registered yet</h3>
            <p className="text-sm text-gray-500 mt-1">
              Scan your physical Car Deal Safety Tag QR code to activate and register your vehicle.
            </p>
          </div>
          <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg px-3 py-2 inline-block">
            Open: {appBase}/tag/CD-XXXX
          </p>
        </div>
      )}

      {/* ── Primary vehicle card ─────────────────────────── */}
      {primary && (
        <>
          {/* Vehicle + QR row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Vehicle info — 2 cols */}
            <div
              className="sm:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/customer/vehicle')}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold font-mono text-gray-900 tracking-widest">
                      {primary.registrationNumber}
                    </p>
                    {tag && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        tag.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {tag.status}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mt-0.5">
                    {primary.make} {primary.model} · {primary.color} · {primary.fuelType}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
              </div>

              {/* Expiry row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Insurance</p>
                  {insurance ? (
                    <>
                      <p className="text-sm font-semibold text-gray-900">{formatDate(insurance.expiryDate)}</p>
                      <ExpiryBadge color={insurance.expiryColor} date={insurance.expiryDate} />
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">Not set</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">PUC</p>
                  {puc ? (
                    <>
                      <p className="text-sm font-semibold text-gray-900">{formatDate(puc.expiryDate)}</p>
                      <ExpiryBadge color={puc.expiryColor} date={puc.expiryDate} />
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">Not set</p>
                  )}
                </div>
              </div>
            </div>

            {/* QR Code — 1 col */}
            {tagUrl ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col items-center justify-center gap-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Safety Tag QR</p>
                <div className="p-2 border-2 border-dashed border-gray-200 rounded-xl">
                  <QRCodeSVG value={tagUrl} size={110} level="H" includeMargin />
                </div>
                <p className="font-mono font-bold text-brand-600 text-sm">{tag?.tagId}</p>
                <p className="text-xs text-gray-400 text-center">Keep this on your vehicle</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-4 flex flex-col items-center justify-center gap-2">
                <QrCode className="w-10 h-10 text-gray-300" />
                <p className="text-xs text-gray-400 text-center">No tag linked yet</p>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Tag Status', icon: Tag,
                value: tag?.status ?? '—',
                color: tag?.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-400',
                bg: 'bg-green-50',
              },
              {
                label: 'Documents', icon: FileText,
                value: `${primary._count?.documents ?? 0} uploaded`,
                color: 'text-purple-600', bg: 'bg-purple-50',
              },
              {
                label: 'Maintenance', icon: Wrench,
                value: `${primary._count?.maintenanceRecords ?? 0} records`,
                color: 'text-orange-600', bg: 'bg-orange-50',
              },
              {
                label: 'Emergency', icon: Phone,
                value: emergency ? emergency.name : 'Not set',
                color: 'text-red-600', bg: 'bg-red-50',
              },
            ].map(({ label, icon: Icon, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-3 border border-white`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                </div>
                <p className={`text-sm font-semibold ${color} truncate`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Emergency contact card */}
          {emergency && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Emergency Contact
                </h3>
                <Link to="/customer/vehicle" className="text-xs text-brand-600 hover:underline">Edit</Link>
              </div>
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-orange-700 text-sm">{emergency.name[0]}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{emergency.name}</p>
                  <p className="text-xs text-gray-500">+91 {emergency.mobile} · {emergency.relationship}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Quick Actions ────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/customer/vehicle',   icon: Car,        label: 'Vehicle',    sub: 'Details & edit',    color: 'text-brand-600 bg-brand-50' },
            { to: '/customer/documents', icon: FileText,   label: 'Documents',  sub: 'RC, Insurance, PUC', color: 'text-purple-600 bg-purple-50' },
            { to: '/customer/maintenance', icon: Wrench,   label: 'Maintenance', sub: 'Service history',  color: 'text-orange-600 bg-orange-50' },
            { to: '/customer/expiry',    icon: Shield,     label: 'Expiry',     sub: 'Renewal alerts',    color: 'text-green-600 bg-green-50' },
          ].map(({ to, icon: Icon, label, sub, color }) => (
            <Link key={to} to={to}>
              <div className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all text-center">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Multiple vehicles ────────────────────────────── */}
      {vehicles.length > 1 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">All Vehicles</h2>
          <div className="space-y-2">
            {(vehicles as any[]).slice(1).map((v: any) => (
              <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Car className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 font-mono">{v.registrationNumber}</p>
                  <p className="text-xs text-gray-500">{v.make} {v.model} · {v.color}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                  v.tag?.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {v.tag?.status ?? 'No tag'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
