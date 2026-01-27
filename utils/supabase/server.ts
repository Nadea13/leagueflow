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
                            // 1. บังคับปิด Secure บน Localhost
                            if (process.env.NODE_ENV !== 'production') {
                                options.secure = false
                            }

                            // 2. ปรับจูน Option (เพิ่ม path: '/' คือพระเอกของเรา)
                            const cookieOptions = {
                                ...options,
                                path: '/',
                                sameSite: 'lax' as const,
                                httpOnly: true,
                                maxAge: 60 * 60 * 24 * 7,
                            }

                            console.log(`>>> [COOKIE DEBUG] Setting: ${name} | Path: ${cookieOptions.path}`)

                            cookieStore.set(name, value, cookieOptions)
                        })
                    } catch (error) {
                        console.error(">>> [COOKIE ERROR]", error)
                    }
                },
            },
        }
    )
}