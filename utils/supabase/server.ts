import { createServerClient, type CookieOptions } from '@supabase/ssr'
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
                            // Force secure: false on localhost to prevent cookie rejection
                            // This is critical for authentication to work in development
                            if (process.env.NODE_ENV !== 'production') {
                                options.secure = false
                            }

                            cookieStore.set(name, value, {
                                ...options,
                                // Ensure these standard security options are set
                                sameSite: 'lax',
                                httpOnly: true,
                            })
                        })
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
