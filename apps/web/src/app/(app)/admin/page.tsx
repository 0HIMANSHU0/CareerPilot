'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useCancelBookingMutation, useCompleteBookingMutation, useUsersQuery, errorMessage } from '@/store/api';
import { PageHeader } from '@/components/page-header';
import { BookingTable } from '@/components/bookings/booking-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

function UsersTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data } = useUsersQuery({ page, search: search || undefined });
  return (
    <div className="space-y-3" data-testid="admin-users">
      <Input placeholder="Search users by name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-sm" data-testid="admin-user-search" />
      <div className="divide-y rounded-lg border bg-card">
        {data?.items.map((u) => (
          <div key={u.id} className="flex items-center justify-between p-3 text-sm" data-testid={`admin-user-${u.id}`}>
            <div><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>
            <Badge variant="secondary">{u.role}</Badge>
          </div>
        ))}
      </div>
      {data && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {data.total} users · page {data.page}/{data.totalPages}
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)} data-testid="admin-users-prev">Prev</Button>
          <Button size="sm" variant="outline" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} data-testid="admin-users-next">Next</Button>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [cancel] = useCancelBookingMutation();
  const [complete] = useCompleteBookingMutation();
  const act = (p: Promise<unknown>, msg: string) => p.then(() => toast.success(msg)).catch((e) => toast.error(errorMessage(e)));
  return (
    <div className="space-y-10" data-testid="admin-page">
      <PageHeader eyebrow="Administration" title="Admin console" description="All bookings and users across the platform." />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">All bookings</h2>
        <BookingTable showClient actions={(b) => (
          <div className="flex justify-end gap-1">
            {b.status === 'CONFIRMED' && new Date(b.startTime) <= new Date() && <Button size="sm" variant="outline" onClick={() => act(complete(b.id).unwrap(), 'Completed')} data-testid={`admin-complete-${b.id}`}>Complete</Button>}
            {['PENDING_PAYMENT', 'CONFIRMED'].includes(b.status) && <Button size="sm" variant="ghost" onClick={() => window.confirm('Cancel booking?') && act(cancel(b.id).unwrap(), 'Cancelled')} data-testid={`admin-cancel-${b.id}`}>Cancel</Button>}
          </div>
        )} />
      </section>
      <section className="space-y-3"><h2 className="text-lg font-semibold">Users</h2><UsersTable /></section>
    </div>
  );
}
