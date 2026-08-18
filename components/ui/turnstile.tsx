"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface TurnstileProps {
    onVerify: (token: string) => void;
    onError?: (error?: unknown) => void;
    onExpire?: () => void;
    className?: string;
    theme?: "light" | "dark" | "auto";
    size?: "normal" | "compact" | "flexible";
}

declare global {
    interface Window {
        turnstile?: {
            render: (
                container: HTMLElement | string,
                options: {
                    sitekey: string;
                    callback?: (token: string) => void;
                    "error-callback"?: (error?: unknown) => void;
                    "expired-callback"?: () => void;
                    theme?: "light" | "dark" | "auto";
                    size?: "normal" | "compact" | "flexible";
                }
            ) => string;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
        };
    }
}

export function Turnstile({
    onVerify,
    onError,
    onExpire,
    className = "my-2 flex justify-center",
    theme = "auto",
    size = "normal",
}: TurnstileProps) {
    const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);

    useEffect(() => {
        if (!siteKey || !scriptLoaded || !containerRef.current || !window.turnstile) return;

        // Clean up previous widget if exists
        if (widgetIdRef.current) {
            try {
                window.turnstile.remove(widgetIdRef.current);
            } catch {}
            widgetIdRef.current = null;
        }

        try {
            const id = window.turnstile.render(containerRef.current, {
                sitekey: siteKey,
                callback: (token: string) => onVerify(token),
                "error-callback": (err?: unknown) => onError?.(err),
                "expired-callback": () => onExpire?.(),
                theme,
                size,
            });
            widgetIdRef.current = id;
        } catch (err) {
            console.error("[Turnstile Widget Render Error]", err);
        }

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                } catch {}
                widgetIdRef.current = null;
            }
        };
    }, [scriptLoaded, siteKey, theme, size, onVerify, onError, onExpire]);

    // If no siteKey configured, silently bypass or do nothing (allows seamless dev)
    if (!siteKey) {
        return null;
    }

    return (
        <div className={className}>
            <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                strategy="afterInteractive"
                onLoad={() => setScriptLoaded(true)}
            />
            <div ref={containerRef} />
        </div>
    );
}
