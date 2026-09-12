import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Tag, Users, Car, FileText, AlertTriangle,
  Radar, MessageSquare, Bell, BarChart2, ClipboardList,
  Settings, LogOut, Shield, Menu, X, Wrench, ChevronDown
} from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../services/api';
import toast from 'react-hot-toast';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/admin/tags',      icon: Tag,         label: 'Tags' },
      { to: '/admin/customers', icon: Users,        label: 'Customers' },
      { to: '/admin/vehicles',  icon: Car,          label: 'Vehicles' },
      { to: '/admin/documents', icon: FileText,     label: 'Documents' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/sos',        icon: AlertTriangle, label: 'SOS Events' },
      { to: '/admin/breakdown',  icon: Wrench,        label: 'Breakdown' },
      { to: '/admin/expiry-radar', icon: Radar,       label: 'Expiry Radar' },
      { to: '/admin/notifications', icon: Bell,       label: 'Notifications' },
      { to: '/admin/whatsapp',   icon: MessageSquare, label: 'WhatsApp' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/admin/scans',      icon: BarChart2,    label: 'Scan Analytics' },
      { to: '/admin/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { clearAuth, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearAuth();
    navigate('/admin/login');
    toast.success('Logged out');
  };

  const initial = (user?.email ?? 'A')[0].toUpperCase();

  return (
    // Full-screen fixed layout — sidebar + content side by side, both full height
    <div className="h-screen flex overflow-hidden bg-gray-50">

      {/* ── Mobile overlay ──────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside
        className={clsx(
          // Always fixed on mobile, static (in-flow) on desktop
          'fixed lg:static inset-y-0 left-0 z-40',
          'w-56 bg-gray-900 flex flex-col',
          'transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800 flex-shrink-0">
          <Link to="/admin/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold text-sm leading-tight">Car Deal</div>
              <div className="text-gray-400 text-xs leading-tight">Safety Tag Admin</div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5 scrollbar-hide">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2 mb-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/admin/dashboard'}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => clsx(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="flex-shrink-0 border-t border-gray-800 p-3">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1 rounded-lg">
            <div className="w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-300 truncate">{user?.email ?? 'Admin'}</p>
              <p className="text-[10px] text-gray-500">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar — mobile only */}
        <header className="lg:hidden flex-shrink-0 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-500 rounded-lg flex items-center justify-center">
              <Shield className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-sm">Admin Panel</span>
          </div>
        </header>

        {/* Page content — this scrolls independently */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-5 lg:p-6 max-w-screen-2xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
