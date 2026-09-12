import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi, insuranceApi, pucApi } from '../../services/api';
import { useState } from 'react';
import { Car, Shield, FileText, Wrench, QrCode, Edit2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { formatDate, expiryColorClass, daysUntil } from '../../utils/helpers';
import { QRCodeSVG } from 'qrcode.react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const appBase = import.meta.env.VITE_APP_BASE_URL ?? 'http://localhost:3000';

  const [editOpen, setEditOpen] = useState(false);
  const [insuranceOpen, setInsuranceOpen] = useState(false);
  const [pucOpen, setPucOpen] = useState(false);

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehicleApi.get(id!).then(r => r.data.data),
    enabled: !!id,
  });

  const editForm = useForm();
  const insuranceForm = useForm();
  const pucForm = useForm();

  const updateVehicle = useMutation({
    mutationFn: (data: any) => vehicleApi.update(id!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicle', id] }); setEditOpen(false); toast.success('Vehicle updated'); },
  });

  const saveInsurance = useMutation({
    mutationFn: (data: any) => insuranceApi.save(id!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicle', id] }); setInsuranceOpen(false); toast.success('Insurance saved'); },
  });

  const savePUC = useMutation({
    mutationFn: (data: any) => pucApi.save(id!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicle', id] }); setPucOpen(false); toast.success('PUC saved'); },
  });

  if (isLoading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (!vehicle) return <p className="text-gray-500 text-center py-20">Vehicle not found</p>;

  const ins = vehicle.insuranceRecord;
  const puc = vehicle.pucRecord;
  const tagId = vehicle.tag?.tagId;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-wide">{vehicle.registrationNumber}</h1>
          <p className="text-gray-500 text-sm">{vehicle.make} {vehicle.model} • {vehicle.color} • {vehicle.manufacturingYear}</p>
        </div>
        <Button variant="outline" size="sm" icon={<Edit2 className="w-4 h-4" />} onClick={() => { editForm.reset({ make: vehicle.make, model: vehicle.model, color: vehicle.color }); setEditOpen(true); }}>
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Vehicle Info */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Car className="w-4 h-4 text-brand-600" /> Vehicle Info</h3>
          <dl className="space-y-2">
            {[
              ['Type', vehicle.vehicleType?.replace('_', ' ')],
              ['Fuel', vehicle.fuelType],
              ['Year', vehicle.manufacturingYear],
              ['Tag', tagId ?? '—'],
              ['Tag Status', vehicle.tag?.status ?? '—'],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between text-sm">
                <dt className="text-gray-500">{k}</dt>
                <dd className="font-medium text-gray-900">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* QR Code */}
        {tagId && (
          <Card className="flex flex-col items-center justify-center gap-2">
            <p className="text-xs text-gray-500 font-semibold uppercase">Safety Tag QR</p>
            <div className="p-2 border border-dashed border-gray-200 rounded-xl">
              <QRCodeSVG value={`${appBase}/tag/${tagId}`} size={110} level="H" includeMargin />
            </div>
            <p className="font-mono font-bold text-brand-600">{tagId}</p>
          </Card>
        )}

        {/* Insurance */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Shield className="w-4 h-4 text-blue-600" /> Insurance</h3>
            <Button variant="ghost" size="sm" onClick={() => { insuranceForm.reset({ policyNumber: ins?.policyNumber, provider: ins?.provider, expiryDate: ins?.expiryDate?.split('T')[0] }); setInsuranceOpen(true); }}>
              {ins ? 'Update' : 'Add'}
            </Button>
          </div>
          {ins ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Policy</span><span className="font-medium">{ins.policyNumber ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Provider</span><span className="font-medium">{ins.provider ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Expires</span><span className="font-medium">{formatDate(ins.expiryDate)}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${expiryColorClass(ins.expiryColor)}`}>
                  {ins.expiryColor} ({daysUntil(ins.expiryDate)}d)
                </span>
              </div>
            </div>
          ) : <p className="text-sm text-gray-400">No insurance record</p>}
        </Card>

        {/* PUC */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Shield className="w-4 h-4 text-purple-600" /> PUC Certificate</h3>
            <Button variant="ghost" size="sm" onClick={() => { pucForm.reset({ certificateNo: puc?.certificateNo, testCenter: puc?.testCenter, expiryDate: puc?.expiryDate?.split('T')[0] }); setPucOpen(true); }}>
              {puc ? 'Update' : 'Add'}
            </Button>
          </div>
          {puc ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Cert No</span><span className="font-medium">{puc.certificateNo ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Test Center</span><span className="font-medium">{puc.testCenter ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Expires</span><span className="font-medium">{formatDate(puc.expiryDate)}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${expiryColorClass(puc.expiryColor)}`}>
                  {puc.expiryColor} ({daysUntil(puc.expiryDate)}d)
                </span>
              </div>
            </div>
          ) : <p className="text-sm text-gray-400">No PUC record</p>}
        </Card>
      </div>

      {/* Edit Vehicle Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Vehicle">
        <form className="space-y-4" onSubmit={editForm.handleSubmit(d => updateVehicle.mutate(d))}>
          <Input label="Make" {...editForm.register('make')} />
          <Input label="Model" {...editForm.register('model')} />
          <Input label="Color" {...editForm.register('color')} />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" type="button" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="flex-1" type="submit" loading={updateVehicle.isPending}>Save</Button>
          </div>
        </form>
      </Modal>

      {/* Insurance Modal */}
      <Modal open={insuranceOpen} onClose={() => setInsuranceOpen(false)} title="Insurance Details">
        <form className="space-y-4" onSubmit={insuranceForm.handleSubmit(d => saveInsurance.mutate(d))}>
          <Input label="Policy Number" {...insuranceForm.register('policyNumber')} />
          <Input label="Provider" {...insuranceForm.register('provider')} />
          <Input label="Start Date" type="date" {...insuranceForm.register('startDate')} />
          <Input label="Expiry Date" type="date" {...insuranceForm.register('expiryDate')} required />
          <Input label="Premium Amount (₹)" type="number" {...insuranceForm.register('premiumAmount')} />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" type="button" onClick={() => setInsuranceOpen(false)}>Cancel</Button>
            <Button className="flex-1" type="submit" loading={saveInsurance.isPending}>Save</Button>
          </div>
        </form>
      </Modal>

      {/* PUC Modal */}
      <Modal open={pucOpen} onClose={() => setPucOpen(false)} title="PUC Certificate">
        <form className="space-y-4" onSubmit={pucForm.handleSubmit(d => savePUC.mutate(d))}>
          <Input label="Certificate Number" {...pucForm.register('certificateNo')} />
          <Input label="Test Center" {...pucForm.register('testCenter')} />
          <Input label="Test Date" type="date" {...pucForm.register('testDate')} />
          <Input label="Expiry Date" type="date" {...pucForm.register('expiryDate')} required />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" type="button" onClick={() => setPucOpen(false)}>Cancel</Button>
            <Button className="flex-1" type="submit" loading={savePUC.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
