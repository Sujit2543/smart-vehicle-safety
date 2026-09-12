import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagApi } from '../../services/api';
import { useState } from 'react';
import {
  ArrowLeft, Download, FileText, QrCode,
  Tag, Car, User, Clock, Activity, Shield,
  Ban, CheckCircle, PowerOff, ExternalLink,
  MapPin, Smartphone, Globe, Calendar
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { formatDate, formatDateTime, tagStatusColor } from '../../utils/helpers';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

// ── Status badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${tagStatusColor(status)}`}>
      {status}
    </span>
  );
}

// ── History action colour ─────────────────────────────────────

function historyColor(action: string): string {
  const map: Record<string, string> = {
    CREATED:    'bg-blue-100 text-blue-700 border-blue-200',
    ACTIVATED:  'bg-green-100 text-green-700 border-green-200',
    ACTIVE:     'bg-green-100 text-green-700 border-green-200',
    INACTIVE:   'bg-yellow-100 text-yellow-700 border-yellow-200',
    BLOCKED:    'bg-red-100 text-red-700 border-red-200',
    REASSIGNED: 'bg-purple-100 text-purple-700 border-purple-200',
    EXPIRED:    'bg-orange-100 text-orange-700 border-orange-200',
  };
  return map[action] ?? 'bg-gray-100 text-gray-600 border-gray-200';
}

function historyIcon(action: string) {
  switch (action) {
    case 'CREATED':    return <Tag className="w-4 h-4" />;
    case 'ACTIVATED':
    case 'ACTIVE':     return <CheckCircle className="w-4 h-4" />;
    case 'INACTIVE':   return <PowerOff className="w-4 h-4" />;
    case 'BLOCKED':    return <Ban className="w-4 h-4" />;
    default:           return <Clock className="w-4 h-4" />;
  }
}

// ─────────────────────────────────────────────────────────────

export default function AdminTagDetail() {
  const { tagId }   = useParams<{ tagId: string }>();
  const navigate    = useNavigate();
  const qc          = useQueryClient();
  const appBase     = import.meta.env.VITE_APP_BASE_URL ?? 'http://localhost:3000';

  const [blockOpen,   setBlockOpen]   = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmOpts, setConfirmOpts] = useState<{ status: string; label: string } | null>(null);

  // ── Queries ───────────────────────────────────────────────

  const { data: tag, isLoading, error } = useQuery({
    queryKey: ['tag-detail', tagId],
    queryFn:  () => tagApi.get(tagId!).then(r => r.data.data),
    enabled:  !!tagId,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['tag-history', tagId],
    queryFn:  () => tagApi.history(tagId!).then(r => r.data.data),
    enabled:  !!tagId,
  });

  // ── Mutations ─────────────────────────────────────────────

  const statusMut = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
      tagApi.changeStatus(tagId!, status, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tag-detail', tagId] });
      qc.invalidateQueries({ queryKey: ['tag-history', tagId] });
      qc.invalidateQueries({ queryKey: ['admin-tags'] });
      qc.invalidateQueries({ queryKey: ['tag-stats'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setBlockOpen(false);
      setBlockReason('');
      setConfirmOpen(false);
      setConfirmOpts(null);
      toast.success('Tag status updated');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Action failed'),
  });

  // ── QR Download ───────────────────────────────────────────

  const downloadQR = async () => {
    try {
      const res = await tagApi.downloadQR(tagId!);
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href = url; a.download = `${tagId}.png`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const downloadPdf = async () => {
    const tid = toast.loading('Generating PDF…');
    try {
      const res = await tagApi.bulkQrPdf([tagId!]);
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href = url; a.download = `${tagId}-sticker.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.dismiss(tid);
      toast.success('PDF downloaded');
    } catch { toast.dismiss(tid); toast.error('PDF failed'); }
  };

  // ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error || !tag) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Tag className="w-12 h-12 text-gray-200" />
        <p className="text-gray-500 font-medium">Tag not found</p>
        <Button variant="outline" onClick={() => navigate('/admin/tags')} icon={<ArrowLeft className="w-4 h-4" />}>
          Back to Tags
        </Button>
      </div>
    );
  }

  const vehicle  = tag.vehicle as any;
  const customer = vehicle?.customer;
  const tagUrl   = `${appBase}/tag/${tag.tagId}`;

  // ── Allowed transitions ───────────────────────────────────
  const canDeactivate = tag.status === 'ACTIVE';
  const canActivate   = tag.status === 'INACTIVE';
  const canBlock      = tag.status === 'ACTIVE';
  const canUnblock    = tag.status === 'BLOCKED';

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/tags')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">{tag.tagId}</h1>
              <StatusBadge status={tag.status} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Tag Detail — Created {formatDate(tag.createdAt)}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={downloadQR}>
            QR PNG
          </Button>
          <Button variant="outline" size="sm" icon={<FileText className="w-4 h-4" />} onClick={downloadPdf}>
            PDF Sticker
          </Button>
          {canDeactivate && (
            <Button variant="secondary" size="sm" icon={<PowerOff className="w-4 h-4" />}
              onClick={() => { setConfirmOpts({ status: 'INACTIVE', label: 'Deactivate' }); setConfirmOpen(true); }}>
              Deactivate
            </Button>
          )}
          {canActivate && (
            <Button size="sm" icon={<CheckCircle className="w-4 h-4" />}
              onClick={() => { setConfirmOpts({ status: 'ACTIVE', label: 'Activate' }); setConfirmOpen(true); }}>
              Activate
            </Button>
          )}
          {canBlock && (
            <Button variant="danger" size="sm" icon={<Ban className="w-4 h-4" />}
              onClick={() => { setBlockReason(''); setBlockOpen(true); }}>
              Block
            </Button>
          )}
          {canUnblock && (
            <Button size="sm" icon={<CheckCircle className="w-4 h-4" />}
              onClick={() => { setConfirmOpts({ status: 'INACTIVE', label: 'Unblock' }); setConfirmOpen(true); }}>
              Unblock
            </Button>
          )}
        </div>
      </div>

      {/* ── Main Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column — tag info + QR */}
        <div className="space-y-4">

          {/* QR Code card */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-brand-600" /> QR Code
            </h3>
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                <QRCodeSVG value={tagUrl} size={140} level="H" includeMargin />
              </div>
              <p className="font-mono font-bold text-brand-600 text-lg">{tag.tagId}</p>
              <a
                href={tagUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-600 transition-colors break-all text-center"
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                {tagUrl}
              </a>
            </div>
          </Card>

          {/* Tag metadata */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-brand-600" /> Tag Info
            </h3>
            <dl className="space-y-2.5">
              {[
                { label: 'Tag ID',       value: <span className="font-mono font-bold text-brand-600">{tag.tagId}</span> },
                { label: 'Status',       value: <StatusBadge status={tag.status} /> },
                { label: 'Created',      value: formatDateTime(tag.createdAt) },
                { label: 'Activated',    value: tag.activatedAt ? formatDateTime(tag.activatedAt) : '—' },
                { label: 'Deactivated',  value: (tag as any).deactivatedAt ? formatDateTime((tag as any).deactivatedAt) : '—' },
                { label: 'Blocked',      value: tag.blockedAt ? formatDateTime(tag.blockedAt) : '—' },
                ...(tag.blockReason ? [{ label: 'Block Reason', value: <span className="text-red-600 text-sm">{tag.blockReason}</span> }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <dt className="text-xs text-gray-400 flex-shrink-0 w-28">{label}</dt>
                  <dd className="text-sm text-gray-800 text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Scan stats */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" /> Scan Activity
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-teal-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-teal-700">{tag.totalScans ?? 0}</p>
                <p className="text-xs text-teal-600 mt-0.5">Total Scans</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs font-medium text-gray-700 leading-tight">
                  {tag.lastScan ? formatDateTime(tag.lastScan.scannedAt) : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Last Scan</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Middle column — vehicle + customer */}
        <div className="space-y-4">

          {/* Vehicle info */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Car className="w-4 h-4 text-purple-600" /> Vehicle
            </h3>
            {vehicle ? (
              <dl className="space-y-2.5">
                {[
                  { label: 'Reg Number',  value: <span className="font-mono font-bold text-gray-900">{vehicle.registrationNumber}</span> },
                  { label: 'Make/Model',  value: `${vehicle.make} ${vehicle.model}` },
                  { label: 'Color',       value: vehicle.color },
                  { label: 'Year',        value: vehicle.manufacturingYear },
                  { label: 'Fuel Type',   value: vehicle.fuelType },
                  { label: 'Type',        value: vehicle.vehicleType?.replace(/_/g, ' ') },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <dt className="text-xs text-gray-400 flex-shrink-0 w-24">{label}</dt>
                    <dd className="text-sm text-gray-800 text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="flex flex-col items-center py-6 gap-2">
                <Car className="w-8 h-8 text-gray-200" />
                <p className="text-sm text-gray-400">Not Assigned</p>
                <p className="text-xs text-gray-300">Tag is waiting for activation</p>
              </div>
            )}
          </Card>

          {/* Customer info */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" /> Owner / Customer
            </h3>
            {customer ? (
              <dl className="space-y-2.5">
                {[
                  { label: 'Name',    value: customer.fullName },
                  { label: 'Mobile',  value: <span className="font-mono">{customer.mobile}</span> },
                  { label: 'Email',   value: customer.email ?? '—' },
                  { label: 'City',    value: customer.city ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <dt className="text-xs text-gray-400 flex-shrink-0 w-16">{label}</dt>
                    <dd className="text-sm text-gray-800 text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="flex flex-col items-center py-6 gap-2">
                <User className="w-8 h-8 text-gray-200" />
                <p className="text-sm text-gray-400">Not Assigned</p>
                <p className="text-xs text-gray-300">No customer linked yet</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right column — history */}
        <div>
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" /> Tag History
              </h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {history.length} event{history.length !== 1 ? 's' : ''}
              </span>
            </div>

            {history.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Clock className="w-8 h-8 text-gray-200" />
                <p className="text-sm text-gray-400">No history yet</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[2.125rem] top-0 bottom-0 w-px bg-gray-100" />
                <ul className="divide-y divide-gray-50">
                  {(history as any[]).map((h, idx) => (
                    <li key={h.id} className="flex gap-3 px-5 py-4 relative">
                      {/* Icon */}
                      <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center ${historyColor(h.action)}`}>
                        {historyIcon(h.action)}
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${historyColor(h.action)}`}>
                            {h.action}
                          </span>
                          <time className="text-xs text-gray-400 flex-shrink-0">
                            {formatDateTime(h.createdAt)}
                          </time>
                        </div>

                        {h.reason && (
                          <p className="text-xs text-gray-500 mt-1 italic">"{h.reason}"</p>
                        )}

                        {h.performedBy && (
                          <p className="text-xs text-gray-400 mt-1">
                            By: <span className="font-mono text-gray-600">{h.performedBy.slice(0, 12)}…</span>
                          </p>
                        )}

                        {h.metadata && (
                          <details className="mt-1">
                            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                              Metadata
                            </summary>
                            <pre className="text-xs text-gray-500 bg-gray-50 rounded p-2 mt-1 overflow-auto max-h-20">
                              {JSON.stringify(h.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Block Modal ─────────────────────────────────────── */}
      <Modal open={blockOpen} onClose={() => setBlockOpen(false)} title={`Block Tag ${tag.tagId}`} size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
            <Ban className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Blocking will prevent this tag from being scanned publicly. The vehicle owner will lose access.
            </p>
          </div>
          <Input
            label="Reason for blocking"
            value={blockReason}
            onChange={e => setBlockReason(e.target.value)}
            placeholder="e.g. Tag reported lost or stolen"
            hint="Recorded in audit log"
          />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setBlockOpen(false)}>Cancel</Button>
            <Button variant="danger" className="flex-1" loading={statusMut.isPending}
              onClick={() => statusMut.mutate({ status: 'BLOCKED', reason: blockReason })}>
              Block Tag
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Confirm Action Modal ─────────────────────────────── */}
      <Modal
        open={confirmOpen && !!confirmOpts}
        onClose={() => { setConfirmOpen(false); setConfirmOpts(null); }}
        title={`${confirmOpts?.label} Tag ${tag.tagId}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to <strong>{confirmOpts?.label?.toLowerCase()}</strong> this tag?
            This action will be recorded in the audit log.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1"
              onClick={() => { setConfirmOpen(false); setConfirmOpts(null); }}>
              Cancel
            </Button>
            <Button className="flex-1" loading={statusMut.isPending}
              onClick={() => confirmOpts && statusMut.mutate({ status: confirmOpts.status })}>
              {confirmOpts?.label}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
