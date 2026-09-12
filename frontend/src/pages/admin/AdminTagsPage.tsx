import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagApi } from '../../services/api';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tag, Plus, Download, Search, RefreshCw, FileDown,
  Eye, Ban, CheckCircle, PowerOff, MoreHorizontal, QrCode,
  ArrowUpDown, ArrowUp, ArrowDown, FileText
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { formatDate, tagStatusColor } from '../../utils/helpers';
import type { Tag as TagType, Pagination as PaginationMeta } from '../../types';
import toast from 'react-hot-toast';
import { GenerateTagsModal } from './GenerateTagsModal';

// ── Status badge ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${tagStatusColor(status)}`}>
      {status}
    </span>
  );
}

// ── Sort header ───────────────────────────────────────────────

function SortHeader({
  label, field, current, dir, onSort,
}: {
  label: string; field: string; current: string; dir: 'asc' | 'desc'; onSort: (f: string) => void;
}) {
  const active = current === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-gray-900 transition-colors font-semibold text-xs text-gray-500 uppercase tracking-wider"
    >
      {label}
      {active ? (
        dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

// ── Status filter options ────────────────────────────────────

const STATUS_OPTS = [
  { value: '',           label: 'All Statuses', dot: 'bg-gray-300' },
  { value: 'UNASSIGNED', label: 'Unassigned',   dot: 'bg-gray-400' },
  { value: 'ACTIVE',     label: 'Active',        dot: 'bg-green-500' },
  { value: 'INACTIVE',   label: 'Inactive',      dot: 'bg-yellow-500' },
  { value: 'BLOCKED',    label: 'Blocked',       dot: 'bg-red-500' },
  { value: 'EXPIRED',    label: 'Expired',       dot: 'bg-orange-500' },
];

// ─────────────────────────────────────────────────────────────

export default function AdminTagsPage() {
  const qc       = useQueryClient();
  const navigate = useNavigate();

  // ── List state ────────────────────────────────────────────
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [sortBy,  setSortBy]  = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // ── Selection ─────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── Modals ────────────────────────────────────────────────
  const [generateOpen, setGenerateOpen]   = useState(false);
  const [blockTag,     setBlockTag]       = useState<TagType | null>(null);
  const [blockReason,  setBlockReason]    = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    tag: TagType; action: 'ACTIVE' | 'INACTIVE'; label: string;
  } | null>(null);

  // ── Query ─────────────────────────────────────────────────
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-tags', page, search, status, sortBy, sortDir],
    queryFn:  () =>
      tagApi.list({ page, limit: 20, search: search || undefined, status: status || undefined, sortBy, sortDir })
        .then(r => r.data),
    staleTime: 30_000,
  });

  // Tag stats for header cards
  const { data: statsData } = useQuery({
    queryKey: ['tag-stats'],
    queryFn:  () => tagApi.stats().then(r => r.data.data),
    staleTime: 30_000,
  });

  const tags: TagType[]          = data?.data ?? [];
  const pagination: PaginationMeta | undefined = data?.pagination;

  // ── Mutations ─────────────────────────────────────────────
  const statusMut = useMutation({
    mutationFn: ({ tagId, status, reason }: { tagId: string; status: string; reason?: string }) =>
      tagApi.changeStatus(tagId, status, reason),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-tags'] });
      qc.invalidateQueries({ queryKey: ['tag-stats'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setBlockTag(null);
      setBlockReason('');
      setConfirmAction(null);
      toast.success(`Tag ${vars.status.toLowerCase()} successfully`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Status change failed'),
  });

  // ── Sorting ───────────────────────────────────────────────
  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
    setPage(1);
  }, [sortBy]);

  // ── Selection ─────────────────────────────────────────────
  const toggleSelect = (tagId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(tagId) ? next.delete(tagId) : next.add(tagId);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === tags.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tags.map(t => t.tagId)));
    }
  };

  // ── Downloads ─────────────────────────────────────────────
  const downloadQR = async (tagId: string) => {
    try {
      const res = await tagApi.downloadQR(tagId);
      triggerDownload(res.data, `${tagId}.png`);
    } catch { toast.error('QR download failed'); }
  };

  const downloadZip = async () => {
    const ids = selected.size > 0 ? [...selected] : tags.map(t => t.tagId);
    if (ids.length === 0) { toast.error('No tags to download'); return; }
    const tid = toast.loading(`Generating ZIP for ${ids.length} tag(s)…`);
    try {
      const res = await tagApi.bulkQrZip(ids);
      triggerDownload(res.data, 'qr-codes.zip');
      toast.dismiss(tid);
      toast.success('ZIP downloaded');
    } catch { toast.dismiss(tid); toast.error('ZIP generation failed'); }
  };

  const downloadPdf = async () => {
    const ids = selected.size > 0 ? [...selected] : tags.map(t => t.tagId);
    if (ids.length === 0) { toast.error('No tags to download'); return; }
    const tid = toast.loading(`Generating PDF for ${ids.length} tag(s)…`);
    try {
      const res = await tagApi.bulkQrPdf(ids);
      triggerDownload(res.data, 'qr-stickers.pdf');
      toast.dismiss(tid);
      toast.success('PDF downloaded');
    } catch { toast.dismiss(tid); toast.error('PDF generation failed'); }
  };

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Page Header ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-6 h-6 text-brand-600" />
            Tags
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage QR/NFC safety tags</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <>
              <Button variant="outline" size="sm" icon={<FileDown className="w-4 h-4" />} onClick={downloadZip}>
                ZIP ({selected.size})
              </Button>
              <Button variant="outline" size="sm" icon={<FileText className="w-4 h-4" />} onClick={downloadPdf}>
                PDF ({selected.size})
              </Button>
            </>
          )}
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setGenerateOpen(true)}>
            Generate Tags
          </Button>
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────── */}
      {statsData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total',      value: statsData.total,      bg: 'bg-brand-50 border-brand-200',   text: 'text-brand-700' },
            { label: 'Unassigned', value: statsData.unassigned, bg: 'bg-gray-50 border-gray-200',      text: 'text-gray-600' },
            { label: 'Active',     value: statsData.active,     bg: 'bg-green-50 border-green-200',    text: 'text-green-700' },
            { label: 'Inactive',   value: statsData.inactive,   bg: 'bg-yellow-50 border-yellow-200',  text: 'text-yellow-700' },
            { label: 'Blocked',    value: statsData.blocked,    bg: 'bg-red-50 border-red-200',         text: 'text-red-700' },
            { label: 'Expired',    value: statsData.expired,    bg: 'bg-orange-50 border-orange-200',   text: 'text-orange-700' },
          ].map(s => (
            <div key={s.label}
              className={`rounded-xl border p-3 cursor-pointer transition-all hover:shadow-sm ${s.bg} ${status === (s.label === 'Total' ? '' : s.label.toUpperCase()) ? 'ring-2 ring-brand-400' : ''}`}
              onClick={() => { setStatus(s.label === 'Total' ? '' : s.label.toUpperCase()); setPage(1); }}
            >
              <p className={`text-2xl font-bold ${s.text}`}>{s.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────── */}
      <Card padding={false}>
        <div className="flex flex-wrap gap-3 p-4 border-b border-gray-100">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              placeholder="Search tag ID…  e.g. CD-1001"
              value={search}
              onChange={e => { setSearch(e.target.value.toUpperCase()); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_OPTS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setStatus(opt.value); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  status === opt.value
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400 hover:text-brand-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh + download all */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={downloadZip} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" title="Download all as ZIP">
              <FileDown className="w-4 h-4 text-gray-500" />
            </button>
            <button onClick={downloadPdf} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" title="Download all as PDF">
              <FileText className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={tags.length > 0 && selected.size === tags.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader label="Tag ID"     field="tagId"      current={sortBy} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader label="Status"     field="status"     current={sortBy} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-4 py-3 text-left">
                  <SortHeader label="Created"    field="createdAt"  current={sortBy} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader label="Activated"  field="activatedAt" current={sortBy} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-5 bg-gray-100 rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : tags.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <QrCode className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No tags found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {search || status
                        ? 'Try clearing your filters'
                        : 'Click "Generate Tags" to create your first batch'}
                    </p>
                    {!search && !status && (
                      <button
                        onClick={() => setGenerateOpen(true)}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Generate Tags
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                tags.map((tag) => (
                  <tr
                    key={tag.id}
                    className={`hover:bg-gray-50 transition-colors ${selected.has(tag.tagId) ? 'bg-brand-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(tag.tagId)}
                        onChange={() => toggleSelect(tag.tagId)}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                    </td>

                    {/* Tag ID */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/admin/tags/${tag.tagId}`)}
                        className="font-mono font-bold text-brand-600 hover:text-brand-800 hover:underline text-sm"
                      >
                        {tag.tagId}
                      </button>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={tag.status} />
                    </td>

                    {/* Vehicle */}
                    <td className="px-4 py-3">
                      {tag.vehicle ? (
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{(tag.vehicle as any).registrationNumber}</p>
                          <p className="text-xs text-gray-400">{(tag.vehicle as any).make} {(tag.vehicle as any).model}</p>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>

                    {/* Owner */}
                    <td className="px-4 py-3">
                      {(tag.vehicle as any)?.customer ? (
                        <div>
                          <p className="text-sm font-medium text-gray-800">{(tag.vehicle as any).customer.fullName}</p>
                          <p className="text-xs text-gray-400">{(tag.vehicle as any).customer.mobile}</p>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(tag.createdAt)}
                    </td>

                    {/* Activated */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {tag.activatedAt ? formatDate(tag.activatedAt) : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {/* View detail */}
                        <ActionBtn
                          icon={<Eye className="w-3.5 h-3.5" />}
                          label="View"
                          color="text-brand-600 hover:bg-brand-50"
                          onClick={() => navigate(`/admin/tags/${tag.tagId}`)}
                        />

                        {/* Download QR */}
                        <ActionBtn
                          icon={<Download className="w-3.5 h-3.5" />}
                          label="QR"
                          color="text-gray-500 hover:bg-gray-100"
                          onClick={() => downloadQR(tag.tagId)}
                        />

                        {/* ACTIVE → INACTIVE */}
                        {tag.status === 'ACTIVE' && (
                          <ActionBtn
                            icon={<PowerOff className="w-3.5 h-3.5" />}
                            label="Deactivate"
                            color="text-yellow-600 hover:bg-yellow-50"
                            onClick={() => setConfirmAction({ tag, action: 'INACTIVE', label: 'deactivate' })}
                          />
                        )}

                        {/* INACTIVE → ACTIVE */}
                        {tag.status === 'INACTIVE' && (
                          <ActionBtn
                            icon={<CheckCircle className="w-3.5 h-3.5" />}
                            label="Activate"
                            color="text-green-600 hover:bg-green-50"
                            onClick={() => setConfirmAction({ tag, action: 'ACTIVE', label: 'activate' })}
                          />
                        )}

                        {/* ACTIVE → BLOCKED */}
                        {tag.status === 'ACTIVE' && (
                          <ActionBtn
                            icon={<Ban className="w-3.5 h-3.5" />}
                            label="Block"
                            color="text-red-600 hover:bg-red-50"
                            onClick={() => { setBlockTag(tag); setBlockReason(''); }}
                          />
                        )}

                        {/* BLOCKED → INACTIVE (super admin only — route handles auth) */}
                        {tag.status === 'BLOCKED' && (
                          <ActionBtn
                            icon={<CheckCircle className="w-3.5 h-3.5" />}
                            label="Unblock"
                            color="text-green-600 hover:bg-green-50"
                            onClick={() => setConfirmAction({ tag, action: 'INACTIVE', label: 'unblock' })}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {selected.size > 0
                ? `${selected.size} selected · `
                : ''}
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total.toLocaleString()} tags
            </p>
            <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>

      {/* ── Generate Tags Modal ───────────────────────────── */}
      <GenerateTagsModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['admin-tags'] });
          qc.invalidateQueries({ queryKey: ['tag-stats'] });
          qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
        }}
      />

      {/* ── Block Tag Modal ───────────────────────────────── */}
      <Modal
        open={!!blockTag}
        onClose={() => setBlockTag(null)}
        title={`Block Tag ${blockTag?.tagId}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Blocking this tag will prevent it from being used for vehicle identification.
            The vehicle owner will not be able to access public features.
          </p>
          <Input
            label="Reason for blocking"
            value={blockReason}
            onChange={e => setBlockReason(e.target.value)}
            placeholder="e.g. Lost tag, reported stolen…"
            hint="This reason is recorded in the audit log"
          />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setBlockTag(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={statusMut.isPending}
              onClick={() => blockTag && statusMut.mutate({ tagId: blockTag.tagId, status: 'BLOCKED', reason: blockReason })}
            >
              Block Tag
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Confirm Action Dialog ─────────────────────────── */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && statusMut.mutate({ tagId: confirmAction.tag.tagId, status: confirmAction.action })}
        title={`Confirm: ${confirmAction?.label} ${confirmAction?.tag.tagId}`}
        message={`Are you sure you want to ${confirmAction?.label} this tag? This will be recorded in the audit log.`}
        confirmLabel={confirmAction?.label ?? 'Confirm'}
        danger={confirmAction?.action === 'INACTIVE'}
        loading={statusMut.isPending}
      />
    </div>
  );
}

// ── Small action icon button ──────────────────────────────────

function ActionBtn({ icon, label, color, onClick }: {
  icon: React.ReactNode; label: string; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-1.5 rounded-lg transition-colors ${color}`}
    >
      {icon}
    </button>
  );
}
