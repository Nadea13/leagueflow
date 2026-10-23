import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const handleI18nRouting = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
    // 1. Extract IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || '127.0.0.1');
    request.headers.set('x-client-ip', clientIp);

    // 2. Check JWT Session Cookie
    const token = request.cookies.get('tourni_access_token')?.value;
    const path = request.nextUrl.pathname;

    // Check if user is navigating to auth pages while already logged in
    const isAuthPage = path.includes('/sign-in') || path.includes('/sign-up') || path.includes('/login') || path.includes('/forgot-password');
    const isRootPage = path === '/' || path === '/th' || path === '/en';

    if (token && (isAuthPage || isRootPage)) {
        // Extract current locale or default to th
        const matchLocale = path.match(/^\/(th|en)/);
        const locale = matchLocale ? matchLocale[1] : 'th';
        
        const dashboardUrl = new URL(`/${locale}/dashboard`, request.url);
        return NextResponse.redirect(dashboardUrl);
    }

    // Protect Dashboard routes: redirect to sign-in if no token
    const isDashboardPage = path.includes('/dashboard');
    if (!token && isDashboardPage) {
        const matchLocale = path.match(/^\/(th|en)/);
        const locale = matchLocale ? matchLocale[1] : 'th';
        
        const signInUrl = new URL(`/${locale}/sign-in`, request.url);
        return NextResponse.redirect(signInUrl);
    }

    // 3. Run next-intl middleware
    const response = handleI18nRouting(request);
    return response;
}

export const config = {
    matcher: [
        // Enable a redirect to a matching locale at the root
        '/',

        // Set a cookie to remember the previous locale for
        // all requests that have a locale prefix
        '/(th|en)/:path*',

        // Enable redirects that add missing locales
        // (e.g. `/pathnames` -> `/en/pathnames`)
        '/((?!_next|_vercel|api|auth|.*\\..*).*)'
    ]
};
