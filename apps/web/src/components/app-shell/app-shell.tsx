'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useMeQuery } from '@/store/api';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarContent } from './sidebar';
import { ServiceHealthPill } from './service-health-pill';

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen" data-testid="app-shell-loading">
      <div className="hidden w-64 bg-sidebar lg:block" />
      <div className="flex-1 space-y-4 p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

// Authenticated layout: persistent sidebar on desktop, sheet drawer on mobile.
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data, error } = useMeQuery();

  useEffect(() => {
    if (error && 'status' in error && error.status === 401) router.replace('/login');
  }, [error, router]);

  if (!data) return <ShellSkeleton />;
  const { user } = data;

  return (
    <div className="flex min-h-screen" data-testid="app-shell">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block" data-testid="desktop-sidebar">
        <SidebarContent user={user} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="rounded-md p-2 hover:bg-accent lg:hidden"
              aria-label="Open navigation"
              data-testid="mobile-nav-trigger"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent className="border-none p-0" aria-describedby={undefined}>
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent user={user} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="ml-auto">
            <ServiceHealthPill />
          </div>
        </header>
        <main className="flex-1 px-4 py-8 sm:px-8 lg:px-12" data-testid="app-main">
          {children}
        </main>
      </div>
    </div>
  );
}
