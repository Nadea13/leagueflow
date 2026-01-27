"use client"

import { Link, usePathname } from "@/i18n/routing";

import { LayoutDashboard, Trophy, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
    const pathname = usePathname();

    const items = [
        { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
        { href: "/dashboard/tournaments", icon: Trophy, label: "Leagues" },
        { href: "/dashboard/teams", icon: Users, label: "Teams" },
        { href: "/dashboard/profile", icon: User, label: "Profile" },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-md p-2 md:hidden z-50">
            <nav className="flex justify-around items-center">
                {items.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                                ? "text-primary"
                                : "text-muted-foreground hover:text-primary"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
}
