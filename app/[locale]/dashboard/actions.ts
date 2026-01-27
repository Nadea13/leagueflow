'use server'

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { ActionResponse } from "@/types/index";

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return redirect("/login");
}

export async function createTournament(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const name = formData.get("name") as string;
        const format = formData.get("format") as string;
        const start_date = formData.get("start_date") as string;
        const end_date = formData.get("end_date") as string;
        const number_of_pitches = parseInt(formData.get("number_of_pitches") as string) || 1;

        if (!name || !format) {
            return { success: false, error: "Name and format are required" };
        }

        const { error } = await supabase.from("tournaments").insert({
            name,
            format,
            start_date: start_date || null,
            end_date: end_date || null,
            number_of_pitches,
            created_at: new Date().toISOString(),
        });

        if (error) {
            return { success: false, error: error.message };
        }

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return { success: false, error: "An unexpected error occurred" };
    }
}
