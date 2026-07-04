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

export function LanguageSubMenu() {
    const t = useTranslations("Common")
    const locale = useLocale()
    const router = useRouter()
    const pathname = usePathname()

    const switchLocale = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale })
    }

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger className="group hover:text-primary transition-colors cursor-pointer py-2 rounded-sm">
                <Globe className="mr-2 md:mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary" />
                <span className="text-xs text-muted-foreground font-bold tracking-tight group-hover:text-primary">{t("language")}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-background border-border min-w-[120px]">
                <DropdownMenuItem onClick={() => switchLocale("en")}>
                    <span className="mr-2 md:mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary">🇺🇸</span>
                    <span className="focus:bg-muted focus:text-primary text-xs font-bold group-hover:text-primary">English</span>
                    {locale === "en" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchLocale("th")}>
                    <span className="mr-2 md:mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary">🇹🇭</span>
                    <span className="focus:bg-muted focus:text-primary text-xs font-bold group-hover:text-primary">ไทย</span>
                    {locale === "th" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    )
}
