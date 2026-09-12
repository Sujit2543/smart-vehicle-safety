import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, notificationApi } from '../../services/api';
import { useState } from 'react';
import { MessageSquare, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, StatCard } from '../../components/ui/Card';
import { Table, Pagination } from '../../components/ui/Table';
import { formatDateTime, notifStatusColor } from '../../utils/helpers';
import type { NotificationLog } from '../../types';
import toast from 'react-hot-toast';

export default function AdminWhatsApp() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-whatsapp', page],
    queryFn: () => adminApi.notifications({ page, limit: 30, channel: 'WHATSAPP' }).then(r => r.data),
  });

  const logs: NotificationLog[] = data?.data ?? [];
  const pagination = data?.pagination;

  const totalSent = logs.filter(l => l.status === 'SENT' || l.status === 'DELIVERED').length;
  const totalFailed = logs.filter(l => l.status === 'FAILED').length;
  const totalPending = logs.filter(l => l.status === 'PENDING').length;

  const retryMut = useMutation({
    mutationFn: (id: string) => notificationApi.retry(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-whatsapp'] }); toast.success('Retry queued'); },
  });

  const retryAll = async () => {
    const failed = logs.filter(l => l.status === 'FAILED');
    for (const f of failed) { await retryMut.mutateAsync(f.id); }
    toast.success(`Retried ${failed.length} failed messages`);
  };

  const columns = [
    { header: 'Event', render: (n: NotificationLog) => <span className="text-sm font-medium">{n.event.replace(/_/g,' ')}</span> },
    { header: 'Recipient', render: (n: NotificationLog) => <span className="font-mono text-sm">{n.recipient}</span> },
    { header: 'Message', render: (n: NotificationLog) => <span className="text-xs text-gray-500 line-clamp-1 max-w-xs">{n.body}</span> },
    { header: 'Status', render: (n: NotificationLog) => <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${notifStatusColor(n.status)}`}>{n.status}</span> },
    { header: 'Retries', render: (n: NotificationLog) => <span className="text-sm text-gray-500">{n.retryCount}</span> },
    { header: 'Time', render: (n: NotificationLog) => <span className="text-xs text-gray-400">{formatDateTime(n.createdAt)}</span> },
    { header: '', render: (n: NotificationLog) => n.status === 'FAILED' && n.retryCount < 3 ? (
      <button onClick={() => retryMut.mutate(n.id)} className="p-1.5 hover:bg-brand-50 text-brand-600 rounded-lg">
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    ) : null },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Automation</h1>
        </div>
        {totalFailed > 0 && (
          <button onClick={retryAll} className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors">
            <RefreshCw className="w-4 h-4" /> Retry All Failed ({totalFailed})
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Sent" value={totalSent} icon={<CheckCircle className="w-5 h-5 text-green-600" />} iconBg="bg-green-100" />
        <StatCard title="Failed" value={totalFailed} icon={<XCircle className="w-5 h-5 text-red-600" />} iconBg="bg-red-100" />
        <StatCard title="Pending" value={totalPending} icon={<Clock className="w-5 h-5 text-yellow-600" />} iconBg="bg-yellow-100" />
      </div>

      <Card padding={false}>
        <Table columns={columns} data={logs} keyExtractor={n => n.id} loading={isLoading} emptyMessage="No WhatsApp messages yet" />
        {pagination && <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />}
      </Card>
    </div>
  );
}
