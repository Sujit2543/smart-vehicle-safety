import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi, maintenanceApi } from '../../services/api';
import { useState } from 'react';
import { Wrench, Plus, Trash2, Edit2, IndianRupee } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../utils/helpers';
import type { Vehicle, MaintenanceRecord } from '../../types';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const SERVICE_TYPES = ['Oil Change','Tyre Replacement','Brake Service','General Service','AC Service','Battery Replacement','Filter Change','Wheel Alignment','Other'];

export default function MaintenancePage() {
  const qc = useQueryClient();
  const [vehicleId, setVehicleId] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState<MaintenanceRecord | null>(null);

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles-mine'],
    queryFn: () => vehicleApi.mine().then(r => r.data.data),
  });

  if (vehicles.length > 0 && !vehicleId) {
    setVehicleId(vehicles[0].id);
  }

  const { data: records = [] } = useQuery<MaintenanceRecord[]>({
    queryKey: ['maintenance', vehicleId],
    queryFn: () => maintenanceApi.list(vehicleId).then(r => r.data.data),
    enabled: !!vehicleId,
  });

  const form = useForm();

  const addMut = useMutation({
    mutationFn: (data: any) => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (v) fd.append(k, String(v)); });
      return maintenanceApi.add(vehicleId, fd);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance', vehicleId] }); setAddOpen(false); form.reset(); toast.success('Record added'); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => maintenanceApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance', vehicleId] }); setDeleteId(null); toast.success('Deleted'); },
  });

  const vehicleOptions = vehicles.map(v => ({ value: v.id, label: `${v.registrationNumber}` }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Maintenance Log</h1>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)} disabled={!vehicleId}>
          Add Record
        </Button>
      </div>

      {vehicles.length > 1 && (
        <Select label="Vehicle" options={vehicleOptions} value={vehicleId} onChange={e => setVehicleId(e.target.value)} />
      )}

      {records.length === 0 ? (
        <EmptyState icon={<Wrench className="w-10 h-10" />} title="No maintenance records" description="Track your vehicle service history here." action={<Button size="sm" onClick={() => setAddOpen(true)}>Add First Record</Button>} />
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{r.serviceType}</p>
                    <span className="text-xs text-gray-400">{formatDate(r.serviceDate)}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    {r.odometer && <span>{r.odometer.toLocaleString('en-IN')} km</span>}
                    {r.cost && <span className="flex items-center gap-0.5"><IndianRupee className="w-3 h-3" />{r.cost.toLocaleString('en-IN')}</span>}
                    {r.serviceCenter && <span>{r.serviceCenter}</span>}
                  </div>
                  {r.notes && <p className="text-xs text-gray-400 mt-1">{r.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors" onClick={() => setDeleteId(r.id)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Maintenance Record">
        <form className="space-y-4" onSubmit={form.handleSubmit(d => addMut.mutate(d))}>
          <Input label="Service Date" type="date" {...form.register('serviceDate')} required />
          <Select label="Service Type" options={[{ value: '', label: 'Select type' }, ...SERVICE_TYPES.map(s => ({ value: s, label: s }))]} {...form.register('serviceType')} />
          <Input label="Odometer (km)" type="number" {...form.register('odometer')} />
          <Input label="Cost (₹)" type="number" {...form.register('cost')} />
          <Input label="Service Center" {...form.register('serviceCenter')} />
          <Input label="Notes" {...form.register('notes')} />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="flex-1" type="submit" loading={addMut.isPending}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
        title="Delete Record"
        message="Are you sure you want to delete this maintenance record?"
        confirmLabel="Delete"
        danger
        loading={deleteMut.isPending}
      />
    </div>
  );
}
