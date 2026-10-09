"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { usePathname, useRouter } from "@/i18n/routing"
import {
    ActionMenuSub,
    ActionMenuSubContent,
    ActionMenuItem,
    ActionMenuSubTrigger,
} from "@/components/ui/action-menu"
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
        <ActionMenuSub>
            <ActionMenuSubTrigger className="group hover:text-primary transition-colors cursor-pointer py-2 rounded-sm">
                <Globe className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                <span className="text-xs text-muted-foreground font-bold tracking-tight group-hover:text-primary">{t("language")}</span>
            </ActionMenuSubTrigger>
            <ActionMenuSubContent className="bg-background border-border min-w-[120px]">
                <ActionMenuItem onClick={() => switchLocale("en")}>
                    <span className="h-4 w-4 text-muted-foreground group-hover:text-primary">🇺🇸</span>
                    <span className="focus:bg-muted focus:text-primary text-xs font-bold group-hover:text-primary">English</span>
                    {locale === "en" && <Check className="ml-auto h-4 w-4" />}
                </ActionMenuItem>
                <ActionMenuItem onClick={() => switchLocale("th")}>
                    <span className="h-4 w-4 text-muted-foreground group-hover:text-primary">🇹🇭</span>
                    <span className="focus:bg-muted focus:text-primary text-xs font-bold group-hover:text-primary">ไทย</span>
                    {locale === "th" && <Check className="ml-auto h-4 w-4" />}
                </ActionMenuItem>
            </ActionMenuSubContent>
        </ActionMenuSub>
    )
}
