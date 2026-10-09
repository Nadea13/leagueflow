"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Globe, Check } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
    ActionMenu,
    ActionMenuContent,
    ActionMenuItem,
    ActionMenuTrigger,
} from "@/components/ui/action-menu";

interface LanguageToggleProps {
    variant?: VariantProps<typeof buttonVariants>["variant"];
    size?: VariantProps<typeof buttonVariants>["size"];
    className?: string;
}

export function LanguageToggle({
    variant = "outline",
    size = "icon",
    className,
}: LanguageToggleProps = {}) {
    const t = useTranslations("Common");
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const switchLocale = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
    };

    return (
        <ActionMenu>
            <ActionMenuTrigger asChild>
                <Button variant={variant} size={size} className={cn(variant === "outline" && "bg-background/50 backdrop-blur-sm", className)}>
                    <Globe className="h-4 w-4" />
                    <span className="sr-only">{t("language")}</span>
                </Button>
            </ActionMenuTrigger>
            <ActionMenuContent align="end" className="min-w-[150px] rounded-sm">
                <ActionMenuItem onClick={() => switchLocale("en")} className="flex items-center justify-between rounded-none">
                    <div className="flex items-center gap-2">
                        <span className="text-base">🇺🇸</span>
                        <span>English</span>
                    </div>
                    {locale === "en" && <Check className="h-4 w-4" />}
                </ActionMenuItem>
                <ActionMenuItem onClick={() => switchLocale("th")} className="flex items-center justify-between rounded">
                    <div className="flex items-center gap-2">
                        <span className="text-base">🇹🇭</span>
                        <span>ไทย</span>
                    </div>
                    {locale === "th" && <Check className="h-4 w-4" />}
                </ActionMenuItem>
            </ActionMenuContent>
        </ActionMenu>
    );
}
