'use server'

import { createClient } from "@/utils/supabase/server";
import { Product, ActionResponse } from "@/types";
import { revalidatePath } from "next/cache";

export async function getProducts(): Promise<ActionResponse<Product[]>> {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('price', { ascending: true });

        if (error) {
            console.error('Error fetching products from DB:', error);
        }

        // Fallback to default products if DB is empty or has error
        if (!data || data.length === 0) {
            console.warn('No products found in database, using fallback defaults.');
            const fallbacks: Product[] = [
                {
                    id: 'fallback-starter',
                    name: 'Starter',
                    description: ['1 Team limit', 'League & Knockout', 'Basic Statistics', 'Community Support'],
                    price: 0,
                    discounted_price: null,
                    duration: 'lifetime',
                    teams_limit: 1,
                    format_support: '14',
                    invite_enabled: false,
                    register_enabled: false,
                    support_level: 'Community',
                    recommended: false,
                    target_role: 'manager',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    id: 'fallback-tournament',
                    name: 'Per Tournament',
                    description: ['Unlimited teams', 'All tournament formats', 'Advanced Stats & Goals', 'Standard Support', 'Custom Branding'],
                    price: 990,
                    discounted_price: 590,
                    duration: 'lifetime',
                    teams_limit: 0,
                    format_support: 'All',
                    invite_enabled: true,
                    register_enabled: true,
                    support_level: 'Standard',
                    recommended: false,
                    target_role: 'organizer',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    id: 'fallback-monthly',
                    name: 'Monthly Pro',
                    description: ['Unlimited tournaments', 'All pro features included', 'Priority 24/7 Support', 'Cancel anytime'],
                    price: 1290,
                    discounted_price: 890,
                    duration: 'monthly',
                    teams_limit: 0,
                    format_support: 'All',
                    invite_enabled: true,
                    register_enabled: true,
                    support_level: 'Priority',
                    recommended: false,
                    target_role: 'organizer',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    id: 'fallback-yearly',
                    name: 'Yearly Pro',
                    description: ['Save 2 months', 'Unlimited everything', 'VIP Priority Support', 'Advance Analytics'],
                    price: 12900,
                    discounted_price: 8900,
                    duration: 'yearly',
                    teams_limit: 0,
                    format_support: 'All',
                    invite_enabled: true,
                    register_enabled: true,
                    support_level: 'Priority',
                    recommended: true,
                    target_role: 'organizer',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ];
            return { success: true, data: fallbacks };
        }

        return { success: true, data: data as Product[] };
    } catch (error) {
        console.error('Unexpected error in getProducts:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

export async function upsertProduct(product: Partial<Product>): Promise<ActionResponse<Product>> {
    const supabase = await createClient();

    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        return { success: false, error: 'Unauthorized access' };
    }

    try {
        const { data, error } = await supabase
            .from('products')
            .upsert({
                id: product.id, // If provided, updates; otherwise creates (if ID is generated in DB, might need to exclude if new)
                // Note: If ID is not provided for new product, we should let DB generate it. 
                // However, upsert requires a primary key match.
                // If creating new, better to use insert, or ensure id is undefined/null so Supabase handles it if configured? 
                // Actually, if we pass undefined ID for new item, upsert might fail if it expects PK.
                // Better strategy: Clean partial object.
                ...product,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error upserting product:', error);
            return { success: false, error: 'Failed to save product' };
        }

        revalidatePath('/admin/pricing');
        return { success: true, data: data as Product };
    } catch (error) {
        console.error('Unexpected error:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

export async function deleteProduct(id: string): Promise<ActionResponse> {
    const supabase = await createClient();

    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        return { success: false, error: 'Unauthorized access' };
    }

    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting product:', error);
            return { success: false, error: 'Failed to delete product' };
        }

        revalidatePath('/admin/pricing');
        return { success: true, message: 'Product deleted successfully' };
    } catch (error) {
        console.error('Unexpected error:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}
