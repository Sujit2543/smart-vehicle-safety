import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, notificationApi } from '../../services/api';
import { useState } from 'react';
import { RefreshCw, Bell } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Table, Pagination } from '../../components/ui/Table';
import { formatDateTime, notifStatusColor } from '../../utils/helpers';
import type { NotificationLog } from '../../types';
import toast from 'react-hot-toast';

const STATUS_OPTS = [
  { value: '', label: 'All' },
  ...['PENDING','SENT','DELIVERED','FAILED'].map(s => ({ value: s, label: s })),
];

export default function AdminNotifications() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifs', page, status],
    queryFn: () => adminApi.notifications({ page, limit: 30, status: status || undefined }).then(r => r.data),
  });

  const retryMut = useMutation({
    mutationFn: (id: string) => notificationApi.retry(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-notifs'] }); toast.success('Retry queued'); },
  });

  const logs: NotificationLog[] = data?.data ?? [];
  const pagination = data?.pagination;

  const columns = [
    { header: 'Channel', render: (n: NotificationLog) => <span className="font-medium text-sm">{n.channel}</span> },
    { header: 'Event', render: (n: NotificationLog) => <span className="text-xs text-gray-500">{n.event.replace(/_/g,' ')}</span> },
    { header: 'Recipient', render: (n: NotificationLog) => <span className="font-mono text-sm">{n.recipient}</span> },
    {
      header: 'Status',
      render: (n: NotificationLog) => (
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${notifStatusColor(n.status)}`}>{n.status}</span>
      ),
    },
    { header: 'Retries', render: (n: NotificationLog) => <span className="text-gray-500 text-sm">{n.retryCount}</span> },
    { header: 'Sent At', render: (n: NotificationLog) => <span className="text-xs text-gray-400">{n.sentAt ? formatDateTime(n.sentAt) : '—'}</span> },
    { header: 'Created', render: (n: NotificationLog) => <span className="text-xs text-gray-400">{formatDateTime(n.createdAt)}</span> },
    {
      header: '',
      render: (n: NotificationLog) => n.status === 'FAILED' ? (
        <button onClick={() => retryMut.mutate(n.id)} className="flex items-center gap-1 px-2 py-1 bg-brand-100 text-brand-700 rounded-lg text-xs hover:bg-brand-200 transition-colors">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Bell className="w-5 h-5 text-brand-600" /><h1 className="text-2xl font-bold text-gray-900">Notifications</h1></div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <Card padding={false}>
        <Table columns={columns} data={logs} keyExtractor={n => n.id} loading={isLoading} />
        {pagination && <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />}
      </Card>
    </div>
  );
}
