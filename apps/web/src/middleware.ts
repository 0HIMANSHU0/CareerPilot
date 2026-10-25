import { NextResponse, type NextRequest } from 'next/server';
import type { Role } from '@careerpilot/shared/constants';
import { AUTH_ROUTES, PUBLIC_ROUTES, canAccess, homeFor } from '@/lib/access';

const ROLES: Role[] = ['USER', 'CONSULTANT', 'ADMIN'];

// Reads (does not verify) the JWT payload purely for routing UX; the frontend holds no secrets.
// Real authorization happens in the gateway (signature check) and services (requireRole).
function readSession(token?: string): { role: Role } | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!ROLES.includes(payload.role) || payload.exp * 1000 < Date.now()) return null;
    return { role: payload.role };
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = readSession(req.cookies.get('access_token')?.value);
  const hasRefresh = req.cookies.has('refresh_token');
  const redirect = (to: string) => NextResponse.redirect(new URL(to, req.url));
  const next = encodeURIComponent(pathname + search);

  if (PUBLIC_ROUTES.includes(pathname)) return NextResponse.next();

  // Signed-in users skip login/register and go to their role home.
  if (AUTH_ROUTES.includes(pathname)) return session ? redirect(homeFor(session.role)) : NextResponse.next();

  // Access token expired but a refresh token exists: rotate it, then come back.
  if (!session) return redirect(hasRefresh ? `/session/refresh?next=${next}` : `/login?next=${next}`);
  if (!canAccess(session.role, pathname)) return redirect(homeFor(session.role));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
