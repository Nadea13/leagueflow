import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export async function middleware(request: NextRequest) {
    // 1. Run next-intl middleware first to handle localization
    // This returns a response with the correct locale redirects/rewrites
    let response = handleI18nRouting(request);

    // 2. Create Supabase client attached to THIS response
    // We pass the response object to the cookie methods so we can modify its headers
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        // Force secure: false on localhost
                        if (process.env.NODE_ENV !== 'production') {
                            options.secure = false;
                        }

                        // Set cookie on the request (for immediate use) and response (for client)
                        request.cookies.set(name, value);
                        response.cookies.set(name, value, {
                            ...options,
                            sameSite: 'lax',
                            httpOnly: true,
                        });
                    });
                },
            },
        }
    );

    // 3. Refresh session (only safe to ignore error here if we handle redirects later)
    // accessing auth.getUser() refreshes the session cookies
    const { data: { user } } = await supabase.auth.getUser();

    // 4. Protected Route Logic
    const pathname = request.nextUrl.pathname;

    // Helper to get current locale or default
    const localeMatch = pathname.match(/^\/([a-z]{2})/);
    const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;

    const isLoginPage = pathname === `/${locale}/login`;

    // Define Public Routes
    const isPublicRoute =
        pathname === `/${locale}/login` ||
        pathname === `/${locale}` ||
        pathname.includes('/auth') || // Allow all auth callback routes
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('.');

    // Case 1: Unauthenticated + Private Route -> Redirect to Login
    if (!user && !isPublicRoute) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = `/${locale}/login`;
        // Preserve query params if needed, or clear them
        loginUrl.search = '';
        return NextResponse.redirect(loginUrl);
    }

    // Case 2: Authenticated + Login Page -> Redirect to Dashboard
    if (user && isLoginPage) {
        const dashboardUrl = request.nextUrl.clone();
        dashboardUrl.pathname = `/${locale}/dashboard`;
        return NextResponse.redirect(dashboardUrl);
    }

    return response;
}

export const config = {
    matcher: [
        // Matcher compatible with next-intl
        '/',
        '/(th|en)/:path*',
        // Skip internal paths
        '/((?!api|_next|_vercel|.*\\..*).*)',
    ],
};