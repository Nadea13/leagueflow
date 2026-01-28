import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        })
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    await supabase.auth.getUser()

    // Run next-intl middleware
    const handleI18n = createMiddleware(routing);
    const i18nResponse = handleI18n(request);

    // Merge headers from i18n response to the supabase response
    if (i18nResponse) {
        i18nResponse.headers.forEach((value, key) => {
            response.headers.set(key, value);
        });
        // If i18n response is a redirect or has other important properties, we might need to be careful
        // But typically for middleware chaining where one modifies cookies (Supabase) and other routing (i18n),
        // we need to return the response that handles the routing but with the cookies set.

        // Ideally, the supabase part just ensures the session is refreshed.
        // If next-intl redirects, we should return that redirect response but ensure cookies are attached.

        // Let's use the i18nResponse as the base if it exists, and copy over any cookies set by Supabase
        // ACTUALLY, usually we run Supabase logic first to refresh token, then return the i18n handler.
        // But we need to make sure the Set-Cookie header from Supabase is passed along.

        const supabaseCookies = response.cookies.getAll();
        supabaseCookies.forEach(cookie => {
            i18nResponse.cookies.set(cookie.name, cookie.value, cookie);
        });

        return i18nResponse;
    }

    return response
}

export const config = {
    matcher: [
        // Supabase matcher + next-intl matcher combined
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
