"use client";

import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import type { User } from "@supabase/supabase-js";

interface PublicNavbarProps {
    user: User | null;
}

export function PublicNavbar({ user }: PublicNavbarProps) {
    const tLanding = useTranslations('Landing');
    const pathname = usePathname();

    const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (pathname === "/" || pathname === "") {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    return (
        <header className="border-b fixed top-0 left-0 right-0 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 bg-background/80 print:hidden">
            <div className="container max-w-7xl mx-auto px-2 md:px-0 h-14 flex items-center justify-between relative">
                {/* Logo & Brand */}
                <div className="flex items-center gap-6">
                    <Link 
                        href="/" 
                        onClick={handleLogoClick}
                        className="flex items-center gap-2 font-bold text-xl cursor-pointer"
                    >
                        <div className="relative shrink-0">
                            <Logo className="w-7 h-7 md:w-8 md:h-8 transition-all" color="#00C49A" />
                        </div>
                        <span className="text-base md:text-lg font-black tracking-tighter text-foreground shrink-0 leading-none">League Flow</span>
                    </Link>
                </div>

                {/* Centered Navigation Menu */}
                <nav className="hidden md:flex items-center gap-4 text-sm font-semibold absolute left-1/2 -translate-x-1/2">
                    <Link href="/tournaments" className="text-muted-foreground hover:text-foreground transition-colors">
                        {tLanding('nav_tournaments')}
                    </Link>
                    <Link href="/registrations" className="text-muted-foreground hover:text-foreground transition-colors">
                        การลงทะเบียน
                    </Link>
                </nav>

                {/* Right Side Actions */}
                <div className="flex items-center">
                    {user ? (
                        <Button asChild variant="outline" className="hidden sm:flex">
                            <Link href="/dashboard">{tLanding('nav_dashboard')}</Link>
                        </Button>
                    ) : (
                        <>
                            <Button variant="ghost" asChild className="hidden sm:inline-flex">
                                <Link href="/login">{tLanding('nav_signin')}</Link>
                            </Button>
                            <Button asChild>
                                <Link href="/signup">{tLanding('hero_cta_start')}</Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
