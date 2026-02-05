import { LayoutDashboard, Trophy, Users, Settings, CreditCard, Mail, Shield, LucideIcon, Home } from "lucide-react"

export interface NavItem {
    titleKey: string
    href: string
    icon: LucideIcon
    adminOnly?: boolean
    openInNewTab?: boolean
}

/**
 * Shared navigation items for dashboard sidebar, header mobile menu, and bottom nav
 * Use `titleKey` with translations: t(item.titleKey)
 */
export const dashboardNavItems: NavItem[] = [
    {
        titleKey: "home",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        titleKey: "leagues",
        href: "/dashboard/tournaments",
        icon: Trophy,
    },
    {
        titleKey: "invites",
        href: "/dashboard/invites",
        icon: Mail,
    },
    {
        titleKey: "teams",
        href: "/dashboard/teams",
        icon: Users,
    },
    {
        titleKey: "billing",
        href: "/dashboard/billing",
        icon: CreditCard,
    },
    {
        titleKey: "settings",
        href: "/dashboard/settings",
        icon: Settings,
    },
]

export const adminNavItem: NavItem = {
    titleKey: "admin",
    href: "/admin",
    icon: Shield,
    adminOnly: true,
    openInNewTab: true,
}

/**
 * Bottom navigation items (subset for mobile)
 */
export const bottomNavItems: NavItem[] = [
    {
        titleKey: "home",
        href: "/dashboard",
        icon: Home,
    },
    {
        titleKey: "leagues",
        href: "/dashboard/tournaments",
        icon: Trophy,
    },
    {
        titleKey: "teams",
        href: "/dashboard/teams",
        icon: Users,
    },
    {
        titleKey: "settings",
        href: "/dashboard/settings",
        icon: Settings,
    },
]

/**
 * Get nav items with optional admin item based on user role
 */
export function getNavItems(role?: string): NavItem[] {
    const items = [...dashboardNavItems]
    if (role === 'admin') {
        items.push(adminNavItem)
    }
    return items
}
