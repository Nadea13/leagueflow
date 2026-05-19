import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const origin = requestUrl.origin;
    const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();

    // Destination URL
    const destinationUrl = redirectTo
        ? `${origin}${redirectTo}`
        : `${origin}/dashboard`;

    // Create response first so we can write cookies to it
    const response = NextResponse.redirect(destinationUrl);

    if (code) {
        const cookieStore = await cookies();

        // Create Supabase client that writes cookies to the response
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        // Write directly to the response cookies
                        cookiesToSet.forEach(({ name, value, options }) => {
                            response.cookies.set(name, value, {
                                ...options,
                                secure: process.env.NODE_ENV === 'production',
                            });
                        });
                    },
                },
            }
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            console.error("Auth callback error:", error);
            return NextResponse.redirect(
                `${origin}/login?error=${encodeURIComponent(error.message)}`
            );
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from("users")
                .select("is_organizer")
                .eq("id", user.id)
                .single();

            const finalDestination = redirectTo
                ? (redirectTo.startsWith('http') ? redirectTo : `${origin}${redirectTo}`)
                : `${origin}/dashboard`;
            
            return NextResponse.redirect(finalDestination);
        }
    }

    return response;
}
