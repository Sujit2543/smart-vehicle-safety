import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Table, Pagination } from '../../components/ui/Table';
import { formatDateTime } from '../../utils/helpers';

export default function AdminDocuments() {
  const [page, setPage] = useState(1);

  // Use audit log filtered to document events
  const { data, isLoading } = useQuery({
    queryKey: ['admin-doc-logs', page],
    queryFn: () => adminApi.auditLogs({ page, limit: 30, entity: 'Document' }).then(r => r.data),
  });

  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  const columns = [
    { header: 'Action', render: (l: any) => <span className="font-medium text-sm">{l.action.replace(/_/g, ' ')}</span> },
    { header: 'Document ID', render: (l: any) => <span className="font-mono text-xs text-gray-500">{l.entityId ?? '—'}</span> },
    { header: 'User', render: (l: any) => <span className="text-sm">{l.user?.mobile ?? l.user?.email ?? 'Anonymous'}</span> },
    { header: 'IP', render: (l: any) => <span className="text-xs text-gray-400">{l.ipAddress ?? '—'}</span> },
    { header: 'Time', render: (l: any) => <span className="text-xs text-gray-400">{formatDateTime(l.createdAt)}</span> },
    { header: 'Meta', render: (l: any) => <span className="text-xs text-gray-400">{l.metadata ? JSON.stringify(l.metadata).slice(0, 60) : '—'}</span> },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Document Activity</h1>
      <Card padding={false}>
        <Table columns={columns} data={logs} keyExtractor={(l: any) => l.id} loading={isLoading} emptyMessage="No document activity yet" />
        {pagination && <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />}
      </Card>
    </div>
  );
}
