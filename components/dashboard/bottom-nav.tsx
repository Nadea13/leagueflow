"use client"

import { Link, usePathname } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { bottomNavItems, adminNavItem } from "@/config/nav"

export function BottomNav({ role }: { role?: string }) {
    const pathname = usePathname()
    const t = useTranslations("Nav")

    // Use bottom nav items (subset for mobile)
    const navItems = bottomNavItems

    return (
        <div className="fixed bottom-0 left-0 z-50 w-full border-t bg-background md:hidden">
            <nav className="grid grid-cols-5 h-16">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        target={item.openInNewTab ? "_blank" : undefined}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors hover:text-primary",
                            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                                ? "text-primary bg-muted/20"
                                : "text-muted-foreground"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        <span>{t(item.titleKey)}</span>
                    </Link>
                ))}
            </nav>
        </div>
    )
}
