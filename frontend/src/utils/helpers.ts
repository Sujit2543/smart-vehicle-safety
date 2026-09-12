import { ExpiryColor } from '../types';

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function expiryColorClass(color: ExpiryColor): string {
  const map: Record<ExpiryColor, string> = {
    GREEN:   'text-green-700 bg-green-100',
    YELLOW:  'text-yellow-700 bg-yellow-100',
    ORANGE:  'text-orange-700 bg-orange-100',
    RED:     'text-red-700 bg-red-100',
    EXPIRED: 'text-white bg-red-600',
  };
  return map[color] ?? 'text-gray-700 bg-gray-100';
}

export function tagStatusColor(status: string): string {
  const map: Record<string, string> = {
    UNASSIGNED: 'text-gray-600 bg-gray-100',
    ACTIVE:     'text-green-700 bg-green-100',
    INACTIVE:   'text-yellow-700 bg-yellow-100',
    BLOCKED:    'text-red-700 bg-red-100',
    EXPIRED:    'text-orange-700 bg-orange-100',
  };
  return map[status] ?? 'text-gray-600 bg-gray-100';
}

export function sosStatusColor(status: string): string {
  const map: Record<string, string> = {
    TRIGGERED:    'text-red-700 bg-red-100',
    NOTIFIED:     'text-orange-700 bg-orange-100',
    ACKNOWLEDGED: 'text-yellow-700 bg-yellow-100',
    RESOLVED:     'text-green-700 bg-green-100',
    CANCELLED:    'text-gray-600 bg-gray-100',
  };
  return map[status] ?? 'text-gray-600 bg-gray-100';
}

export function notifStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING:   'text-yellow-700 bg-yellow-100',
    SENT:      'text-blue-700 bg-blue-100',
    DELIVERED: 'text-green-700 bg-green-100',
    FAILED:    'text-red-700 bg-red-100',
  };
  return map[status] ?? 'text-gray-600 bg-gray-100';
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}
