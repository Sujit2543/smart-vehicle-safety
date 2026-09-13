import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { customerApi, documentApi } from '../../services/api';
import {
  FileText, Upload, Eye, Check, X, ExternalLink,
  Lock, Info, Shield, Loader2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { formatDate, fileSize } from '../../utils/helpers';
import toast from 'react-hot-toast';

const DOC_TYPES = [
  { key: 'RC',        label: 'RC',        desc: 'Registration Certificate', color: 'bg-blue-100 text-blue-700' },
  { key: 'INSURANCE', label: 'Insurance', desc: 'Insurance Certificate',    color: 'bg-green-100 text-green-700' },
  { key: 'PUC',       label: 'PUC',       desc: 'Pollution Certificate',    color: 'bg-purple-100 text-purple-700' },
];

export default function CustomerDocumentsPage() {
  const qc = useQueryClient();

  const [uploadType, setUploadType] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPin,  setUploadPin]  = useState('');
  const [viewDoc,    setViewDoc]    = useState<any | null>(null);
  const [viewPin,    setViewPin]    = useState('');
  const [docUrl,     setDocUrl]     = useState<string | null>(null);
  const [viewError,  setViewError]  = useState('');
  const [vehicleId,  setVehicleId]  = useState<string | null>(null);

  // ── Fetch vehicles ───────────────────────────────────────────
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn: () => customerApi.getMyVehicles().then(r => r.data.data),
  });

  // onSuccess was removed in TanStack Query v5 — use useEffect to react to data
  useEffect(() => {
    const list = vehicles as any[];
    if (list.length > 0 && !vehicleId) {
      setVehicleId(list[0].id);
    }
  }, [vehicles]);

  // ── Fetch documents for selected vehicle ─────────────────────
  const { data: docs = [], refetch } = useQuery({
    queryKey: ['my-docs', vehicleId],
    queryFn: () => documentApi.list(vehicleId!).then(r => r.data.data),
    enabled: !!vehicleId,
  });

  const docOf = (type: string) => (docs as any[]).find(d => d.type === type);

  // ── Upload mutation ──────────────────────────────────────────
  const uploadMut = useMutation({
    mutationFn: () => {
      if (!vehicleId)  throw new Error('No vehicle selected — please activate a tag first.');
      if (!uploadFile) throw new Error('Please select a file.');
      if (uploadPin.length !== 4) throw new Error('PIN must be exactly 4 digits.');
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('type', uploadType!);
      fd.append('pin', uploadPin);
      return documentApi.upload(vehicleId, fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-docs', vehicleId] });
      setUploadType(null);
      setUploadFile(null);
      setUploadPin('');
      toast.success('Document uploaded successfully');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? e.message ?? 'Upload failed'),
  });

  // ── View / access mutation ───────────────────────────────────
  const accessMut = useMutation({
    mutationFn: async () => {
      if (!viewDoc || !viewPin) throw new Error('Missing fields');
      const v = (vehicles as any[]).find(v => v.id === vehicleId);
      const tagId = v?.tag?.tagId ?? '';
      const res = await documentApi.access(viewDoc.id, tagId, viewPin);
      return res.data.data.url as string;
    },
    onSuccess: (url: string) => { setDocUrl(url); setViewPin(''); setViewError(''); },
    onError: (e: any) => setViewError(e.response?.data?.message ?? 'Incorrect PIN'),
  });

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Documents</h1>
        <p className="text-sm text-gray-500 mt-0.5">Store and access your vehicle documents securely</p>
      </div>

      {/* Loading */}
      {vehiclesLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        </div>
      )}

      {/* No vehicle */}
      {!vehiclesLoading && (vehicles as any[]).length === 0 && (
        <div className="text-center py-16 space-y-3">
          <FileText className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-600 font-semibold">No vehicle registered yet</p>
          <p className="text-sm text-gray-400">Scan your physical tag and complete activation to upload documents.</p>
        </div>
      )}

      {/* Main content */}
      {!vehiclesLoading && (vehicles as any[]).length > 0 && (
        <>
          {/* Info banner */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Documents are stored in a private encrypted vault. A 4-digit PIN is required to view them from the public vehicle page.
            </p>
          </div>

          {/* Vehicle selector — show if more than one vehicle */}
          {(vehicles as any[]).length > 1 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Vehicle</label>
              <select
                value={vehicleId ?? ''}
                onChange={e => setVehicleId(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {(vehicles as any[]).map((v: any) => (
                  <option key={v.id} value={v.id}>{v.registrationNumber} — {v.make} {v.model}</option>
                ))}
              </select>
            </div>
          )}

          {/* Document cards */}
          <div className="space-y-3">
            {DOC_TYPES.map(dt => {
              const doc = docOf(dt.key);
              return (
                <Card key={dt.key}>
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${dt.color}`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{dt.label}</p>
                        {doc
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" /> Uploaded
                            </span>
                          : <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Not uploaded</span>
                        }
                      </div>
                      <p className="text-xs text-gray-500">{dt.desc}</p>
                      {doc && <p className="text-xs text-gray-400 mt-0.5">{doc.fileName} · {fileSize(doc.sizeBytes)} · {formatDate(doc.uploadedAt)}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {doc && (
                        <Button variant="outline" size="sm" icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => { setViewDoc(doc); setDocUrl(null); setViewPin(''); setViewError(''); }}>
                          View
                        </Button>
                      )}
                      <Button size="sm" icon={<Upload className="w-3.5 h-3.5" />}
                        onClick={() => { setUploadType(dt.key); setUploadFile(null); setUploadPin(''); }}>
                        {doc ? 'Replace' : 'Upload'}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ── Upload Modal ──────────────────────────────────────── */}
      <Modal open={!!uploadType} onClose={() => setUploadType(null)} title={`Upload ${uploadType} Document`}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Select File</label>
            <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors ${uploadFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-brand-400'}`}>
              <input type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => setUploadFile(e.target.files?.[0] ?? null)} />
              {uploadFile
                ? <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                : <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />}
              <div>
                <p className="text-sm font-medium text-gray-700 truncate">{uploadFile?.name ?? 'Choose PDF, JPG or PNG'}</p>
                <p className="text-xs text-gray-400">Max 10 MB</p>
              </div>
              {uploadFile && (
                <button type="button" onClick={e => { e.preventDefault(); setUploadFile(null); }}
                  className="ml-auto text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              )}
            </label>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Document PIN <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1 text-xs">(4 digits — set during activation)</span>
            </label>
            <input
              type="password" inputMode="numeric" maxLength={4} placeholder="••••"
              value={uploadPin}
              onChange={e => setUploadPin(e.target.value.replace(/\D/g, ''))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setUploadType(null)}>Cancel</Button>
            <Button className="flex-1" loading={uploadMut.isPending}
              disabled={!uploadFile || uploadPin.length !== 4}
              onClick={() => uploadMut.mutate()}>
              Upload
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── View Document Modal ───────────────────────────────── */}
      <Modal
        open={!!viewDoc}
        onClose={() => { setViewDoc(null); setDocUrl(null); setViewPin(''); setViewError(''); }}
        title="View Document"
      >
        {docUrl ? (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Access Granted</p>
              <p className="text-sm text-gray-500">{viewDoc?.fileName}</p>
            </div>
            <a href={docUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-3 font-medium text-sm transition-colors">
              <ExternalLink className="w-4 h-4" /> Open Document
            </a>
            <p className="text-xs text-gray-400">Link expires in 15 minutes</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter your 4-digit document PIN to access <strong>{viewDoc?.fileName}</strong>.
            </p>
            <div>
              <input
                type="password" inputMode="numeric" maxLength={4} placeholder="••••"
                value={viewPin}
                onChange={e => { setViewPin(e.target.value.replace(/\D/g, '')); setViewError(''); }}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {viewError && <p className="text-xs text-red-500 mt-1">{viewError}</p>}
            </div>
            <Button className="w-full" loading={accessMut.isPending}
              disabled={viewPin.length !== 4}
              onClick={() => accessMut.mutate()}>
              <Lock className="w-4 h-4" /> Verify PIN
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
