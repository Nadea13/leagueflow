import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    console.log(">>> [AUTH DEBUG] Callback route hit! 🚀") // จุดเริ่มต้น

    const { searchParams, origin } = new URL(request.url)

    // 1. รับ Code จาก URL
    const code = searchParams.get('code')

    // 2. Logic การหาหน้าถัดไป
    const next = searchParams.get('next') ?? searchParams.get('redirect') ?? '/mytour'

    console.log(`>>> [AUTH DEBUG] Code present: ${!!code}`)
    console.log(`>>> [AUTH DEBUG] Next redirect path: ${next}`)

    if (code) {
        const supabase = await createClient()
        console.log(">>> [AUTH DEBUG] Supabase client created")

        // 3. แลก Code เป็น Session
        console.log(">>> [AUTH DEBUG] Exchanging code for session...")
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            console.log(">>> [AUTH DEBUG] ✅ Session exchanged successfully!")
            console.log(">>> [AUTH DEBUG] User ID:", data.user?.id) // เช็คว่าได้ User จริงไหม

            // 4. Logic การ Redirect
            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'

            console.log(`>>> [AUTH DEBUG] Env: ${process.env.NODE_ENV}, ForwardedHost: ${forwardedHost}`)

            let redirectUrl = ''

            if (isLocalEnv) {
                // Localhost
                redirectUrl = `${origin}${next}`
                console.log(">>> [AUTH DEBUG] Redirecting to (Local):", redirectUrl)
                return NextResponse.redirect(redirectUrl)
            } else if (forwardedHost) {
                // Production
                redirectUrl = `https://${forwardedHost}${next}`
                console.log(">>> [AUTH DEBUG] Redirecting to (Prod):", redirectUrl)
                return NextResponse.redirect(redirectUrl)
            } else {
                // Fallback
                redirectUrl = `${origin}${next}`
                console.log(">>> [AUTH DEBUG] Redirecting to (Fallback):", redirectUrl)
                return NextResponse.redirect(redirectUrl)
            }
        } else {
            // ❌ ถ้ามี Error ตรงนี้ แปลว่าทำไมไม่มี Set-Cookie
            console.error(">>> [AUTH DEBUG] ❌ Exchange Error:", error.message)
            console.error(">>> [AUTH DEBUG] Full Error Object:", error)
        }
    } else {
        console.warn(">>> [AUTH DEBUG] ⚠️ No 'code' found in URL params")
    }

    // กรณี Error
    console.log(">>> [AUTH DEBUG] Redirecting to Auth Code Error page")
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}