'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { Provider } from '@supabase/supabase-js'
import { getLocale } from 'next-intl/server';

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const locale = await getLocale();

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect(`/${locale}/login?error=${encodeURIComponent(error.message)}`)
    }

    revalidatePath('/', 'layout')
    redirect(`/${locale}/dashboard`)
}

export async function signup(formData: FormData) {
    const supabase = await createClient()
    const headersList = await headers()
    let origin = headersList.get('origin')

    if (!origin) {
        const host = headersList.get('host')
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
        if (host) {
            origin = `${protocol}://${host}`
        }
    }

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const locale = await getLocale();

    const { error } = await supabase.auth.signUp({
        ...data,
        options: {
            emailRedirectTo: `${origin}/${locale}/auth/callback`,
        },
    })

    if (error) {
        redirect(`/${locale}/login?error=${encodeURIComponent(error.message)}`)
    }

    redirect(`/${locale}/login?message=Check email to continue sign in process`)
}

export async function loginWithOAuth(provider: Provider) {
    const supabase = await createClient()
    const headersList = await headers()
    let origin = headersList.get('origin')

    if (!origin) {
        const host = headersList.get('host')
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
        if (host) {
            origin = `${protocol}://${host}`
        }
    }

    const locale = await getLocale();

    const redirectTo = `${origin}/${locale}/auth/callback`
    console.log('[Auth Debug] loginWithOAuth content:', {
        provider,
        origin,
        locale,
        finalRedirectTo: redirectTo
    })

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo,
        },
    })

    if (error) {
        console.error('[Auth Debug] signInWithOAuth Error:', error)
        redirect(`/${locale}/login?error=${encodeURIComponent(error.message)}`)
    }

    if (data.url) {
        console.log('[Auth Debug] Redirecting to Supabase OAuth URL:', data.url)
        redirect(data.url)
    }
}
