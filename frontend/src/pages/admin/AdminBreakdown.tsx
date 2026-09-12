import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { breakdownApi } from '../../services/api';
import { useState } from 'react';
import { Wrench, MapPin, Plus, Star } from 'lucide-react';
import { Card, StatCard } from '../../components/ui/Card';
import { Table, Pagination } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { formatDateTime } from '../../utils/helpers';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const STATUS_OPTS = [
  { value: '', label: 'All Status' },
  ...['PENDING','ACCEPTED','EN_ROUTE','ARRIVED','COMPLETED','CANCELLED'].map(s => ({ value: s, label: s })),
];
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700', ACCEPTED: 'bg-blue-100 text-blue-700',
  EN_ROUTE: 'bg-purple-100 text-purple-700', ARRIVED: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700', CANCELLED: 'bg-gray-100 text-gray-500',
};
const SERVICE_TYPES = ['MECHANIC','TOWING','FUEL_DELIVERY','AMBULANCE','POLICE','ROADSIDE_ASSISTANCE'];

export default function AdminBreakdown() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [addProvider, setAddProvider] = useState(false);
  const [updateReq, setUpdateReq] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-breakdown', page, status],
    queryFn: () => breakdownApi.all({ page, limit: 20, status: status || undefined }).then(r => r.data),
    refetchInterval: 30000,
  });

  const requests = data?.data ?? [];
  const pagination = data?.pagination;

  const pending   = requests.filter((r: any) => r.status === 'PENDING').length;
  const active    = requests.filter((r: any) => ['ACCEPTED','EN_ROUTE','ARRIVED'].includes(r.status)).length;
  const completed = requests.filter((r: any) => r.status === 'COMPLETED').length;

  const providerForm = useForm();
  const addProviderMut = useMutation({
    mutationFn: (d: any) => breakdownApi.addProvider(d),
    onSuccess: () => { setAddProvider(false); providerForm.reset(); toast.success('Provider added'); },
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status, data }: any) => breakdownApi.updateStatus(id, status, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-breakdown'] }); setUpdateReq(null); toast.success('Status updated'); },
  });

  const columns = [
    {
      header: 'Request',
      render: (r: any) => (
        <div>
          <p className="font-mono font-bold text-brand-600 text-xs">#{r.id.slice(-8).toUpperCase()}</p>
          <p className="font-semibold text-sm">{r.serviceType?.replace(/_/g,' ')}</p>
          <p className="text-xs text-gray-500">{r.breakdownType?.replace(/_/g,' ')}</p>
        </div>
      ),
    },
    {
      header: 'Vehicle',
      render: (r: any) => r.vehicle ? (
        <div>
          <p className="font-bold text-sm">{r.vehicle.registrationNumber}</p>
          <p className="text-xs text-gray-500">{r.vehicle.make} {r.vehicle.model}</p>
          <p className="text-xs text-gray-400">{r.vehicle.customer?.fullName} • {r.vehicle.customer?.mobile}</p>
        </div>
      ) : '—',
    },
    { header: 'Caller', render: (r: any) => <span className="font-mono text-sm">{r.callerMobile}</span> },
    {
      header: 'Status',
      render: (r: any) => (
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
      ),
    },
    {
      header: 'Location',
      render: (r: any) => r.mapLink ? (
        <a href={r.mapLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand-600 text-xs hover:underline">
          <MapPin className="w-3 h-3" /> Map
        </a>
      ) : <span className="text-gray-400 text-xs">No GPS</span>,
    },
    {
      header: 'Rating',
      render: (r: any) => r.rating ? (
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= r.rating.score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />)}
        </div>
      ) : <span className="text-gray-300 text-xs">—</span>,
    },
    { header: 'Time', render: (r: any) => <span className="text-xs text-gray-400">{formatDateTime(r.createdAt)}</span> },
    {
      header: 'Actions',
      render: (r: any) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED' ? (
        <button onClick={() => setUpdateReq(r)} className="px-2.5 py-1 bg-brand-100 text-brand-700 rounded-lg text-xs font-medium hover:bg-brand-200 transition-colors">
          Update
        </button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-6 h-6 text-orange-600" />
          <h1 className="text-2xl font-bold text-gray-900">Breakdown Requests</h1>
        </div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddProvider(true)}>
          Add Provider
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Pending" value={pending} icon={<Wrench className="w-5 h-5 text-yellow-600" />} iconBg="bg-yellow-100" />
        <StatCard title="Active" value={active} icon={<Wrench className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-100" />
        <StatCard title="Completed" value={completed} icon={<Wrench className="w-5 h-5 text-green-600" />} iconBg="bg-green-100" />
      </div>

      <div className="flex items-center gap-3">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-xs text-gray-400">Auto-refreshes every 30s</span>
      </div>

      <Card padding={false}>
        <Table columns={columns} data={requests} keyExtractor={(r: any) => r.id} loading={isLoading} emptyMessage="No breakdown requests" />
        {pagination && <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />}
      </Card>

      {/* Update Status Modal */}
      {updateReq && (
        <Modal open={true} onClose={() => setUpdateReq(null)} title={`Update Request #${updateReq.id.slice(-8).toUpperCase()}`} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              <strong>{updateReq.serviceType?.replace(/_/g,' ')}</strong> — {updateReq.vehicle?.registrationNumber}
            </p>
            <Select label="New Status"
              options={[
                { value: 'ACCEPTED', label: 'Accepted' },
                { value: 'EN_ROUTE', label: 'En Route' },
                { value: 'ARRIVED', label: 'Arrived' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
              defaultValue={updateReq.status}
              onChange={e => setUpdateReq({ ...updateReq, newStatus: e.target.value })}
            />
            <Input label="Assigned To (provider name/number)" placeholder="e.g. Ramu Mechanic - 98765XXXXX"
              onChange={e => setUpdateReq({ ...updateReq, assignedTo: e.target.value })} />
            <Input label="Estimated Arrival" placeholder="e.g. 15 minutes"
              onChange={e => setUpdateReq({ ...updateReq, estimatedArrival: e.target.value })} />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setUpdateReq(null)}>Cancel</Button>
              <Button className="flex-1" loading={updateStatusMut.isPending}
                onClick={() => updateStatusMut.mutate({ id: updateReq.id, status: updateReq.newStatus ?? updateReq.status, data: { assignedTo: updateReq.assignedTo, estimatedArrival: updateReq.estimatedArrival } })}>
                Update
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Provider Modal */}
      <Modal open={addProvider} onClose={() => setAddProvider(false)} title="Add Service Provider" size="md">
        <form className="space-y-4" onSubmit={providerForm.handleSubmit(d => addProviderMut.mutate(d))}>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Provider Name" {...providerForm.register('name')} required />
            <Input label="Mobile" type="tel" maxLength={10} {...providerForm.register('mobile')} required />
          </div>
          <Select label="Service Type"
            options={SERVICE_TYPES.map(s => ({ value: s, label: s.replace(/_/g,' ') }))}
            {...providerForm.register('serviceType')} />
          <Input label="Address" {...providerForm.register('address')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" {...providerForm.register('city')} required />
            <Input label="State" {...providerForm.register('state')} required />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" type="button" onClick={() => setAddProvider(false)}>Cancel</Button>
            <Button className="flex-1" type="submit" loading={addProviderMut.isPending}>Add Provider</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
