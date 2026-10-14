'use server'

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionResponse, Tournament } from "@/types";
import { uploadToR2 } from "@/lib/r2";
import { ApiClient } from "@/lib/api-client";


import { getServerSession } from "@/lib/auth-server";
import { classifyPlayerNames } from "@/lib/name-helper";

async function getAuthUser() {
    const session = await getServerSession();
    if (session?.user?.id) {
        return {
            id: session.user.id,
            email: session.user.email
        };
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function getUserSubscriptionPlan(): Promise<string> {
    const details = await getUserSubscriptionDetails();
    return details.plan;
}

export async function getUserSubscriptionDetails() {
    try {
        const session = await getServerSession();
        if (!session?.user) return { plan: 'free', expiresAt: null };

        if (session.user.role === 'super_admin') {
            return { plan: 'yearly', expiresAt: null };
        }

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leagueflow-v80x.onrender.com/api/v1';
        try {
            const res = await fetch(`${API_BASE_URL}/payments?user_id=${session.user.id}`, {
                headers: { Authorization: `Bearer ${session.token}` },
                cache: 'no-store'
            });
            if (res.ok) {
                const data = await res.json();
                const list: any[] = Array.isArray(data) ? data : (data.data || []);
                const paid = list.find((p: any) => p.payment_status === 'completed' || p.payment_status === 'success');
                if (paid && paid.plan_name) {
                    return { plan: paid.plan_name, expiresAt: null };
                }
            }
        } catch {
            // fallback to role
        }

        // Non-paid users default to 'free'
        return { plan: 'free', expiresAt: null };
    } catch {
        return { plan: 'free', expiresAt: null };
    }
}


export async function updateProfile(formData: FormData): Promise<ActionResponse> {
    const fullName = formData.get("fullName") as string;
    const phone = formData.get("phone") as string;
    const avatarFile = formData.get("avatar") as File | null;

    const session = await getServerSession();
    if (!session?.user || !session?.token) {
        return { success: false, error: "Authentication required" };
    }

    let avatarUrl: string | null = (formData.get("existing_avatar_url") as string) || null;

    // Handle avatar upload if provided
    if (avatarFile && avatarFile.size > 0) {
        const fileExt = avatarFile.name.split('.').pop() || 'jpg';
        const fileName = `${session.user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const uploadRes = await uploadToR2(avatarFile, filePath, avatarFile.type);

        if (!uploadRes.success || !uploadRes.url) {
            console.error("Avatar upload error:", uploadRes.error);
            return { success: false, error: "Failed to upload avatar: " + (uploadRes.error || "Unknown error") };
        }

        avatarUrl = uploadRes.url;
    } else if (formData.get("remove_avatar") === "true") {
        avatarUrl = null;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            body: JSON.stringify({
                full_name: fullName,
                phone: phone || null,
                avatar_url: avatarUrl,
            }),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return { success: false, error: errData.error || "Failed to update profile" };
        }

        revalidatePath("/", "layout");
        return { success: true };
    } catch (err: any) {
        console.error("Error updating profile in Go backend:", err);
        return { success: false, error: err.message || "Failed to update profile" };
    }
}

export async function changePassword(formData: FormData): Promise<ActionResponse> {
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!currentPassword || !newPassword) {
        return { success: false, error: "กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่" };
    }

    if (newPassword.length < 8) {
        return { success: false, error: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร" };
    }

    if (newPassword !== confirmPassword) {
        return { success: false, error: "รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน" };
    }

    const session = await getServerSession();
    if (!session?.token) {
        return { success: false, error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" };
    }

    try {
        const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
            }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return { success: false, error: data.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้" };
        }

        return { success: true };
    } catch (err: any) {
        console.error("Error changing password:", err);
        return { success: false, error: err.message || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน" };
    }
}


export async function deleteAccount() {
    const user = await getAuthUser();

    if (!user) return;

    // In a real app, you might want to call a service role function to delete the user from Auth
    // For now, we sign out and the profile deletion would be handled by your business logic/DB cascades
    // or a specialized RPC if available.
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
        console.error("Error signing out during deletion:", error);
    }

    redirect("/");
}

export async function getMasterPlayer() {
    const user = await getAuthUser();

    if (!user) return null;

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
        .from("master_players")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Error fetching master player profile:", error);
        return null;
    }
    return data;
}

export async function createMasterPlayer(formData: FormData): Promise<ActionResponse> {
    try {
        const user = await getAuthUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const firstNameTh = formData.get("firstNameTh") as string || null;
        const middleNameTh = formData.get("middleNameTh") as string || null;
        const lastNameTh = formData.get("lastNameTh") as string || null;
        const firstNameEn = formData.get("firstNameEn") as string || null;
        const middleNameEn = formData.get("middleNameEn") as string || null;
        const lastNameEn = formData.get("lastNameEn") as string || null;
        const gender = formData.get("gender") as string;
        const birthday = formData.get("birthday") as string;
        const tel = formData.get("tel") as string;
        const favoriteSportId = formData.get("favoriteSportId") as string || null;
        const preferredHand = formData.get("preferredHand") as string || null;
        const preferredFoot = formData.get("preferredFoot") as string || null;

        const classified = classifyPlayerNames({
            first_name_local: firstNameTh || null,
            middle_name_local: middleNameTh || null,
            last_name_local: lastNameTh || null,
            first_name_intl: firstNameEn || null,
            middle_name_intl: middleNameEn || null,
            last_name_intl: lastNameEn || null,
        });

        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("master_players")
            .insert({
                user_id: user.id,
                first_name_local: classified.first_name_local,
                middle_name_local: classified.middle_name_local,
                last_name_local: classified.last_name_local,
                first_name_intl: classified.first_name_intl,
                middle_name_intl: classified.middle_name_intl,
                last_name_intl: classified.last_name_intl,
                gender,
                birthday,
                tel,
                favorite_sport_id: favoriteSportId,
                preferred_hand: preferredHand,
                preferred_foot: preferredFoot,
                status: 'active',
                verified: true
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating master player:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/", "layout");
        return { success: true, data };
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Failed to create master player profile";
        return { success: false, error: errorMessage };
    }
}

export async function getAllPublicTournaments(): Promise<Tournament[]> {
    try {
        const resp = await ApiClient.fetch<{ data: any[] }>('/tournaments?status=registration_open');
        const tournaments = resp.data || [];

        return tournaments.map((t: any) => ({
            id: t.id,
            name: t.name,
            logo_img: t.logo_url || null,
            cover_img: t.banner_url || null,
            description: t.description || null,
            location_name: t.location || null,
            google_map_url: null,
            status: t.status,
            is_registration_open: t.status === 'registration_open' || (t.settings?.is_registration_open === true),
            start_date: t.start_date,
            end_date: t.end_date,
            document_deadline: null,
            bank_name: null,
            bank_account_name: null,
            bank_account_number: null,
            registration_fee: 0,
        })) as unknown as Tournament[];
    } catch (err) {
        console.error("Error fetching tournaments from Go backend:", err);
        return [];
    }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export async function searchMasterPlayers(query: string) {
    try {
        const trimmed = query.trim();
        if (!trimmed) return { success: true, data: [] };

        const session = await getServerSession();
        try {
            const res = await fetch(`${API_BASE_URL}/master-players?search=${encodeURIComponent(trimmed)}`, {
                headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
                cache: 'no-store'
            });

            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    return { success: true, data };
                }
            }
        } catch {
            // fallback to Supabase below
        }

        // Direct Supabase Search Fallback (supports local / intl first name, last name, nickname)
        const adminSupabase = createAdminClient();
        const searchPattern = `%${trimmed}%`;
        const { data, error } = await adminSupabase
            .from("master_players")
            .select("id, user_id, first_name_local, middle_name_local, last_name_local, first_name_intl, middle_name_intl, last_name_intl, nickname, birthday, photo_url, tel, favorite_sport_id, preferred_hand, preferred_foot, gender")
            .or(`first_name_local.ilike.${searchPattern},last_name_local.ilike.${searchPattern},first_name_intl.ilike.${searchPattern},last_name_intl.ilike.${searchPattern},nickname.ilike.${searchPattern}`)
            .limit(15);

        if (error) {
            console.error("Supabase searchMasterPlayers error:", error);
            return { success: true, data: [] };
        }

        return { success: true, data: data || [] };
    } catch (err) {
        console.error("Error searching master players:", err);
        return { success: true, data: [] };
    }
}

export async function claimMasterPlayer(masterPlayerId: string): Promise<ActionResponse> {
    try {
        const user = await getAuthUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const adminSupabase = createAdminClient();

        // 1. Check if player exists and if it is already claimed
        const { data: existingPlayer, error: checkError } = await adminSupabase
            .from("master_players")
            .select("id, user_id")
            .eq("id", masterPlayerId)
            .single();

        if (checkError || !existingPlayer) {
            return { success: false, error: "Master player profile not found" };
        }

        if (existingPlayer.user_id) {
            return { success: false, error: "This player profile has already been claimed by another user" };
        }

        // 2. Check if current user already has a master player profile
        const { data: userCurrentPlayer } = await adminSupabase
            .from("master_players")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (userCurrentPlayer) {
            return { success: false, error: "Your account is already linked to a master player profile" };
        }

        // 3. Link master player to current user (unverified until admin approves)
        const { data: updatedPlayer, error: updateError } = await adminSupabase
            .from("master_players")
            .update({
                user_id: user.id,
                verified: false,
                updated_at: new Date().toISOString()
            })
            .eq("id", masterPlayerId)
            .select()
            .single();

        if (updateError) {
            return { success: false, error: updateError.message };
        }

        revalidatePath("/", "layout");
        return { success: true, data: updatedPlayer };
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Failed to claim master player profile";
        return { success: false, error: errorMessage };
    }
}

export async function registerAsOrganizer(): Promise<ActionResponse> {
    try {
        const user = await getAuthUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const adminClient = createAdminClient();
        const { error } = await adminClient
            .from("users")
            .update({ 
                is_organizer: true,
                role: 'organizer' 
            })
            .eq("id", user.id);

        if (error) {
            return { success: false, error: error.message };
        }

        revalidatePath("/", "layout");
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message };
    }
}

export async function registerAsTeamManager(): Promise<ActionResponse> {
    try {
        const user = await getAuthUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const adminClient = createAdminClient();
        const { error } = await adminClient
            .from("users")
            .update({ 
                is_team_manager: true
            })
            .eq("id", user.id);

        if (error) {
            return { success: false, error: error.message };
        }

        revalidatePath("/", "layout");
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message };
    }
}

export async function getMasterPlayerStats(masterPlayerId: string): Promise<ActionResponse<{
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    saves: number;
    injuries: number;
    history: {
        tournamentName: string;
        teamName: string;
        goals: number;
        assists: number;
        yellowCards: number;
        redCards: number;
        saves: number;
        injuries: number;
    }[];
}>> {
    try {
        const adminSupabase = createAdminClient();
        
        const { data: localPlayers, error: lpError } = await adminSupabase
            .from("players")
            .select("id")
            .eq("master_id", masterPlayerId);
            
        if (lpError) throw lpError;
        
        if (!localPlayers || localPlayers.length === 0) {
            return { 
                success: true, 
                data: { goals: 0, assists: 0, yellowCards: 0, redCards: 0, saves: 0, injuries: 0, history: [] } 
            };
        }
        
        const playerIds = localPlayers.map(lp => lp.id);
        
        const { data: events, error: evError } = await adminSupabase
            .from("match_events")
            .select(`
                id,
                event_type,
                player_id,
                extra_info,
                team_id,
                team:teams(name),
                match:matches(
                    tournament_category_id,
                    category:tournament_categories(
                        tournament:tournaments(name)
                    )
                )
            `)
            .or(`player_id.in.(${playerIds.join(',')}),event_type.eq.goal`);
            
        if (evError) throw evError;

        type QueryEvent = {
            id: string;
            event_type: string;
            player_id: string | null;
            extra_info: { assist_player_id?: string; is_own_goal?: boolean; card_type?: string } | null;
            team: { name: string } | null;
            match: {
                category: {
                    tournament: {
                        name: string;
                    } | null;
                } | null;
            } | null;
        };

        const typedEvents = (events as unknown as QueryEvent[]) || [];

        let totalGoals = 0;
        let totalAssists = 0;
        let totalYellow = 0;
        let totalRed = 0;
        let totalSaves = 0;
        let totalInjuries = 0;

        const tourneyStats = new Map<string, {
            tournamentName: string;
            teamName: string;
            goals: number;
            assists: number;
            yellowCards: number;
            redCards: number;
            saves: number;
            injuries: number;
        }>();

        typedEvents.forEach(event => {
            const isSelfPlayer = event.player_id && playerIds.includes(event.player_id);
            const isAssist = event.extra_info?.assist_player_id && playerIds.includes(event.extra_info.assist_player_id);

            if (!isSelfPlayer && !isAssist) return;

            const tName = event.match?.category?.tournament?.name || "Unknown Tournament";
            const teamName = event.team?.name || "Unknown Team";
            const key = `${tName}-${teamName}`;

            if (!tourneyStats.has(key)) {
                tourneyStats.set(key, {
                    tournamentName: tName,
                    teamName,
                    goals: 0,
                    assists: 0,
                    yellowCards: 0,
                    redCards: 0,
                    saves: 0,
                    injuries: 0
                });
            }

            const current = tourneyStats.get(key)!;

            if (event.event_type === 'goal') {
                const isOwnGoal = !!event.extra_info?.is_own_goal;
                if (isSelfPlayer && !isOwnGoal) {
                    totalGoals++;
                    current.goals++;
                }
                if (isAssist && !isOwnGoal) {
                    totalAssists++;
                    current.assists++;
                }
            } else if ((event.event_type === 'yellow_card' || (event.event_type === 'foul' && event.extra_info?.card_type === 'yellow')) && isSelfPlayer) {
                totalYellow++;
                current.yellowCards++;
            } else if ((event.event_type === 'red_card' || (event.event_type === 'foul' && event.extra_info?.card_type === 'red')) && isSelfPlayer) {
                totalRed++;
                current.redCards++;
            } else if (event.event_type === 'save' && isSelfPlayer) {
                totalSaves++;
                current.saves++;
            } else if (event.event_type === 'injury' && isSelfPlayer) {
                totalInjuries++;
                current.injuries++;
            }
        });

        return {
            success: true,
            data: {
                goals: totalGoals,
                assists: totalAssists,
                yellowCards: totalYellow,
                redCards: totalRed,
                saves: totalSaves,
                injuries: totalInjuries,
                history: Array.from(tourneyStats.values())
            }
        };
    } catch (err) {
        console.error("Error calculating master player stats:", err);
        return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
}


