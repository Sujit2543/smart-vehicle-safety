import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '../../services/api';
import { useState } from 'react';
import { Search, UserX, Eye } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Table, Pagination } from '../../components/ui/Table';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { formatDate } from '../../utils/helpers';
import type { Customer } from '../../types';
import toast from 'react-hot-toast';

export default function AdminCustomers() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [disableId, setDisableId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', page, search],
    queryFn: () => customerApi.list({ page, limit: 20, search: search || undefined }).then(r => r.data),
  });

  const customers: Customer[] = data?.data ?? [];
  const pagination = data?.pagination;

  const disableMut = useMutation({
    mutationFn: (id: string) => customerApi.disable(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-customers'] }); setDisableId(null); toast.success('Customer disabled'); },
  });

  const columns = [
    { header: 'Name', render: (c: Customer) => <span className="font-medium">{c.fullName}</span> },
    { header: 'Mobile', render: (c: Customer) => <span className="font-mono text-sm">{c.mobile}</span> },
    { header: 'Email', render: (c: Customer) => <span className="text-gray-500 text-sm">{c.email ?? '—'}</span> },
    { header: 'City', render: (c: Customer) => <span className="text-gray-500">{c.city ?? '—'}</span> },
    { header: 'Vehicles', render: (c: Customer) => <span className="font-semibold">{c.vehicles?.length ?? 0}</span> },
    { header: 'Joined', render: (c: Customer) => <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span> },
    {
      header: 'Status',
      render: (c: Customer) => (
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {c.isActive ? 'Active' : 'Disabled'}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (c: Customer) => (
        <div className="flex gap-1.5">
          <button onClick={() => setViewCustomer(c)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Eye className="w-3.5 h-3.5" /></button>
          {c.isActive && (
            <button onClick={() => setDisableId(c.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"><UserX className="w-3.5 h-3.5" /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <span className="text-sm text-gray-500">{pagination?.total ?? 0} total</span>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          placeholder="Search name, mobile..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <Card padding={false}>
        <Table columns={columns} data={customers} keyExtractor={c => c.id} loading={isLoading} />
        {pagination && <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />}
      </Card>

      {/* View Customer Modal */}
      <Modal open={!!viewCustomer} onClose={() => setViewCustomer(null)} title="Customer Details">
        {viewCustomer && (
          <dl className="space-y-3">
            {[
              ['Name', viewCustomer.fullName],
              ['Mobile', viewCustomer.mobile],
              ['Email', viewCustomer.email ?? '—'],
              ['Address', viewCustomer.address ?? '—'],
              ['City / State', `${viewCustomer.city ?? '—'} / ${viewCustomer.state ?? '—'}`],
              ['PIN Code', viewCustomer.pinCode ?? '—'],
              ['Joined', formatDate(viewCustomer.createdAt)],
              ['Vehicles', String(viewCustomer.vehicles?.length ?? 0)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
                <dt className="text-gray-500">{k}</dt>
                <dd className="font-medium text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>

      <ConfirmDialog
        open={!!disableId}
        onClose={() => setDisableId(null)}
        onConfirm={() => disableId && disableMut.mutate(disableId)}
        title="Disable Customer"
        message="This will prevent the customer from logging in. All their data is preserved."
        confirmLabel="Disable"
        danger
        loading={disableMut.isPending}
      />
    </div>
  );
}
