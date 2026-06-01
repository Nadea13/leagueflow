"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse } from "@/types/index";

export interface Sponsor {
    id: string;
    tournament_id: string;
    sponsor_name: string;
    logo_img: string;
    link_url: string | null;
    order_index: number;
    created_at: string;
}

export async function getSponsors(tournamentId: string): Promise<ActionResponse<Sponsor[]>> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("tournament_sponsors")
            .select("*")
            .eq("tournament_id", tournamentId)
            .is("deleted_at", null)
            .order("order_index", { ascending: true });

        if (error) {
            console.error("Error getting sponsors:", error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data as Sponsor[] };
    } catch (error) {
        console.error("Unexpected error in getSponsors:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

export async function addSponsor(
    tournamentId: string,
    sponsorName: string,
    logoImg: string,
    linkUrl?: string,
    orderIndex?: number
): Promise<ActionResponse> {
    try {
        const adminSupabase = createAdminClient();

        // Get max order index to append
        let nextOrderIndex = orderIndex;
        if (nextOrderIndex === undefined) {
            const { data } = await adminSupabase
                .from("tournament_sponsors")
                .select("order_index")
                .eq("tournament_id", tournamentId)
                .is("deleted_at", null)
                .order("order_index", { ascending: false })
                .limit(1)
                .maybeSingle();
            
            nextOrderIndex = data ? data.order_index + 1 : 0;
        }

        const { error } = await adminSupabase
            .from("tournament_sponsors")
            .insert({
                tournament_id: tournamentId,
                sponsor_name: sponsorName,
                logo_img: logoImg,
                link_url: linkUrl || null,
                order_index: nextOrderIndex,
            });

        if (error) {
            console.error("Error adding sponsor:", error);
            return { success: false, error: error.message };
        }

        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error("Unexpected error in addSponsor:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

export async function updateSponsorsOrder(
    tournamentId: string,
    sponsors: { id: string; order_index: number }[]
): Promise<ActionResponse> {
    try {
        const adminSupabase = createAdminClient();

        // Perform updates in parallel
        const promises = sponsors.map(s => 
            adminSupabase
                .from("tournament_sponsors")
                .update({ order_index: s.order_index })
                .eq("id", s.id)
        );

        const results = await Promise.all(promises);
        const errorResult = results.find(r => r.error);

        if (errorResult && errorResult.error) {
            console.error("Error updating sponsor order:", errorResult.error);
            return { success: false, error: errorResult.error.message };
        }

        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error("Unexpected error in updateSponsorsOrder:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

export async function deleteSponsor(sponsorId: string, tournamentId: string): Promise<ActionResponse> {
    try {
        const adminSupabase = createAdminClient();

        // Soft delete (or hard delete if preferred, schema supports soft delete with deleted_at)
        const { error } = await adminSupabase
            .from("tournament_sponsors")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", sponsorId);

        if (error) {
            console.error("Error deleting sponsor:", error);
            return { success: false, error: error.message };
        }

        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error("Unexpected error in deleteSponsor:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}
