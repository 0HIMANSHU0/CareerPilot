'use client';

import { useHealthQuery } from '@/store/api';
import { cn } from '@/lib/utils';

// Small status pill in the header; polls the gateway's aggregated /api/health.
export function ServiceHealthPill() {
  const { data, isError, isLoading } = useHealthQuery(undefined, { pollingInterval: 30000 });
  const down = data ? Object.entries(data.services).filter(([, s]) => s.status !== 'ok').map(([n]) => n) : [];
  const state = isLoading ? 'loading' : isError ? 'outage' : down.length ? 'degraded' : 'healthy';

  const styles = {
    loading: 'border-slate-200 bg-slate-100 text-slate-500',
    healthy: 'border-emerald-200 bg-emerald-500/10 text-emerald-700',
    degraded: 'border-amber-200 bg-amber-500/10 text-amber-700',
    outage: 'border-rose-200 bg-rose-500/10 text-rose-700',
  }[state];
  const dot = { loading: 'bg-slate-400', healthy: 'bg-emerald-500', degraded: 'bg-amber-500', outage: 'bg-rose-500' }[state];
  const label = {
    loading: 'Checking services',
    healthy: 'All systems operational',
    degraded: `Degraded: ${down.join(', ')}`,
    outage: 'API unreachable',
  }[state];

  return (
    <div
      data-testid="service-health-pill"
      data-state={state}
      className={cn('flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium', styles)}
    >
      <span className={cn('h-2 w-2 rounded-full', dot, state === 'healthy' && 'animate-pulse')} />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}
