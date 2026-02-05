import createMiddleware from 'next-intl/middleware';
import { updateSession } from './utils/supabase/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const handleI18nRouting = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
    // 1. Update Supabase session (refreshes auth token)
    // Skip this for auth confirmation page to avoid clearing PKCE cookies
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const isAuthConfirm = request.nextUrl.pathname.includes('/auth/confirm');

    if (!isAuthConfirm) {
        response = await updateSession(request);
    }

    // 2. Run next-intl middleware for locale routing
    const i18nResponse = handleI18nRouting(request);

    // 3. Merge headers/cookies from auth response to i18n response
    // This ensures that both auth cookies and i18n routing work together

    // Copy headers
    i18nResponse.headers.forEach((value, key) => {
        response.headers.set(key, value);
    });

    // The updateSession function already handles copying cookies if we passed it correctly, 
    // but since we are running two middlewares, we need to be careful.
    // Ideally, valid auth requests should just fall through to i18n routing unless redirecting.

    // If updateSession returned a redirect (e.g. to login), we should probably respect it.
    // But wait, updateSession in our impl only redirects if accessing /dashboard without user.
    if (response.status === 307 || response.status === 302 || response.status === 308) {
        return response;
    }

    // If we are committed to return the i18n response (which handles the rewrites/redirects for locale),
    // we need to make sure we don't lose the cookies set by updateSession (refreshed tokens).

    // A cleaner approach used in many Supabase+Next-Intl examples:
    // We use the response object from updateSession as a base if possible, 
    // or manually copy cookies from the 'response' (from updateSession) to 'i18nResponse'.

    // Since updateSession returns a response that might have set-cookie headers:
    const finalResponse = i18nResponse;

    // Copy cookies from supabase response to final response
    response.cookies.getAll().forEach((cookie) => {
        finalResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    return finalResponse;
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
        '/((?!_next|_vercel|auth|.*\\..*).*)'
    ]
};
