'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useRefreshMutation } from '@/store/api';
import { safeNext } from '@/lib/access';

// Middleware sends users here when the access token expired but a refresh token exists.
export default function SessionRefreshPage() {
  const [refresh] = useRefreshMutation();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const next = new URLSearchParams(window.location.search).get('next');
    refresh()
      .unwrap()
      .then(({ user }) => window.location.replace(safeNext(user.role, next)))
      .catch(() => window.location.replace(`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`));
  }, [refresh]);

  return (
    <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground" data-testid="session-refresh-page">
      <Loader2 className="h-4 w-4 animate-spin" /> Restoring your session…
    </div>
  );
}
