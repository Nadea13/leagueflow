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
    className = "my-1 lg:my-2 w-full",
    theme = "auto",
    size = "flexible",
}: TurnstileProps) {
    const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [scriptLoaded, setScriptLoaded] = useState(() => {
        return typeof window !== "undefined" && Boolean(window.turnstile);
    });

    // Keep latest callbacks in ref to avoid re-triggering useEffect when parent re-renders
    const callbacksRef = useRef({ onVerify, onError, onExpire });
    useEffect(() => {
        callbacksRef.current = { onVerify, onError, onExpire };
    });

    useEffect(() => {
        if (!siteKey || !scriptLoaded || !containerRef.current || !window.turnstile) return;

        // If widget already rendered in this container, don't re-render
        if (widgetIdRef.current) return;

        try {
            const id = window.turnstile.render(containerRef.current, {
                sitekey: siteKey,
                callback: (token: string) => callbacksRef.current.onVerify?.(token),
                "error-callback": (err?: unknown) => callbacksRef.current.onError?.(err),
                "expired-callback": () => callbacksRef.current.onExpire?.(),
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
    }, [scriptLoaded, siteKey, theme, size]);

    // If no siteKey configured, silently bypass or do nothing (allows seamless dev)
    if (!siteKey) {
        return null;
    }

    return (
        <div className={className}>
            <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                strategy="lazyOnload"
                onLoad={() => setScriptLoaded(true)}
            />
            <div ref={containerRef} />
        </div>
    );
}

