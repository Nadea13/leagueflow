'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function PresenceTracker() {
    useEffect(() => {
        const supabase = createClient()
        let activeChannel: ReturnType<typeof supabase.channel> | null = null

        const setupPresence = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            activeChannel = supabase.channel('online-users-room', {
                config: {
                    presence: {
                        key: user.id,
                    },
                },
            })

            activeChannel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await activeChannel?.track({
                        id: user.id,
                        email: user.email,
                        full_name: user.user_metadata?.full_name || null,
                        onlineAt: new Date().toISOString()
                    })
                }
            })
        }

        setupPresence()

        return () => {
            if (activeChannel) {
                supabase.removeChannel(activeChannel)
            }
        }
    }, [])

    return null
}
