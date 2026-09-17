"use client";

import { useState, useEffect } from "react";
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
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (pathname === "/" || pathname === "") {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 print:hidden transition-all duration-300 ${
                scrolled
                    ? "py-3 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-xs"
                    : "py-6 border-0 border-transparent bg-transparent"
            }`}
        >
            <div className="container max-w-7xl mx-auto px-4 md:px-0 flex items-center justify-between relative transition-all duration-300">
                {/* Logo & Brand */}
                <div className="flex items-center gap-6">
                    <Link 
                        href="/" 
                        onClick={handleLogoClick}
                        className="flex items-center gap-2.5 font-bold text-xl cursor-pointer"
                    >
                        <div className="relative shrink-0">
                            <Logo className="w-8 h-8 transition-all" color="#00C49A" />
                        </div>
                        <span className="text-lg md:text-xl font-black tracking-tighter text-foreground shrink-0 leading-none">League Flow</span>
                    </Link>
                </div>

                {/* Centered Navigation Menu */}
                <nav className="hidden md:flex items-center gap-6 text-base font-semibold absolute left-1/2 -translate-x-1/2">
                    <Link href="/tournaments" className="text-muted-foreground hover:text-foreground transition-colors">
                        {tLanding('nav_tournaments')}
                    </Link>
                    <Link href="/registrations" className="text-muted-foreground hover:text-foreground transition-colors">
                        การลงทะเบียน
                    </Link>
                </nav>

                {/* Right Side Actions */}
                <div className="flex items-center gap-2">
                    {user ? (
                        <Button asChild size="sm" variant="outline" className="hidden sm:flex font-medium">
                            <Link href="/dashboard">{tLanding('nav_dashboard')}</Link>
                        </Button>
                    ) : (
                        <>
                            <Button size="sm" variant="ghost" asChild className="hidden sm:inline-flex font-medium">
                                <Link href="/login">{tLanding('nav_signin')}</Link>
                            </Button>
                            <Button size="sm" asChild className="font-semibold shadow-xs">
                                <Link href="/signup">{tLanding('hero_cta_start')}</Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
