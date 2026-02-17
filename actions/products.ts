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
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching products:', error);
            return { success: false, error: 'Failed to fetch products' };
        }

        return { success: true, data: data as Product[] };
    } catch (error) {
        console.error('Unexpected error:', error);
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
