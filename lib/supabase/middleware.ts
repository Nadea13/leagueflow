import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
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
                    cookiesToSet.forEach(({ name, value, options: _options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
        error: _error,
    } = await supabase.auth.getUser()

    // console.log("Middleware Auth Check:", user?.email || "No User", error?.message || "No Error");

    // REMOVED: Redirect logic here creates issues with i18n. 
    // We will handle protection in the dashboard layout or a separate route guard.
    // if (
    //   !user &&
    //   !request.nextUrl.pathname.startsWith('/login') &&
    //   !request.nextUrl.pathname.startsWith('/auth') &&
    //   request.nextUrl.pathname.startsWith('/dashboard')
    // ) {
    //   // no user, potentially respond by redirecting the user to the login page
    //   const url = request.nextUrl.clone()
    //   url.pathname = '/login'
    //   return NextResponse.redirect(url)
    // }

    // If user is signed in and the current path is / login / or auth pages redirect the user to /dashboard
    if (user) {
        const path = request.nextUrl.pathname;
        const isLoginPage = path.includes('/login');
        // Check for root '/' or locale roots '/en', '/th'
        const isRootPage = path === '/' || /^\/(en|th)$/.test(path);

        if (isLoginPage || isRootPage) {
            const url = request.nextUrl.clone();

            // Fetch profile to check role for correct dashboard redirection
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, is_organizer')
                .eq('id', user.id)
                .single();

            const isOrganizer = profile?.role === 'organizer' || profile?.is_organizer;
            const dashboardPath = isOrganizer ? '/organizer/dashboard' : '/dashboard';

            // If it's a login page, we want to replace 'login' with the dashboard path to preserve locale if present
            if (isLoginPage) {
                url.pathname = path.replace('/login', dashboardPath);
            } else {
                // It's a root page
                if (path === '/') {
                    url.pathname = dashboardPath;
                } else {
                    // path is '/en' or '/th', append the dashboard path
                    url.pathname = `${path}${dashboardPath}`;
                }
            }

            const redirectResponse = NextResponse.redirect(url);
            // HUGE IMPORTANT: we must copy the cookies from the supabaseResponse
            // because those cookies might contain the refreshed session!
            supabaseResponse.cookies.getAll().forEach((cookie) => {
                redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
            });
            return redirectResponse;
        }
    }

    // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
    // 1. Pass the request in it, like so:
    //    const myNewResponse = NextResponse.next({ request })
    // 2. Copy over the cookies, like so:
    //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. Change the myNewResponse object to fit your needs, but avoid changing
    //    the cookies!
    // 4. Finally:
    //    return myNewResponse
    // If this is not done, you may be causing the browser and server to go out
    // of sync and terminate the user's session prematurely!

    return supabaseResponse
}
