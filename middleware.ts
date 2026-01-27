import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export async function middleware(request: NextRequest) {
    // 1. Run next-intl middleware first to handle localization
    let response = handleI18nRouting(request);

    // 2. Create Supabase client attached to THIS response
    // (ใช้ Config เดิมจาก Source B ที่จัดการ Cookie และ Secure flag ได้ถูกต้องแล้ว)
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

    // 3. Refresh session and get User
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // 4. Helper Variables for Paths
    const pathname = request.nextUrl.pathname;

    // ดึง locale ปัจจุบันออกมา (เช่น 'th' หรือ 'en') เพื่อใช้ในการ Redirect
    const localeMatch = pathname.match(/^\/([a-z]{2})/);
    const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;

    // สร้าง path ที่ตัด locale ออก เพื่อให้เช็คง่ายขึ้น (เช่น /th/admin -> /admin)
    const pathWithoutLocale = pathname.replace(new RegExp(`^/${locale}`), '') || '/';

    // -------------------------------------------------------------------------
    // LOGIC FROM SOURCE A: Specific Route Guards (/admin & /mytour)
    // -------------------------------------------------------------------------

    // A. ป้องกันหน้า /admin (ต้องล็อกอิน และ role = admin)
    if (pathWithoutLocale.startsWith('/admin')) {
        // ยังไม่ล็อกอิน -> เด้งกลับหน้าแรก (พร้อม locale)
        if (!user) {
            return NextResponse.redirect(new URL(`/${locale}`, request.url));
        }

        // ล็อกอินแล้ว -> เช็ค role ใน Database
        const { data: profile, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

        // Error หรือไม่ใช่ Admin -> เด้งกลับหน้าแรก
        if (error || !profile || profile.role !== 'admin') {
            // console.error('Access denied or error fetching role', error);
            return NextResponse.redirect(new URL(`/${locale}`, request.url));
        }
        // ถ้าผ่านเงื่อนไข ก็ปล่อยให้ไปต่อ (return response ด้านล่างสุด)
    }

    // B. ป้องกันหน้า /mytour (แค่ต้องล็อกอิน)
    if (pathWithoutLocale.startsWith('/mytour') && !user) {
        return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }

    // -------------------------------------------------------------------------
    // LOGIC FROM SOURCE B: General Auth Protection
    // -------------------------------------------------------------------------

    const isLoginPage = pathname === `/${locale}/login`;

    // Define Public Routes
    // เพิ่มเงื่อนไข pathWithoutLocale เพื่อความแม่นยำ
    const isPublicRoute =
        pathWithoutLocale === '/login' ||
        pathWithoutLocale === '/' ||
        pathname.includes('/auth') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('.');

    // Case 1: Unauthenticated + Private Route -> Redirect to Login
    // (Logic นี้จะทำงานถ้ายังไม่โดนดักด้วย /admin หรือ /mytour ด้านบน)
    if (!user && !isPublicRoute) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = `/${locale}/login`;
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