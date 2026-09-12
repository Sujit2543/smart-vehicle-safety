import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../../services/api';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { formatDate, daysUntil, expiryColorClass } from '../../utils/helpers';
import type { Vehicle } from '../../types';

const colorIcon = (color: string) => {
  if (color === 'GREEN') return <CheckCircle className="w-5 h-5 text-green-500" />;
  if (color === 'EXPIRED') return <XCircle className="w-5 h-5 text-red-600" />;
  if (color === 'RED') return <AlertTriangle className="w-5 h-5 text-red-500" />;
  return <Clock className="w-5 h-5 text-yellow-500" />;
};

export default function ExpiryPage() {
  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ['vehicles-mine'],
    queryFn: () => vehicleApi.mine().then(r => r.data.data),
  });

  if (isLoading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Expiry Tracker</h1>

      <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-center">
        {[
          { label: '>30 days', color: 'bg-green-100 text-green-700' },
          { label: '15–30 days', color: 'bg-yellow-100 text-yellow-700' },
          { label: '7–14 days', color: 'bg-orange-100 text-orange-700' },
          { label: '<7 days', color: 'bg-red-100 text-red-700' },
          { label: 'Expired', color: 'bg-red-700 text-white' },
        ].map(({ label, color }) => (
          <div key={label} className={`py-1 px-2 rounded-lg ${color}`}>{label}</div>
        ))}
      </div>

      {vehicles.map((vehicle) => (
        <Card key={vehicle.id}>
          <h3 className="font-bold text-gray-900 mb-3">{vehicle.registrationNumber} — {vehicle.make} {vehicle.model}</h3>
          <div className="space-y-3">
            <ExpiryRow
              label="Insurance"
              record={vehicle.insuranceRecord}
              icon={<Shield className="w-4 h-4 text-blue-500" />}
            />
            <ExpiryRow
              label="PUC Certificate"
              record={vehicle.pucRecord}
              icon={<Shield className="w-4 h-4 text-purple-500" />}
            />
          </div>
        </Card>
      ))}

      {vehicles.length === 0 && (
        <Card className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No vehicles to track</p>
        </Card>
      )}
    </div>
  );
}

function ExpiryRow({ label, record, icon }: { label: string; record?: { expiryDate: string; expiryColor: string } | null; icon: React.ReactNode }) {
  if (!record) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
        <div className="flex items-center gap-2">{icon}<span className="text-sm text-gray-700">{label}</span></div>
        <span className="text-xs text-gray-400">Not set</span>
      </div>
    );
  }

  const days = daysUntil(record.expiryDate);
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <p className="text-xs text-gray-400">{formatDate(record.expiryDate)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {colorIcon(record.expiryColor)}
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${expiryColorClass(record.expiryColor as any)}`}>
          {days <= 0 ? 'EXPIRED' : `${days} days`}
        </span>
      </div>
    </div>
  );
}
