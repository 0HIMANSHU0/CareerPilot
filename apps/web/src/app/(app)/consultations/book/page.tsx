'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { createBookingSchema, type Consultant, type CreateBookingInput } from '@careerpilot/shared';
import { useCheckoutMutation, useConsultantsQuery, useCreateBookingMutation, useMeQuery, useSlotsQuery, errorMessage } from '@/store/api';
import { PageHeader } from '@/components/page-header';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { inr } from '@/components/bookings/status-badge';
import { cn } from '@/lib/utils';

const todayUtc = () => new Date().toISOString().slice(0, 10);

function ConsultantPicker({ value, onChange }: { value?: Consultant; onChange: (c: Consultant) => void }) {
  const { data, isLoading } = useConsultantsQuery();
  if (isLoading) return <Skeleton className="h-32" />;
  if (!data?.items.length) return <p className="text-sm text-muted-foreground" data-testid="no-consultants">No consultants are available yet.</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {data.items.map((c) => (
        <button key={c.id} onClick={() => onChange(c)} data-testid={`consultant-card-${c.id}`}
          className={cn('rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/60', value?.id === c.id && 'border-primary ring-2 ring-primary/20')}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">{c.name}</p>
            <span className="font-mono text-sm font-bold">{inr(c.hourlyRate)}<span className="text-xs font-normal text-muted-foreground">/hr</span></span>
          </div>
          <p className="text-sm text-muted-foreground">{c.headline}</p>
          <div className="mt-2 flex flex-wrap gap-1">{c.expertise.map((e) => <Badge key={e} variant="secondary">{e}</Badge>)}</div>
        </button>
      ))}
    </div>
  );
}

function SlotPicker({ consultantId, date, value, onChange }: { consultantId: string; date: string; value?: string; onChange: (s: string) => void }) {
  const { data, isFetching, isError } = useSlotsQuery({ id: consultantId, date });
  if (isFetching) return <Skeleton className="h-12" />;
  if (isError) return <p className="text-sm text-destructive">Could not load slots.</p>;
  if (!data?.slots.length) return <p className="text-sm text-muted-foreground" data-testid="no-slots">No availability on this date. Try another day.</p>;
  return (
    <div className="flex flex-wrap gap-2" data-testid="slot-list">
      {data.slots.map((s) => (
        <button key={s.startTime} disabled={!s.available} onClick={() => onChange(s.startTime)} data-testid={`slot-${s.startTime}`}
          className={cn('rounded-md border px-3 py-2 font-mono text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through', value === s.startTime ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary')}>
          {new Date(s.startTime).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
        </button>
      ))}
    </div>
  );
}

export default function BookConsultationPage() {
  const { data: me } = useMeQuery();
  const [consultant, setConsultant] = useState<Consultant>();
  const [date, setDate] = useState(todayUtc());
  const [slot, setSlot] = useState<string>();
  const [createBooking, { isLoading: creating, error: createError }] = useCreateBookingMutation();
  const [checkout, { isLoading: paying, error: payError }] = useCheckoutMutation();
  const { register, handleSubmit, formState } = useForm<CreateBookingInput>({
    resolver: zodResolver(createBookingSchema),
    values: { consultantId: consultant?.id ?? '', startTime: slot ?? '', name: me?.user.name ?? '', email: me?.user.email ?? '', phone: me?.user.phone ?? '', agenda: '' },
  });

  // Create PENDING_PAYMENT booking, then redirect to Stripe (or mock) checkout.
  const onSubmit = async (v: CreateBookingInput) => {
    const res = await createBooking(v).unwrap().catch(() => null);
    if (!res) return;
    const pay = await checkout({ id: res.booking.id, originUrl: window.location.origin }).unwrap().catch(() => null);
    if (pay) window.location.assign(pay.url);
  };
  const err = createError || payError;

  return (
    <div className="max-w-4xl space-y-8" data-testid="book-consultation-page">
      <PageHeader eyebrow="Consultations" title="Book a consultation" description="60-minute sessions, paid securely. Times are in your local time zone." />
      <section className="space-y-3"><h2 className="font-semibold">1. Choose a consultant</h2><ConsultantPicker value={consultant} onChange={(c) => { setConsultant(c); setSlot(undefined); }} /></section>
      {consultant && (
        <section className="space-y-3">
          <h2 className="font-semibold">2. Pick a date and time</h2>
          <div className="max-w-xs space-y-1.5"><Label htmlFor="date">Date (UTC calendar day; slot times below are shown in your local time)</Label><Input id="date" type="date" min={todayUtc()} value={date} onChange={(e) => { setDate(e.target.value); setSlot(undefined); }} data-testid="booking-date-input" /></div>
          {date && <SlotPicker consultantId={consultant.id} date={date} value={slot} onChange={setSlot} />}
        </section>
      )}
      {consultant && slot && (
        <Card className="space-y-5 p-6">
          <h2 className="font-semibold">3. Your details</h2>
          {err && <Alert variant="destructive" data-testid="booking-error"><AlertDescription>{errorMessage(err)}</AlertDescription></Alert>}
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
            <FormField label="Name" testId="booking-name-input" error={formState.errors.name?.message} {...register('name')} />
            <FormField label="Email" type="email" testId="booking-email-input" error={formState.errors.email?.message} {...register('email')} />
            <FormField label="Phone" type="tel" testId="booking-phone-input" error={formState.errors.phone?.message} {...register('phone')} />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="agenda">Meeting agenda</Label>
              <Textarea id="agenda" rows={4} placeholder="What would you like to discuss?" data-testid="booking-agenda-input" {...register('agenda')} />
              {formState.errors.agenda && <p className="text-xs font-medium text-destructive" data-testid="booking-agenda-input-error">{formState.errors.agenda.message}</p>}
            </div>
            <div className="flex items-center justify-between gap-4 sm:col-span-2">
              <p className="text-sm">Total <span className="font-mono text-lg font-bold" data-testid="booking-total">{inr(consultant.hourlyRate)}</span></p>
              <Button type="submit" disabled={creating || paying} data-testid="booking-pay-button">{(creating || paying) && <Loader2 className="animate-spin" />} Continue to payment</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
