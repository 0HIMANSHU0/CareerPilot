'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, Plane } from 'lucide-react';
import { useMeQuery } from '@/store/api';
import { homeFor } from '@/lib/access';
import { NAV_LINKS } from '@/lib/landing-content';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export function LandingLogo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" data-testid="landing-logo">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Plane className="h-5 w-5 -rotate-45" /></span>
      <span className="text-lg font-extrabold tracking-tight">CareerPilot</span>
    </Link>
  );
}

// Shows "Dashboard" for signed-in visitors, otherwise Login / Get started.
function AuthButtons({ onClick, hasSession }: { onClick?: () => void; hasSession: boolean }) {
  // Only ask "who am I" when a session cookie exists (avoids 401 noise for anonymous visitors).
  const { data, isLoading } = useMeQuery(undefined, { skip: !hasSession });
  if (isLoading) return <div className="h-10 w-36 animate-pulse rounded-md bg-muted" />;
  if (data) {
    return <Button asChild onClick={onClick} data-testid="landing-dashboard-button"><Link href={homeFor(data.user.role)}>Go to dashboard</Link></Button>;
  }
  return (
    <>
      <Button variant="ghost" asChild onClick={onClick} data-testid="landing-login-button"><Link href="/login">Log in</Link></Button>
      <Button asChild onClick={onClick} data-testid="landing-register-button"><Link href="/register">Get started</Link></Button>
    </>
  );
}

export function LandingHeader({ hasSession }: { hasSession: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md" data-testid="landing-header">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-8">
        <LandingLogo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Sections">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" data-testid={`landing-nav-${l.href.slice(1)}`}>{l.label}</a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex"><AuthButtons hasSession={hasSession} /></div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="rounded-md p-2 hover:bg-accent md:hidden" aria-label="Open menu" data-testid="landing-mobile-menu-trigger"><Menu className="h-5 w-5" /></SheetTrigger>
          <SheetContent className="flex flex-col gap-6 bg-sidebar p-6 text-sidebar-foreground" aria-describedby={undefined}>
            <SheetTitle className="text-lg font-extrabold">CareerPilot</SheetTitle>
            <nav className="flex flex-col gap-4">
              {NAV_LINKS.map((l) => <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm font-medium" data-testid={`landing-mobile-nav-${l.href.slice(1)}`}>{l.label}</a>)}
            </nav>
            <div className="flex flex-col gap-2 [&_a]:w-full"><AuthButtons hasSession={hasSession} onClick={() => setOpen(false)} /></div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
