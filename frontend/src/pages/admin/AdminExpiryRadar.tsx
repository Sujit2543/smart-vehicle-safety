import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { Radar, Shield } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { formatDate, expiryColorClass, daysUntil } from '../../utils/helpers';

export default function AdminExpiryRadar() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-expiry-radar'],
    queryFn: () => adminApi.expiryRadar().then(r => r.data.data),
  });

  if (isLoading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>;

  const ins = data?.insurance ?? {};
  const puc = data?.puc ?? {};

  const allInsurance = [
    ...(ins.in_7_days ?? []),
    ...(ins.in_15_days ?? []),
    ...(ins.in_30_days ?? []),
  ].filter((v, i, a) => a.findIndex((t: any) => t.id === v.id) === i);

  const allPUC = [
    ...(puc.in_7_days ?? []),
    ...(puc.in_15_days ?? []),
    ...(puc.in_30_days ?? []),
  ].filter((v, i, a) => a.findIndex((t: any) => t.id === v.id) === i);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Radar className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl font-bold text-gray-900">Expiry Radar</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[7, 15, 30].map(days => (
          <div key={days} className="text-center p-3 bg-white rounded-xl border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">
              {(ins[`in_${days}_days`] ?? []).length + (puc[`in_${days}_days`] ?? []).length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Expiring in {days} days</p>
          </div>
        ))}
      </div>

      <ExpirySection title="Insurance Expiring" icon={<Shield className="w-5 h-5 text-blue-600" />} records={allInsurance} type="insurance" />
      <ExpirySection title="PUC Expiring" icon={<Shield className="w-5 h-5 text-purple-600" />} records={allPUC} type="puc" />
    </div>
  );
}

function ExpirySection({ title, icon, records, type }: { title: string; icon: React.ReactNode; records: any[]; type: 'insurance' | 'puc' }) {
  if (records.length === 0) return (
    <Card>
      <div className="flex items-center gap-2 mb-2">{icon}<h3 className="font-semibold text-gray-900">{title}</h3></div>
      <p className="text-sm text-gray-400">No records expiring in the next 30 days.</p>
    </Card>
  );

  return (
    <Card padding={false}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="ml-auto text-sm text-gray-500">{records.length} vehicles</span>
      </div>
      <div className="divide-y divide-gray-100">
        {records.map((r: any) => {
          const expiry = type === 'insurance' ? r.expiryDate : r.expiryDate;
          const color = r.expiryColor;
          const days = daysUntil(expiry);
          return (
            <div key={r.id} className="px-4 py-3 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-sm">{r.vehicle?.registrationNumber}</p>
                <p className="text-xs text-gray-500">{r.vehicle?.customer?.fullName} • {r.vehicle?.customer?.mobile}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatDate(expiry)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${expiryColorClass(color)}`}>
                  {days <= 0 ? 'EXPIRED' : `${days}d remaining`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
