import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { useState } from 'react';
import { BarChart2, QrCode, Wifi } from 'lucide-react';
import { Card, StatCard } from '../../components/ui/Card';
import { Table, Pagination } from '../../components/ui/Table';
import { formatDateTime } from '../../utils/helpers';
import type { ScanLog, ScanAnalytics } from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

export default function AdminScans() {
  const [page, setPage] = useState(1);

  const { data: analytics } = useQuery<ScanAnalytics>({
    queryKey: ['admin-scan-analytics'],
    queryFn: () => adminApi.scanAnalytics().then(r => r.data.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-scans', page],
    queryFn: () => adminApi.scans({ page, limit: 30 }).then(r => r.data),
  });

  const scans: ScanLog[] = data?.data ?? [];
  const pagination = data?.pagination;

  const barData = [
    { name: 'Today', value: analytics?.today ?? 0 },
    { name: 'Week', value: analytics?.thisWeek ?? 0 },
    { name: 'Month', value: analytics?.thisMonth ?? 0 },
  ];

  const typeData = [
    { name: 'QR', value: analytics?.qrScans ?? 0 },
    { name: 'NFC', value: analytics?.nfcScans ?? 0 },
    { name: 'Activation', value: analytics?.activationScans ?? 0 },
  ];

  const columns = [
    { header: 'Tag ID', render: (s: ScanLog) => <span className="font-mono font-bold text-brand-600">{s.tagId}</span> },
    { header: 'Type', render: (s: ScanLog) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.scanType === 'NFC' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{s.scanType}</span>
    )},
    { header: 'Purpose', render: (s: ScanLog) => <span className="text-xs text-gray-500">{s.purpose?.replace('_',' ')}</span> },
    { header: 'IP', render: (s: ScanLog) => <span className="text-xs text-gray-400 font-mono">{s.ipAddress ?? '—'}</span> },
    { header: 'Device', render: (s: ScanLog) => <span className="text-xs text-gray-400 truncate max-w-xs block">{s.userAgent ? s.userAgent.slice(0, 40) + '...' : '—'}</span> },
    { header: 'Scanned At', render: (s: ScanLog) => <span className="text-xs text-gray-400">{formatDateTime(s.scannedAt)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl font-bold text-gray-900">Scan Analytics</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard title="Today" value={analytics?.today ?? 0} icon={<BarChart2 className="w-5 h-5 text-brand-600" />} iconBg="bg-brand-100" />
        <StatCard title="This Week" value={analytics?.thisWeek ?? 0} icon={<BarChart2 className="w-5 h-5 text-green-600" />} iconBg="bg-green-100" />
        <StatCard title="This Month" value={analytics?.thisMonth ?? 0} icon={<BarChart2 className="w-5 h-5 text-purple-600" />} iconBg="bg-purple-100" />
        <StatCard title="QR Scans" value={analytics?.qrScans ?? 0} icon={<QrCode className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-100" />
        <StatCard title="NFC Scans" value={analytics?.nfcScans ?? 0} icon={<Wifi className="w-5 h-5 text-purple-600" />} iconBg="bg-purple-100" />
        <StatCard title="Activations" value={analytics?.activationScans ?? 0} icon={<BarChart2 className="w-5 h-5 text-teal-600" />} iconBg="bg-teal-100" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">Scan Volume</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">By Type</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={typeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {typeData.map((_, i) => <Cell key={i} fill={['#3b82f6','#8b5cf6','#22c55e'][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card padding={false}>
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-900">Recent Scans</div>
        <Table columns={columns} data={scans} keyExtractor={s => s.id} loading={isLoading} />
        {pagination && <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />}
      </Card>
    </div>
  );
}
