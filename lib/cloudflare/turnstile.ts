/**
 * Server-side validation for Cloudflare Turnstile token.
 * 
 * If Turnstile Secret Key is not configured in .env, it will gracefully pass
 * to allow development and testing without blocking the flow.
 */
export async function verifyTurnstileToken(token: string | null | undefined, remoteIp?: string): Promise<{ success: boolean; error?: string }> {
    const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

    // If secret key is not set, bypass verification (useful for local development without keys)
    if (!secretKey) {
        return { success: true };
    }

    if (!token) {
        return { success: false, error: "Security check required (Missing Turnstile token)" };
    }

    try {
        const formData = new URLSearchParams();
        formData.append("secret", secretKey);
        formData.append("response", token);
        if (remoteIp) {
            formData.append("remoteip", remoteIp);
        }

        const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            body: formData,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        const outcome = await res.json();
        if (outcome.success) {
            return { success: true };
        } else {
            console.error("[Turnstile] Verification failed:", outcome["error-codes"]);
            return { 
                success: false, 
                error: "Security verification failed. Please try again." 
            };
        }
    } catch (err) {
        console.error("[Turnstile] Error verifying token:", err);
        return { success: false, error: "Network error verifying security challenge." };
    }
}
