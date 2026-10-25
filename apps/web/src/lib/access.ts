import { ROLE_HOME, type Role } from '@careerpilot/shared/constants';

// Route prefixes each role may open. Mirrors backend requireRole() checks (backend is the source of truth).
export const ROLE_ROUTES: Record<Role, string[]> = {
  USER: ['/dashboard', '/chat', '/resumes', '/consultations', '/profile'],
  CONSULTANT: ['/consultant', '/profile'],
  ADMIN: ['/admin', '/profile'],
};

export const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];
// Reachable with or without a session.
export const PUBLIC_ROUTES = ['/', '/verify-email', '/session/refresh'];

export function canAccess(role: Role, pathname: string) {
  return ROLE_ROUTES[role].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function homeFor(role: Role) {
  return ROLE_HOME[role];
}

// Only allow internal, role-permitted redirect targets (prevents open redirects).
export function safeNext(role: Role, next: string | null) {
  if (next && next.startsWith('/') && !next.startsWith('//') && canAccess(role, next.split(/[?#]/)[0])) return next;
  return homeFor(role);
}
