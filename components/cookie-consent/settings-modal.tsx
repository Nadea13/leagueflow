"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CookieConsent } from "./types";

interface CookieSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (consent: CookieConsent) => void;
}

export function CookieSettingsModal({ open, onOpenChange, onSave }: CookieSettingsModalProps) {
    const t = useTranslations("CookieConsent");

    const [preferences, setPreferences] = useState<CookieConsent>({
        necessary: true,
        analytics: true,
        marketing: true
    });

    const handleSave = () => {
        onSave(preferences);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("settings")}</DialogTitle>
                    <DialogDescription>
                        {t("description")}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    {/* Necessary */}
                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label className="text-base font-medium">{t("necessary")}</Label>
                            <p className="text-xs text-muted-foreground">{t("necessary_desc")}</p>
                        </div>
                        <Switch checked={true} disabled />
                    </div>

                    {/* Analytics */}
                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label htmlFor="analytics" className="text-base font-medium">{t("analytics")}</Label>
                            <p className="text-xs text-muted-foreground">{t("analytics_desc")}</p>
                        </div>
                        <Switch
                            id="analytics"
                            checked={preferences.analytics}
                            onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, analytics: checked }))}
                        />
                    </div>

                    {/* Marketing */}
                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label htmlFor="marketing" className="text-base font-medium">{t("marketing")}</Label>
                            <p className="text-xs text-muted-foreground">{t("marketing_desc")}</p>
                        </div>
                        <Switch
                            id="marketing"
                            checked={preferences.marketing}
                            onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, marketing: checked }))}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("cancel") || "Cancel"}
                    </Button>
                    <Button onClick={handleSave}>{t("save")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
