import {
  LayoutDashboard,
  MessageSquareText,
  FileText,
  CalendarClock,
  UserRound,
  Briefcase,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@careerpilot/shared/constants';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  testId: string;
}
export interface NavGroup {
  title: string;
  items: NavItem[];
}

const profile: NavItem = { href: '/profile', label: 'Profile', icon: UserRound, testId: 'nav-profile' };

// Sidebar per role; must stay consistent with ROLE_ROUTES in lib/access.ts.
export const NAV_BY_ROLE: Record<Role, NavGroup[]> = {
  USER: [
    { title: 'Main', items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, testId: 'nav-dashboard' }] },
    {
      title: 'Career tools',
      items: [
        { href: '/chat', label: 'AI Assistant', icon: MessageSquareText, testId: 'nav-chat' },
        { href: '/resumes', label: 'Resumes', icon: FileText, testId: 'nav-resumes' },
        { href: '/consultations', label: 'Consultations', icon: CalendarClock, testId: 'nav-consultations' },
      ],
    },
    { title: 'Account', items: [profile] },
  ],
  CONSULTANT: [
    { title: 'Consultant', items: [{ href: '/consultant', label: 'My sessions', icon: Briefcase, testId: 'nav-consultant' }] },
    { title: 'Account', items: [profile] },
  ],
  ADMIN: [
    { title: 'Administration', items: [{ href: '/admin', label: 'Admin console', icon: ShieldCheck, testId: 'nav-admin' }] },
    { title: 'Account', items: [profile] },
  ],
};

export const ROLE_LABEL: Record<Role, string> = { USER: 'Job seeker', CONSULTANT: 'Consultant', ADMIN: 'Admin' };
