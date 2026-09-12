import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Tag, Users, Car, AlertTriangle, Shield, BarChart2,
  Zap, CheckCircle, XCircle, Activity, TrendingUp,
  QrCode, Wifi, RefreshCw
} from 'lucide-react';
import { SkeletonCard } from '../../components/ui/Skeleton';
import type { DashboardStats } from '../../types';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';

// ── Compact stat card ─────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconBg: string;
  link?: string;
  badge?: string;
  badgeColor?: string;
}

function StatCard({ title, value, icon, iconBg, link, badge, badgeColor }: StatCardProps) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => link && navigate(link)}
      className={`bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3.5 ${link ? 'cursor-pointer hover:border-brand-300 hover:shadow-sm transition-all' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 font-medium truncate">{title}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5 leading-none">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      </div>
      {badge && (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${badgeColor ?? 'bg-gray-100 text-gray-600'}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading, refetch, isFetching } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard'],
    queryFn:  () => adminApi.dashboard().then(r => r.data.data),
    refetchInterval: 60_000,
  });

  const { data: scanData } = useQuery({
    queryKey: ['admin-scan-analytics'],
    queryFn:  () => adminApi.scanAnalytics().then(r => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  // Chart data
  const dailyData = (stats?.dailyScans ?? []).map(d => ({
    date: format(parseISO(String(d.date)), 'dd MMM'),
    scans: d.count,
  }));

  const pieData = [
    { name: 'QR',  value: scanData?.qrScans  ?? 0, color: '#3b82f6' },
    { name: 'NFC', value: scanData?.nfcScans ?? 0, color: '#8b5cf6' },
  ];

  const tagDistData = [
    { name: 'Unassigned', value: stats?.unassignedTags ?? 0, color: '#94a3b8' },
    { name: 'Active',     value: stats?.activeTags     ?? 0, color: '#22c55e' },
    { name: 'Inactive',   value: stats?.inactiveTags   ?? 0, color: '#f59e0b' },
    { name: 'Blocked',    value: stats?.blockedTags    ?? 0, color: '#ef4444' },
  ];

  const total    = stats?.totalTags ?? 0;
  const pctActive = total > 0 ? ((stats?.activeTags ?? 0) / total * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-5">

      {/* ── Page header ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Real-time platform overview</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── KPI Cards row 1 — Tags ─────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tags</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard title="Total Tags"      value={stats?.totalTags      ?? 0} icon={<Tag className="w-4.5 h-4.5 text-brand-600" />}         iconBg="bg-brand-100"  link="/admin/tags" />
          <StatCard title="Unassigned"      value={stats?.unassignedTags ?? 0} icon={<Tag className="w-4.5 h-4.5 text-gray-500" />}          iconBg="bg-gray-100"   link="/admin/tags?status=UNASSIGNED" />
          <StatCard title="Active"          value={stats?.activeTags     ?? 0} icon={<CheckCircle className="w-4.5 h-4.5 text-green-600" />} iconBg="bg-green-100"  link="/admin/tags?status=ACTIVE"     badge={`${pctActive}%`} badgeColor="bg-green-100 text-green-700" />
          <StatCard title="Inactive"        value={stats?.inactiveTags   ?? 0} icon={<Activity className="w-4.5 h-4.5 text-yellow-600" />}   iconBg="bg-yellow-100" link="/admin/tags?status=INACTIVE" />
          <StatCard title="Blocked"         value={stats?.blockedTags    ?? 0} icon={<XCircle className="w-4.5 h-4.5 text-red-600" />}       iconBg="bg-red-100"    link="/admin/tags?status=BLOCKED" />
        </div>
      </div>

      {/* ── KPI Cards row 2 — Platform ─────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Platform</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard title="Total Customers"    value={stats?.totalCustomers   ?? 0} icon={<Users className="w-4.5 h-4.5 text-blue-600" />}         iconBg="bg-blue-100"   link="/admin/customers" />
          <StatCard title="Total Vehicles"     value={stats?.totalVehicles    ?? 0} icon={<Car className="w-4.5 h-4.5 text-purple-600" />}          iconBg="bg-purple-100" link="/admin/vehicles" />
          <StatCard title="Insurance Expiring" value={stats?.insuranceExpiring ?? 0} icon={<Shield className="w-4.5 h-4.5 text-yellow-600" />}     iconBg="bg-yellow-100" link="/admin/expiry-radar" badge={stats?.insuranceExpiring ? 'Soon' : undefined} badgeColor="bg-yellow-100 text-yellow-700" />
          <StatCard title="PUC Expiring"       value={stats?.pucExpiring      ?? 0} icon={<Shield className="w-4.5 h-4.5 text-orange-600" />}       iconBg="bg-orange-100" link="/admin/expiry-radar" />
        </div>
      </div>

      {/* ── KPI Cards row 3 — Alerts ───────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Alerts & Activity</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard title="SOS Today"     value={stats?.sosToday      ?? 0} icon={<AlertTriangle className="w-4.5 h-4.5 text-red-600" />}    iconBg="bg-red-100"    link="/admin/sos"   badge={stats?.sosToday ? 'Alert' : undefined} badgeColor="bg-red-100 text-red-700" />
          <StatCard title="Unresolved SOS" value={stats?.unresolvedSOS ?? 0} icon={<Zap className="w-4.5 h-4.5 text-red-700" />}             iconBg="bg-red-100"    link="/admin/sos" />
          <StatCard title="Total Scans"   value={stats?.totalScans    ?? 0} icon={<BarChart2 className="w-4.5 h-4.5 text-teal-600" />}        iconBg="bg-teal-100"   link="/admin/scans" />
          <StatCard title="Scans Today"   value={scanData?.today      ?? 0} icon={<TrendingUp className="w-4.5 h-4.5 text-indigo-600" />}     iconBg="bg-indigo-100" link="/admin/scans" />
        </div>
      </div>

      {/* ── Tag utilisation bar ─────────────────────────────── */}
      {total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Tag Utilisation</h3>
            <div className="flex items-center gap-3">
              {tagDistData.map(t => (
                <div key={t.name} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                  <span className="text-xs text-gray-500">{t.name}</span>
                  <span className="text-xs font-semibold text-gray-700">({t.value})</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex gap-px">
            {tagDistData.map(t => (
              t.value > 0 && (
                <div
                  key={t.name}
                  title={`${t.name}: ${t.value}`}
                  className="h-full transition-all"
                  style={{ width: `${(t.value / total) * 100}%`, background: t.color }}
                />
              )
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-gray-400">{pctActive}% utilised</span>
            <button onClick={() => navigate('/admin/tags')} className="text-xs text-brand-600 hover:underline">Manage Tags →</button>
          </div>
        </div>
      )}

      {/* ── Charts row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Daily Scans — 2/3 width */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Daily Scans</h3>
            <span className="text-xs text-gray-400">Last 7 days</span>
          </div>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={dailyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="scans" name="Scans" stroke="#3b82f6" fill="url(#sg)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center gap-2">
              <BarChart2 className="w-8 h-8 text-gray-200" />
              <p className="text-sm text-gray-400">No scan data yet</p>
              <p className="text-xs text-gray-300">Scans will appear here once tags are used</p>
            </div>
          )}
        </div>

        {/* Scan Type Donut — 1/3 width */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Scan Type</h3>
          </div>
          {(pieData[0].value + pieData[1].value) > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center gap-2">
              <div className="flex gap-3">
                <QrCode className="w-7 h-7 text-gray-200" />
                <Wifi className="w-7 h-7 text-gray-200" />
              </div>
              <p className="text-sm text-gray-400">No scans yet</p>
            </div>
          )}
          {/* Scan stats below */}
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            {[
              { label: 'Today',      value: scanData?.today      ?? 0 },
              { label: 'This Week',  value: scanData?.thisWeek   ?? 0 },
              { label: 'This Month', value: scanData?.thisMonth  ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-xs font-bold text-gray-800">{value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row — Tag distribution + Activity ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-2">

        {/* Tag Status horizontal bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Tag Status Distribution</h3>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={tagDistData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Tags" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {tagDistData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Scan activity progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Scan Activity</h3>
          <div className="space-y-3.5">
            {[
              { label: 'Today',             value: scanData?.today            ?? 0, color: 'bg-brand-500' },
              { label: 'This Week',         value: scanData?.thisWeek         ?? 0, color: 'bg-blue-400' },
              { label: 'This Month',        value: scanData?.thisMonth        ?? 0, color: 'bg-indigo-400' },
              { label: 'Activation Scans',  value: scanData?.activationScans  ?? 0, color: 'bg-teal-500' },
              { label: 'QR Scans',          value: scanData?.qrScans          ?? 0, color: 'bg-violet-500' },
              { label: 'NFC Scans',         value: scanData?.nfcScans         ?? 0, color: 'bg-purple-400' },
            ].map(({ label, value, color }) => {
              const max = scanData?.thisMonth ?? 1;
              const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-28 flex-shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-800 w-8 text-right flex-shrink-0">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
