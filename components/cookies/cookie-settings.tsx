"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CookieConsent } from "./cookie-types";

interface CookieSettingsProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (consent: CookieConsent) => void;
}

export function CookieSettings({ open, onOpenChange, onSave }: CookieSettingsProps) {
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
            <DialogContent className="sm:max-w-[425px] p-0 bg-card rounded-sm">
                <DialogHeader className="border-b p-2 md:p-4">
                    <DialogTitle>{t("settings")}</DialogTitle>
                    <DialogDescription>
                        {t("description")}
                    </DialogDescription>
                </DialogHeader>
                <div className="p-2 md:p-4">
                    <div className="border bg-card rounded-sm divide-y divide-border overflow-hidden">
                        {/* Necessary */}
                        <div className="flex items-center justify-between p-3 md:p-4 hover:bg-muted/30 transition-all">
                            <div className="space-y-1">
                                <Label>{t("necessary")}</Label>
                                <p className="text-xs text-muted-foreground">{t("necessary_desc")}</p>
                            </div>
                            <Switch checked={true} disabled />
                        </div>

                        {/* Analytics */}
                        <div className="flex items-center justify-between p-3 md:p-4 hover:bg-muted/30 transition-all">
                            <div className="space-y-1">
                                <Label htmlFor="analytics">{t("analytics")}</Label>
                                <p className="text-xs text-muted-foreground">{t("analytics_desc")}</p>
                            </div>
                            <Switch
                                id="analytics"
                                checked={preferences.analytics}
                                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, analytics: checked }))}
                            />
                        </div>

                        {/* Marketing */}
                        <div className="flex items-center justify-between p-3 md:p-4 hover:bg-muted/30 transition-all">
                            <div className="space-y-1">
                                <Label htmlFor="marketing">{t("marketing")}</Label>
                                <p className="text-xs text-muted-foreground">{t("marketing_desc")}</p>
                            </div>
                            <Switch
                                id="marketing"
                                checked={preferences.marketing}
                                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, marketing: checked }))}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter className="p-2 md:p-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("cancel") || "Cancel"}
                    </Button>
                    <Button onClick={handleSave}>{t("save")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
