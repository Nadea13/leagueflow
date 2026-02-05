"use server";

import { createAdminClient } from "@/utils/supabase/server";

export async function getAllPayments() {
    // Use Admin Client to bypass RLS
    const supabase = createAdminClient();

    const { data: payments, error } = await supabase
        .from("payments")
        .select('*')
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching payments:", error);
        return [];
    }

    // Fetch users for mapping (Email is key)
    const { data: users } = await supabase
        .from("profiles")
        .select("id, email, full_name");

    const userMap = new Map(users?.map((u: any) => [u.id, u]) || []);

    return payments.map((p: any) => {
        const user = userMap.get(p.user_id);
        return {
            ...p,
            user: user ? { email: user.email, full_name: user.full_name } : undefined
        };
    });
}
