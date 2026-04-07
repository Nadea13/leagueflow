'use server'

import { createClient } from "@/lib/supabase/server";
import { Plan, ActionResponse } from "@/types";
import { revalidatePath } from "next/cache";
import { requireAdminAuth } from "@/lib/admin-auth";

export async function getPlans(options?: { role?: 'organizer' | 'manager' }): Promise<ActionResponse<Plan[]>> {
    const supabase = await createClient();

    try {
        const role = options?.role || 'organizer';
        const tableName = role === 'manager' ? 'manager_plans' : 'organizer_plans';

        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .order('price', { ascending: true });

        if (error) {
            console.error(`Error fetching ${tableName} from DB:`, error);
        }

        // Fallback to default plans if DB is empty or has error
        if (!data || data.length === 0) {
            console.warn(`No plans found in ${tableName}, using fallback defaults.`);
            
            if (role === 'manager') {
                const managerFallbacks: Plan[] = [
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
                        recommended: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ];
                return { success: true, data: managerFallbacks };
            } else {
                const organizerFallbacks: Plan[] = [
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
                return { success: true, data: organizerFallbacks };
            }
        }

        return { success: true, data: data as Plan[] };
    } catch (error) {
        console.error('Unexpected error in getPlans:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

export async function upsertPlan(plan: Partial<Plan>, role: 'organizer' | 'manager'): Promise<ActionResponse<Plan>> {
    const auth = await requireAdminAuth();
    if (!auth.authorized) return { success: false, error: auth.error };

    const supabase = auth.supabase;
    const tableName = role === 'manager' ? 'manager_plans' : 'organizer_plans';

    try {
        const { data, error } = await supabase
            .from(tableName)
            .upsert({
                id: plan.id,
                ...plan,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error(`Error upserting ${tableName}:`, error);
            return { success: false, error: 'Failed to save plan' };
        }

        revalidatePath('/admin/pricing');
        return { success: true, data: data as Plan };
    } catch (error) {
        console.error('Unexpected error:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

export async function deletePlan(id: string, role: 'organizer' | 'manager'): Promise<ActionResponse> {
    const auth = await requireAdminAuth();
    if (!auth.authorized) return { success: false, error: auth.error };

    const supabase = auth.supabase;
    const tableName = role === 'manager' ? 'manager_plans' : 'organizer_plans';

    try {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`Error deleting from ${tableName}:`, error);
            return { success: false, error: 'Failed to delete plan' };
        }

        revalidatePath('/admin/pricing');
        return { success: true, message: 'Plan deleted successfully' };
    } catch (error) {
        console.error('Unexpected error:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}
