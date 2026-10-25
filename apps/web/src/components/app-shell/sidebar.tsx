'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { BookOpenText, LogOut, Plane } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@careerpilot/shared';
import { api, useLogoutMutation } from '@/store/api';
import { cn } from '@/lib/utils';
import { NAV_BY_ROLE, ROLE_LABEL } from './nav-config';

export function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2" data-testid="sidebar-brand">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Plane className="h-5 w-5 -rotate-45" />
      </div>
      <span className="text-lg font-extrabold tracking-tight">CareerPilot</span>
    </div>
  );
}

export function SidebarNav({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3" aria-label="Main navigation">
      {NAV_BY_ROLE[user.role].map((group) => (
        <div key={group.title} className="space-y-1">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.title}</p>
          {group.items.map(({ href, label, icon: Icon, testId }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                data-testid={testId}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-slate-300 hover:bg-sidebar-muted hover:text-white',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
      <a href="/api/docs" target="_blank" rel="noreferrer" data-testid="nav-api-docs"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-sidebar-muted hover:text-white">
        <BookOpenText className="h-4 w-4" /> API docs
      </a>
    </nav>
  );
}

function UserBlock({ user }: { user: User }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const [logout, { isLoading }] = useLogoutMutation();

  const onLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      toast.error('Logout failed on the server; your local session was cleared.');
    }
    dispatch(api.util.resetApiState());
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="m-3 rounded-lg bg-sidebar-muted p-3" data-testid="sidebar-user-block">
      <p className="truncate text-sm font-semibold" data-testid="sidebar-user-name">{user.name}</p>
      <p className="truncate text-xs text-slate-400" data-testid="sidebar-user-email">{user.email}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-semibold text-blue-300" data-testid="sidebar-user-role">
          {ROLE_LABEL[user.role]}
        </span>
        <button
          onClick={onLogout}
          disabled={isLoading}
          data-testid="logout-button"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-300 transition-colors hover:text-white disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" /> Log out
        </button>
      </div>
    </div>
  );
}

export function SidebarContent({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar pt-5 text-sidebar-foreground">
      <Brand />
      <SidebarNav user={user} onNavigate={onNavigate} />
      <UserBlock user={user} />
    </div>
  );
}
