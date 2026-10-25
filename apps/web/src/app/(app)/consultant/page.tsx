'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AvailabilityWindow, ConsultantProfileInput } from '@careerpilot/shared';
import { useCompleteBookingMutation, useMyConsultantQuery, useSaveConsultantMutation, errorMessage } from '@/store/api';
import { PageHeader } from '@/components/page-header';
import { BookingTable } from '@/components/bookings/booking-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EMPTY: ConsultantProfileInput = { headline: '', bio: '', expertise: [], hourlyRate: 1500, active: true, availability: [{ dayOfWeek: 1, startHour: 9, endHour: 17 }] };
const selectCls = 'h-9 rounded-md border border-input bg-background px-2 text-sm';

function ProfileForm() {
  const { data, isLoading } = useMyConsultantQuery();
  const [save, { isLoading: saving }] = useSaveConsultantMutation();
  const [form, setForm] = useState<ConsultantProfileInput>(EMPTY);
  useEffect(() => {
    if (data?.consultant) {
      const { headline, bio, expertise, hourlyRate, active, availability } = data.consultant;
      setForm({ headline, bio, expertise, hourlyRate, active, availability });
    }
  }, [data]);
  if (isLoading) return <Skeleton className="h-64" />;

  const setWin = (i: number, patch: Partial<AvailabilityWindow>) => setForm({ ...form, availability: form.availability.map((w, idx) => (idx === i ? { ...w, ...patch } : w)) });
  const submit = () => save(form).unwrap().then(() => toast.success('Profile saved')).catch((e) => toast.error(errorMessage(e)));

  return (
    <Card data-testid="consultant-profile-form">
      <CardHeader><CardTitle className="text-base">{data?.consultant ? 'Your public profile' : 'Create your consultant profile to start receiving bookings'}</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2"><Label>Headline</Label><Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} data-testid="consultant-headline-input" /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Bio</Label><Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} data-testid="consultant-bio-input" /></div>
        <div className="space-y-1.5"><Label>Expertise (comma separated)</Label><Input value={form.expertise.join(', ')} onChange={(e) => setForm({ ...form, expertise: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} data-testid="consultant-expertise-input" /></div>
        <div className="space-y-1.5"><Label>Hourly rate (INR)</Label><Input type="number" min={100} value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })} data-testid="consultant-rate-input" /></div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Weekly availability (UTC hours, 60-minute slots)</Label>
          {form.availability.map((w, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2" data-testid={`availability-row-${i}`}>
              <select className={selectCls} value={w.dayOfWeek} onChange={(e) => setWin(i, { dayOfWeek: Number(e.target.value) })} data-testid={`availability-day-${i}`}>{DAYS.map((d, idx) => <option key={d} value={idx}>{d}</option>)}</select>
              <select className={selectCls} value={w.startHour} onChange={(e) => setWin(i, { startHour: Number(e.target.value) })} data-testid={`availability-start-${i}`}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select>
              <span className="text-sm">to</span>
              <select className={selectCls} value={w.endHour} onChange={(e) => setWin(i, { endHour: Number(e.target.value) })} data-testid={`availability-end-${i}`}>{Array.from({ length: 24 }, (_, h) => h + 1).map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select>
              <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, availability: form.availability.filter((_, idx) => idx !== i) })} data-testid={`availability-remove-${i}`}><Trash2 /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setForm({ ...form, availability: [...form.availability, { dayOfWeek: 1, startHour: 9, endHour: 17 }] })} data-testid="availability-add"><Plus /> Add window</Button>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} data-testid="consultant-active-checkbox" /> Accepting bookings</label>
        <div className="sm:col-span-2"><Button onClick={submit} disabled={saving} data-testid="consultant-save-button">{saving && <Loader2 className="animate-spin" />} Save profile</Button></div>
      </CardContent>
    </Card>
  );
}

export default function ConsultantPage() {
  const [complete] = useCompleteBookingMutation();
  return (
    <div className="space-y-8" data-testid="consultant-page">
      <PageHeader eyebrow="Consultant" title="My sessions" description="Manage your rate, availability and booked sessions." />
      <ProfileForm />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Booked sessions</h2>
        <BookingTable showClient actions={(b) => b.status === 'CONFIRMED' && new Date(b.startTime) <= new Date() && (
          <Button size="sm" variant="outline" data-testid={`booking-complete-${b.id}`} onClick={() => complete(b.id).unwrap().then(() => toast.success('Marked completed')).catch((e) => toast.error(errorMessage(e)))}>Mark completed</Button>
        )} />
      </section>
    </div>
  );
}
