import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * SECURITY FIX (this session): replaced the previous placeholder cookie
 * check (`request.cookies.has('dental_admin_session')` — a cookie nothing
 * ever actually set) with real Supabase session verification. This
 * middleware also REFRESHES the session token on every request (the
 * standard @supabase/ssr middleware pattern) — without this, sessions would
 * silently expire mid-use since nothing else in the request lifecycle
 * refreshes the auth cookie.
 *
 * This middleware is still a UX convenience layer, not the security
 * boundary — `requireAdmin()` (lib/requireAdmin.ts) inside every Server
 * Action remains the actual enforcement point, since middleware can't
 * safely be the sole gate for Server Actions in Next.js (a Server Action
 * can in principle be invoked directly). Both layers are intentional
 * defense in depth, not redundant.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDashboardRoute =
    request.nextUrl.pathname.startsWith('/overview') ||
    request.nextUrl.pathname.startsWith('/users') ||
    request.nextUrl.pathname.startsWith('/clinics') ||
    request.nextUrl.pathname.startsWith('/laboratories') ||
    request.nextUrl.pathname.startsWith('/posts') ||
    request.nextUrl.pathname.startsWith('/comments') ||
    request.nextUrl.pathname.startsWith('/reviews') ||
    request.nextUrl.pathname.startsWith('/reports') ||
    request.nextUrl.pathname.startsWith('/verifications');

  if (isDashboardRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
