"use client";

import { useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function RegistrationTourButton() {
    const t = useTranslations("Registration");

    const startTour = useCallback(() => {
        const driverObj = driver({
            showProgress: true,
            animate: true,
            steps: [
                {
                    element: "#tour-registration-header",
                    popover: {
                        title: t("tour_reg_welcome_title"),
                        description: t("tour_reg_welcome_desc"),
                        side: "bottom" as const,
                        align: "start" as const
                    }
                },
                {
                    element: "#tour-registration-form",
                    popover: {
                        title: t("tour_reg_form_title"),
                        description: t("tour_reg_form_desc"),
                        side: "right" as const,
                        align: "start" as const
                    }
                },
                ...(document.getElementById("tour-registration-details") ? [{
                    element: "#tour-registration-details",
                    popover: {
                        title: t("tour_reg_details_title"),
                        description: t("tour_reg_details_desc"),
                        side: "left" as const,
                        align: "start" as const
                    }
                }] : []),
                ...(document.getElementById("tour-registration-info") ? [{
                    element: "#tour-registration-info",
                    popover: {
                        title: t("tour_reg_info_title"),
                        description: t("tour_reg_info_desc"),
                        side: "left" as const,
                        align: "start" as const
                    }
                }] : []),
                ...(document.getElementById("tour-registration-teams") ? [{
                    element: "#tour-registration-teams",
                    popover: {
                        title: t("tour_reg_teams_title"),
                        description: t("tour_reg_teams_desc"),
                        side: "left" as const,
                        align: "start" as const
                    }
                }] : [])
            ]
        });
        driverObj.drive();
    }, [t]);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem("has_seen_registration_tour");
        if (!hasSeenTour) {
            const timer = setTimeout(() => {
                startTour();
                localStorage.setItem("has_seen_registration_tour", "true");
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [startTour]);

    return (
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={startTour} 
            className="flex items-center text-xs font-bold border-dashed border-primary hover:bg-primary/5 transition-all cursor-pointer"
        >
            <HelpCircle className="h-4 w-4" />
        </Button>
    );
}
