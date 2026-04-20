"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSelect() {
    const t = useTranslations("Common");
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const switchLocale = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="bg-background/50 backdrop-blur-sm">
                    <Globe className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">{t("language")}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[150px]">
                <DropdownMenuItem onClick={() => switchLocale("en")} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-base">🇺🇸</span>
                        <span>English</span>
                    </div>
                    {locale === "en" && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchLocale("th")} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-base">🇹🇭</span>
                        <span>ไทย</span>
                    </div>
                    {locale === "th" && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

