import { useQuery } from '@tanstack/react-query';
import { customerApi, vehicleApi } from '../../services/api';
import { Link } from 'react-router-dom';
import { Car, Shield, Bell, Wrench, AlertTriangle, ChevronRight, Tag, QrCode } from 'lucide-react';
import { Card, StatCard } from '../../components/ui/Card';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { formatDate, expiryColorClass, daysUntil } from '../../utils/helpers';
import type { Vehicle } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '../../stores/authStore';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const appBase = import.meta.env.VITE_APP_BASE_URL ?? 'http://localhost:3000';

  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ['customer-me'],
    queryFn: () => customerApi.getMe().then(r => r.data.data),
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ['vehicles-mine'],
    queryFn: () => vehicleApi.mine().then(r => r.data.data),
  });

  const primaryVehicle = vehicles[0];
  const insurance = primaryVehicle?.insuranceRecord;
  const puc = primaryVehicle?.pucRecord;

  if (loadingCustomer || loadingVehicles) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Welcome, {customer?.fullName ?? 'Vehicle Owner'} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's your vehicle safety overview</p>
        </div>
      </div>

      {/* No vehicles yet */}
      {vehicles.length === 0 && (
        <Card className="text-center py-12">
          <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700">No vehicles yet</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">Scan your safety tag QR code to activate your first vehicle.</p>
        </Card>
      )}

      {/* Primary Vehicle Card */}
      {primaryVehicle && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Link to={`/vehicles/${primaryVehicle.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 tracking-wide">{primaryVehicle.registrationNumber}</div>
                    <div className="text-gray-500 text-sm">{primaryVehicle.make} {primaryVehicle.model} • {primaryVehicle.color}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${primaryVehicle.tag?.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {primaryVehicle.tag?.status ?? 'NO TAG'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ExpiryCard label="Insurance" record={insurance} />
                  <ExpiryCard label="PUC" record={puc} />
                </div>
                <div className="flex items-center gap-1 mt-3 text-sm text-brand-600 font-medium">
                  View Details <ChevronRight className="w-4 h-4" />
                </div>
              </Card>
            </Link>
          </div>

          {/* QR Code */}
          {primaryVehicle.tag?.tagId && (
            <Card className="flex flex-col items-center justify-center gap-3">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Your Safety Tag</p>
              <div className="p-3 border-2 border-dashed border-gray-200 rounded-xl">
                <QRCodeSVG
                  value={`${appBase}/tag/${primaryVehicle.tag.tagId}`}
                  size={120}
                  level="H"
                  includeMargin
                />
              </div>
              <p className="font-mono font-bold text-brand-600 text-lg">{primaryVehicle.tag.tagId}</p>
              <p className="text-xs text-gray-400">Keep this on your vehicle</p>
            </Card>
          )}
        </div>
      )}

      {/* Stats */}
      {vehicles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Vehicles" value={vehicles.length} icon={<Car className="w-5 h-5 text-brand-600" />} iconBg="bg-brand-100" />
          <StatCard title="Active Tags" value={vehicles.filter(v => v.tag?.status === 'ACTIVE').length} icon={<Tag className="w-5 h-5 text-green-600" />} iconBg="bg-green-100" />
          <StatCard title="Insurance" value={insurance ? `${daysUntil(insurance.expiryDate)}d` : '—'} icon={<Shield className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-100" sub="days remaining" />
          <StatCard title="PUC" value={puc ? `${daysUntil(puc.expiryDate)}d` : '—'} icon={<Shield className="w-5 h-5 text-purple-600" />} iconBg="bg-purple-100" sub="days remaining" />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/vehicles', icon: Car, label: 'My Vehicles', color: 'text-brand-600 bg-brand-50' },
          { to: '/documents', icon: Shield, label: 'Documents', color: 'text-purple-600 bg-purple-50' },
          { to: '/maintenance', icon: Wrench, label: 'Maintenance', color: 'text-orange-600 bg-orange-50' },
          { to: '/notifications', icon: Bell, label: 'Alerts', color: 'text-green-600 bg-green-50' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to}>
            <Card className="hover:shadow-md transition-all text-center py-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-gray-700">{label}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ExpiryCard({ label, record }: { label: string; record?: { expiryDate: string; expiryColor: string } | null }) {
  if (!record) return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-400 mt-0.5">Not set</p>
    </div>
  );
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatDate(record.expiryDate)}</p>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${expiryColorClass(record.expiryColor as any)}`}>
        {record.expiryColor}
      </span>
    </div>
  );
}
