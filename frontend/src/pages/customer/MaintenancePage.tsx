import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { customerApi, maintenanceApi } from '../../services/api';
import { Wrench, Plus, Trash2, IndianRupee, Calendar } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { formatDate } from '../../utils/helpers';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const SERVICE_TYPES = ['Oil Change','Tyre Replacement','Brake Service','General Service','AC Service','Battery Replacement','Filter Change','Wheel Alignment','Other'];

export default function CustomerMaintenancePage() {
  const qc = useQueryClient();
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [addOpen,   setAddOpen]   = useState(false);
  const [deleteId,  setDeleteId]  = useState<string | null>(null);
  const form = useForm();

  const { data: vehicles = [] } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn: () => customerApi.getMyVehicles().then(r => r.data.data),
  });

  useEffect(() => {
    if ((vehicles as any[]).length && !vehicleId) setVehicleId((vehicles as any[])[0].id);
  }, [vehicles, vehicleId]);

  const { data: records = [], refetch } = useQuery({
    queryKey: ['maintenance', vehicleId],
    queryFn: () => maintenanceApi.list(vehicleId!).then(r => r.data.data),
    enabled: !!vehicleId,
  });

  const addMut = useMutation({
    mutationFn: (d: any) => {
      const fd = new FormData();
      Object.entries(d).forEach(([k, v]) => { if (v) fd.append(k, String(v)); });
      return maintenanceApi.add(vehicleId!, fd);
    },
    onSuccess: () => { refetch(); setAddOpen(false); form.reset(); toast.success('Record added'); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => maintenanceApi.delete(id),
    onSuccess: () => { refetch(); setDeleteId(null); toast.success('Record deleted'); },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Maintenance Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track your vehicle service history</p>
        </div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)} disabled={!vehicleId}>
          Add Record
        </Button>
      </div>

      {(records as any[]).length === 0 ? (
        <Card className="text-center py-12">
          <Wrench className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="font-medium text-gray-500">No maintenance records yet</p>
          <p className="text-sm text-gray-400 mt-1">Track your service history to stay on top of vehicle health.</p>
          <Button size="sm" className="mt-4" onClick={() => setAddOpen(true)}>Add First Record</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {(records as any[]).map(r => (
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
                    {r.odometer && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{r.odometer.toLocaleString('en-IN')} km</span>}
                    {r.cost && <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{r.cost.toLocaleString('en-IN')}</span>}
                    {r.serviceCenter && <span>{r.serviceCenter}</span>}
                  </div>
                  {r.notes && <p className="text-xs text-gray-400 mt-1">{r.notes}</p>}
                </div>
                <button className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg" onClick={() => setDeleteId(r.id)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Maintenance Record">
        <form className="space-y-4" onSubmit={form.handleSubmit(d => addMut.mutate(d))}>
          <Input label="Service Date" type="date" {...form.register('serviceDate')} required />
          <Select label="Service Type"
            options={[{ value: '', label: 'Select type' }, ...SERVICE_TYPES.map(s => ({ value: s, label: s }))]}
            {...form.register('serviceType')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Odometer (km)" type="number" {...form.register('odometer')} />
            <Input label="Cost (₹)" type="number" {...form.register('cost')} />
          </div>
          <Input label="Service Center" {...form.register('serviceCenter')} />
          <Input label="Notes" {...form.register('notes')} />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="flex-1" type="submit" loading={addMut.isPending}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
        title="Delete Record" message="Are you sure you want to delete this maintenance record?"
        confirmLabel="Delete" danger loading={deleteMut.isPending} />
    </div>
  );
}
