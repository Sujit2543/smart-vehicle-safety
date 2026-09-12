/**
 * Add seconds to a date
 */
export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Days until expiry (negative if expired)
 */
export function daysUntil(expiryDate: Date): number {
  const now = new Date();
  const diff = expiryDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get expiry color based on days remaining
 */
export function getExpiryColor(expiryDate: Date): 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'EXPIRED' {
  const days = daysUntil(expiryDate);
  if (days <= 0) return 'EXPIRED';
  if (days <= 7) return 'RED';
  if (days <= 14) return 'ORANGE';
  if (days <= 30) return 'YELLOW';
  return 'GREEN';
}

/**
 * Format date as DD/MM/YYYY
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
