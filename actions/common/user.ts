'use server'

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfileExists } from "@/lib/profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionResponse } from "@/types";

export async function getUserSubscriptionPlan() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return 'free';

    // Just-in-time profile creation safety
    await ensureProfileExists(supabase, user);

    // Check if user is an admin - Admins get Pro features by default for management
    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role === 'admin') {
        return 'yearly';
    }

    const { data: subscription } = await supabase
        .from("payments")
        .select("plan_name, created_at")
        .eq("user_id", user.id)
        .eq("payment_status", "success")
        .in("plan_name", ["monthly", "yearly", "manager_pro", "pro", "pro_yearly", "cup", "cup_yearly"])
        .is("tournament_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (subscription) {
        const now = new Date();
        const createdAt = new Date(subscription.created_at);
        const expiresAt = new Date(createdAt);
        
        if (subscription.plan_name === "monthly" || subscription.plan_name === "pro" || subscription.plan_name === "manager_pro" || subscription.plan_name === "cup") {
            expiresAt.setDate(createdAt.getDate() + 30);
        } else if (subscription.plan_name === "yearly" || subscription.plan_name === "pro_yearly" || subscription.plan_name === "cup_yearly") {
            expiresAt.setDate(createdAt.getDate() + 365);
        }

        return now > expiresAt ? 'free' : (subscription.plan_name || 'free');
    }

    return 'free';
}

export async function getUserSubscriptionDetails() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { plan: 'free', expiresAt: null };

    await ensureProfileExists(supabase, user);

    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role === 'admin') {
        return { plan: 'yearly', expiresAt: null };
    }

    const { data: subscription } = await supabase
        .from("payments")
        .select("plan_name, created_at")
        .eq("user_id", user.id)
        .eq("payment_status", "success")
        .in("plan_name", ["monthly", "yearly", "manager_pro", "pro", "pro_yearly", "cup", "cup_yearly"])
        .is("tournament_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (subscription) {
        const now = new Date();
        const createdAt = new Date(subscription.created_at);
        const expiresAt = new Date(createdAt);
        
        if (subscription.plan_name === "monthly" || subscription.plan_name === "pro" || subscription.plan_name === "manager_pro" || subscription.plan_name === "cup") {
            expiresAt.setDate(createdAt.getDate() + 30);
        } else if (subscription.plan_name === "yearly" || subscription.plan_name === "pro_yearly" || subscription.plan_name === "cup_yearly") {
            expiresAt.setDate(createdAt.getDate() + 365);
        }

        if (now > expiresAt) {
            return { plan: 'free', expiresAt: null };
        }
        return { plan: subscription.plan_name || 'free', expiresAt: expiresAt.toISOString() };
    }

    return { plan: 'free', expiresAt: null };
}


export async function updateProfile(formData: FormData): Promise<ActionResponse> {
    const supabase = await createClient();
    const fullName = formData.get("fullName") as string;
    const phone = formData.get("phone") as string;
    const avatarFile = formData.get("avatar") as File | null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Authentication required" };
    }

    let avatarUrl = formData.get("existing_avatar_url") as string || null;

    // Handle avatar upload if provided
    if (avatarFile && avatarFile.size > 0) {
        const fileExt = avatarFile.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, avatarFile);

        if (uploadError) {
            console.error("Avatar upload error:", uploadError);
            return { success: false, error: "Failed to upload avatar: " + uploadError.message };
        }

        const { data: { publicUrl } } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

        avatarUrl = publicUrl;
    } else if (formData.get("remove_avatar") === "true") {
        avatarUrl = null;
    }

    const { error } = await supabase.auth.updateUser({
        data: { 
            full_name: fullName,
            avatar_url: avatarUrl 
        }
    });

    if (error) {
        return { success: false, error: error.message };
    }

    // Direct database update using service role client as well
    const adminSupabase = createAdminClient();
    await adminSupabase
        .from("users")
        .update({ 
            full_name: fullName,
            phone: phone || null,
            profile_img: avatarUrl
        })
        .eq("id", user.id);

    revalidatePath("/", "layout");
    return { success: true };
}

export async function deleteAccount() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // In a real app, you might want to call a service role function to delete the user from Auth
    // For now, we sign out and the profile deletion would be handled by your business logic/DB cascades
    // or a specialized RPC if available.
    const { error } = await supabase.auth.signOut();
    
    if (error) {
        console.error("Error signing out during deletion:", error);
    }

    redirect("/");
}

export async function getMasterPlayer() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

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

        if ((!firstNameTh && !firstNameEn) || (!lastNameTh && !lastNameEn) || !gender || !birthday) {
            return { success: false, error: "First name, last name, gender, and birthday are required" };
        }

        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("master_players")
            .insert({
                user_id: user.id,
                first_name_th: firstNameTh,
                middle_name_th: middleNameTh,
                last_name_th: lastNameTh,
                first_name_en: firstNameEn,
                middle_name_en: middleNameEn,
                last_name_en: lastNameEn,
                gender,
                birthday,
                tel,
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

export async function getAllPublicTournaments() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("tournaments")
        .select(`
            id, name, logo_img, cover_img, description, location_name, google_map_url, status, start_date, end_date, document_deadline, bank_name, bank_account_name, bank_account_number,
            tournament_categories(registration_fee)
        `)
        .in("status", ["upcoming", "ongoing"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching all tournaments:", error);
        return [];
    }
    
    return (data || []).map(t => {
        const categories = t.tournament_categories as unknown as { registration_fee: number }[] | null;
        const registrationFee = categories && categories.length > 0 ? categories[0].registration_fee : 0;
        return {
            ...t,
            registration_fee: registrationFee
        };
    });
}

export async function searchMasterPlayers(query: string) {
    const adminSupabase = createAdminClient();

    let dbQuery = adminSupabase
        .from("master_players")
        .select("*");

    if (query && query.trim().length > 0) {
        // Search in English and Thai name columns
        dbQuery = dbQuery.or(`first_name_th.ilike.%${query.trim()}%,last_name_th.ilike.%${query.trim()}%,first_name_en.ilike.%${query.trim()}%,last_name_en.ilike.%${query.trim()}%`);
    }

    const { data, error } = await dbQuery
        .order("first_name_en", { ascending: true })
        .limit(20);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data };
}

export async function claimMasterPlayer(masterPlayerId: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

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
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

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
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

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
            extra_info: { assist_player_id?: string } | null;
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
                if (isSelfPlayer) {
                    totalGoals++;
                    current.goals++;
                }
                if (isAssist) {
                    totalAssists++;
                    current.assists++;
                }
            } else if (event.event_type === 'yellow_card' && isSelfPlayer) {
                totalYellow++;
                current.yellowCards++;
            } else if (event.event_type === 'red_card' && isSelfPlayer) {
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


