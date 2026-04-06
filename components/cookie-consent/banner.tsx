"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CookieConsent, COOKIE_CONSENT_KEY } from "./types";
import { CookieSettingsModal } from "./settings-modal";
import { X } from "lucide-react";

export function CookieBanner() {
    const t = useTranslations("CookieConsent");
    const [showBanner, setShowBanner] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        // Check if cookie exists
        const consent = document.cookie.split('; ').find(row => row.startsWith(COOKIE_CONSENT_KEY + '='));
        if (!consent) {
            setShowBanner(true);
        }
    }, []);

    const handleAcceptAll = () => {
        const consent: CookieConsent = {
            necessary: true,
            analytics: true,
            marketing: true
        };
        saveConsent(consent);
    };

    const handleRejectAll = () => {
        const consent: CookieConsent = {
            necessary: true,
            analytics: false,
            marketing: false
        };
        saveConsent(consent);
    };

    const saveConsent = (consent: CookieConsent) => {
        const value = JSON.stringify(consent);
        // Set cookie for 1 year
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        document.cookie = `${COOKIE_CONSENT_KEY}=${value}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;

        setShowBanner(false);
        // Reload to apply changes (e.g. load analytics scripts) - Optional but often needed
        // window.location.reload(); 
        // For now, we just hide banner. A real implementation would verify analytics scripts inject here.
    };

    if (!showBanner) return null;

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
                <Card className="max-w-screen-lg mx-auto p-6 shadow-2xl border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="space-y-2 flex-1">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                {t("title")}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {t("description")}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                            <Button variant="outline" onClick={() => setShowSettings(true)}>
                                {t("settings")}
                            </Button>
                            <Button variant="secondary" onClick={handleRejectAll}>
                                {t("reject_all")}
                            </Button>
                            <Button onClick={handleAcceptAll}>
                                {t("accept_all")}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            <CookieSettingsModal
                open={showSettings}
                onOpenChange={setShowSettings}
                onSave={saveConsent}
            />
        </>
    );
}
