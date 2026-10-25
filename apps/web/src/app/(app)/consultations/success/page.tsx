'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useBookingQuery } from '@/store/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge, when } from '@/components/bookings/status-badge';

// Return page after checkout. It only DISPLAYS status (polling); confirmation happens server-side via webhook.
export default function BookingResultPage() {
  const [params, setParams] = useState<{ id: string; cancelled: boolean }>({ id: '', cancelled: false });
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setParams({ id: p.get('bookingId') || '', cancelled: p.has('cancelled') });
  }, []);
  const [polls, setPolls] = useState(0);
  const { data, refetch } = useBookingQuery(params.id, { skip: !params.id });
  const status = data?.booking.status;
  const waiting = status === 'PENDING_PAYMENT' || status === 'PAID';

  useEffect(() => {
    if (!waiting || params.cancelled || polls > 15) return;
    const t = setTimeout(() => { refetch(); setPolls((n) => n + 1); }, 2000);
    return () => clearTimeout(t);
  }, [waiting, polls, refetch, params.cancelled]);

  const b = data?.booking;
  return (
    <div className="mx-auto max-w-lg pt-8" data-testid="booking-result-page">
      <Card className="space-y-4 p-6">
        {status === 'CONFIRMED' && <h1 className="flex items-center gap-2 text-2xl font-bold text-emerald-700" data-testid="booking-confirmed"><CheckCircle2 /> Booking confirmed</h1>}
        {waiting && !params.cancelled && <h1 className="flex items-center gap-2 text-2xl font-bold" data-testid="booking-waiting"><Clock /> Confirming your payment…</h1>}
        {(status === 'PAYMENT_FAILED' || params.cancelled) && status !== 'CONFIRMED' && <h1 className="flex items-center gap-2 text-2xl font-bold text-destructive" data-testid="booking-failed"><XCircle /> Payment not completed</h1>}
        {b && (
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <dt className="text-muted-foreground">Status</dt><dd className="col-span-2"><StatusBadge status={b.status} /></dd>
            <dt className="text-muted-foreground">Consultant</dt><dd className="col-span-2">{b.consultantName}</dd>
            <dt className="text-muted-foreground">When</dt><dd className="col-span-2">{when(b.startTime)}</dd>
            <dt className="text-muted-foreground">Meeting</dt><dd className="col-span-2 break-all" data-testid="booking-meeting-link">{b.calendar?.meetingUrl ? <a className="text-primary underline" href={b.calendar.meetingUrl} target="_blank" rel="noreferrer">{b.calendar.meetingUrl}</a> : 'Pending'}</dd>
            <dt className="text-muted-foreground">Email</dt><dd className="col-span-2" data-testid="booking-email-status">{b.notification?.status === 'DONE' ? `Sent to ${b.email}` : b.notification?.status || 'Pending'}</dd>
            <dt className="text-muted-foreground">Booking ID</dt><dd className="col-span-2 font-mono text-xs">{b.id}</dd>
          </dl>
        )}
        <Button asChild data-testid="view-consultations-link"><Link href="/consultations">View my consultations</Link></Button>
      </Card>
    </div>
  );
}
