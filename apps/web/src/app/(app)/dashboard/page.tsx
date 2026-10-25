'use client';

import { AlertTriangle, CalendarCheck2, CalendarClock, FileText, MessagesSquare, RefreshCw } from 'lucide-react';
import { useDashboardQuery, useMeQuery, errorMessage } from '@/store/api';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { data: me } = useMeQuery();
  const { data, error, isLoading, isFetching, refetch } = useDashboardQuery();
  // On 503 the gateway still returns the per-service status body.
  const body = data ?? ((error as { data?: typeof data })?.data || undefined);
  const stats = body?.stats;
  const down = body ? Object.entries(body.services).filter(([, s]) => s.status !== 'ok').map(([n]) => n) : [];

  return (
    <div className="space-y-10" data-testid="dashboard-page">
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back${me ? `, ${me.user.name.split(' ')[0]}` : ''}`}
        description="Your career activity at a glance."
        actions={
          <Button variant="outline" size="sm" onClick={refetch} disabled={isFetching} data-testid="dashboard-refresh-button">
            <RefreshCw className={isFetching ? 'animate-spin' : ''} /> Refresh
          </Button>
        }
      />
      {(down.length > 0 || (error && !body)) && (
        <Alert variant="warning" data-testid="dashboard-partial-alert">
          <AlertTriangle />
          <AlertTitle>Some data is temporarily unavailable</AlertTitle>
          <AlertDescription>
            {down.length ? `The ${down.join(' and ')} service is not responding. Other sections still work.` : errorMessage(error)}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Resumes" value={stats?.totalResumes} icon={FileText} loading={isLoading} testId="stat-total-resumes" />
        <StatCard label="AI chats" value={stats?.totalChats} icon={MessagesSquare} loading={isLoading} testId="stat-total-chats" />
        <StatCard label="Upcoming sessions" value={stats?.upcomingConsultations} icon={CalendarClock} loading={isLoading} testId="stat-upcoming-consultations" />
        <StatCard label="Completed sessions" value={stats?.completedConsultations} icon={CalendarCheck2} loading={isLoading} testId="stat-completed-consultations" />
      </div>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Get started</h2>
        <QuickActions />
      </section>
    </div>
  );
}
