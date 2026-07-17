"use client";

import { useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function SettingsTourButton() {
    const t = useTranslations("DashboardSettings");

    const startTour = useCallback(() => {
        const driverObj = driver({
            showProgress: true,
            animate: true,
            steps: [
                {
                    element: "#tour-settings-header",
                    popover: {
                        title: t("tour_welcome_title"),
                        description: t("tour_welcome_desc"),
                        side: "bottom" as const,
                        align: "start" as const
                    }
                },
                ...(document.getElementById("tour-settings-tabs") ? [{
                    element: "#tour-settings-tabs",
                    popover: {
                        title: t("tour_tabs_title"),
                        description: t("tour_tabs_desc"),
                        side: "bottom" as const,
                        align: "start" as const
                    }
                }] : []),
                ...(document.getElementById("tour-settings-content") ? [{
                    element: "#tour-settings-content",
                    popover: {
                        title: t("tour_content_title"),
                        description: t("tour_content_desc"),
                        side: "top" as const,
                        align: "start" as const
                    }
                }] : [])
            ]
        });
        driverObj.drive();
    }, [t]);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem("has_seen_settings_tour");
        if (!hasSeenTour) {
            const timer = setTimeout(() => {
                startTour();
                localStorage.setItem("has_seen_settings_tour", "true");
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [startTour]);

    return (
        <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={startTour} 
        >
            <HelpCircle className="h-4 w-4" />
        </Button>
    );
}
