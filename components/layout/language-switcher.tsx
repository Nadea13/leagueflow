"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { usePathname, useRouter } from "@/i18n/routing"
import {
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuItem,
    DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { Globe, Check } from "lucide-react"

export function LanguageSwitcher() {
    const t = useTranslations("Common")
    const locale = useLocale()
    const router = useRouter()
    const pathname = usePathname()

    const switchLocale = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale })
    }

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger className="rounded-none focus:bg-muted focus:text-secondary py-2.5">
                <Globe className="mr-3 h-4 w-4 opacity-70" />
                <span className="text-xs font-bold uppercase tracking-tight">{t("language")}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-background border-border rounded-none min-w-[120px]">
                <DropdownMenuItem onClick={() => switchLocale("en")}>
                    <span className="mr-2 text-base opacity-70">🇺🇸</span>
                    <span className="rounded-none focus:bg-muted focus:text-secondary text-xs font-bold uppercase">English</span>
                    {locale === "en" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchLocale("th")}>
                    <span className="mr-2 text-base opacity-70">🇹🇭</span>
                    <span className="rounded-none focus:bg-muted focus:text-secondary text-xs font-bold uppercase">ไทย</span>
                    {locale === "th" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    )
}
