"use client"

import { Link } from "@/i18n/routing"
import { useTheme } from "next-themes"
import { Laptop, Moon, Sun, LogOut, User, CreditCard, Shield } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/actions/common/auth"
import Image from "next/image"
import { LanguageSubMenu } from "@/components/layout/language-sub-menu"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function UserDropdown({
    email,
    name,
    avatar,
    role,
    className,
    side = "bottom",
    align = "end",
    sideOffset = 8,
    alignOffset = 0,
    hideText = false
}: {
    email: string | undefined,
    name?: string | null,
    avatar?: string,
    role?: string,
    className?: string,
    side?: "top" | "right" | "bottom" | "left",
    align?: "start" | "center" | "end",
    sideOffset?: number,
    alignOffset?: number,
    hideText?: boolean
}) {
    const { setTheme } = useTheme()
    const locale = useLocale()
    const t = useTranslations("Nav")
    const tCommon = useTranslations("Common")
    const tSettings = useTranslations("DashboardSettings")

    const profileHref = '/dashboard/settings'
    const displayName = name || email;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="lg" className={cn("w-full justify-center md:justify-start md:group-hover/sidebar:justify-start p-0 md:py-2 md:group-hover/sidebar:p-2 h-auto transition-all text-left overflow-hidden", className)}>
                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-muted/10 text-muted-foreground/60 shrink-0">
                        {avatar ? (
                            <Image
                                src={avatar}
                                alt={displayName || "User"}
                                width={36}
                                height={36}
                                className="h-full w-full object-cover rounded-full"
                            />
                        ) : (
                            <span className="text-xs font-bold">{displayName?.slice(0, 2).toUpperCase()}</span>
                        )}
                    </div>
                    {!hideText && (
                        <div className="flex flex-col min-w-0 transition-all duration-300 opacity-100 w-auto md:opacity-0 md:w-0 md:group-hover/sidebar:opacity-100 md:group-hover/sidebar:w-auto md:group-hover/sidebar:ml-2 overflow-hidden">
                            <span className="text-xs font-bold text-foreground truncate">{name || displayName}</span>
                            {email && <span className="text-[10px] text-muted-foreground truncate">{email}</span>}
                        </div>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-64 bg-card border shadow-2xl ml-4 mt-3 p-2 rounded-sm"
                side={side}
                align={align}
                sideOffset={sideOffset}
                alignOffset={alignOffset}
                forceMount
            >
                <DropdownMenuLabel className="mb-2">
                    <div className="flex flex-col space-y-1">
                        <p className="text-xs font-bold tracking-widest text-primary">{tCommon("user")}</p>
                        <p className="text-sm font-medium leading-none text-foreground truncate">
                            {displayName}
                        </p>
                        {name && email && (
                            <p className="text-xs text-muted-foreground truncate">{email}</p>
                        )}
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild className="group hover:text-primary transition-colors cursor-pointer py-2 rounded-sm">
                        <Link href={profileHref} className="w-full flex items-center">
                            <User className="mr-2 md:mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary" />
                            <span className="text-xs text-muted-foreground font-bold tracking-tight group-hover:text-primary">{t("profile")}</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="group hover:text-primary transition-colors cursor-pointer py-2 rounded-sm">
                        <Link href="/dashboard/settings?tab=billing" className="w-full flex items-center">
                            <CreditCard className="mr-2 md:mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary" />
                            <span className="text-xs text-muted-foreground font-bold tracking-tight group-hover:text-primary">{tSettings("billing")}</span>
                        </Link>
                    </DropdownMenuItem>
                    {role === "admin" && (
                        <DropdownMenuItem asChild className="group hover:text-primary transition-colors cursor-pointer py-2 rounded-sm">
                            <Link href="/admin" className="w-full flex items-center">
                                <Shield className="mr-2 md:mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                <span className="text-xs text-muted-foreground font-bold tracking-tight group-hover:text-primary">{t("admin") || "Admin"}</span>
                            </Link>
                        </DropdownMenuItem>
                    )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-border" />
                <LanguageSubMenu />
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="group hover:text-primary transition-colors cursor-pointer py-2 rounded-sm">
                        <Sun className="mr-2 md:mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary" />
                        <Moon className="absolute mr-2 md:mr-3 h-4 w-4 text-muted-foreground rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="text-xs text-muted-foreground font-bold tracking-tight group-hover:text-primary">{tCommon("theme")}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent
                            className="bg-background border border-border min-w-[120px] rounded-lg shadow-xl p-1.5"
                            sideOffset={8}
                        >
                            <DropdownMenuItem onClick={() => setTheme("light")} className="focus:bg-muted focus:text-primary text-xs font-bold">
                                <Sun className="mr-3 h-4 w-4" />
                                {tCommon("light")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("dark")} className="focus:bg-muted focus:text-primary text-xs font-bold">
                                <Moon className="mr-3 h-4 w-4" />
                                {tCommon("dark")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("system")} className="focus:bg-muted focus:text-primary text-xs font-bold">
                                <Laptop className="mr-3 h-4 w-4" />
                                {tCommon("system")}
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem asChild className="text-destructive focus:text-red-400 focus:bg-red-500/10 py-2 rounded-sm">
                    <form action={signOut} className="w-full">
                        <input type="hidden" name="locale" value={locale} />
                        <button className="w-full flex items-center text-left cursor-pointer">
                            <LogOut className="mr-3 h-4 w-4 text-red-500" />
                            <span className="text-xs font-bold tracking-tight">{t("logout")}</span>
                        </button>
                    </form>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
