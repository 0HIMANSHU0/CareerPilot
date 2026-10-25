'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { Booking, BookingStatus } from '@careerpilot/shared';
import { useBookingsQuery, type BookingQuery } from '@/store/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, inr, when } from './status-badge';

const STATUSES: BookingStatus[] = ['PENDING_PAYMENT', 'PAYMENT_FAILED', 'PAID', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
const SORTS = [['-startTime', 'Session date (latest)'], ['startTime', 'Session date (earliest)'], ['-createdAt', 'Newest booked'], ['-amount', 'Amount (high)']];
const selectCls = 'h-10 rounded-md border border-input bg-background px-3 text-sm';

// Server-side paginated / searchable / sortable / filterable bookings table (shared by user, consultant and admin pages).
export function BookingTable({ actions, showClient }: { actions?: (b: Booking) => React.ReactNode; showClient?: boolean }) {
  const [query, setQuery] = useState<BookingQuery>({ page: 1, limit: 10, status: '', search: '', sort: '-startTime' });
  const [search, setSearch] = useState('');
  const { data, isFetching, isError } = useBookingsQuery(query);

  useEffect(() => {
    const t = setTimeout(() => setQuery((q) => ({ ...q, search, page: 1 })), 350);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-4" data-testid="booking-table">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, email, consultant, agenda" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="booking-search-input" />
        </div>
        <select className={selectCls} value={query.status} onChange={(e) => setQuery({ ...query, status: e.target.value as BookingStatus, page: 1 })} data-testid="booking-status-filter">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className={selectCls} value={query.sort} onChange={(e) => setQuery({ ...query, sort: e.target.value, page: 1 })} data-testid="booking-sort-select">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {isError && <p className="text-sm text-destructive" data-testid="booking-table-error">Could not load bookings.</p>}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3">When</th><th className="p-3">{showClient ? 'Client' : 'Consultant'}</th><th className="p-3">Status</th><th className="p-3">Amount</th><th className="p-3">Meeting</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {!data && isFetching && <tr><td colSpan={6} className="p-3"><Skeleton className="h-8" /></td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground" data-testid="booking-table-empty">No bookings match.</td></tr>}
            {data?.items.map((b) => (
              <tr key={b.id} className="border-b last:border-0" data-testid={`booking-row-${b.id}`}>
                <td className="whitespace-nowrap p-3 font-medium">{when(b.startTime)}</td>
                <td className="p-3">{showClient ? <>{b.name}<div className="text-xs text-muted-foreground">{b.email}</div></> : b.consultantName}</td>
                <td className="p-3"><StatusBadge status={b.status} /></td>
                <td className="p-3 font-mono">{inr(b.amount)}</td>
                <td className="p-3">{b.calendar?.meetingUrl ? <a href={b.calendar.meetingUrl} target="_blank" rel="noreferrer" className="text-primary underline">Join</a> : '—'}</td>
                <td className="p-3 text-right">{actions?.(b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span data-testid="booking-pagination-info">{data.total} total · page {data.page} of {data.totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={data.page <= 1} onClick={() => setQuery({ ...query, page: query.page - 1 })} data-testid="booking-prev-page"><ChevronLeft /></Button>
            <Button size="sm" variant="outline" disabled={data.page >= data.totalPages} onClick={() => setQuery({ ...query, page: query.page + 1 })} data-testid="booking-next-page"><ChevronRight /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
