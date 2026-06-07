import { LayoutDashboard, Trophy, Users, Settings, Mail, LucideIcon, Home } from "lucide-react"

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
export const organizerNavItems: NavItem[] = [
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
        titleKey: "notifications",
        href: "/dashboard/notifications",
        icon: Mail,
    },
    {
        titleKey: "settings",
        href: "/dashboard/settings",
        icon: Settings,
    },
]

export const teamNavItems: NavItem[] = [
    {
        titleKey: "home",
        href: "/manager/dashboard",
        icon: LayoutDashboard,
    },
    {
        titleKey: "my_teams",
        href: "/manager/my-teams",
        icon: Users,
    },
    {
        titleKey: "leagues",
        href: "/manager/tournaments",
        icon: Trophy,
    },
    {
        titleKey: "my_registrations",
        href: "/manager/my-registrations",
        icon: Trophy,
    },
    {
        titleKey: "settings",
        href: "/manager/settings",
        icon: Settings,
    },
]

/**
 * Get nav items based on mode
 */
export function getNavItems(mode: 'organizer' | 'team' = 'organizer', _role?: string): NavItem[] {
    return mode === 'team' ? [...teamNavItems] : [...organizerNavItems];
}
