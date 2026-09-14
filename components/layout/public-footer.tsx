"use client";

import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ArrowRight, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/shared/logo";

export function PublicFooter() {
    const tLanding = useTranslations('Landing');
    const tPricing = useTranslations('Pricing');
    const pathname = usePathname();

    const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (pathname === "/" || pathname === "") {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    return (
        <footer className="py-10 z-10 border-t bg-background" id="footer">
            <div className="container max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-between text-sm text-muted-foreground gap-8 px-4 md:px-0">
                {/* Brand & Tournaments link */}
                <div className="flex flex-col items-center md:items-start gap-4">
                    <Link 
                        href="/" 
                        onClick={handleLogoClick}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                    >
                        <Logo className="w-8 h-8" color="#00C49A" />
                        <span className="font-black text-foreground text-xl tracking-tighter">League Flow</span>
                    </Link>
                    <div className="flex flex-col items-center md:items-start gap-2">
                        <Link href="/tournaments" className="hover:text-foreground transition-colors font-medium">
                            {tLanding('nav_tournaments')}
                        </Link>
                        <Link href="/registrations" className="hover:text-foreground transition-colors font-medium">
                            {tLanding('nav_registrations')}
                        </Link>
                        <Button asChild className="mt-1">
                            <Link href="/signup">
                                {tPricing('get_started')} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Contact Us Info */}
                <div className="flex flex-col items-center md:items-start gap-2.5">
                    <span className="font-bold text-foreground text-sm">{tLanding('contact_us')}</span>
                    <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 text-xs">
                        <a 
                            href="tel:0992142626" 
                            className="flex items-center gap-2 hover:text-primary transition-colors group"
                        >
                            <Phone className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="font-medium font-mono">099-214-2626</span>
                        </a>
                        <a 
                            href="mailto:nathanon.idea@gmail.com" 
                            className="flex items-center gap-2 hover:text-primary transition-colors group"
                        >
                            <Mail className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="font-medium">nathanon.idea@gmail.com</span>
                        </a>
                    </div>
                </div>

                {/* Copyright & Toggles */}
                <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 md:self-end">
                    <p className="text-xs tracking-wide opacity-40">
                        © {new Date().getFullYear()} League Flow. {tLanding('footer_rights')}
                    </p>
                    <div className="flex items-center gap-2">
                        <LanguageToggle />
                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </footer>
    );
}
