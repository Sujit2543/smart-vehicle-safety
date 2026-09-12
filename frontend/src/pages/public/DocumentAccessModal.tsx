import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { documentApi } from '../../services/api';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { FileText, Lock, Eye, ExternalLink } from 'lucide-react';
import type { Document } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  vehicleId: string;
  tagId: string;
}

export function DocumentAccessModal({ open, onClose, vehicleId, tagId }: Props) {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [docUrl, setDocUrl] = useState<string | null>(null);

  const { data: docs, isLoading } = useQuery({
    queryKey: ['public-docs', tagId],
    queryFn: () => documentApi.listByTag(tagId).then(r => r.data.data as Document[]),
    enabled: open && !!tagId,
  });

  const accessMutation = useMutation({
    mutationFn: () => documentApi.access(selectedDoc!.id, tagId, pin),
    onSuccess: (res) => {
      setDocUrl(res.data.data.url);
      toast.success('Access granted');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Incorrect PIN';
      setPinError(msg);
    },
  });

  const handleClose = () => {
    setSelectedDoc(null);
    setPin('');
    setPinError('');
    setDocUrl(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Vehicle Documents" size="md">
      {isLoading ? (
        <div className="py-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !docs?.length ? (
        <p className="text-center text-gray-500 py-8">No documents available for this vehicle.</p>
      ) : !selectedDoc ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 mb-4">Select a document to view. A 4-digit PIN is required.</p>
          {docs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-all text-left"
            >
              <FileText className="w-5 h-5 text-brand-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">{doc.type}</p>
                <p className="text-xs text-gray-500">{doc.fileName}</p>
              </div>
              <Lock className="w-4 h-4 text-gray-400 ml-auto" />
            </button>
          ))}
        </div>
      ) : docUrl ? (
        <div className="text-center space-y-4 py-4">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Eye className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Access Granted</p>
            <p className="text-sm text-gray-500">{selectedDoc.type} — {selectedDoc.fileName}</p>
          </div>
          <div className="flex gap-3">
            <a
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-brand-600 text-white rounded-xl py-3 font-medium text-sm hover:bg-brand-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Open Document
            </a>
            <Button variant="outline" onClick={() => { setSelectedDoc(null); setDocUrl(null); setPin(''); }}>
              Back
            </Button>
          </div>
          <p className="text-xs text-gray-400">This link expires in 15 minutes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setSelectedDoc(null)} className="text-sm text-brand-600 hover:underline">← Back</button>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <FileText className="w-5 h-5 text-gray-500" />
            <div>
              <p className="font-medium text-sm text-gray-900">{selectedDoc.type}</p>
              <p className="text-xs text-gray-500">{selectedDoc.fileName}</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Enter 4-digit PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            />
            {pinError && <p className="text-xs text-red-600 mt-1">{pinError}</p>}
          </div>
          <Button
            className="w-full"
            loading={accessMutation.isPending}
            disabled={pin.length !== 4}
            onClick={() => accessMutation.mutate()}
          >
            <Lock className="w-4 h-4" /> Verify PIN
          </Button>
        </div>
      )}
    </Modal>
  );
}
