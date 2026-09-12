import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { sosApi } from '../../services/api';
import { useState } from 'react';
import { AlertTriangle, MapPin, CheckCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Table, Pagination } from '../../components/ui/Table';
import { formatDateTime, sosStatusColor } from '../../utils/helpers';
import type { SOSEvent } from '../../types';
import toast from 'react-hot-toast';

const STATUS_OPTS = [
  { value: '', label: 'All' },
  ...['TRIGGERED','NOTIFIED','ACKNOWLEDGED','RESOLVED','CANCELLED'].map(s => ({ value: s, label: s })),
];

export default function AdminSOSPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sos', page, status],
    queryFn: () => adminApi.sos({ page, limit: 20, status: status || undefined }).then(r => r.data),
    refetchInterval: 30000,
  });

  const events: SOSEvent[] = data?.data ?? [];
  const pagination = data?.pagination;

  const resolveMut = useMutation({
    mutationFn: (id: string) => sosApi.resolve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-sos'] }); toast.success('SOS resolved'); },
  });

  const columns = [
    {
      header: 'Vehicle',
      render: (s: SOSEvent) => (
        <div>
          <div className="font-bold">{s.vehicle?.registrationNumber}</div>
          <div className="text-xs text-gray-400">{s.vehicle?.customer?.fullName}</div>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (s: SOSEvent) => (
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${sosStatusColor(s.status)}`}>{s.status}</span>
      ),
    },
    { header: 'Triggered', render: (s: SOSEvent) => <span className="text-xs text-gray-500">{formatDateTime(s.triggeredAt)}</span> },
    {
      header: 'Location',
      render: (s: SOSEvent) => s.mapLink ? (
        <a href={s.mapLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand-600 text-xs hover:underline">
          <MapPin className="w-3 h-3" /> View Map
        </a>
      ) : <span className="text-gray-400 text-xs">No location</span>,
    },
    { header: 'Owner', render: (s: SOSEvent) => <span className="text-sm">{s.vehicle?.customer?.mobile ?? '—'}</span> },
    {
      header: 'Actions',
      render: (s: SOSEvent) => ['TRIGGERED','NOTIFIED','ACKNOWLEDGED'].includes(s.status) ? (
        <button onClick={() => resolveMut.mutate(s.id)}
          className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors">
          <CheckCircle className="w-3 h-3" /> Resolve
        </button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900">SOS Events</h1>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-gray-400">Auto-refreshes every 30s</span>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <Card padding={false}>
        <Table columns={columns} data={events} keyExtractor={s => s.id} loading={isLoading} emptyMessage="No SOS events" />
        {pagination && <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />}
      </Card>
    </div>
  );
}
