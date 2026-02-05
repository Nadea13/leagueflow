"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function LanguageSelect() {
    const t = useTranslations("Common");
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const switchLocale = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
    };

    return (
        <Select value={locale} onValueChange={switchLocale}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("language")} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="en">
                    <span className="flex items-center gap-2">
                        <span className="text-base">🇺🇸</span>
                        <span>English</span>
                    </span>
                </SelectItem>
                <SelectItem value="th">
                    <span className="flex items-center gap-2">
                        <span className="text-base">🇹🇭</span>
                        <span>ไทย</span>
                    </span>
                </SelectItem>
            </SelectContent>
        </Select>
    );
}
