"use server";

import { getServerSession } from "@/lib/auth-server";
import { ActionResponse, GlobalPlayer } from "@/types/index";
import { validateUploadedFile } from "@/lib/file-validation";
import { uploadToR2 } from "@/lib/r2";
import { resolveStorageUrl } from "@/lib/storage-utils";
import { classifyPlayerNames } from "@/lib/name-helper";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export async function getGlobalPlayers(
    page: number = 1,
    pageSize: number = 10,
    search: string = ""
): Promise<ActionResponse<{ players: GlobalPlayer[]; totalCount: number }>> {
    try {
        const session = await getServerSession();
        const url = `${API_BASE_URL}/master-players?search=${encodeURIComponent(search.trim())}`;
        const res = await fetch(url, {
            headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
            cache: 'no-store'
        });

        if (!res.ok) {
            return { success: false, error: "Failed to fetch master players" };
        }

        const data: any[] = await res.json();
        const list = Array.isArray(data) ? data : [];

        const mapped: GlobalPlayer[] = list.map((mp) => {
            const rawName = mp.name || (mp.first_name_local ? `${mp.first_name_local} ${mp.last_name_local || ''}` : `${mp.first_name_intl || ''} ${mp.last_name_intl || ''}`).trim();
            return {
                id: mp.id,
                name: rawName || 'Unnamed Player',
                first_name_local: mp.first_name_local,
                middle_name_local: mp.middle_name_local,
                last_name_local: mp.last_name_local,
                first_name_intl: mp.first_name_intl,
                middle_name_intl: mp.middle_name_intl,
                last_name_intl: mp.last_name_intl,
                photo_url: resolveStorageUrl(mp.photo_url || null),
                id_card_url: resolveStorageUrl(mp.id_card_url || null),
                date_of_birth: mp.birthday,
                birthday: mp.birthday,
                athlete_types: [], 
                created_by: mp.user_id,
                created_at: mp.created_at
            };
        });

        const from = (page - 1) * pageSize;
        const paged = mapped.slice(from, from + pageSize);

        return {
            success: true,
            data: {
                players: paged,
                totalCount: mapped.length,
            },
        };
    } catch (err) {
        console.error("Error fetching global players:", err);
        return { success: false, error: err instanceof Error ? err.message : "Failed to fetch players" };
    }
}

export async function createGlobalPlayer(
    name: string,
    photoUrl?: string | null,
    idCardUrl?: string | null,
    dateOfBirth?: string | null,
    _athleteTypes: string[] = []
): Promise<ActionResponse<GlobalPlayer>> {
    const session = await getServerSession();
    if (!session?.user) {
        return { success: false, error: "Authentication required" };
    }

    const classified = classifyPlayerNames({ name });

    try {
        const res = await fetch(`${API_BASE_URL}/master-players`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify({
                user_id: session.user.id,
                first_name_local: classified.first_name_local,
                middle_name_local: classified.middle_name_local,
                last_name_local: classified.last_name_local,
                first_name_intl: classified.first_name_intl,
                middle_name_intl: classified.middle_name_intl,
                last_name_intl: classified.last_name_intl,
                photo_url: photoUrl || null,
                id_card_url: idCardUrl || null,
                birthday: dateOfBirth || null,
                gender: 'unspecified',
                status: 'active'
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: err.error || "Failed to create player" };
        }

        const data = await res.json();
        return {
            success: true,
            data: {
                id: data.id,
                name: name.trim(),
                first_name_local: data.first_name_local,
                middle_name_local: data.middle_name_local,
                last_name_local: data.last_name_local,
                first_name_intl: data.first_name_intl,
                middle_name_intl: data.middle_name_intl,
                last_name_intl: data.last_name_intl,
                photo_url: resolveStorageUrl(data.photo_url || null),
                id_card_url: resolveStorageUrl(data.id_card_url || null),
                date_of_birth: data.birthday,
                birthday: data.birthday,
                athlete_types: [],
                created_by: data.user_id,
                created_at: data.created_at
            }
        };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Failed to create player" };
    }
}

export async function updateGlobalPlayerInfo(
    globalPlayerId: string,
    data: {
        name?: string;
        first_name?: string;
        last_name?: string;
        first_name_local?: string | null;
        middle_name_local?: string | null;
        last_name_local?: string | null;
        first_name_intl?: string | null;
        middle_name_intl?: string | null;
        last_name_intl?: string | null;
        first_name_th?: string | null;
        middle_name_th?: string | null;
        last_name_th?: string | null;
        first_name_en?: string | null;
        middle_name_en?: string | null;
        last_name_en?: string | null;
        date_of_birth?: string | null;
        gender?: string;
        tel?: string | null;
        photo_url?: string | null;
        profile_img?: string | null;
        favorite_sport_id?: string | null;
        preferred_hand?: string | null;
        preferred_foot?: string | null;
    }
): Promise<ActionResponse> {
    const session = await getServerSession();
    if (!session?.user) return { success: false, error: "Authentication required" };

    const classified = classifyPlayerNames({
        name: data.name,
        first_name: data.first_name,
        last_name: data.last_name,
        first_name_local: data.first_name_local || data.first_name_th,
        middle_name_local: data.middle_name_local || data.middle_name_th,
        last_name_local: data.last_name_local || data.last_name_th,
        first_name_intl: data.first_name_intl || data.first_name_en,
        middle_name_intl: data.middle_name_intl || data.middle_name_en,
        last_name_intl: data.last_name_intl || data.last_name_en,
    });

    const updateData: Record<string, unknown> = {};
    if (classified.first_name_local !== null) updateData.first_name_local = classified.first_name_local;
    if (classified.middle_name_local !== null) updateData.middle_name_local = classified.middle_name_local;
    if (classified.last_name_local !== null) updateData.last_name_local = classified.last_name_local;
    if (classified.first_name_intl !== null) updateData.first_name_intl = classified.first_name_intl;
    if (classified.middle_name_intl !== null) updateData.middle_name_intl = classified.middle_name_intl;
    if (classified.last_name_intl !== null) updateData.last_name_intl = classified.last_name_intl;

    if (data.date_of_birth !== undefined) {
        updateData.birthday = data.date_of_birth || null;
    }
    if (data.gender !== undefined) {
        updateData.gender = data.gender;
    }
    if (data.tel !== undefined) {
        updateData.tel = data.tel;
    }
    if (data.favorite_sport_id !== undefined) {
        updateData.favorite_sport_id = data.favorite_sport_id ? parseInt(data.favorite_sport_id) : null;
    }
    if (data.preferred_hand !== undefined) {
        updateData.preferred_hand = data.preferred_hand;
    }
    if (data.preferred_foot !== undefined) {
        updateData.preferred_foot = data.preferred_foot;
    }
    const newPhotoUrl = data.photo_url !== undefined ? data.photo_url : data.profile_img;
    if (newPhotoUrl !== undefined) {
        updateData.photo_url = newPhotoUrl;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/master-players/${globalPlayerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify(updateData)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: err.error || "Failed to update global player" };
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Failed to update player" };
    }
}

export async function linkPlayerToGlobal(
    playerId: string,
    globalPlayerId: string
): Promise<ActionResponse> {
    const session = await getServerSession();
    if (!session?.user) return { success: false, error: "Authentication required" };

    try {
        await fetch(`${API_BASE_URL}/master-players/${globalPlayerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify({ player_id: playerId })
        });
        return { success: true };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Failed to link player" };
    }
}

export async function unlinkPlayerFromGlobal(playerId: string): Promise<ActionResponse> {
    const session = await getServerSession();
    if (!session?.user) return { success: false, error: "Authentication required" };

    try {
        await fetch(`${API_BASE_URL}/master-players/${playerId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${session.token}`,
            }
        });
        return { success: true };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Failed to unlink player" };
    }
}

export async function updateGlobalPlayerPhoto(
    globalPlayerId: string,
    formData: FormData
): Promise<ActionResponse<{ url: string }>> {
    const session = await getServerSession().catch(() => null);
    if (!session?.user) return { success: false, error: "Authentication required" };

    const file = formData.get("photo") as File;
    if (!file) return { success: false, error: "No file provided" };

    const fileCheck = validateUploadedFile(file);
    if (!fileCheck.valid) return { success: false, error: fileCheck.error };

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `players/${globalPlayerId}/photo_${Date.now()}.${fileExt}`;

    const uploadRes = await uploadToR2(file, fileName, file.type);
    if (!uploadRes.success || !uploadRes.url) {
        console.error("[updateGlobalPlayerPhoto] Upload error:", uploadRes.error);
        return { 
            success: false, 
            error: `Upload failed: ${uploadRes.error || "Unknown error"}` 
        };
    }

    const publicUrl = uploadRes.url;

    try {
        await fetch(`${API_BASE_URL}/master-players/${globalPlayerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify({
                photo_url: publicUrl,
            }),
        });
    } catch (err) {
        console.warn("[updateGlobalPlayerPhoto] PUT master-players failed:", err);
    }

    return { success: true, data: { url: publicUrl } };
}
