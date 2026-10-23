"use client";

import { useState, useEffect } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/shared/logo";
import { Shield } from "lucide-react";

export interface NavbarUser {
    id?: string;
    email?: string;
    full_name?: string;
    role?: string;
}

interface PublicNavbarProps {
    user?: NavbarUser | null;
}

export function PublicNavbar({ user = null }: PublicNavbarProps) {
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

    const isSignInPage = pathname === "/sign-in" || pathname === "/login";
    const isSignUpPage = pathname === "/sign-up" || pathname === "/signup";

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
                    <BrandLogo 
                        href="/" 
                        onClick={handleLogoClick}
                        size="md"
                        className="font-bold cursor-pointer"
                    />
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
                        <>
                            {(user.role === 'super_admin' || user.role === 'admin') && (
                                <Button asChild size="sm" variant="outline" className="font-semibold text-primary border-primary/30 hover:bg-primary/10 gap-1.5 shadow-xs">
                                    <Link href="/admin" target="_blank" rel="noopener noreferrer">
                                        <Shield className="h-4 w-4" />
                                        <span>Admin Panel</span>
                                    </Link>
                                </Button>
                            )}
                            <Button asChild size="sm" variant="outline" className="font-medium">
                                <Link href="/dashboard">{tLanding('nav_dashboard')}</Link>
                            </Button>
                        </>
                    ) : isSignInPage ? (
                        <Button size="sm" asChild className="font-semibold shadow-xs">
                            <Link href="/sign-up">ลงทะเบียน</Link>
                        </Button>
                    ) : isSignUpPage ? (
                        <Button size="sm" variant="outline" asChild className="font-semibold shadow-xs">
                            <Link href="/sign-in">{tLanding('nav_signin') || "เข้าสู่ระบบ"}</Link>
                        </Button>
                    ) : (
                        <>
                            <Button size="sm" variant="ghost" asChild className="hidden sm:inline-flex font-medium">
                                <Link href="/sign-in">{tLanding('nav_signin')}</Link>
                            </Button>
                            <Button size="sm" asChild className="font-semibold shadow-xs">
                                <Link href="/sign-up">{tLanding('hero_cta_start')}</Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
