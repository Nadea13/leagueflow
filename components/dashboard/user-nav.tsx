"use client"

import { Link } from "@/i18n/routing"
import { useTheme } from "next-themes"
import { Laptop, Moon, Sun, LogOut, User, CreditCard } from "lucide-react"
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
import { signOut } from "@/app/[locale]/dashboard/actions"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"

export function UserNav({ email }: { email: string | undefined }) {
    const { setTheme } = useTheme()
    const t = useTranslations("Nav")
    const tCommon = useTranslations("Common")

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-none">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src="" alt={email} />
                        <AvatarFallback>{email?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{tCommon("user")}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/settings" className="w-full cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            {t("profile")}
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <LanguageSwitcher />
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span>{tCommon("theme")}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => setTheme("light")}>
                                <Sun className="mr-2 h-4 w-4" />
                                {tCommon("light")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("dark")}>
                                <Moon className="mr-2 h-4 w-4" />
                                {tCommon("dark")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("system")}>
                                <Laptop className="mr-2 h-4 w-4" />
                                {tCommon("system")}
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20">
                    <form action={signOut} className="w-full">
                        <button className="w-full flex items-center text-left cursor-pointer">
                            <LogOut className="mr-4 h-4 w-4 text-red-600" />
                            {t("logout")}
                        </button>
                    </form>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
