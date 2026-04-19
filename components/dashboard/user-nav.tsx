"use client"

import { Link } from "@/i18n/routing"
import { useTheme } from "next-themes"
import { Laptop, Moon, Sun, LogOut, User } from "lucide-react"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
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
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"

export function UserNav({ email, mode = 'team' }: { email: string | undefined, mode?: 'organizer' | 'team' }) {
    const { setTheme } = useTheme()
    const t = useTranslations("Nav")
    const tCommon = useTranslations("Common")

    const profileHref = mode === 'organizer' ? '/organizer/settings' : '/manager/settings'

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-none hover:bg-muted p-0 overflow-hidden group">
                    <Avatar className="h-9 w-9 rounded-none border border-border group-hover:border-secondary transition-colors">
                        <AvatarImage src="" alt={email} />
                        <AvatarFallback className="bg-secondary/10 text-secondary text-xs font-bold">{email?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-background border-border rounded-none shadow-2xl p-2" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-3 bg-muted/30 mb-2">
                    <div className="flex flex-col space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">{tCommon("user")}</p>
                        <p className="text-sm font-medium leading-none text-foreground truncate">
                            {email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuGroup className="space-y-1">
                    <DropdownMenuItem asChild className="rounded-none focus:bg-muted focus:text-secondary transition-colors cursor-pointer py-2.5">
                        <Link href={profileHref} className="w-full flex items-center">
                            <User className="mr-3 h-4 w-4 opacity-70" />
                            <span className="text-xs font-bold uppercase tracking-tight">{t("profile")}</span>
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-border" />
                <LanguageSwitcher />
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="rounded-none focus:bg-muted focus:text-secondary py-2.5">
                        <Sun className="mr-3 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 opacity-70" />
                        <Moon className="absolute mr-3 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 opacity-70" />
                        <span className="text-xs font-bold uppercase tracking-tight">{tCommon("theme")}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent className="bg-background border-border rounded-none min-w-[120px]">
                            <DropdownMenuItem onClick={() => setTheme("light")} className="rounded-none focus:bg-muted focus:text-secondary text-xs font-bold uppercase">
                                <Sun className="mr-2 h-3.5 w-3.5" />
                                {tCommon("light")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("dark")} className="rounded-none focus:bg-muted focus:text-secondary text-xs font-bold uppercase">
                                <Moon className="mr-2 h-3.5 w-3.5" />
                                {tCommon("dark")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("system")} className="rounded-none focus:bg-muted focus:text-secondary text-xs font-bold uppercase">
                                <Laptop className="mr-2 h-3.5 w-3.5" />
                                {tCommon("system")}
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem asChild className="rounded-none text-red-500 focus:text-red-400 focus:bg-red-500/10 py-2.5">
                    <form action={signOut} className="w-full">
                        <button className="w-full flex items-center text-left cursor-pointer">
                            <LogOut className="mr-3 h-4 w-4 text-red-500" />
                            <span className="text-xs font-bold uppercase tracking-tight">{t("logout")}</span>
                        </button>
                    </form>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
