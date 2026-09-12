import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { tagApi } from '../../services/api';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Download, FileText, QrCode, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface GenerateResult {
  tagIds: string[];
  count: number;
  prefix: string;
  startNumber: number;
  endNumber: number;
}

export function GenerateTagsModal({ open, onClose, onSuccess }: Props) {
  const [quantity,    setQuantity]    = useState<number>(10);
  const [prefix,      setPrefix]      = useState('CD');
  const [startNumber, setStartNumber] = useState<number>(1001);
  const [result,      setResult]      = useState<GenerateResult | null>(null);
  const [downloading, setDownloading] = useState<'zip' | 'pdf' | null>(null);

  // ── Auto-suggest next number when prefix changes ──────────
  const { data: nextData, isFetching: fetchingNext } = useQuery({
    queryKey: ['next-number', prefix],
    queryFn:  () => tagApi.nextNumber(prefix.toUpperCase()).then(r => r.data.data),
    enabled:  open && prefix.length >= 1,
    staleTime: 0,
  });

  useEffect(() => {
    if (nextData?.nextNumber) setStartNumber(nextData.nextNumber);
  }, [nextData]);

  // Reset when modal opens
  useEffect(() => {
    if (open) { setResult(null); setQuantity(10); }
  }, [open]);

  // ── Preview ───────────────────────────────────────────────
  const padLen = Math.max(4, String(startNumber + Math.max(quantity, 1) - 1).length);
  const firstId = `${prefix.toUpperCase()}-${String(startNumber).padStart(padLen, '0')}`;
  const lastId  = `${prefix.toUpperCase()}-${String(startNumber + quantity - 1).padStart(padLen, '0')}`;

  // ── Validation ────────────────────────────────────────────
  const prefixValid    = /^[A-Z0-9]{1,5}$/.test(prefix.toUpperCase());
  const quantityValid  = quantity >= 1 && quantity <= 10000;
  const startValid     = startNumber >= 1;
  const formValid      = prefixValid && quantityValid && startValid;

  // ── Generate mutation ─────────────────────────────────────
  const generateMut = useMutation({
    mutationFn: () =>
      tagApi.bulkGenerate(quantity, prefix.toUpperCase(), startNumber)
        .then(r => r.data.data as GenerateResult),
    onSuccess: (data) => {
      setResult(data);
      onSuccess();
      toast.success(`✅ ${data.count} tags generated (${data.tagIds[0]} → ${data.tagIds[data.tagIds.length - 1]})`);
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message ?? 'Generation failed';
      toast.error(msg);
    },
  });

  // ── Downloads ─────────────────────────────────────────────
  const download = async (type: 'zip' | 'pdf') => {
    if (!result) return;
    setDownloading(type);
    try {
      const res = type === 'zip'
        ? await tagApi.bulkQrZip(result.tagIds)
        : await tagApi.bulkQrPdf(result.tagIds);

      const url      = URL.createObjectURL(res.data);
      const a        = document.createElement('a');
      const filename = type === 'zip' ? `${result.prefix}-tags.zip` : `${result.prefix}-stickers.pdf`;
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast.success(`${type.toUpperCase()} downloaded`);
    } catch {
      toast.error(`${type.toUpperCase()} download failed`);
    } finally {
      setDownloading(null);
    }
  };

  const handleClose = () => {
    if (generateMut.isPending || downloading) return;
    setResult(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Generate New Tags"
      size="md"
    >
      {/* ── Success state ───────────────────────────────── */}
      {result ? (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">
                {result.count.toLocaleString()} Tags Generated!
              </p>
              <p className="text-sm text-gray-500 mt-0.5 font-mono">
                {result.tagIds[0]} → {result.tagIds[result.tagIds.length - 1]}
              </p>
            </div>
          </div>

          {/* Preview grid */}
          <div className="bg-gray-50 rounded-xl p-3 max-h-40 overflow-y-auto">
            <div className="grid grid-cols-4 gap-1.5">
              {result.tagIds.slice(0, 40).map(id => (
                <span key={id} className="font-mono text-xs bg-white border border-gray-200 rounded px-2 py-1 text-center text-gray-700">
                  {id}
                </span>
              ))}
              {result.tagIds.length > 40 && (
                <span className="font-mono text-xs text-gray-400 col-span-4 text-center pt-1">
                  +{result.tagIds.length - 40} more…
                </span>
              )}
            </div>
          </div>

          {/* Download buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => download('zip')}
              disabled={!!downloading}
              className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-all disabled:opacity-50"
            >
              <Download className={`w-6 h-6 text-brand-600 ${downloading === 'zip' ? 'animate-bounce' : ''}`} />
              <div className="text-center">
                <p className="font-semibold text-sm text-gray-900">Download ZIP</p>
                <p className="text-xs text-gray-400">{result.count} × QR PNG files</p>
              </div>
            </button>
            <button
              onClick={() => download('pdf')}
              disabled={!!downloading}
              className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-all disabled:opacity-50"
            >
              <FileText className={`w-6 h-6 text-brand-600 ${downloading === 'pdf' ? 'animate-bounce' : ''}`} />
              <div className="text-center">
                <p className="font-semibold text-sm text-gray-900">Download PDF</p>
                <p className="text-xs text-gray-400">A4 sticker sheet, 12/page</p>
              </div>
            </button>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleClose}>Close</Button>
            <Button
              className="flex-1"
              onClick={() => { setResult(null); setQuantity(10); }}
            >
              Generate More
            </Button>
          </div>
        </div>
      ) : (
        /* ── Form state ──────────────────────────────────── */
        <div className="space-y-5">
          <p className="text-sm text-gray-500">
            Generate a batch of unique safety tag IDs. Each tag gets a QR code URL pointing to
            <span className="font-mono text-brand-600"> /tag/{'<ID>'}</span>.
          </p>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-2">(1 – 10,000)</span>
            </label>
            <div className="flex gap-2">
              {[10, 50, 100, 500, 1000].map(n => (
                <button
                  key={n}
                  onClick={() => setQuantity(n)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    quantity === n
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
                  }`}
                >
                  {n.toLocaleString()}
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={10000}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, Math.min(10000, Number(e.target.value))))}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-0"
                placeholder="Custom"
              />
            </div>
            {!quantityValid && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Must be between 1 and 10,000
              </p>
            )}
          </div>

          {/* Prefix + Start Number */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prefix <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={5}
                value={prefix}
                onChange={e => setPrefix(e.target.value.toUpperCase())}
                placeholder="CD"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                  prefix && !prefixValid ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {prefix && !prefixValid && (
                <p className="text-xs text-red-500 mt-1">1–5 uppercase letters/numbers</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Starting Number <span className="text-red-500">*</span>
                {fetchingNext && <span className="text-xs text-gray-400 ml-1">(checking…)</span>}
              </label>
              <input
                type="number"
                min={1}
                value={startNumber}
                onChange={e => setStartNumber(Math.max(1, Number(e.target.value)))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Preview */}
          {formValid && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-2">
                Preview
              </p>
              <div className="flex items-center gap-3">
                <QrCode className="w-8 h-8 text-brand-500 flex-shrink-0" />
                <div>
                  <p className="font-mono font-bold text-brand-900 text-sm">
                    {firstId} → {lastId}
                  </p>
                  <p className="text-xs text-brand-600 mt-0.5">
                    {quantity.toLocaleString()} unique tags will be created with status <strong>UNASSIGNED</strong>
                  </p>
                </div>
              </div>
              <p className="text-xs text-brand-500 mt-2 font-mono">
                QR URL: {import.meta.env.VITE_APP_BASE_URL ?? 'http://localhost:3000'}/tag/{firstId}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              loading={generateMut.isPending}
              disabled={!formValid}
              onClick={() => generateMut.mutate()}
            >
              Generate {quantity.toLocaleString()} Tags
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
