"use client"

import { Link, usePathname } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { UserDropdown } from "@/features/dashboard/user-dropdown"
import { useState } from "react"
import { getNavItems } from "@/config/nav"

import { BecomeOrganizerDialog } from "@/features/dashboard/become-organizer-dialog"
import { BecomeTeamManagerDialog } from "@/features/dashboard/become-team-manager-dialog"
import { Logo } from "@/components/shared/logo"

interface DashboardNavbarProps {
    userEmail?: string
    userName?: string | null
    userAvatar?: string
    role?: string
    isOrganizer?: boolean
    isTeamManager?: boolean
    forcedMode?: 'organizer' | 'team'
    className?: string
}

export function DashboardNavbar({
    userEmail,
    userName,
    userAvatar,
    role,
    isOrganizer = false,
    isTeamManager = false,
    className
}: DashboardNavbarProps) {
    const pathname = usePathname()
    const t = useTranslations("Nav")
    const [showOrganizerDialog, setShowOrganizerDialog] = useState(false)
    const [showManagerDialog, setShowManagerDialog] = useState(false)

    const mode = 'organizer'
    const navItems = getNavItems(mode, role)

    return (
        <>
            {/* Mobile Bottom Navigation Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex justify-around py-1.5 items-center px-2 shadow-lg">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={(e) => {
                                if (item.href === "/dashboard/tournaments" && !isOrganizer) {
                                    e.preventDefault();
                                    setShowOrganizerDialog(true);
                                    return;
                                }
                                if (item.href === "/dashboard/teams" && !isTeamManager) {
                                    e.preventDefault();
                                    setShowManagerDialog(true);
                                    return;
                                }
                            }}
                            className={cn(
                                "flex flex-col items-center gap-1 py-1 px-3 rounded-md transition-all active:scale-95",
                                isActive ? "text-primary" : "text-muted-foreground/60 hover:text-primary"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            <span className="text-[10px] font-bold tracking-tight">{t(item.titleKey)}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Mobile Top Header / Desktop Navbar Header */}
            <header className={cn("sticky top-0 z-40 flex h-14 md:h-20 items-center justify-between border-b bg-background/80 backdrop-blur-xl px-2 w-full", className)}>
                <div className="flex items-center gap-1 md:gap-2">
                    <Link href="/dashboard" className="flex items-center gap-2 transition-transform group">
                        <div className="relative shrink-0">
                            <Logo className="w-7 h-7 md:w-8 md:h-8 transition-all" color="#00C49A" />
                        </div>
                        <span className="text-base md:text-lg font-black tracking-tighter text-foreground shrink-0 leading-none">League Flow</span>
                    </Link>
                </div>
                <div className="flex items-center">
                    <UserDropdown email={userEmail} name={userName} avatar={userAvatar} role={role} className="border-none hover:bg-transparent p-0" hideText />
                </div>

                <BecomeOrganizerDialog
                    open={showOrganizerDialog}
                    onOpenChange={setShowOrganizerDialog}
                />
                <BecomeTeamManagerDialog
                    open={showManagerDialog}
                    onOpenChange={setShowManagerDialog}
                />
            </header>
        </>
    )
}
