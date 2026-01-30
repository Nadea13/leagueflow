import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    console.log('[Auth Debug] Callback Route Hit:', request.url)
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Logic หา URL ปลายทาง
            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'

            let redirectUrl = `${origin}${next}` // Default

            if (!isLocalEnv && forwardedHost) {
                redirectUrl = `https://${forwardedHost}${next}`
            }

            // ✅ สร้าง Response ขึ้นมาก่อน เพื่อให้แน่ใจว่า Cookie ทำงาน
            // (จริงๆ createClient ใน server.ts จัดการให้แล้ว แต่ Redirect แบบนี้ปลอดภัยกว่าใน Next.js 15)
            return NextResponse.redirect(redirectUrl)
        }
    }

    // กรณี Error
    return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}