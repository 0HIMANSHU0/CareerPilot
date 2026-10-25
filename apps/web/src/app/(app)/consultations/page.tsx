'use client';

import Link from 'next/link';
import { CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useCancelBookingMutation, errorMessage } from '@/store/api';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { BookingTable } from '@/components/bookings/booking-table';

export default function ConsultationsPage() {
  const [cancel] = useCancelBookingMutation();
  return (
    <div data-testid="consultations-page">
      <PageHeader eyebrow="Career tools" title="Consultations" description="Your sessions with career experts. Times are shown in your local time zone."
        actions={<Button asChild data-testid="book-consultation-button"><Link href="/consultations/book"><CalendarPlus /> Book a session</Link></Button>} />
      <BookingTable
        actions={(b) =>
          ['PENDING_PAYMENT', 'CONFIRMED'].includes(b.status) && (
            <Button size="sm" variant="ghost" data-testid={`booking-cancel-${b.id}`}
              onClick={() => window.confirm('Cancel this booking?') && cancel(b.id).unwrap().then(() => toast.success('Booking cancelled')).catch((e) => toast.error(errorMessage(e)))}>Cancel</Button>
          )
        }
      />
    </div>
  );
}
