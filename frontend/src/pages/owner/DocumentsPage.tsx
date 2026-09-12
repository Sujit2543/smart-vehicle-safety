import { useQuery, useMutation } from '@tanstack/react-query';
import { vehicleApi, documentApi } from '../../services/api';
import { useState } from 'react';
import { FileText, Upload, Eye, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, fileSize } from '../../utils/helpers';
import type { Vehicle, Document } from '../../types';
import toast from 'react-hot-toast';

export default function DocumentsPage() {
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState('RC');
  const [file, setFile] = useState<File | null>(null);
  const [pin, setPin] = useState('');
  const [viewPin, setViewPin] = useState('');
  const [viewDocId, setViewDocId] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles-mine'],
    queryFn: () => vehicleApi.mine().then(r => r.data.data),
  });

  // Set default vehicle when data arrives
  if (vehicles.length > 0 && !selectedVehicle) {
    setSelectedVehicle(vehicles[0].id);
  }

  const { data: docs = [], refetch } = useQuery<Document[]>({
    queryKey: ['docs', selectedVehicle],
    queryFn: () => documentApi.list(selectedVehicle).then(r => r.data.data),
    enabled: !!selectedVehicle,
  });

  const uploadMut = useMutation({
    mutationFn: () => {
      if (!file || !pin || pin.length !== 4) throw new Error('File and 4-digit PIN required');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', docType);
      fd.append('pin', pin);
      return documentApi.upload(selectedVehicle, fd);
    },
    onSuccess: () => { setUploadOpen(false); setFile(null); setPin(''); refetch(); toast.success('Document uploaded'); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Upload failed'),
  });

  const accessMut = useMutation({
    mutationFn: () => documentApi.access(viewDocId!, '', viewPin),
    onSuccess: (res) => { setDocUrl(res.data.data.url); setViewPin(''); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Incorrect PIN'),
  });

  const vehicleOptions = vehicles.map(v => ({ value: v.id, label: `${v.registrationNumber} — ${v.make} ${v.model}` }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Documents</h1>
        <Button size="sm" icon={<Upload className="w-4 h-4" />} onClick={() => setUploadOpen(true)} disabled={!selectedVehicle}>
          Upload
        </Button>
      </div>

      {vehicles.length > 1 && (
        <Select label="Select Vehicle" options={vehicleOptions} value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} />
      )}

      {docs.length === 0 ? (
        <EmptyState icon={<FileText className="w-10 h-10" />} title="No documents" description="Upload your RC, Insurance, and PUC documents." action={<Button size="sm" onClick={() => setUploadOpen(true)}>Upload Document</Button>} />
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <Card key={doc.id}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{doc.type}</p>
                  <p className="text-xs text-gray-500 truncate">{doc.fileName} • {fileSize(doc.sizeBytes)}</p>
                  <p className="text-xs text-gray-400">Uploaded {formatDate(doc.uploadedAt)}</p>
                </div>
                <Button variant="outline" size="sm" icon={<Eye className="w-4 h-4" />} onClick={() => { setViewDocId(doc.id); setDocUrl(null); setViewPin(''); }}>
                  View
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Document">
        <div className="space-y-4">
          <Select label="Document Type" options={['RC','INSURANCE','PUC','OTHER'].map(v => ({ value: v, label: v }))} value={docType} onChange={e => setDocType(e.target.value)} />
          <div>
            <label className="text-sm font-medium text-gray-700">File (PDF/Image, max 5MB)</label>
            <label className={`mt-1 flex items-center gap-3 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors ${file ? 'border-brand-400 bg-brand-50' : 'border-gray-300 hover:border-brand-400'}`}>
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600 truncate">{file?.name ?? 'Choose file...'}</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Document PIN (4 digits)</label>
            <input type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-center text-xl tracking-widest font-mono" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button className="flex-1" loading={uploadMut.isPending} disabled={!file || pin.length !== 4} onClick={() => uploadMut.mutate()}>Upload</Button>
          </div>
        </div>
      </Modal>

      {/* View Document PIN Modal */}
      <Modal open={!!viewDocId} onClose={() => { setViewDocId(null); setDocUrl(null); }} title="View Document">
        {docUrl ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">Document access granted. Opens in new tab.</p>
            <a href={docUrl} target="_blank" rel="noopener noreferrer" className="block w-full bg-brand-600 text-white rounded-xl py-3 font-medium text-sm hover:bg-brand-700 transition-colors">
              Open Document
            </a>
            <p className="text-xs text-gray-400">Link expires in 15 minutes</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Enter the 4-digit PIN to access this document.</p>
            <input type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={viewPin} onChange={e => setViewPin(e.target.value.replace(/\D/g, ''))}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <Button className="w-full" loading={accessMut.isPending} disabled={viewPin.length !== 4} onClick={() => accessMut.mutate()}>
              Verify PIN
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
