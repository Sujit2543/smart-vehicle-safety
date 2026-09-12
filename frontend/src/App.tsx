import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';

import { CustomerLayout } from './components/layout/CustomerLayout';
import { AdminLayout }    from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// ── Page loader ───────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// PUBLIC PAGES  (no auth required)
// ═════════════════════════════════════════════════════════════

// QR/NFC scan landing + self-activation wizard
const TagScanPage    = lazy(() => import('./pages/public/TagScanPage'));
const ActivationPage = lazy(() => import('./pages/public/ActivationPage'));

// ═════════════════════════════════════════════════════════════
// CUSTOMER  AUTH
// ═════════════════════════════════════════════════════════════

const CustomerLoginPage = lazy(() => import('./pages/customer/LoginPage'));

// ═════════════════════════════════════════════════════════════
// CUSTOMER PORTAL  (/customer/*)
// ═════════════════════════════════════════════════════════════

const CustomerDashboard     = lazy(() => import('./pages/customer/DashboardPage'));
const CustomerVehicle       = lazy(() => import('./pages/customer/VehiclePage'));
const CustomerDocuments     = lazy(() => import('./pages/customer/DocumentsPage'));
const CustomerMaintenance   = lazy(() => import('./pages/customer/MaintenancePage'));
const CustomerExpiry        = lazy(() => import('./pages/customer/ExpiryPage'));
const CustomerBreakdown     = lazy(() => import('./pages/customer/BreakdownPage'));
const CustomerNotifications = lazy(() => import('./pages/customer/NotificationsPage'));
const CustomerProfile       = lazy(() => import('./pages/customer/ProfilePage'));

// ═════════════════════════════════════════════════════════════
// ADMIN  AUTH + PANEL  (/admin/*)
// ═════════════════════════════════════════════════════════════

const AdminLoginPage      = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminDashboard      = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminTagsPage       = lazy(() => import('./pages/admin/AdminTagsPage'));
const AdminTagDetail      = lazy(() => import('./pages/admin/AdminTagDetail'));
const AdminCustomers      = lazy(() => import('./pages/admin/AdminCustomers'));
const AdminVehicles       = lazy(() => import('./pages/admin/AdminVehicles'));
const AdminDocuments      = lazy(() => import('./pages/admin/AdminDocuments'));
const AdminSOSPage        = lazy(() => import('./pages/admin/AdminSOSPage'));
const AdminExpiryRadar    = lazy(() => import('./pages/admin/AdminExpiryRadar'));
const AdminNotifications  = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminWhatsApp       = lazy(() => import('./pages/admin/AdminWhatsApp'));
const AdminScans          = lazy(() => import('./pages/admin/AdminScans'));
const AdminAuditLogs      = lazy(() => import('./pages/admin/AdminAuditLogs'));
const AdminBreakdown      = lazy(() => import('./pages/admin/AdminBreakdown'));
const AdminSettings       = lazy(() => import('./pages/admin/AdminSettings'));

// ═════════════════════════════════════════════════════════════
// ROUTER
// ═════════════════════════════════════════════════════════════

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* ── PUBLIC ─────────────────────────────────────── */}

        {/* The entry-point when someone scans a physical QR tag */}
        <Route path="/tag/:tagId"      element={<TagScanPage />} />
        {/* Self-activation wizard (reached from TagScanPage) */}
        <Route path="/activate/:tagId" element={<ActivationPage />} />

        {/* ── CUSTOMER AUTH ──────────────────────────────── */}

        <Route path="/customer/login" element={<CustomerLoginPage />} />
        {/* Alias: /login → same login page */}
        <Route path="/login"          element={<CustomerLoginPage />} />

        {/* ── CUSTOMER PORTAL ────────────────────────────── */}

        <Route
          element={
            <ProtectedRoute requireRole="CUSTOMER" redirectTo="/customer/login">
              <CustomerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/customer/dashboard"      element={<CustomerDashboard />} />
          <Route path="/customer/vehicle"        element={<CustomerVehicle />} />
          <Route path="/customer/documents"      element={<CustomerDocuments />} />
          <Route path="/customer/maintenance"    element={<CustomerMaintenance />} />
          <Route path="/customer/expiry"         element={<CustomerExpiry />} />
          <Route path="/customer/breakdown"      element={<CustomerBreakdown />} />
          <Route path="/customer/notifications"  element={<CustomerNotifications />} />
          <Route path="/customer/profile"        element={<CustomerProfile />} />
        </Route>

        {/* Legacy paths — redirect to new /customer/* equivalents */}
        <Route path="/dashboard"         element={<Navigate to="/customer/dashboard"      replace />} />
        <Route path="/vehicles"          element={<Navigate to="/customer/vehicle"         replace />} />
        <Route path="/vehicles/:id"      element={<Navigate to="/customer/vehicle"         replace />} />
        <Route path="/documents"         element={<Navigate to="/customer/documents"       replace />} />
        <Route path="/maintenance"       element={<Navigate to="/customer/maintenance"     replace />} />
        <Route path="/expiry"            element={<Navigate to="/customer/expiry"          replace />} />
        <Route path="/notifications"     element={<Navigate to="/customer/notifications"   replace />} />
        <Route path="/profile"           element={<Navigate to="/customer/profile"         replace />} />
        <Route path="/sos-history"       element={<Navigate to="/customer/dashboard"       replace />} />
        <Route path="/breakdown-history" element={<Navigate to="/customer/breakdown"       replace />} />
        <Route path="/verify-otp"        element={<Navigate to="/customer/login"           replace />} />

        {/* ── ADMIN AUTH ─────────────────────────────────── */}

        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* ── ADMIN PANEL ────────────────────────────────── */}

        <Route
          element={
            <ProtectedRoute requireRole="ADMIN" redirectTo="/admin/login">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin/dashboard"     element={<AdminDashboard />} />
          <Route path="/admin/tags"          element={<AdminTagsPage />} />
          <Route path="/admin/tags/:tagId"   element={<AdminTagDetail />} />
          <Route path="/admin/customers"     element={<AdminCustomers />} />
          <Route path="/admin/vehicles"      element={<AdminVehicles />} />
          <Route path="/admin/documents"     element={<AdminDocuments />} />
          <Route path="/admin/sos"           element={<AdminSOSPage />} />
          <Route path="/admin/expiry-radar"  element={<AdminExpiryRadar />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/whatsapp"      element={<AdminWhatsApp />} />
          <Route path="/admin/scans"         element={<AdminScans />} />
          <Route path="/admin/audit-logs"    element={<AdminAuditLogs />} />
          <Route path="/admin/breakdown"     element={<AdminBreakdown />} />
          <Route path="/admin/settings"      element={<AdminSettings />} />
        </Route>

        {/* ── DEFAULTS ───────────────────────────────────── */}

        {/* Root → customer login */}
        <Route path="/"      element={<Navigate to="/customer/login"    replace />} />
        {/* /admin → admin dashboard */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard"   replace />} />

        {/* 404 */}
        <Route path="*" element={
          <div className="flex items-center justify-center min-h-screen flex-col gap-4 bg-gray-50">
            <h1 className="text-8xl font-bold text-gray-100">404</h1>
            <p className="text-gray-500 font-semibold text-lg">Page not found</p>
            <div className="flex gap-3">
              <a href="/customer/login" className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors">
                Customer Login
              </a>
              <a href="/admin/login" className="px-4 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                Admin Login
              </a>
            </div>
          </div>
        } />

      </Routes>
    </Suspense>
  );
}
