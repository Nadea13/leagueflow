"use client"

import { useState, useEffect } from "react"
import { Link, usePathname, useRouter } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { getNavItems } from "@/config/nav"

import { BugReportDialog } from "@/components/dashboard/bug-report-dialog"
import { Button } from "@/components/ui/button"
import { LayoutGrid, Users as UsersIcon, Trophy, CheckCircle2, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { registerAsOrganizer } from "@/actions/organizer/dashboard"
import { useToast } from "@/hooks/use-toast"

export function DashboardSidebar({ className, role, isOrganizer: initialIsOrganizer, forcedMode }: { className?: string, role?: string, isOrganizer?: boolean, forcedMode?: 'organizer' | 'team' }) {
    const pathname = usePathname()
    const t = useTranslations("Nav")
    const { toast } = useToast()
    const router = useRouter()
    const [mode, setMode] = useState<'organizer' | 'team'>(forcedMode || 'team')
    const [isOrganizer, setIsOrganizer] = useState(initialIsOrganizer)
    const [showRegDialog, setShowRegDialog] = useState(false)
    const [isRegistering, setIsRegistering] = useState(false)

    // Persist mode in localStorage
    useEffect(() => {
        const timer = setTimeout(() => {
            const savedMode = localStorage.getItem('dashboard-mode') as 'organizer' | 'team'
            if (savedMode === 'organizer' && !isOrganizer) {
                setMode('team')
                localStorage.setItem('dashboard-mode', 'team')
            } else if (savedMode) {
                setMode(savedMode)
            }
        }, 0);

        // Sync with DashboardNavbar
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'dashboard-mode') {
                setMode(e.newValue as 'organizer' | 'team')
            }
        }
        window.addEventListener('storage', handleStorageChange)
        return () => {
            clearTimeout(timer);
            window.removeEventListener('storage', handleStorageChange);
        }
    }, [isOrganizer])

    const handleModeChange = (newMode: 'organizer' | 'team') => {
        if (newMode === 'organizer' && !isOrganizer) {
            setShowRegDialog(true)
            return
        }
        
        setMode(newMode)
        localStorage.setItem('dashboard-mode', newMode)
        // Dispatch event for same-window sync
        window.dispatchEvent(new StorageEvent('storage', { key: 'dashboard-mode', newValue: newMode }))
        
        // Navigate to the respective dashboard
        if (newMode === 'organizer') {
            router.push('/organizer/dashboard')
        } else {
            router.push('/manager/dashboard')
        }
    }

    const handleRegister = async () => {
        setIsRegistering(true)
        const result = await registerAsOrganizer()
        setIsRegistering(false)

        if (result.success) {
            setIsOrganizer(true)
            setShowRegDialog(false)
            handleModeChange('organizer')
            toast({
                title: "Welcome, Organizer!",
                description: "You have successfully registered as a tournament organizer.",
            })
            router.refresh()
        } else {
            toast({
                title: "Registration Failed",
                description: result.error,
                variant: "destructive"
            })
        }
    }

    const navItems = getNavItems(mode, role)

    return (
        <div className={cn("flex h-full max-h-screen flex-col gap-0 fixed md:w-[220px] lg:w-[280px] bg-background border-r border-border shadow-2xl z-50", className)}>
            <div className="flex h-20 items-center px-4 lg:px-8 border-b border-border">
                <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 group">
                    <div className="relative">
                        <svg viewBox="0 0 160 160" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(0,196,154,0.3)] transition-all group-hover:drop-shadow-[0_0_12px_rgba(0,196,154,0.5)]" xmlns="http://www.w3.org/2000/svg">
                            <path d="M85.4616 21.9501C86.0436 21.9471 86.6256 21.9441 87.2253 21.941C94.6778 21.9214 101.867 22.4122 109.212 23.8001C108.078 25.1269 106.944 26.4529 105.805 27.7751C104.953 28.7693 104.105 29.7682 103.268 30.7751C95.053 40.4796 85.8612 49.0996 75.6116 56.6001C75.0985 56.9801 74.5855 57.3601 74.0569 57.7517C62.719 66.1146 50.7349 73.3682 38.3116 80.0001C37.7382 80.3066 37.1648 80.6131 36.5741 80.9288C32.6149 83.0001 32.6149 83.0001 30.8116 83.0001C30.5549 81.8516 30.3068 80.7011 30.0616 79.5501C29.9223 78.9097 29.7831 78.2693 29.6397 77.6095C28.1595 68.5881 28.3166 59.5618 28.3616 50.4501C28.3656 49.0256 28.3692 47.6012 28.3725 46.1767C28.3812 42.7178 28.395 39.259 28.4116 35.8001C43.3259 28.6069 43.3259 28.6069 49.5616 26.7501C50.1967 26.5597 50.8319 26.3693 51.4864 26.1732C53.3888 25.6225 55.296 25.1029 57.2116 24.6001C58.021 24.3849 58.021 24.3849 58.8467 24.1654C67.5959 21.9748 76.496 21.9759 85.4616 21.9501Z" fill="#0D2C54" />
                            <path d="M143.612 48.5996C144.14 48.5996 144.668 48.5996 145.212 48.5996C145.95 75.4476 143.218 103.372 125.212 124.6C124.536 125.405 123.861 126.21 123.165 127.04C114.98 136.526 99.6453 150.742 86.8117 152.6C84.5742 151.628 84.5742 151.628 82.2117 150.25C81.4238 149.797 80.636 149.344 79.8242 148.878C79.2261 148.522 78.628 148.166 78.0117 147.8C78.0117 145.4 78.0117 145.4 79.3117 144.04C79.9387 143.515 80.5657 142.99 81.2117 142.45C90.2309 134.585 98.7241 126.103 106.012 116.6C106.823 115.571 107.634 114.543 108.446 113.515C123.99 93.7006 135.136 72.2987 143.612 48.5996Z" fill="#0D2C54" />
                            <path d="M128.411 7C128.675 7.528 128.939 8.056 129.211 8.6C128.486 10.2676 128.486 10.2676 127.323 12.3313C126.896 13.091 126.47 13.8508 126.03 14.6336C125.562 15.4475 125.093 16.2614 124.611 17.1C124.136 17.9304 123.661 18.7608 123.172 19.6164C114.766 34.1514 104.746 46.8321 93.2106 59C92.3567 59.9049 92.3567 59.9049 91.4856 60.8281C87.7139 64.7157 83.6366 68.1475 79.3899 71.5047C77.8355 72.739 76.2941 73.9889 74.7512 75.2375C66.616 81.759 58.2439 87.4056 49.2106 92.6C48.3451 93.1068 48.3451 93.1068 47.4621 93.6238C21.8479 108.6 21.8479 108.6 15.6106 108.6C15.3372 107.502 15.0722 106.401 14.8106 105.3C14.5878 104.381 14.5878 104.381 14.3606 103.444C13.9648 101.133 13.988 98.941 14.0106 96.6C14.5443 96.3837 15.078 96.1674 15.6279 95.9445C43.5248 84.5694 70.347 70.2494 92.4106 49.4C93.5065 48.4454 94.6064 47.4952 95.7106 46.55C101.954 41.0825 107.257 35.0974 112.411 28.6C112.769 28.1515 113.128 27.7031 113.497 27.241C118.747 20.6719 123.743 14.0008 128.411 7Z" fill="#00C49A" />
                            <path d="M132.412 16.5996C132.808 17.3916 132.808 17.3916 133.212 18.1996C132.401 20.3205 132.401 20.3205 131.121 23.009C130.893 23.4895 130.665 23.97 130.43 24.465C129.682 26.0307 128.923 27.5906 128.162 29.1496C127.905 29.6788 127.648 30.2079 127.384 30.7531C123.495 38.7442 119.335 46.2689 114.012 53.3996C113.424 54.2174 112.836 55.0352 112.23 55.8777C110.469 58.29 108.658 60.6516 106.812 62.9996C106.212 63.7638 105.613 64.5279 104.996 65.3152C94.7698 77.8603 83.0952 89.4632 70.0115 98.9996C68.8962 99.869 68.8962 99.869 67.7584 100.756C57 109.105 45.5483 116.434 33.2115 122.2C32.4195 118.24 31.6275 114.28 30.8115 110.2C31.7139 109.743 32.6162 109.286 33.5459 108.815C61.9532 94.2572 89.802 74.4553 109.729 49.166C110.957 47.616 112.202 46.0805 113.446 44.5434C119.624 36.8337 125.049 28.9151 130 20.3654C130.761 19.084 131.585 17.8399 132.412 16.5996Z" fill="#00C49A" />
                            <path d="M137.211 24.5986C138.191 27.5371 137.739 28.1896 136.565 30.983C136.234 31.7759 135.904 32.5688 135.563 33.3857C135.2 34.2315 134.836 35.0773 134.461 35.9486C133.908 37.2513 133.908 37.2513 133.343 38.5803C119.694 70.3639 98.4172 99.4369 70.8115 120.599C69.8872 121.334 68.9644 122.072 68.0427 122.811C53.7988 134.199 53.7988 134.199 50.8115 134.199C50.2508 132.803 49.7033 131.402 49.1615 129.999C48.8552 129.219 48.5489 128.439 48.2334 127.636C47.3033 124.29 47.3033 124.29 48.4115 122.199C50.0305 120.986 51.5772 119.968 53.3115 118.949C72.4474 107.16 90.9969 91.6468 105.002 74.0486C106.187 72.5746 107.402 71.1232 108.646 69.6986C120.381 56.2213 129.292 40.5486 137.211 24.5986Z" fill="#00C49A" />
                            <path d="M140.411 36.5996C142.712 43.4067 137.507 52.0474 134.811 58.1996C134.394 59.1908 133.977 60.1825 133.561 61.1746C122.113 88.2649 104.9 111.364 84.2613 132.15C83.5297 132.889 82.798 133.628 82.0441 134.39C69.3737 147 69.3737 147 66.0113 147C65.3187 145.454 64.6375 143.903 63.9613 142.35C63.5808 141.486 63.2003 140.623 62.8082 139.734C62.0113 137.4 62.0113 137.4 62.8113 135C64.3926 133.731 64.3926 133.731 66.5113 132.3C81.2412 121.83 95.1535 108.643 106.011 94.1996C106.769 93.2149 107.528 92.2306 108.286 91.2465C121.242 74.329 132.257 56.3321 140.411 36.5996Z" fill="#00C49A" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-black leading-[0.8] tracking-tighter text-foreground">LeagueFlow</span>
                        <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-secondary/80 ml-0.5">
                            {mode === 'organizer' ? 'Organizer' : 'Manager'}
                        </span>
                    </div>
                </Link>
            </div>
            
            {/* Mode Switcher */}
            <div className="px-4 py-6">
                <div className="flex p-1 bg-muted/20 rounded-none gap-1 border border-border">
                    <button
                        onClick={() => handleModeChange('organizer')}
                        className={cn(
                            "flex flex-1 items-center justify-center gap-2 px-2 py-2 text-[10px] font-black uppercase transition-all rounded-none",
                            mode === 'organizer' ? "bg-secondary text-secondary-foreground shadow-[0_0_15px_rgba(0,196,154,0.3)]" : "text-muted-foreground hover:text-secondary"
                        )}
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        {t("organizer_mode")}
                    </button>
                    <button
                        onClick={() => handleModeChange('team')}
                        className={cn(
                            "flex flex-1 items-center justify-center gap-2 px-2 py-2 text-[10px] font-black uppercase transition-all rounded-none",
                            mode === 'team' ? "bg-secondary text-secondary-foreground shadow-[0_0_15px_rgba(0,196,154,0.3)]" : "text-muted-foreground hover:text-secondary"
                        )}
                    >
                        <UsersIcon className="h-3.5 w-3.5" />
                        {t("team_mode")}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pt-2">
                <nav className="grid items-start px-2 lg:px-4 gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                target={item.openInNewTab ? "_blank" : undefined}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3.5 transition-all relative group",
                                    isActive
                                        ? "text-secondary font-black bg-muted/30"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                                )}
                            >
                                {isActive && <div className="absolute left-0 top-0 w-1 h-full bg-secondary shadow-[0_0_10px_rgba(0,196,154,0.5)]" />}
                                <item.icon className={cn("h-4.5 w-4.5 transition-transform group-hover:scale-110", isActive ? "text-secondary" : "text-muted-foreground/50")} />
                                <span className="text-[11px] font-black uppercase tracking-[0.15em]">{t(item.titleKey)}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto p-4 flex flex-col items-start gap-2 border-t border-border">
                <BugReportDialog />
            </div>

            <Dialog open={showRegDialog} onOpenChange={setShowRegDialog}>
                <DialogContent className="sm:max-w-[450px] bg-background border-border rounded-none p-0 overflow-hidden shadow-2xl">
                    <div className="bg-secondary/10 px-8 py-6 border-b border-border relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                        <DialogHeader>
                            <div className="w-12 h-12 bg-muted flex items-center justify-center mb-4 border border-border rotate-3">
                                <Trophy className="h-6 w-6 text-secondary -rotate-3" />
                            </div>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground">Become an Organizer</DialogTitle>
                            <DialogDescription className="text-muted-foreground font-medium pt-1">
                                Unlock professional tournament management tools and reach thousands of players.
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    
                    <div className="px-8 py-8 space-y-6">
                        <div className="grid gap-3">
                            <div className="flex items-start gap-4 p-4 bg-muted/20 border border-border transition-all hover:border-secondary/30">
                                <div className="p-1.5 bg-secondary/10 border border-secondary/20">
                                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Tournament Creation</p>
                                    <p className="text-[11px] text-muted-foreground font-medium">Build professional leagues and brackets with ease.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 bg-muted/20 border border-border transition-all hover:border-secondary/30">
                                <div className="p-1.5 bg-secondary/10 border border-secondary/20">
                                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Financial Controls</p>
                                    <p className="text-[11px] text-muted-foreground font-medium">Manage registration fees and secure payments.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 bg-muted/20 border border-border transition-all hover:border-secondary/30">
                                <div className="p-1.5 bg-secondary/10 border border-secondary/20">
                                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Match Console</p>
                                    <p className="text-[11px] text-muted-foreground font-medium">Real-time scheduling and live score tracking.</p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button
                                className="w-full h-12 shadow-[0_0_20px_rgba(0,196,154,0.2)]"
                                onClick={handleRegister}
                                disabled={isRegistering}
                                variant="secondary"
                            >
                                {isRegistering ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Trophy className="h-4 w-4" />
                                        Confirm Registration
                                    </span>
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
