'use server'

import { createClient } from "@/lib/supabase/server";

export async function getAllPayments() {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from("payments")
        .select(`
            *,
            user:users!user_id (
                email,
                full_name
            )
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching payments:", error);
        return [];
    }

    return data || [];
}
