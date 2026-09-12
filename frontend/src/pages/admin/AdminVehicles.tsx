import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../../services/api';
import { useState } from 'react';
import { Search, Eye } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Table, Pagination } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { formatDate, expiryColorClass } from '../../utils/helpers';
import type { Vehicle } from '../../types';

export default function AdminVehicles() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [viewVehicle, setViewVehicle] = useState<Vehicle | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-vehicles', page, search],
    queryFn: () => vehicleApi.adminAll({ page, limit: 20, search: search || undefined }).then(r => r.data),
  });

  const vehicles: Vehicle[] = data?.data ?? [];
  const pagination = data?.pagination;

  const columns = [
    { header: 'Reg No', render: (v: Vehicle) => <span className="font-mono font-bold">{v.registrationNumber}</span> },
    { header: 'Make / Model', render: (v: Vehicle) => <span>{v.make} {v.model}</span> },
    { header: 'Type', render: (v: Vehicle) => <span className="text-gray-500 text-sm">{v.vehicleType?.replace('_', ' ')}</span> },
    { header: 'Owner', render: (v: Vehicle) => v.customer ? <div><div className="font-medium">{v.customer.fullName}</div><div className="text-xs text-gray-400">{v.customer.mobile}</div></div> : '—' },
    {
      header: 'Tag',
      render: (v: Vehicle) => v.tag ? (
        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{v.tag.tagId}</span>
      ) : <span className="text-gray-400 text-xs">No tag</span>,
    },
    {
      header: 'Insurance',
      render: (v: Vehicle) => v.insuranceRecord ? (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${expiryColorClass(v.insuranceRecord.expiryColor)}`}>
          {formatDate(v.insuranceRecord.expiryDate)}
        </span>
      ) : <span className="text-gray-400 text-xs">—</span>,
    },
    {
      header: 'PUC',
      render: (v: Vehicle) => v.pucRecord ? (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${expiryColorClass(v.pucRecord.expiryColor)}`}>
          {formatDate(v.pucRecord.expiryDate)}
        </span>
      ) : <span className="text-gray-400 text-xs">—</span>,
    },
    { header: 'Registered', render: (v: Vehicle) => <span className="text-xs text-gray-400">{formatDate(v.createdAt)}</span> },
    {
      header: '', render: (v: Vehicle) => (
        <button onClick={() => setViewVehicle(v)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg">
          <Eye className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
        <span className="text-sm text-gray-500">{pagination?.total ?? 0} total</span>
      </div>
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input placeholder="Search reg, make, model..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <Card padding={false}>
        <Table columns={columns} data={vehicles} keyExtractor={v => v.id} loading={isLoading} />
        {pagination && <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />}
      </Card>

      <Modal open={!!viewVehicle} onClose={() => setViewVehicle(null)} title="Vehicle Details" size="lg">
        {viewVehicle && (
          <dl className="grid grid-cols-2 gap-3">
            {[
              ['Registration', viewVehicle.registrationNumber],
              ['Make', viewVehicle.make],
              ['Model', viewVehicle.model],
              ['Color', viewVehicle.color],
              ['Year', String(viewVehicle.manufacturingYear)],
              ['Fuel', viewVehicle.fuelType],
              ['Type', viewVehicle.vehicleType?.replace('_', ' ')],
              ['Owner', viewVehicle.customer?.fullName ?? '—'],
              ['Owner Mobile', viewVehicle.customer?.mobile ?? '—'],
              ['Tag', viewVehicle.tag?.tagId ?? 'No Tag'],
              ['Tag Status', viewVehicle.tag?.status ?? '—'],
              ['Registered', formatDate(viewVehicle.createdAt)],
            ].map(([k, v]) => (
              <div key={k} className="text-sm">
                <dt className="text-gray-500 text-xs">{k}</dt>
                <dd className="font-semibold text-gray-900 mt-0.5">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </div>
  );
}
