import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '../../services/api';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import {
  Car, Edit2, Save, X, Shield, Phone, AlertTriangle,
  CheckCircle, QrCode
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { formatDate, daysUntil, expiryColorClass } from '../../utils/helpers';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

const FUEL_OPTIONS = [
  { value: 'PETROL', label: 'Petrol' }, { value: 'DIESEL', label: 'Diesel' },
  { value: 'CNG', label: 'CNG' }, { value: 'ELECTRIC', label: 'Electric' },
  { value: 'HYBRID', label: 'Hybrid' }, { value: 'LPG', label: 'LPG' },
];

function Section({ title, icon, children, action }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
          {icon}{title}
        </h3>
        {action}
      </div>
      {children}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 flex-shrink-0 w-32">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value || '—'}</span>
    </div>
  );
}

export default function CustomerVehiclePage() {
  const qc = useQueryClient();
  const appBase = import.meta.env.VITE_APP_BASE_URL ?? 'http://localhost:3000';

  const [editOpen,    setEditOpen]    = useState(false);
  const [insOpen,     setInsOpen]     = useState(false);
  const [pucOpen,     setPucOpen]     = useState(false);
  const [emergOpen,   setEmergOpen]   = useState(false);
  const [selectedVid, setSelectedVid] = useState<string | null>(null);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn: () => customerApi.getMyVehicles().then(r => r.data.data),
    onSuccess: (d: any[]) => { if (d.length && !selectedVid) setSelectedVid(d[0].id); },
  } as any);

  useEffect(() => {
    if ((vehicles as any[]).length && !selectedVid) setSelectedVid((vehicles as any[])[0].id);
  }, [vehicles, selectedVid]);

  const { data: vehicle, isLoading: loadingV } = useQuery({
    queryKey: ['my-vehicle', selectedVid],
    queryFn: () => customerApi.getMyVehicle(selectedVid!).then(r => r.data.data),
    enabled: !!selectedVid,
  });

  const editForm  = useForm();
  const insForm   = useForm();
  const pucForm   = useForm();
  const emergForm = useForm();

  useEffect(() => {
    if (vehicle) {
      editForm.reset({ make: vehicle.make, model: vehicle.model, color: vehicle.color, fuelType: vehicle.fuelType, manufacturingYear: String(vehicle.manufacturingYear) });
      if (vehicle.insuranceRecord) insForm.reset({ policyNumber: vehicle.insuranceRecord.policyNumber ?? '', provider: vehicle.insuranceRecord.provider ?? '', expiryDate: vehicle.insuranceRecord.expiryDate?.split('T')[0] ?? '' });
      if (vehicle.pucRecord) pucForm.reset({ certificateNo: vehicle.pucRecord.certificateNo ?? '', testCenter: vehicle.pucRecord.testCenter ?? '', expiryDate: vehicle.pucRecord.expiryDate?.split('T')[0] ?? '' });
      if (vehicle.emergencyContacts?.[0]) emergForm.reset({ name: vehicle.emergencyContacts[0].name, mobile: vehicle.emergencyContacts[0].mobile, relationship: vehicle.emergencyContacts[0].relationship });
    }
  }, [vehicle]);

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['my-vehicle', selectedVid] }); qc.invalidateQueries({ queryKey: ['my-vehicles'] }); };

  const editMut  = useMutation({ mutationFn: (d: any) => customerApi.updateMyVehicle(selectedVid!, d), onSuccess: () => { invalidate(); setEditOpen(false); toast.success('Vehicle updated'); } });
  const insMut   = useMutation({ mutationFn: (d: any) => customerApi.saveInsurance(selectedVid!, d), onSuccess: () => { invalidate(); setInsOpen(false); toast.success('Insurance saved'); } });
  const pucMut   = useMutation({ mutationFn: (d: any) => customerApi.savePuc(selectedVid!, d), onSuccess: () => { invalidate(); setPucOpen(false); toast.success('PUC saved'); } });
  const emergMut = useMutation({ mutationFn: (d: any) => customerApi.updateEmergency(selectedVid!, d), onSuccess: () => { invalidate(); setEmergOpen(false); toast.success('Emergency contact updated'); } });

  if (isLoading || loadingV) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />)}</div>;
  }

  if (!vehicle) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Car className="w-12 h-12 text-gray-300" />
      <p className="text-gray-500">No vehicle found. Scan a tag to register your vehicle.</p>
    </div>
  );

  const tag = vehicle.tag;
  const ins = vehicle.insuranceRecord;
  const puc = vehicle.pucRecord;
  const em  = vehicle.emergencyContacts?.[0];
  const tagUrl = tag?.tagId ? `${appBase}/tag/${tag.tagId}` : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-mono">{vehicle.registrationNumber}</h1>
          <p className="text-sm text-gray-500">{vehicle.make} {vehicle.model} · {vehicle.color}</p>
        </div>
        <Button variant="outline" size="sm" icon={<Edit2 className="w-4 h-4" />} onClick={() => setEditOpen(true)}>
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Vehicle Info */}
        <Section title="Vehicle Details" icon={<Car className="w-4 h-4 text-brand-600" />}>
          <InfoRow label="Registration" value={<span className="font-mono font-bold">{vehicle.registrationNumber}</span>} />
          <InfoRow label="Type"   value={vehicle.vehicleType?.replace(/_/g, ' ')} />
          <InfoRow label="Make"   value={vehicle.make} />
          <InfoRow label="Model"  value={vehicle.model} />
          <InfoRow label="Color"  value={vehicle.color} />
          <InfoRow label="Year"   value={String(vehicle.manufacturingYear)} />
          <InfoRow label="Fuel"   value={vehicle.fuelType} />
          <InfoRow label="Tag ID" value={tag ? <span className="font-mono text-brand-600">{tag.tagId}</span> : 'No tag'} />
          <InfoRow label="Tag Status" value={
            tag ? (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tag.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {tag.status}
              </span>
            ) : '—'
          } />
        </Section>

        {/* QR Code */}
        {tagUrl ? (
          <Section title="Safety Tag QR Code" icon={<QrCode className="w-4 h-4 text-brand-600" />}>
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="p-3 border-2 border-dashed border-gray-200 rounded-2xl">
                <QRCodeSVG value={tagUrl} size={130} level="H" includeMargin />
              </div>
              <p className="font-mono font-bold text-brand-600">{tag?.tagId}</p>
              <p className="text-xs text-gray-400 text-center">Stick this on your vehicle windscreen or bumper</p>
              {tag?.activatedAt && <p className="text-xs text-gray-400">Activated: {formatDate(tag.activatedAt)}</p>}
            </div>
          </Section>
        ) : (
          <Section title="Safety Tag" icon={<QrCode className="w-4 h-4 text-gray-400" />}>
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <QrCode className="w-10 h-10 text-gray-200" />
              <p className="text-sm text-gray-400">No tag linked to this vehicle</p>
            </div>
          </Section>
        )}

        {/* Insurance */}
        <Section title="Insurance" icon={<Shield className="w-4 h-4 text-blue-600" />}
          action={<Button variant="ghost" size="sm" onClick={() => setInsOpen(true)}>{ins ? 'Update' : 'Add'}</Button>}>
          {ins ? (
            <>
              <InfoRow label="Policy No."  value={ins.policyNumber} />
              <InfoRow label="Provider"    value={ins.provider} />
              <InfoRow label="Expiry Date" value={formatDate(ins.expiryDate)} />
              <InfoRow label="Status" value={
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${expiryColorClass(ins.expiryColor as any)}`}>
                  {ins.expiryColor} ({daysUntil(ins.expiryDate)} days)
                </span>
              } />
            </>
          ) : <p className="text-sm text-gray-400 py-2 text-center">No insurance record. Add it to get expiry alerts.</p>}
        </Section>

        {/* PUC */}
        <Section title="PUC Certificate" icon={<CheckCircle className="w-4 h-4 text-purple-600" />}
          action={<Button variant="ghost" size="sm" onClick={() => setPucOpen(true)}>{puc ? 'Update' : 'Add'}</Button>}>
          {puc ? (
            <>
              <InfoRow label="Certificate No." value={puc.certificateNo} />
              <InfoRow label="Test Center"     value={puc.testCenter} />
              <InfoRow label="Expiry Date"     value={formatDate(puc.expiryDate)} />
              <InfoRow label="Status" value={
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${expiryColorClass(puc.expiryColor as any)}`}>
                  {puc.expiryColor} ({daysUntil(puc.expiryDate)} days)
                </span>
              } />
            </>
          ) : <p className="text-sm text-gray-400 py-2 text-center">No PUC record. Add it to get expiry alerts.</p>}
        </Section>

        {/* Emergency Contact */}
        <Section title="Emergency Contact" icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}
          action={<Button variant="ghost" size="sm" onClick={() => setEmergOpen(true)}>{em ? 'Update' : 'Add'}</Button>}>
          {em ? (
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 text-orange-700 font-bold">
                {em.name[0]}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{em.name}</p>
                <p className="text-xs text-gray-500">+91 {em.mobile}</p>
                <p className="text-xs text-gray-400">{em.relationship}</p>
              </div>
            </div>
          ) : <p className="text-sm text-gray-400 py-2 text-center">No emergency contact set.</p>}
        </Section>
      </div>

      {/* ── Edit Vehicle Modal ─── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Vehicle Details">
        <form className="space-y-4" onSubmit={editForm.handleSubmit(d => editMut.mutate(d))}>
          <Input label="Make"  {...editForm.register('make')} />
          <Input label="Model" {...editForm.register('model')} />
          <Input label="Color" {...editForm.register('color')} />
          <Select label="Fuel Type" options={FUEL_OPTIONS} {...editForm.register('fuelType')} />
          <Input label="Manufacturing Year" {...editForm.register('manufacturingYear')} />
          <div className="flex gap-3"><Button variant="outline" className="flex-1" type="button" onClick={() => setEditOpen(false)}>Cancel</Button><Button className="flex-1" type="submit" loading={editMut.isPending}>Save</Button></div>
        </form>
      </Modal>

      {/* ── Insurance Modal ─── */}
      <Modal open={insOpen} onClose={() => setInsOpen(false)} title="Insurance Details">
        <form className="space-y-4" onSubmit={insForm.handleSubmit(d => insMut.mutate(d))}>
          <Input label="Policy Number" {...insForm.register('policyNumber')} />
          <Input label="Insurance Provider" {...insForm.register('provider')} />
          <Input label="Start Date" type="date" {...insForm.register('startDate')} />
          <Input label="Expiry Date" type="date" {...insForm.register('expiryDate')} required />
          <Input label="Premium Amount (₹)" type="number" {...insForm.register('premiumAmount')} />
          <div className="flex gap-3"><Button variant="outline" className="flex-1" type="button" onClick={() => setInsOpen(false)}>Cancel</Button><Button className="flex-1" type="submit" loading={insMut.isPending}>Save</Button></div>
        </form>
      </Modal>

      {/* ── PUC Modal ─── */}
      <Modal open={pucOpen} onClose={() => setPucOpen(false)} title="PUC Certificate Details">
        <form className="space-y-4" onSubmit={pucForm.handleSubmit(d => pucMut.mutate(d))}>
          <Input label="Certificate Number" {...pucForm.register('certificateNo')} />
          <Input label="Test Center" {...pucForm.register('testCenter')} />
          <Input label="Test Date" type="date" {...pucForm.register('testDate')} />
          <Input label="Expiry Date" type="date" {...pucForm.register('expiryDate')} required />
          <div className="flex gap-3"><Button variant="outline" className="flex-1" type="button" onClick={() => setPucOpen(false)}>Cancel</Button><Button className="flex-1" type="submit" loading={pucMut.isPending}>Save</Button></div>
        </form>
      </Modal>

      {/* ── Emergency Modal ─── */}
      <Modal open={emergOpen} onClose={() => setEmergOpen(false)} title="Emergency Contact">
        <form className="space-y-4" onSubmit={emergForm.handleSubmit(d => emergMut.mutate(d))}>
          <Input label="Contact Name" {...emergForm.register('name')} required />
          <Input label="Mobile Number" type="tel" maxLength={10} {...emergForm.register('mobile')} required />
          <Input label="Relationship" placeholder="Spouse / Parent / Friend" {...emergForm.register('relationship')} required />
          <div className="flex gap-3"><Button variant="outline" className="flex-1" type="button" onClick={() => setEmergOpen(false)}>Cancel</Button><Button className="flex-1" type="submit" loading={emergMut.isPending}>Save</Button></div>
        </form>
      </Modal>
    </div>
  );
}
