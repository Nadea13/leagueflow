import createMiddleware from 'next-intl/middleware';
import { updateSession } from './lib/supabase/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const handleI18nRouting = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
    // 1. Run Supabase session update
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const isAuthConfirm = request.nextUrl.pathname.includes('/auth/confirm');
    if (!isAuthConfirm) {
        response = await updateSession(request);
        if (response.status === 307 || response.status === 308 || response.headers.has('location')) {
            return response;
        }
    }

    // 2. Run next-intl middleware
    const i18nResponse = handleI18nRouting(request);

    // 3. Merge responses
    // We prioritize i18nResponse for routing (redirects/rewrites)
    // but MUST preserve cookies/headers from the supabase response
    
    // Copy all cookies from Supabase response to i18nResponse
    response.cookies.getAll().forEach((cookie) => {
        i18nResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    // Copy important headers (except those handled by next-intl)
    // We only copy headers that were added/modified by updateSession
    response.headers.forEach((value, key) => {
        if (!i18nResponse.headers.has(key)) {
            i18nResponse.headers.set(key, value);
        }
    });

    return i18nResponse;
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
