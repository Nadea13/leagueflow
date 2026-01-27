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
            <DropdownMenuSubTrigger>
                <Globe className="mr-2 h-4 w-4" />
                <span>{t("language")}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => switchLocale("en")}>
                    <span className="mr-2 text-base">🇺🇸</span>
                    <span>English</span>
                    {locale === "en" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchLocale("th")}>
                    <span className="mr-2 text-base">🇹🇭</span>
                    <span>ไทย</span>
                    {locale === "th" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    )
}
