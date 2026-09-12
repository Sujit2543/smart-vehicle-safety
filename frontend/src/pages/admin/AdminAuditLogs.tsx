import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Table, Pagination } from '../../components/ui/Table';
import { formatDateTime } from '../../utils/helpers';
import type { AuditLog } from '../../types';

const ENTITIES = ['', 'Tag', 'Vehicle', 'Document', 'SOSEvent', 'Customer', 'User'];

export default function AdminAuditLogs() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, action, entity],
    queryFn: () => adminApi.auditLogs({ page, limit: 30, action: action || undefined, entity: entity || undefined }).then(r => r.data),
  });

  const logs: AuditLog[] = data?.data ?? [];
  const pagination = data?.pagination;

  const columns = [
    {
      header: 'Action',
      render: (l: AuditLog) => (
        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-mono font-semibold">
          {l.action.replace(/_/g, ' ')}
        </span>
      ),
    },
    { header: 'Entity', render: (l: AuditLog) => <span className="text-sm font-medium">{l.entity}</span> },
    { header: 'Entity ID', render: (l: AuditLog) => <span className="text-xs font-mono text-gray-500">{l.entityId?.slice(0, 12) ?? '—'}...</span> },
    {
      header: 'User',
      render: (l: AuditLog) => (
        <div>
          <div className="text-sm">{l.user?.mobile ?? l.user?.email ?? 'Anonymous'}</div>
          {l.userRole && <div className="text-xs text-gray-400">{l.userRole}</div>}
        </div>
      ),
    },
    { header: 'IP', render: (l: AuditLog) => <span className="text-xs font-mono text-gray-400">{l.ipAddress ?? '—'}</span> },
    { header: 'Time', render: (l: AuditLog) => <span className="text-xs text-gray-400">{formatDateTime(l.createdAt)}</span> },
    {
      header: 'Meta',
      render: (l: AuditLog) => l.metadata ? (
        <span className="text-xs text-gray-400">{JSON.stringify(l.metadata).slice(0, 50)}</span>
      ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input placeholder="Filter by action..." value={action} onChange={e => { setAction(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={entity} onChange={e => { setEntity(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          {ENTITIES.map(e => <option key={e} value={e}>{e || 'All Entities'}</option>)}
        </select>
      </div>

      <Card padding={false}>
        <Table columns={columns} data={logs} keyExtractor={l => l.id} loading={isLoading} emptyMessage="No audit logs found" />
        {pagination && <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />}
      </Card>
    </div>
  );
}
