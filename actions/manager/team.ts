'use server';

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, Player, Sport } from "@/types/index";
import { validateUploadedFile } from "@/lib/file-validation";
import { logActivity } from "@/lib/audit";
import { uploadToR2 } from "@/lib/r2";
import { resolveStorageUrl } from "@/lib/storage-utils";
import { getServerSession } from "@/lib/auth-server";
import { classifyPlayerNames } from "@/lib/name-helper";

import { 
    getGlobalPlayers as getGP, 
    createGlobalPlayer as createGP, 
    linkPlayerToGlobal as linkGP, 
    unlinkPlayerFromGlobal as unlinkGP,
    updateGlobalPlayerInfo as updateGPInfo
} from "../tournaments/master-player";

export async function updateGlobalPlayerInfo(globalPlayerId: string, data: { name?: string; date_of_birth?: string | null }) {
    return updateGPInfo(globalPlayerId, data);
}

export async function getGlobalPlayers(page?: number, pageSize?: number, search?: string) {
    return getGP(page, pageSize, search);
}

export async function createGlobalPlayer(name: string, photoUrl?: string | null, dateOfBirth?: string | null, _athleteTypes?: string[]) {
    return createGP(name, photoUrl, dateOfBirth);
}

export async function linkPlayerToGlobal(playerId: string, globalPlayerId: string) {
    return linkGP(playerId, globalPlayerId);
}

export async function unlinkPlayerFromGlobal(playerId: string) {
    return unlinkGP(playerId);
}


/**
 * Authorization helper to check if a user is authorized to manage a team.
 * Checks global team ownership and tournament participation ownership/management.
 */
async function isAuthorizedForTeam(teamId: string, userId: string) {
    const supabase = await createClient();
    
    // Check if it's a global team owned by user
    const { data: globalTeam } = await supabase
        .from("teams")
        .select("id")
        .eq("id", teamId)
        .eq("user_id", userId)
        .single();
    
    if (globalTeam) return true;

    // Check if it's a tournament team owned by user or if user is tournament manager
    const { data: participation } = await supabase
        .from("tournament_teams")
        .select(`
            id,
            team_id,
            teams ( user_id ),
            tournament_category_id,
            tournament_categories ( tournament_id )
        `)
        .eq("id", teamId)
        .single();
    
    if (participation) {
        const teamOwnerId = (participation.teams as unknown as { user_id: string } | null)?.user_id;
        if (teamOwnerId === userId) return true;

        const tournamentId = (participation.tournament_categories as unknown as { tournament_id: string } | null)?.tournament_id;
        if (tournamentId) {
            // Check if user is organizer of the tournament
            const { data: tournament } = await supabase
                .from("tournaments")
                .select("organizer_id")
                .eq("id", tournamentId)
                .single();
            
            if (tournament && tournament.organizer_id === userId) return true;

            // Check if user is a member with admin/editor role
            const { data: membership } = await supabase
                .from("tournament_invitations")
                .select("role")
                .eq("tournament_id", tournamentId)
                .eq("user_id", userId)
                .eq("status", "accepted")
                .in("role", ["co_organizer", "staff"])
                .is("deleted_at", null)
                .maybeSingle();
            
            if (membership) return true;
        }
    }

    return false;
}

/* ============================================================================
   TEAM MANAGEMENT
   ============================================================================ */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leagueflow-v80x.onrender.com/api/v1';

const SPORT_ID_MAP: Record<string, string> = {
    "1": "Football",
    "2": "Volleyball",
    "3": "Basketball",
    "4": "Futsal",
    "5": "Badminton",
    "6": "Tennis",
    "7": "Sepak Takraw",
    "8": "Cricket",
    "7cf8611f-99a1-44f6-a218-9345ca2cfa06": "Football",
    "f193797b-8454-4870-b669-715f45d43543": "Futsal",
    "ed6d32f4-4fe3-4694-81d6-7f29f8f163b1": "Basketball",
    "e193797b-8454-4870-b669-715f45d43542": "Volleyball",
    "b193797b-8454-4870-b669-715f45d43544": "Badminton",
    "t193797b-8454-4870-b669-715f45d43545": "Tennis",
    "s193797b-8454-4870-b669-715f45d43546": "Sepak Takraw",
    "c193797b-8454-4870-b669-715f45d43547": "Cricket",
};

/**
 * Get all available sports.
 */
export async function getSports(): Promise<ActionResponse<Sport[]>> {
    try {
        const defaultSports: Sport[] = [
            { id: 1, sport_name: "Football", created_at: new Date().toISOString() },
            { id: 2, sport_name: "Volleyball", created_at: new Date().toISOString() },
            { id: 3, sport_name: "Basketball", created_at: new Date().toISOString() },
            { id: 4, sport_name: "Futsal", created_at: new Date().toISOString() },
            { id: 5, sport_name: "Badminton", created_at: new Date().toISOString() },
            { id: 6, sport_name: "Tennis", created_at: new Date().toISOString() },
            { id: 7, sport_name: "Sepak Takraw", created_at: new Date().toISOString() },
            { id: 8, sport_name: "Cricket", created_at: new Date().toISOString() },
        ];

        try {
            const res = await fetch(`${API_BASE_URL}/sports`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    return { success: true, data };
                }
            }
        } catch (fetchErr) {
            console.warn("Failed to fetch sports from backend API, using defaults:", fetchErr);
        }

        return { success: true, data: defaultSports };
    } catch (error) {
        console.error("Unexpected error in getSports:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}


/**
 * Create a new global team.
 */
export async function createTeam(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return { success: false, error: "Authentication required" };
        }

        const name = formData.get("name") as string;
        const logoFile = formData.get("logo") as File;
        let rawSportId = formData.get("sport_id") as string;
        const description = formData.get("description") as string;
        const contact_name = formData.get("contact_name") as string;
        const contact_phone = formData.get("contact_phone") as string;
        const contact_email = formData.get("contact_email") as string;

        if (!name || !name.trim()) {
            return { success: false, error: "Team name is required" };
        }
        if (!contact_name || !contact_name.trim()) {
            return { success: false, error: "Contact name is required" };
        }
        if (!contact_phone || !contact_phone.trim()) {
            return { success: false, error: "Contact phone is required" };
        }

        let sportIdInt = 1;
        if (rawSportId) {
            const parsed = parseInt(String(rawSportId), 10);
            if (!isNaN(parsed) && parsed > 0) {
                sportIdInt = parsed;
            } else {
                const lowerSport = String(rawSportId).toLowerCase().trim();
                if (lowerSport.includes("volley") || lowerSport.includes("วอลเลย์") || lowerSport.includes("e193797b")) {
                    sportIdInt = 2;
                } else if (lowerSport.includes("basket") || lowerSport.includes("บาส") || lowerSport.includes("ed6d32f4")) {
                    sportIdInt = 3;
                } else if (lowerSport.includes("futsal") || lowerSport.includes("ฟุตซอล") || lowerSport.includes("f193797b")) {
                    sportIdInt = 4;
                } else if (lowerSport.includes("badminton") || lowerSport.includes("แบดมินตัน") || lowerSport.includes("b193797b")) {
                    sportIdInt = 5;
                } else if (lowerSport.includes("tennis") || lowerSport.includes("เทนนิส") || lowerSport.includes("t193797b")) {
                    sportIdInt = 6;
                } else if (lowerSport.includes("takraw") || lowerSport.includes("ตะกร้อ") || lowerSport.includes("s193797b")) {
                    sportIdInt = 7;
                } else if (lowerSport.includes("cricket") || lowerSport.includes("คริกเก็ต") || lowerSport.includes("c193797b")) {
                    sportIdInt = 8;
                } else {
                    sportIdInt = 1;
                }
            }
        }

        const teamId = crypto.randomUUID();
        let logoUrl: string | null = null;

        // Handle logo upload if provided
        if (logoFile && logoFile.size > 0) {
            const fileCheck = validateUploadedFile(logoFile);
            if (!fileCheck.valid) return { success: false, error: fileCheck.error };

            const fileExt = logoFile.name.split('.').pop() || 'png';
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const filePath = `teams/${teamId}/${fileName}`;

            const uploadRes = await uploadToR2(logoFile, filePath, logoFile.type);
            if (!uploadRes.success || !uploadRes.url) {
                console.error("Logo upload error:", uploadRes.error);
                return { success: false, error: "Failed to upload logo: " + (uploadRes.error || "Unknown error") };
            }

            logoUrl = uploadRes.url;
        }

        // Call Go Backend API to create team
        const createRes = await fetch(`${API_BASE_URL}/teams`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify({
                name: name.trim(),
                description: description || '',
                contact_name: contact_name.trim(),
                contact_phone: contact_phone.trim(),
                contact_email: contact_email?.trim() || session.user.email || '',
                logo_url: logoUrl || null,
                logo_img: logoUrl || null,
                sport_id: sportIdInt,
            }),
        });

        if (!createRes.ok) {
            const err = await createRes.json().catch(() => ({}));
            return { success: false, error: err.error || "Failed to create team" };
        }

        const createdTeam = await createRes.json();
        await logActivity('CREATE_TEAM', 'team', createdTeam?.id || teamId, { name, sport_id: sportIdInt });

        revalidatePath("/manager/my-teams");
        revalidatePath("/manager/dashboard");
        revalidatePath("/organizer/dashboard"); 
        revalidatePath("/dashboard/teams");
        
        return { success: true };
    } catch (error) {
        console.error("Unexpected error in createTeam:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

/**
 * Get all global teams owned by the current user.
 */
export async function getMyTeams(): Promise<ActionResponse<unknown[]>> {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return { success: false, error: "Authentication required" };
        }

        const res = await fetch(`${API_BASE_URL}/teams?user_id=${session.user.id}`, {
            headers: {
                Authorization: `Bearer ${session.token}`,
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: err.error || "Failed to fetch teams" };
        }

        const teams = await res.json();
        
        // Fetch sports map
        const supabase = await createClient();
        const { data: sportsData } = await supabase.from("sports").select("id, sport_name");
        const sportMap = new Map<string, string>();
        Object.entries(SPORT_ID_MAP).forEach(([k, v]) => sportMap.set(k, v));
        (sportsData || []).forEach(s => sportMap.set(s.id, s.sport_name));

        const mappedData = (teams || []).map((team: any) => {
            const sportName = (team.sport_id && sportMap.get(team.sport_id)) || team.sport || team.sport_name || 'Football';
            return {
                ...team,
                logo_url: team.logo_url || team.logo_img,
                sport: sportName,
                sport_name: sportName,
                sport_id: team.sport_id,
                tournament: null
            };
        });

        return { success: true, data: mappedData };
    } catch (error) {
        console.error("Error in getMyTeams:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

/**
 * Get detailed team information, handling both global teams and tournament participations.
 */
export async function getTeam(teamId: string) {
    try {
        const session = await getServerSession();
        if (!session?.user) return null;

        const res = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
            headers: {
                Authorization: `Bearer ${session.token}`,
            },
            cache: 'no-store',
        });

        if (!res.ok) return null;
        const data = await res.json();
        if (!data) return null;

        const supabase = await createClient();
        const { data: sportsData } = await supabase.from("sports").select("id, sport_name");
        const sportMap = new Map<string, string>();
        Object.entries(SPORT_ID_MAP).forEach(([k, v]) => sportMap.set(k, v));
        (sportsData || []).forEach(s => sportMap.set(s.id, s.sport_name));

        const sportName = (data.sport_id && sportMap.get(data.sport_id)) || data.sport || data.sport_name || 'Football';

        const mappedData = {
            ...data,
            logo_url: data.logo_url || data.logo_img,
            sport: sportName,
            sport_name: sportName,
            sport_id: data.sport_id
        };

        return {
            ...mappedData,
            isParticipation: false,
            participations: [],
            registrations: []
        };
    } catch (error) {
        console.error("Error in getTeam:", error);
        return null;
    }
}

export async function getTournamentTeam(id: string) {
    try {
        const session = await getServerSession();
        if (!session?.user) return null;

        const res = await fetch(`${API_BASE_URL}/tournament-teams/${id}`, {
            headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
            cache: 'no-store',
        });

        if (res.ok) {
            const data = await res.json();
            if (data) {
                const teamData = data.team || {};
                const supabase = await createClient();
                const { data: sportsData } = await supabase.from("sports").select("id, sport_name");
                const sportMap = new Map<string, string>();
                Object.entries(SPORT_ID_MAP).forEach(([k, v]) => sportMap.set(k, v));
                (sportsData || []).forEach(s => sportMap.set(s.id, s.sport_name));

                const sportName = (teamData.sport_id && sportMap.get(teamData.sport_id)) || teamData.sport || teamData.sport_name || 'Football';

                let tournament = data.tournament || data.tournaments || null;
                let categories: any[] = [];
                const tournamentId = data.tournament_id || data.tournament?.id;
                if (tournamentId) {
                    try {
                        const tourRes = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}`, {
                            headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
                            cache: 'no-store',
                        });
                        if (tourRes.ok) {
                            const tourJson = await tourRes.json();
                            if (!tournament) {
                                tournament = tourJson.tournament || tourJson;
                            }
                            categories = tourJson.categories || [];
                        }
                    } catch (err) {
                        console.error("Failed to fetch tournament in getTournamentTeam:", err);
                    }
                }

                const resolvedTourName = tournament?.name || (tournament as any)?.tournament?.name || data.tournament_name || data.tournament?.name || null;
                const categoryId = data.tournament_category_id || data.category_id;
                let categoryName = data.category?.name || data.tournament_category?.name || data.category_name || null;
                if (!categoryName && categoryId && categories.length > 0) {
                    const matched = categories.find((c: any) => c.id === categoryId);
                    if (matched) {
                        categoryName = matched.name || matched.category_name || null;
                    }
                }

                return {
                    id: data.id,
                    team_id: data.team_id,
                    user_id: teamData.user_id || session.user.id || null,
                    tournament_id: tournamentId,
                    tournament_category_id: categoryId,
                    tournament: tournament,
                    tournament_name: resolvedTourName,
                    category_name: categoryName,
                    category: data.category || (categoryName ? { id: categoryId, name: categoryName } : null),
                    name: teamData.name || data.name || "Unknown Team",
                    short_name: teamData.short_name || data.short_name,
                    description: teamData.description || null,
                    logo_url: resolveStorageUrl(teamData.logo_url || teamData.logo_img || data.logo_url || data.logo_img),
                    logo_img: resolveStorageUrl(teamData.logo_img || teamData.logo_url || data.logo_img || data.logo_url),
                    contact_name: data.contact_name || teamData.contact_name,
                    contact_phone: data.contact_phone || teamData.contact_phone,
                    contact_email: data.contact_email || teamData.contact_email,
                    is_roster_locked: data.is_roster_locked || false,
                    unlock_requested: data.unlock_requested || false,
                    registration_status: data.registration_status,
                    roster_status: data.roster_status,
                    payment_status: data.payment_status,
                    sport: sportName as any,
                    sport_name: sportName,
                    sport_id: teamData.sport_id,
                    created_at: data.created_at || new Date().toISOString(),
                    isParticipation: true,
                    participations: [],
                    registrations: [],
                };
            }
        }

        // Direct DB fallback
        const adminSupabase = createAdminClient();
        const { data: ttData } = await adminSupabase
            .from("tournament_teams")
            .select(`
                id,
                tournament_id,
                tournament_category_id,
                team_id,
                payment_status,
                registration_status,
                roster_status,
                is_roster_locked,
                unlock_requested,
                contact_name,
                contact_phone,
                contact_email,
                created_at,
                teams ( id, user_id, name, short_name, description, logo_url, logo_img, sport_id ),
                tournaments ( id, name, sport, logo_url, banner_url, status, document_deadline ),
                tournament_categories ( id, name )
            `)
            .eq("id", id)
            .maybeSingle();

        if (ttData) {
            const team = (ttData.teams as any) || {};
            const tournament = (ttData.tournaments as any) || null;
            const category = (ttData.tournament_categories as any) || null;
            return {
                id: ttData.id,
                team_id: ttData.team_id,
                user_id: team.user_id || session.user.id || null,
                tournament_id: ttData.tournament_id,
                tournament_category_id: ttData.tournament_category_id,
                tournament: tournament,
                tournament_name: tournament?.name || null,
                category_name: category?.name || null,
                category: category,
                name: team.name || "Unknown Team",
                short_name: team.short_name,
                description: team.description || null,
                logo_url: resolveStorageUrl(team.logo_url || team.logo_img),
                logo_img: resolveStorageUrl(team.logo_img || team.logo_url),
                contact_name: ttData.contact_name,
                contact_phone: ttData.contact_phone,
                contact_email: ttData.contact_email,
                is_roster_locked: ttData.is_roster_locked || false,
                unlock_requested: ttData.unlock_requested || false,
                registration_status: ttData.registration_status,
                roster_status: ttData.roster_status,
                payment_status: ttData.payment_status,
                sport: 'Football' as any,
                sport_name: 'Football',
                sport_id: team.sport_id,
                created_at: ttData.created_at || new Date().toISOString(),
                isParticipation: true,
                participations: [],
                registrations: [],
            };
        }

        return null;
    } catch (error) {
        console.error("Error in getTournamentTeam:", error);
        return null;
    }
}



/**
 * Update global team information.
 */
export async function updateTeamGlobal(teamId: string, formData: FormData, _tournamentId: string): Promise<ActionResponse> {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return { success: false, error: "Authentication required" };
        }

        const name = formData.get("name") as string;
        const logoFile = formData.get("logo") as File;
        const sport = formData.get("sport") as string;
        const description = formData.get("description") as string;
        const contact_name = formData.get("contact_name") as string;
        const contact_phone = formData.get("contact_phone") as string;
        const contact_email = formData.get("contact_email") as string;
        const existingLogoUrl = formData.get("existing_logo_url") as string;

        if (!name) {
            return { success: false, error: "Team name is required" };
        }

        let logoUrl = existingLogoUrl;

        if (logoFile && logoFile.size > 0) {
            const fileCheck = validateUploadedFile(logoFile);
            if (!fileCheck.valid) return { success: false, error: fileCheck.error };

            const fileExt = logoFile.name.split('.').pop() || 'png';
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const filePath = `teams/${teamId}/${fileName}`;

            const uploadRes = await uploadToR2(logoFile, filePath, logoFile.type);
            if (!uploadRes.success || !uploadRes.url) {
                console.error("Logo upload error:", uploadRes.error);
                return { success: false, error: "Failed to upload logo: " + (uploadRes.error || "Unknown error") };
            }

            logoUrl = uploadRes.url;
        }

        const adminSupabase = createAdminClient();

        // 1. Try Go API
        try {
            await fetch(`${API_BASE_URL}/teams/${teamId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.token}`,
                },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description || '',
                    contact_name: contact_name || '',
                    contact_phone: contact_phone || '',
                    contact_email: contact_email?.trim() || null,
                    logo_url: logoUrl || null,
                    logo_img: logoUrl || null,
                    sport_id: sport || undefined,
                }),
            });
        } catch (apiErr) {
            console.warn("[updateTeamGlobal] API PUT failed, falling back to direct DB update:", apiErr);
        }

        // 2. Direct Supabase DB update
        const teamUpdates: Record<string, unknown> = {
            name: name.trim(),
            description: description || null,
            contact_name: contact_name || null,
            contact_phone: contact_phone || null,
            contact_email: contact_email?.trim() || null,
            logo_img: logoUrl || null,
            logo_url: logoUrl || null,
        };
        if (sport) teamUpdates.sport_id = sport;

        const { error: dbError } = await adminSupabase
            .from("teams")
            .update(teamUpdates)
            .eq("id", teamId);

        if (dbError) {
            console.error("[updateTeamGlobal] Direct DB update failed:", dbError);
            // If teamId is a tournament_team
            const { data: ttRec } = await adminSupabase
                .from("tournament_teams")
                .select("team_id")
                .eq("id", teamId)
                .maybeSingle();

            if (ttRec?.team_id) {
                await adminSupabase
                    .from("teams")
                    .update(teamUpdates)
                    .eq("id", ttRec.team_id);
            }
        }

        // Revalidate relevant paths
        revalidatePath("/manager/my-teams");
        revalidatePath("/manager/my-registrations");
        revalidatePath(`/manager/my-teams/${teamId}`);
        revalidatePath(`/dashboard/teams/${teamId}`);
        revalidatePath(`/dashboard/tournament-teams/${teamId}`);
        return { success: true };
    } catch (err) {
        console.error("Error in updateTeamGlobal:", err);
        return { success: false, error: "An unexpected error occurred" };
    }
}

/**
 * Delete a global team.
 */
export async function deleteTeamGlobal(teamId: string, _tournamentId?: string): Promise<ActionResponse> {
    try {
        const session = await getServerSession();
        if (!session?.user) return { success: false, error: "Authentication required" };

        const res = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${session.token}`,
            },
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: err.error || "Failed to delete team" };
        }

        revalidatePath("/dashboard/teams");
        revalidatePath("/manager/my-teams");
        return { success: true };
    } catch (err) {
        console.error("Error in deleteTeamGlobal:", err);
        return { success: false, error: "An unexpected error occurred" };
    }
}

/**
 * Toggle roster locking for a team.
 */
export async function toggleRosterLock(teamId: string, isLocked: boolean): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForTeam(teamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this team" };

    const { data: globalTeam } = await adminSupabase.from("teams").select("id").eq("id", teamId).single();
    const { data: participation } = await adminSupabase.from("tournament_teams").select("id").eq("id", teamId).single();

    if (!globalTeam && !participation) {
        return { success: false, error: "Team context not found." };
    }

    const tableToAdd = globalTeam ? "teams" : "tournament_teams";
    const updateData: Record<string, boolean> = { is_roster_locked: isLocked };
    if (!globalTeam && isLocked) {
        updateData.unlock_requested = false;
    }

    const { error } = await adminSupabase
        .from(tableToAdd)
        .update(updateData)
        .eq("id", teamId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/teams/${teamId}`);
    revalidatePath(`/manager/my-teams/${teamId}`);
    return { success: true };
}

/* ============================================================================
   ROSTER IMPORT & MANAGEMENT (Supabase-backed)
   ============================================================================ */

/**
 * Fetch available teams that the user owns to use as import sources.
 */
export async function getImportableTeams(currentTeamId: string): Promise<ActionResponse<any[]>> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    // Get current team sport to only show teams of same sport
    let currentSportId: string | null = null;
    const { data: curGlobal } = await adminSupabase.from("teams").select("sport_id").eq("id", currentTeamId).single();
    if (curGlobal?.sport_id) {
        currentSportId = curGlobal.sport_id;
    } else {
        const { data: curTourney } = await adminSupabase
            .from("tournament_teams")
            .select("tournament_categories(sport_id)")
            .eq("id", currentTeamId)
            .single();
        const cat = curTourney?.tournament_categories as unknown as { sport_id: string } | null;
        if (cat?.sport_id) currentSportId = cat.sport_id;
    }

    // 1. Fetch user's global teams
    let globalQuery = adminSupabase
        .from("teams")
        .select("id, name, logo_url, sport_id")
        .eq("user_id", user.id)
        .neq("id", currentTeamId);

    if (currentSportId) {
        globalQuery = globalQuery.eq("sport_id", currentSportId);
    }

    const { data: globalTeams } = await globalQuery;

    // 2. Fetch user's tournament participation teams
    const tourneyQuery = adminSupabase
        .from("tournament_teams")
        .select(`
            id,
            teams ( id, name, logo_url, user_id ),
            tournament_categories ( sport_id, name, tournaments ( name ) )
        `)
        .neq("id", currentTeamId);

    const { data: tourneyParticipations } = await tourneyQuery;

    const results: any[] = [];

    // Add global teams
    if (globalTeams) {
        for (const t of globalTeams) {
            results.push({
                id: t.id,
                name: t.name,
                logo_url: resolveStorageUrl(t.logo_url),
                sourceType: 'global',
                description: 'Global Team'
            });
        }
    }

    // Add tournament teams
    if (tourneyParticipations) {
        for (const tp of tourneyParticipations) {
            const team = tp.teams as unknown as { id: string; name: string; logo_url: string; user_id: string } | null;
            if (team && team.user_id === user.id) {
                const cat = tp.tournament_categories as unknown as { sport_id: string; name: string; tournaments: { name: string } } | null;
                if (!currentSportId || cat?.sport_id === currentSportId) {
                    if (team.id !== currentTeamId && tp.id !== currentTeamId) {
                        results.push({
                            id: tp.id,
                            name: `${team.name} (${cat?.tournaments?.name || 'Tournament'} - ${cat?.name || 'Category'})`,
                            logo_url: resolveStorageUrl(team.logo_url),
                            sourceType: 'tournament',
                            description: 'Tournament Participation'
                        });
                    }
                }
            }
        }
    }

    return { success: true, data: results };
}

/* ============================================================================
   PLAYER MANAGEMENT (Manager Perspective)
   ============================================================================ */

/**
 * Get players for a specific team (global or tournament).
 */
export async function getPlayers(teamId: string): Promise<ActionResponse<Player[]>> {
    try {
        const session = await getServerSession();
        let players: any[] = [];
        let fetchedFromApi = false;

        try {
            const res = await fetch(`${API_BASE_URL}/teams/${teamId}/players`, {
                headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
                cache: 'no-store',
            });

            if (res.ok) {
                players = await res.json();
                fetchedFromApi = true;
            }
        } catch (fetchErr) {
            console.warn("[getPlayers] API fetch error, falling back to direct DB query:", fetchErr);
        }

        // Direct DB Fallback if API returned empty or failed
        if (!fetchedFromApi || !players || players.length === 0) {
            try {
                const adminSupabase = createAdminClient();
                // 1. Try tournament_players first (approved roster)
                const { data: tpData } = await adminSupabase
                    .from("tournament_players")
                    .select("id, tournament_team_id, master_player_id, shirt_number, position, photo_url, created_at, master_players(id, first_name_local, middle_name_local, last_name_local, first_name_intl, middle_name_intl, last_name_intl, name, photo_url, birthday, tel)")
                    .eq("tournament_team_id", teamId)
                    .is("deleted_at", null);

                if (tpData && tpData.length > 0) {
                    const mapped: Player[] = tpData.map((tp: any) => {
                        const mp = tp.master_players || {};
                        const rawName = mp.name || (mp.first_name_local ? `${mp.first_name_local} ${mp.last_name_local || ''}` : `${mp.first_name_intl || ''} ${mp.last_name_intl || ''}`).trim();
                        const cleanName = rawName.replace(/\s*-\s*$/, '').trim();
                        return {
                            id: tp.id,
                            name: cleanName || 'Unnamed Player',
                            number: tp.shirt_number ? parseInt(tp.shirt_number) : null,
                            position: tp.position || null,
                            birth_date: mp.birthday || null,
                            photo_url: resolveStorageUrl(tp.photo_url || mp.photo_url || null),
                            team_id: teamId,
                            global_team_id: null,
                            global_player_id: tp.master_player_id || null,
                            master_player_id: tp.master_player_id || null,
                            tel: mp.tel || null,
                            status: 'approved',
                            created_at: tp.created_at || new Date().toISOString(),
                            deleted_at: null,
                        };
                    });
                    return { success: true, data: mapped };
                }

                // 2. Try tournament_roster_submissions (submitted/pending roster)
                const { data: trsData } = await adminSupabase
                    .from("tournament_roster_submissions")
                    .select("id, tournament_team_id, name, shirt_number, position, photo_url, tel, status, created_at")
                    .eq("tournament_team_id", teamId)
                    .is("deleted_at", null);

                if (trsData && trsData.length > 0) {
                    const mapped: Player[] = trsData.map((trs: any) => {
                        return {
                            id: trs.id,
                            name: trs.name || 'Unnamed Player',
                            number: trs.shirt_number ? parseInt(trs.shirt_number) : null,
                            position: trs.position || null,
                            birth_date: null,
                            photo_url: resolveStorageUrl(trs.photo_url || null),
                            team_id: teamId,
                            global_team_id: null,
                            global_player_id: null,
                            master_player_id: null,
                            tel: trs.tel || null,
                            status: trs.status || 'pending',
                            created_at: trs.created_at || new Date().toISOString(),
                            deleted_at: null,
                        };
                    });
                    return { success: true, data: mapped };
                }

                // 3. Direct query from `players` table matching exact DB schema (or via tournament_teams.team_id)
                const { data: ttRecord } = await adminSupabase
                    .from("tournament_teams")
                    .select("id, team_id")
                    .eq("id", teamId)
                    .maybeSingle();

                const targetTeamId = ttRecord?.team_id || teamId;

                const { data: pData, error: pError } = await adminSupabase
                    .from("players")
                    .select("id, team_id, first_name, last_name, jersey_number, position, photo_url, date_of_birth, master_player_id, created_at, updated_at")
                    .eq("team_id", targetTeamId)
                    .is("deleted_at", null);

                if (pError) {
                    console.warn("[getPlayers] direct players select error:", pError.message);
                } else if (pData && pData.length > 0) {
                    players = pData;
                }
            } catch (dbErr) {
                console.error("[getPlayers] DB fallback error:", dbErr);
            }
        }

        const masterPlayerIds = (players || [])
            .map((p: any) => p.master_player_id || p.master_id)
            .filter(Boolean) as string[];

        const masterMap = new Map<string, { photo_url?: string | null; tel?: string | null }>();
        if (masterPlayerIds.length > 0) {
            try {
                const adminSupabase = createAdminClient();
                const { data: mpData } = await adminSupabase
                    .from("master_players")
                    .select("id, photo_url, tel")
                    .in("id", masterPlayerIds);
                if (mpData) {
                    for (const mp of mpData) {
                        masterMap.set(mp.id, mp);
                    }
                }
            } catch (err) {
                console.error("[getPlayers] error querying master_players:", err);
            }
        }

        const mappedPlayers: Player[] = (players || []).map((p: any) => {
            const masterId = p.master_player_id || p.master_id;
            const masterInfo = masterId ? masterMap.get(masterId) : null;
            const photoUrl = resolveStorageUrl(p.photo_url || masterInfo?.photo_url || null);

            return {
                id: p.id,
                name: (p.name || `${p.first_name || ''} ${p.last_name && p.last_name !== '-' ? p.last_name : ''}`).trim() || 'Unnamed Player',
                first_name: p.first_name || null,
                last_name: p.last_name || null,
                number: p.jersey_number !== undefined && p.jersey_number !== null ? parseInt(p.jersey_number) : (p.shirt_number ? parseInt(p.shirt_number) : null),
                position: p.position || null,
                birth_date: p.date_of_birth || p.birth_date || null,
                photo_url: photoUrl,
                team_id: teamId,
                global_team_id: teamId,
                global_player_id: masterId || p.id,
                master_player_id: masterId || null,
                tel: p.tel || masterInfo?.tel || null,
                status: 'approved',
                created_at: p.created_at || new Date().toISOString(),
                deleted_at: null,
            };
        });

        const getRolePriority = (position?: string | null): number => {
            if (!position) return 4;
            const pos = position.toLowerCase().trim();
            if (pos.includes("ผู้จัดการ") || pos.includes("manager")) return 1;
            if (pos.includes("ผู้ช่วย") || pos.includes("assistant") || pos.includes("asst")) return 3;
            if (pos.includes("ผู้ฝึกสอน") || pos.includes("โค้ช") || pos.includes("coach")) return 2;
            return 4;
        };

        mappedPlayers.sort((a, b) => {
            const rankA = getRolePriority(a.position);
            const rankB = getRolePriority(b.position);
            if (rankA !== rankB) return rankA - rankB;
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            if (timeA !== timeB) return timeA - timeB;
            return 0;
        });
        return { success: true, data: mappedPlayers };
    } catch (err) {
        console.error("Error fetching players:", err);
        return { success: true, data: [] };
    }
}

/**
 * Add a player to a team roster.
 */
export async function addPlayer(
    teamId: string,
    formData: FormData
): Promise<ActionResponse> {
    try {
        const session = await getServerSession();
        if (!session?.user) return { success: false, error: "Authentication required" };

        const name = formData.get("name") as string;
        const firstNameTh = formData.get("firstNameTh") as string || formData.get("first_name_th") as string || formData.get("first_name_local") as string || "";
        const middleNameTh = formData.get("middleNameTh") as string || formData.get("middle_name_th") as string || formData.get("middle_name_local") as string || "";
        const lastNameTh = formData.get("lastNameTh") as string || formData.get("last_name_th") as string || formData.get("last_name_local") as string || "";
        const firstNameEn = formData.get("firstNameEn") as string || formData.get("first_name_en") as string || formData.get("first_name_intl") as string || "";
        const middleNameEn = formData.get("middleNameEn") as string || formData.get("middle_name_en") as string || formData.get("middle_name_intl") as string || "";
        const lastNameEn = formData.get("lastNameEn") as string || formData.get("last_name_en") as string || formData.get("last_name_intl") as string || "";
        const nickname = formData.get("nickname") as string || "";
        const number = formData.get("number") as string;
        const position = formData.get("position") as string;
        const photoFile = formData.get("photo") as File | null;
        const dateOfBirth = formData.get("date_of_birth") as string || formData.get("birthday") as string || "";
        const tel = formData.get("tel") as string || "";
        const gender = formData.get("gender") as string || "male";
        const preferredHand = formData.get("preferred_hand") as string || formData.get("preferredHand") as string || "";
        const preferredFoot = formData.get("preferred_foot") as string || formData.get("preferredFoot") as string || "";
        let masterPlayerId = formData.get("master_player_id") as string | null;

        // Smart name classification
        const classified = classifyPlayerNames({
            name,
            first_name_local: firstNameTh || null,
            middle_name_local: middleNameTh || null,
            last_name_local: lastNameTh || null,
            first_name_intl: firstNameEn || null,
            middle_name_intl: middleNameEn || null,
            last_name_intl: lastNameEn || null,
        });

        // Resolve display first and last name
        let firstName = classified.first_name_intl || classified.first_name_local;
        let lastName = classified.last_name_intl || classified.last_name_local || "-";

        if (!firstName) {
            if (!name || !name.trim()) return { success: false, error: "Name is required" };
            const nameParts = name.trim().split(" ");
            firstName = nameParts[0];
            lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";
        }

        let photoUrl: string | null = null;
        if (photoFile && photoFile.size > 0) {
            const fileCheck = validateUploadedFile(photoFile);
            if (!fileCheck.valid) return { success: false, error: fileCheck.error };

            const fileExt = photoFile.name.split('.').pop() || 'jpg';
            const fileName = `players/${teamId}/photo_${Date.now()}.${fileExt}`;
            const uploadRes = await uploadToR2(photoFile, fileName, photoFile.type);
            if (uploadRes.success && uploadRes.url) {
                photoUrl = uploadRes.url;
            }
        }

        const adminSupabase = createAdminClient();

        // 1. If detailed information is provided or no master player selected, create/link master_players
        if (!masterPlayerId) {
            try {
                const { data: createdMP } = await adminSupabase
                    .from("master_players")
                    .insert({
                        first_name_local: classified.first_name_local,
                        middle_name_local: classified.middle_name_local,
                        last_name_local: classified.last_name_local,
                        first_name_intl: classified.first_name_intl,
                        middle_name_intl: classified.middle_name_intl,
                        last_name_intl: classified.last_name_intl,
                        nickname: nickname || null,
                        birthday: dateOfBirth || null,
                        gender: gender || 'male',
                        preferred_hand: preferredHand || null,
                        preferred_foot: preferredFoot || null,
                        tel: tel || null,
                        photo_url: photoUrl,
                        status: 'active',
                        verified: false
                    })
                    .select("id")
                    .single();

                if (createdMP?.id) {
                    masterPlayerId = createdMP.id;
                }
            } catch (mpErr) {
                console.warn("[addPlayer] Master player insert fallback error:", mpErr);
            }
        }

        // 2. Call Go Backend API
        try {
            await fetch(`${API_BASE_URL}/teams/${teamId}/players`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.token}`,
                },
                body: JSON.stringify({
                    team_id: teamId,
                    first_name: firstName,
                    last_name: lastName,
                    jersey_number: number ? parseInt(number) : null,
                    shirt_number: number ? number.toString() : null,
                    position: position || null,
                    photo_url: photoUrl,
                    date_of_birth: dateOfBirth || null,
                    master_player_id: masterPlayerId || null,
                }),
            });
        } catch (apiErr) {
            console.warn("[addPlayer] API POST failed, continuing with direct DB:", apiErr);
        }

        // 3. Ensure direct insert in players table if needed
        try {
            const { data: existingPlayer } = await adminSupabase
                .from("players")
                .select("id")
                .eq("team_id", teamId)
                .eq("first_name", firstName)
                .eq("last_name", lastName)
                .maybeSingle();

            if (!existingPlayer) {
                await adminSupabase
                    .from("players")
                    .insert({
                        team_id: teamId,
                        first_name: firstName,
                        last_name: lastName,
                        jersey_number: number ? parseInt(number) : null,
                        shirt_number: number ? number.toString() : null,
                        position: position || null,
                        photo_url: photoUrl,
                        date_of_birth: dateOfBirth || null,
                        master_player_id: masterPlayerId || null,
                    });
            }
        } catch (dbErr) {
            console.warn("[addPlayer] direct players insert error:", dbErr);
        }

        revalidatePath(`/dashboard/teams/${teamId}`);
        revalidatePath(`/manager/my-teams/${teamId}`);
        return { success: true };
    } catch (err) {
        console.error("Error in addPlayer:", err);
        return { success: false, error: "An unexpected error occurred" };
    }
}

/**
 * Add multiple players to a team roster at once.
 */
export async function addPlayersBatch(
    teamId: string,
    playersList: { name: string; number?: string; position?: string; tel?: string; master_player_id?: string; }[]
): Promise<ActionResponse> {
    try {
        const session = await getServerSession();
        if (!session?.user) return { success: false, error: "Authentication required" };

        for (const playerInfo of playersList) {
            if (!playerInfo.name || !playerInfo.name.trim()) continue;

            const nameParts = playerInfo.name.trim().split(" ");
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";

            await fetch(`${API_BASE_URL}/teams/${teamId}/players`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.token}`,
                },
                body: JSON.stringify({
                    team_id: teamId,
                    first_name: firstName,
                    last_name: lastName,
                    jersey_number: playerInfo.number ? parseInt(playerInfo.number) : null,
                    position: playerInfo.position || null,
                    master_player_id: playerInfo.master_player_id || null,
                }),
            });
        }

        revalidatePath(`/dashboard/teams/${teamId}`);
        revalidatePath(`/manager/my-teams/${teamId}`);
        return { success: true };
    } catch (err) {
        console.error("Error in addPlayersBatch:", err);
        return { success: false, error: "An unexpected error occurred" };
    }
}

/**
 * Add multiple players with photos using FormData.
 */
export async function addPlayersBatchForm(
    formData: FormData
): Promise<ActionResponse> {
    try {
        const session = await getServerSession();
        if (!session?.user) return { success: false, error: "Authentication required" };

        const teamId = formData.get("teamId") as string;
        const count = parseInt(formData.get("count") as string || "0");
        if (!teamId || count === 0) return { success: false, error: "No players provided" };

        for (let i = 0; i < count; i++) {
            const name = formData.get(`name_${i}`) as string;
            if (!name || !name.trim()) continue;

            const number = formData.get(`number_${i}`) as string;
            const position = formData.get(`position_${i}`) as string;
            const photoFile = formData.get(`photo_${i}`) as File | null;
            const masterPlayerId = formData.get(`master_player_id_${i}`) as string | null;

            let photoUrl: string | null = null;
            if (photoFile && photoFile.size > 0) {
                const fileCheck = validateUploadedFile(photoFile);
                if (fileCheck.valid) {
                    const fileExt = photoFile.name.split('.').pop() || 'jpg';
                    const fileName = `players/${teamId}/photo_${Date.now()}_${i}.${fileExt}`;
                    const uploadRes = await uploadToR2(photoFile, fileName, photoFile.type);
                    if (uploadRes.success && uploadRes.url) {
                        photoUrl = uploadRes.url;
                    }
                }
            }

            const nameParts = name.trim().split(" ");
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";

            await fetch(`${API_BASE_URL}/teams/${teamId}/players`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.token}`,
                },
                body: JSON.stringify({
                    team_id: teamId,
                    first_name: firstName,
                    last_name: lastName,
                    jersey_number: number ? parseInt(number) : null,
                    position: position || null,
                    photo_url: photoUrl,
                    master_player_id: masterPlayerId || null,
                }),
            });
        }

        revalidatePath(`/dashboard/teams/${teamId}`);
        revalidatePath(`/manager/my-teams/${teamId}`);
        return { success: true };
    } catch (err) {
        console.error("Error in addPlayersBatchForm:", err);
        return { success: false, error: "An unexpected error occurred" };
    }
}

/**
 * Update player information.
 */
export async function updatePlayer(
    playerId: string,
    teamId: string,
    data: { name?: string; number?: number | null; position?: string | null; birth_date?: string | null; photo_url?: string | null; tel?: string | null }
): Promise<ActionResponse> {
    try {
        const session = await getServerSession().catch(() => null);
        if (!session?.user) return { success: false, error: "Authentication required" };

        const nameParts = data.name ? data.name.trim().split(" ") : [];
        const firstName = nameParts.length > 0 ? nameParts[0] : undefined;
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : (nameParts.length === 1 ? "-" : undefined);

        let updateSuccess = false;
        let lastError = "";

        // 1. Try Go Backend API for team player
        try {
            const res = await fetch(`${API_BASE_URL}/teams/${teamId}/players/${playerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.token}`,
                },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    jersey_number: data.number !== undefined ? data.number : undefined,
                    position: data.position !== undefined ? data.position : undefined,
                    photo_url: data.photo_url !== undefined ? data.photo_url : undefined,
                    date_of_birth: data.birth_date !== undefined ? data.birth_date : undefined,
                    tel: data.tel !== undefined ? data.tel : undefined,
                }),
            });
            if (res.ok) {
                updateSuccess = true;
            } else {
                const errBody = await res.json().catch(() => ({}));
                lastError = errBody.error || "Failed to update team player";
            }
        } catch (apiErr) {
            console.warn("[updatePlayer] API PUT /teams failed:", apiErr);
        }

        // 2. Also try tournament player PUT API if applicable
        try {
            const res = await fetch(`${API_BASE_URL}/tournament-teams/${teamId}/players/${playerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.token}`,
                },
                body: JSON.stringify({
                    shirt_number: data.number !== undefined && data.number !== null ? String(data.number) : null,
                    position: data.position || null,
                    first_name: firstName,
                    last_name: lastName,
                    name: data.name,
                    photo_url: data.photo_url,
                    tel: data.tel,
                }),
            });
            if (res.ok) {
                updateSuccess = true;
            }
        } catch {
            // ignore
        }

        if (!updateSuccess && lastError) {
            return { success: false, error: lastError };
        }

        revalidatePath(`/dashboard/teams/${teamId}`);
        revalidatePath(`/dashboard/tournament-teams/${teamId}`);
        revalidatePath(`/manager/my-teams/${teamId}`);
        return { success: true };
    } catch (err) {
        console.error("Error in updatePlayer:", err);
        return { success: false, error: err instanceof Error ? err.message : "An unexpected error occurred" };
    }
}

/**
 * Remove a player from a team roster.
 */
export async function deletePlayer(playerId: string, teamId: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const session = await getServerSession().catch(() => null);
        const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        const currentUser = session?.user || user;
        if (!currentUser) return { success: false, error: "Authentication required" };

        const adminSupabase = createAdminClient();

        try {
            await fetch(`${API_BASE_URL}/teams/${teamId}/players/${playerId}`, {
                method: 'DELETE',
                headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
            });
        } catch {
            // ignore
        }

        const now = new Date().toISOString();

        // 1. Soft delete in player_sports
        await adminSupabase
            .from("player_sports")
            .update({ deleted_at: now })
            .eq("player_id", playerId)
            .eq("team_id", teamId);

        // 2. Soft delete in players
        await adminSupabase
            .from("players")
            .update({ deleted_at: now })
            .eq("id", playerId);

        // 3. Delete in tournament_players if exists
        await adminSupabase
            .from("tournament_players")
            .delete()
            .eq("id", playerId);

        revalidatePath(`/dashboard/teams/${teamId}`);
        revalidatePath(`/dashboard/tournament-teams/${teamId}`);
        revalidatePath(`/manager/my-teams/${teamId}`);
        return { success: true };
    } catch (err) {
        console.error("Error in deletePlayer:", err);
        return { success: false, error: err instanceof Error ? err.message : "An unexpected error occurred" };
    }
}

/**
 * Import a roster from one team to another.
 */
export async function importRoster(
    targetTeamId: string,
    sourceTeamId: string
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorizedTarget = await isAuthorizedForTeam(targetTeamId, user.id);
    if (!authorizedTarget) return { success: false, error: "Unauthorized to manage target roster" };

    const authorizedSource = await isAuthorizedForTeam(sourceTeamId, user.id);
    if (!authorizedSource) return { success: false, error: "Unauthorized to read from source roster" };

    const sourceRes = await getPlayers(sourceTeamId);
    if (!sourceRes.success || !sourceRes.data || sourceRes.data.length === 0) {
        return { success: false, error: sourceRes.error || "Source team has no players to import" };
    }
    const sourcePlayers = sourceRes.data;

    const { data: participationCheck } = await adminSupabase.from("tournament_teams").select("id").eq("id", targetTeamId).single();
    let globalCheck = null;
    
    if (!participationCheck) {
        const { data: gCheck } = await adminSupabase.from("teams").select("id").eq("id", targetTeamId).single();
        globalCheck = gCheck;
    }

    if (!participationCheck && !globalCheck) {
        return { success: false, error: "Target team not found." };
    }

    if (participationCheck) {
        // Clear existing staged players for this target
        await adminSupabase
            .from("tournament_roster_submissions")
            .delete()
            .eq("tournament_team_id", targetTeamId);

        // Insert into staging table
        const stagedToInsert = sourcePlayers.map(p => ({
            tournament_team_id: targetTeamId,
            name: p.name,
            shirt_number: p.number ? String(p.number) : null,
            position: p.position || null,
            tel: p.tel || null,
            photo_url: p.photo_url || null
        }));

        const { error: stagedError } = await adminSupabase
            .from("tournament_roster_submissions")
            .insert(stagedToInsert);

        if (stagedError) {
            console.error("[importRoster] Staged insert failed:", stagedError);
            return { success: false, error: stagedError.message };
        }

        revalidatePath(`/manager/my-teams/${targetTeamId}`);
        revalidatePath(`/dashboard/tournament-teams/${targetTeamId}`);
        return { success: true, message: `Successfully imported ${sourcePlayers.length} players to staging.` };
    }

    let targetGlobalTeamId = null;
    let targetSportId = null;
    let targetTournamentId = null;

    if (globalCheck) {
        targetGlobalTeamId = globalCheck.id;
        const { data: teamData } = await adminSupabase.from("teams").select("sport_id").eq("id", targetGlobalTeamId).single();
        if (teamData) targetSportId = teamData.sport_id;
    }

    if (!targetTournamentId) {
        const { data: anyTour } = await adminSupabase.from("tournaments").select("id").limit(1).single();
        if (anyTour) {
            targetTournamentId = anyTour.id;
        }
    }

    if (!targetTournamentId) {
        return { success: false, error: "Target tournament context not found." };
    }

    const playersToInsert = sourcePlayers.map(p => ({
        master_id: p.global_player_id,
        display_name: p.name,
        tel: p.tel || null
    }));

    const { data: newPlayers, error: insertError } = await adminSupabase
        .from("players")
        .insert(playersToInsert)
        .select("id, master_id");

    if (insertError) {
        console.error("[importRoster] Bulk insert failed:", insertError);
        return { success: false, error: insertError.message };
    }

    if (newPlayers && newPlayers.length > 0 && targetSportId) {
        const sportsToInsert = newPlayers.map((np, idx) => {
            const sourceP = sourcePlayers[idx];
            return {
                player_id: np.id,
                sport_id: targetSportId,
                team_id: targetTeamId,
                position: sourceP.position || null,
                shirt_number: sourceP.number ? String(sourceP.number) : null
            };
        });

        const { error: sportsError } = await adminSupabase
            .from("player_sports")
            .insert(sportsToInsert);

        if (sportsError) {
            console.error("[importRoster] player_sports bulk insert failed:", sportsError);
        }
    }

    revalidatePath(`/manager/my-teams/${targetTeamId}`);
    revalidatePath(`/dashboard/tournament-teams/${targetTeamId}`);
    return { success: true, message: `Successfully imported ${newPlayers.length} players.` };
}

/**
 * Remove all players from a team roster.
 */
export async function resetRoster(teamId: string): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForTeam(teamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this roster" };

    // Fetch player_ids from player_sports
    const { data: psRecords } = await adminSupabase
        .from("player_sports")
        .select("player_id")
        .eq("team_id", teamId);

    const now = new Date().toISOString();

    // 1. Update player_sports.deleted_at
    const { error: psError } = await adminSupabase
        .from("player_sports")
        .update({ deleted_at: now })
        .eq("team_id", teamId);

    if (psError) return { success: false, error: psError.message };

    // 2. Update players.deleted_at
    if (psRecords && psRecords.length > 0) {
        const playerIds = psRecords.map((r) => r.player_id);
        const { error: pError } = await adminSupabase
            .from("players")
            .update({ deleted_at: now })
            .in("id", playerIds);
        if (pError) return { success: false, error: pError.message };
    }

    revalidatePath(`/manager/my-teams/${teamId}`);
    revalidatePath(`/dashboard/tournament-teams/${teamId}`);
    await logActivity('RESET_ROSTER', 'team', teamId, { reset_by: user.id });
    return { success: true };
}

/**
 * Restore all soft-deleted players for a team roster.
 */
export async function restoreRoster(teamId: string): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForTeam(teamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this roster" };

    // Fetch player_ids from player_sports
    const { data: psRecords } = await adminSupabase
        .from("player_sports")
        .select("player_id")
        .eq("team_id", teamId);

    // 1. Update player_sports.deleted_at to null
    const { error: psError } = await adminSupabase
        .from("player_sports")
        .update({ deleted_at: null })
        .eq("team_id", teamId);

    if (psError) return { success: false, error: psError.message };

    // 2. Update players.deleted_at to null
    if (psRecords && psRecords.length > 0) {
        const playerIds = psRecords.map((r) => r.player_id);
        const { error: pError } = await adminSupabase
            .from("players")
            .update({ deleted_at: null })
            .in("id", playerIds);
        if (pError) return { success: false, error: pError.message };
    }

    revalidatePath(`/manager/my-teams/${teamId}`);
    revalidatePath(`/dashboard/tournament-teams/${teamId}`);
    await logActivity('RESTORE_ROSTER', 'team', teamId, { restored_by: user.id });
    return { success: true };
}

/**
 * Check if a team has any soft-deleted players.
 */
export async function hasSoftDeletedPlayers(teamId: string): Promise<ActionResponse<boolean>> {
    const supabase = await createClient();

    // Check if there are any records in player_sports where deleted_at IS NOT NULL
    const { count, error } = await supabase
        .from("player_sports")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .not("deleted_at", "is", null);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data: (count || 0) > 0 };
}

/**
 * Search global teams for management claim by name or contact email.
 */
export async function searchTeamsForClaim(query: string): Promise<ActionResponse<Array<{ id: string; name: string; contact_email?: string; logo_url?: string; sport?: string }>>> {
    try {
        const session = await getServerSession();
        const url = `${API_BASE_URL}/teams/search-claim?q=${encodeURIComponent(query.trim())}`;
        const headers: Record<string, string> = {};
        if (session?.token) {
            headers['Authorization'] = `Bearer ${session.token}`;
        }

        const res = await fetch(url, {
            headers,
            cache: 'no-store'
        });

        if (res.ok) {
            const data = await res.json();
            return {
                success: true,
                data: (data || []).map((t: any) => ({
                    id: t.id,
                    name: t.name,
                    contact_email: t.contact_email,
                    logo_url: t.logo_url || t.logo_img,
                    sport: t.sport || 'football'
                }))
            };
        }

        // Fallback to Supabase
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("teams")
            .select("id, name, contact_email, logo_url, logo_img")
            .or(`name.ilike.%${query.trim()}%,contact_email.ilike.%${query.trim()}%`)
            .is("deleted_at", null)
            .limit(20);

        if (error) {
            return { success: false, error: error.message };
        }

        return {
            success: true,
            data: (data || []).map((t: any) => ({
                id: t.id,
                name: t.name,
                contact_email: t.contact_email,
                logo_url: t.logo_url || t.logo_img
            }))
        };
    } catch (error) {
        console.error("Unexpected error in searchTeamsForClaim:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

/**
 * Search global teams by contact email.
 */
export async function getTeamsByEmail(email: string): Promise<ActionResponse<Array<{ id: string; name: string }>>> {
    return searchTeamsForClaim(email);
}

/**
 * Submit a team management request.
 * Inserts or updates a row in team_management_requests with status='pending'.
 */
export async function submitTeamManagementRequest(
    teamId: string,
    contactPhone: string,
    message?: string
): Promise<ActionResponse> {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return { success: false, error: "Authentication required" };
        }

        const res = await fetch(`${API_BASE_URL}/team-management-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify({
                team_id: teamId,
                contact_phone: contactPhone.trim(),
                message: message?.trim() || null,
            }),
        });

        if (res.ok) {
            revalidatePath("/dashboard/teams");
            return { success: true };
        }

        const errData = await res.json().catch(() => ({}));

        // Fallback to Direct Supabase if Go API failed
        const adminSupabase = createAdminClient();

        // Check if a pending request already exists for this user + team
        const { data: existing } = await adminSupabase
            .from("team_management_requests")
            .select("id, status")
            .eq("team_id", teamId)
            .eq("requester_id", session.user.id)
            .maybeSingle();

        if (existing) {
            if (existing.status === 'pending') {
                return { success: false, error: "คุณมีคำขอที่รอดำเนินการอยู่แล้วสำหรับทีมนี้" };
            }
            // Update existing non-pending request back to pending
            const { error: updateError } = await adminSupabase
                .from("team_management_requests")
                .update({
                    contact_phone: contactPhone.trim(),
                    message: message?.trim() || null,
                    status: 'pending',
                    updated_at: new Date().toISOString()
                })
                .eq("id", existing.id);

            if (updateError) {
                return { success: false, error: updateError.message };
            }
            revalidatePath("/dashboard/teams");
            return { success: true };
        }

        const { error } = await adminSupabase
            .from("team_management_requests")
            .insert({
                team_id: teamId,
                requester_id: session.user.id,
                contact_phone: contactPhone.trim(),
                message: message?.trim() || null,
                status: 'pending',
            });

        if (error) {
            console.error("Error submitting team management request via fallback:", error);
            return { success: false, error: errData.error || error.message };
        }

        revalidatePath("/dashboard/teams");
        return { success: true };
    } catch (error) {
        console.error("Unexpected error in submitTeamManagementRequest:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}


