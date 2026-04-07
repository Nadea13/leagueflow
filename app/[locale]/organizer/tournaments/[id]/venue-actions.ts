"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, Venue } from "@/types/index";

export async function getVenues(tournamentId: string): Promise<ActionResponse<Venue[]>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("name");

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data: data as Venue[] };
}

export async function addVenue(
    tournamentId: string,
    name: string,
    address?: string,
    googleMapsUrl?: string,
    capacity?: number,
    notes?: string
): Promise<ActionResponse<Venue>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("venues")
        .insert({
            tournament_id: tournamentId,
            name,
            address: address || null,
            google_maps_url: googleMapsUrl || null,
            capacity: capacity || null,
            notes: notes || null,
        })
        .select()
        .single();

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true, data: data as Venue };
}

export async function updateVenue(
    venueId: string,
    tournamentId: string,
    data: Partial<Omit<Venue, 'id' | 'tournament_id' | 'created_at'>>
): Promise<ActionResponse> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("venues")
        .update(data)
        .eq("id", venueId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function deleteVenue(venueId: string, tournamentId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("venues")
        .delete()
        .eq("id", venueId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}
