"use server";

import { revalidatePath } from "next/cache";
import { ActionResponse } from "@/types/index";
import { getServerSession } from "@/lib/auth-server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export async function resetBracketFlow(tournamentId: string, categoryId?: string | null): Promise<ActionResponse> {
    const session = await getServerSession();
    if (!session?.user) return { success: false, error: "Authentication required" };

    let targetCategoryId = categoryId;

    if (!targetCategoryId) {
        try {
            const catRes = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}/categories`, {
                headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
                cache: 'no-store'
            });
            if (catRes.ok) {
                const cats = await catRes.json();
                if (Array.isArray(cats) && cats.length > 0) {
                    targetCategoryId = cats[0].id;
                }
            }
        } catch {
            // ignore
        }
    }

    if (!targetCategoryId) {
        return { success: false, error: "No tournament category found" };
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
    };

    // 1. Reset canvas_data
    try {
        await fetch(`${API_BASE_URL}/tournaments/${tournamentId}/categories/${targetCategoryId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ canvas_data: null })
        });
    } catch {
        // ignore
    }

    // 2. Delete matches for this category
    try {
        await fetch(`${API_BASE_URL}/tournaments/${tournamentId}/categories/${targetCategoryId}/matches`, {
            method: 'DELETE',
            headers,
        });
    } catch {
        // ignore
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}
