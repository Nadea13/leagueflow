import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            // ✅ แก้ไข: บังคับปิด Secure บน Localhost (โค้ดเก่าคุณไม่มีส่วนนี้)
                            if (process.env.NODE_ENV !== 'production') {
                                options.secure = false
                            }

                            const cookieOptions = {
                                ...options,
                                sameSite: 'lax' as const,
                                path: '/', // ✅ เพิ่ม path: '/' เพื่อความชัวร์ว่าใช้ได้ทั้งเว็บ
                            }
                            cookieStore.set(name, value, cookieOptions)
                        })
                    } catch {
                        // The `setAll` method was called from a Server Component.
                    }
                },
            },
        }
    )
}