import type { BookingStatus } from '@careerpilot/shared';
import { Badge } from '@/components/ui/badge';

const VARIANT: Record<BookingStatus, 'success' | 'warning' | 'danger' | 'secondary' | 'default'> = {
  PENDING_PAYMENT: 'warning',
  PAYMENT_FAILED: 'danger',
  PAID: 'default',
  CONFIRMED: 'success',
  CANCELLED: 'secondary',
  COMPLETED: 'default',
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge variant={VARIANT[status]} data-testid="booking-status-badge">{status.replace('_', ' ')}</Badge>;
}

export const inr = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
export const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
