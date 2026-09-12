import { useQuery } from '@tanstack/react-query';
import { customerApi } from '../../services/api';
import { Shield, CheckCircle, AlertTriangle, XCircle, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate, daysUntil, expiryColorClass } from '../../utils/helpers';

function ExpiryRow({ label, record, editLink }: {
  label: string;
  record?: { expiryDate: string; expiryColor: string } | null;
  editLink: string;
}) {
  if (!record) return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
          <Shield className="w-4 h-4 text-gray-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-xs text-gray-400">Not set</p>
        </div>
      </div>
      <Link to={editLink} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
        Add <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );

  const days = daysUntil(record.expiryDate);
  const Icon = days <= 0 ? XCircle : days <= 7 ? AlertTriangle : days <= 30 ? Clock : CheckCircle;
  const iconColor = days <= 0 ? 'text-red-500' : days <= 7 ? 'text-red-400' : days <= 30 ? 'text-yellow-500' : 'text-green-500';

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${days <= 0 ? 'bg-red-100' : days <= 30 ? 'bg-yellow-100' : 'bg-green-100'}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          <p className="text-xs text-gray-500">{formatDate(record.expiryDate)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${expiryColorClass(record.expiryColor as any)}`}>
          {days <= 0 ? 'EXPIRED' : `${days}d left`}
        </span>
        <Link to={editLink} className="text-xs text-brand-600 hover:underline">
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function CustomerExpiryPage() {
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn: () => customerApi.getMyVehicles().then(r => r.data.data),
  });

  if (isLoading) return <div className="space-y-4">{[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />)}</div>;

  const COLOR_LEGEND = [
    { color: 'bg-green-500', label: 'Valid (> 30 days)' },
    { color: 'bg-yellow-400', label: '15–30 days' },
    { color: 'bg-orange-400', label: '7–14 days' },
    { color: 'bg-red-500', label: '< 7 days' },
    { color: 'bg-red-700', label: 'Expired' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Expiry Tracker</h1>
        <p className="text-sm text-gray-500 mt-0.5">Monitor your insurance and PUC validity</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {COLOR_LEGEND.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Per-vehicle rows */}
      {(vehicles as any[]).map(v => (
        <div key={v.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="font-bold text-gray-900 font-mono">{v.registrationNumber}</p>
            <p className="text-xs text-gray-500">{v.make} {v.model} · {v.color}</p>
          </div>
          <div className="px-4">
            <ExpiryRow label="Insurance" record={v.insuranceRecord} editLink="/customer/vehicle" />
            <ExpiryRow label="PUC Certificate" record={v.pucRecord} editLink="/customer/vehicle" />
          </div>
        </div>
      ))}

      {(vehicles as any[]).length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No vehicles registered yet.</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-1">🔔 Automatic Reminders</p>
        <p className="text-xs text-blue-700">
          You will receive WhatsApp and SMS reminders 30, 15, 7, 3, and 1 day before expiry.
          Make sure your mobile number is up to date in your profile.
        </p>
      </div>
    </div>
  );
}
