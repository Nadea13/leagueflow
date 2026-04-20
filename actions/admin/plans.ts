'use server'

import { Plan, ActionResponse } from "@/types";

// ==========================================
// HARDCODED PLANS (MANAGED VIA CODE)
// ==========================================
const MANAGER_PLANS: Plan[] = [
    {
        id: 'fallback-starter',
        name: 'Manager Starter',
        description: ['1 Team limit', 'Basic Player Management', 'Community Support'],
        price: 0,
        discounted_price: null,
        duration: 'lifetime',
        max_teams: 1,
        max_players_per_team: 14,
        support_level: 'Community',
        recommended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'fallback-manager-pro',
        name: 'Manager Pro',
        description: ['Unlimited team creation', 'Manage multiple squads', 'Advanced Team Management', 'Standard Support'],
        price: 190,
        discounted_price: null,
        duration: 'monthly',
        max_teams: 0,
        max_players_per_team: 0,
        support_level: 'Standard',
        recommended: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

const ORGANIZER_PLANS: Plan[] = [
    {
        id: 'fallback-free',
        name: 'Free',
        description: ['Limit 8 teams per tournament', 'Basic stats', 'Community Support'],
        price: 0,
        discounted_price: null,
        duration: 'lifetime',
        max_tournaments: 0,
        max_teams_per_tournament: 8,
        format_support: 'Basic',
        invite_enabled: false,
        register_enabled: true,
        stats_support: 'Basic',
        support_level: 'Community',
        recommended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'fallback-tournament',
        name: 'Single Tournament',
        description: ['Single tournament use', 'All tournament formats', 'Advanced Stats & Goals', 'Standard Support', 'Custom Branding'],
        price: 990,
        discounted_price: 590,
        duration: 'lifetime',
        max_tournaments: 1,
        max_teams_per_tournament: 0,
        format_support: 'All',
        invite_enabled: true,
        register_enabled: true,
        stats_support: 'Advanced',
        support_level: 'Standard',
        recommended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'fallback-monthly',
        name: 'Organizer Monthly Pro',
        description: ['Unlimited tournaments', 'All pro features included', 'Priority 24/7 Support', 'Cancel anytime'],
        price: 1290,
        discounted_price: 890,
        duration: 'monthly',
        max_tournaments: 0,
        max_teams_per_tournament: 0,
        format_support: 'All',
        invite_enabled: true,
        register_enabled: true,
        stats_support: 'Advanced',
        support_level: 'Priority',
        recommended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'fallback-yearly',
        name: 'Organizer Yearly Pro',
        description: ['Save 2 months', 'Unlimited everything', 'VIP Priority Support', 'Advance Analytics'],
        price: 12900,
        discounted_price: 8900,
        duration: 'yearly',
        max_tournaments: 0,
        max_teams_per_tournament: 0,
        format_support: 'All',
        invite_enabled: true,
        register_enabled: true,
        stats_support: 'Advanced',
        support_level: 'Priority',
        recommended: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

export async function getPlans(options?: { role?: 'organizer' | 'manager' }): Promise<ActionResponse<Plan[]>> {
    try {
        const role = options?.role || 'organizer';
        const data = role === 'manager' ? MANAGER_PLANS : ORGANIZER_PLANS;
        return { success: true, data };
    } catch (error) {
        console.error('Unexpected error in getPlans:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

export async function upsertPlan(_plan: Partial<Plan>, _role: 'organizer' | 'manager'): Promise<ActionResponse<Plan>> {
    return { success: false, error: 'Pricing is now managed directly in the codebase.' };
}

export async function deletePlan(_id: string, _role: 'organizer' | 'manager'): Promise<ActionResponse> {
    return { success: false, error: 'Pricing is now managed directly in the codebase.' };
}
