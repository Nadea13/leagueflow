"use client"

import { Link } from "@/i18n/routing"
import { useTheme } from "next-themes"
import { Laptop, Moon, Sun, LogOut, User } from "lucide-react"
import {
    Avatar,
    AvatarFallback,
} from "@/components/ui/avatar"
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
import { LanguageSubMenu } from "@/components/layout/language-sub-menu"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function UserDropdown({ email, name, mode = 'team', className }: { email: string | undefined, name?: string | null, mode?: 'organizer' | 'team', className?: string }) {
    const { setTheme } = useTheme()
    const locale = useLocale()
    const t = useTranslations("Nav")
    const tCommon = useTranslations("Common")

    const profileHref = mode === 'organizer' ? '/organizer/settings' : '/manager/settings'
    const displayName = name || email;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={cn("w-full justify-start p-2", className)}>
                    <div className="flex justify-center items-center gap-2">
                        <div className="h-8 w-8 border rounded-full flex justify-center items-center">
                            {displayName?.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-sm font-medium leading-none text-foreground truncate">{name}</p>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-card shadow-2xl p-3" align="end" forceMount>
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
                <DropdownMenuGroup className="space-y-1">
                    <DropdownMenuItem asChild className="group hover:text-primary transition-colors cursor-pointer py-3">
                        <Link href={profileHref} className="w-full flex items-center">
                            <User className="mr-2 md:mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary" />
                            <span className="text-xs text-muted-foreground font-bold tracking-tight group-hover:text-primary">{t("profile")}</span>
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-border" />
                <LanguageSubMenu />
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="group hover:text-primary transition-colors cursor-pointer py-3">
                        <Sun className="mr-2 md:mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary" />
                        <Moon className="absolute mr-2 md:mr-3 h-4 w-4 text-muted-foreground rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="text-xs text-muted-foreground font-bold tracking-tight group-hover:text-primary">{tCommon("theme")}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent className="bg-background border-border rounded-none min-w-[120px]">
                            <DropdownMenuItem onClick={() => setTheme("light")} className="rounded-none focus:bg-muted focus:text-primary text-xs font-bold">
                                <Sun className="mr-3 h-4 w-4" />
                                {tCommon("light")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("dark")} className="rounded-none focus:bg-muted focus:text-primary text-xs font-bold">
                                <Moon className="mr-3 h-4 w-4" />
                                {tCommon("dark")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("system")} className="rounded-none focus:bg-muted focus:text-primary text-xs font-bold">
                                <Laptop className="mr-3 h-4 w-4" />
                                {tCommon("system")}
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem asChild className="rounded-none text-destructive focus:text-red-400 focus:bg-red-500/10 py-2.5">
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
