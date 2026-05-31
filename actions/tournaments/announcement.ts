"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, Announcement } from "@/types/index";

export async function getAnnouncements(tournamentId: string): Promise<ActionResponse<Announcement[]>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data: data as Announcement[] };
}

export async function addAnnouncement(
    tournamentId: string,
    title: string,
    content?: string,
    isPinned?: boolean
): Promise<ActionResponse> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("announcements")
        .insert({
            tournament_id: tournamentId,
            title,
            content: content || null,
            is_pinned: isPinned || false,
        });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function deleteAnnouncement(announcementId: string, tournamentId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcementId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function toggleAnnouncementPin(announcementId: string, isPinned: boolean, tournamentId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("announcements")
        .update({ is_pinned: isPinned })
        .eq("id", announcementId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}
