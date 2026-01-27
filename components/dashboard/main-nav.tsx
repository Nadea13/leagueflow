"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Trophy, Users, Settings } from 'lucide-react';

const items = [
    { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { title: "Tournaments", href: "/dashboard/tournaments", icon: Trophy },
    { title: "Teams", href: "/dashboard/teams", icon: Users },
    { title: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function MainNav({ className }: { className?: string }) {
    const pathname = usePathname();
    return (
        <nav className={cn("flex flex-col gap-2", className)}>
            {items.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                        pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                    )}
                >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                </Link>
            ))}
        </nav>
    )
}
