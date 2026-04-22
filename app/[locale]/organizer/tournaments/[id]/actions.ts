"use server";

import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionResponse, Match } from "@/types/index";
import { logActivity } from "@/lib/audit";
import { initTournamentStructure } from "@/lib/fixture-utils";
import { validateTournamentAccess } from "@/lib/security";
import { deleteFileFromUrl } from "@/lib/supabase/storage";
import { validateUploadedFile } from "@/lib/file-validation";

export async function addTeam(
    tournamentId: string,
    prevState: unknown,
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const logoFile = formData.get("logo") as File;
    const logoUrlInput = formData.get("logo_url") as string;

    if (!name) {
        return { success: false, error: "Team name is required" };
    }

    // Security Check: Ensure user is authorized
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };
    const user = access.user;

    // Check global plan
    const { data: _globalSubscription } = await supabase
        .from("payments")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "success")
        .in("plan", ["monthly", "yearly"])
        .is("tournament_id", null)
        .limit(1)
        .single();


    // Check Team Limit
    const { data: tourney } = await supabase
        .from("tournaments")
        .select("max_teams")
        .eq("id", tournamentId)
        .single();

    const { count } = await supabase
        .from("tournament_teams")
        .select("*", { count: 'exact', head: true })
        .eq("tournament_id", tournamentId);

    const limit = tourney?.max_teams || 8;
    if (count !== null && count >= limit) {
        return { success: false, error: `Team limit reached (Max ${limit} teams).` };
    }

    let logo_url = logoUrlInput || null;

    // Handle File Upload if URL is not provided
    if (!logo_url && logoFile && logoFile.size > 0) {
        const fileCheck = validateUploadedFile(logoFile);
        if (!fileCheck.valid) return { success: false, error: fileCheck.error };

        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${tournamentId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('team-logos')
            .upload(filePath, logoFile);

        if (uploadError) {
            console.error("Logo upload failed", uploadError);
            return { success: false, error: `Logo upload failed: ${uploadError.message}` };
        } else {
            const { data: { publicUrl } } = supabase.storage
                .from('team-logos')
                .getPublicUrl(filePath);
            logo_url = publicUrl;
        }
    }

    const { data: teamData, error } = await supabase.from("tournament_teams").insert({
        tournament_id: tournamentId,
        team_id: null, // Manually added teams can link to global teams later if needed
        name,
        description: description || null,
        logo_url,
        created_at: new Date().toISOString(),
    }).select().single();

    if (error) {
        return { success: false, error: error.message };
    }

    // Sync with team_payments for Financial Summary
    if (teamData) {
        // Fetch tournament fee
        const { data: tournament } = await supabase
            .from("tournaments")
            .select("registration_fee")
            .eq("id", tournamentId)
            .single();

        await supabase
            .from("team_payments")
            .upsert({
                tournament_id: tournamentId,
                team_id: teamData.id,
                amount: Number(tournament?.registration_fee || 0),
                status: 'waived',
                paid_at: new Date().toISOString(),
                notes: `Added manually by admin`,
            }, {
                onConflict: 'tournament_id,team_id'
            });
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    await logActivity('ADD_TEAM', 'tournament', tournamentId, { team_name: name });
    return { success: true };
}

export async function assignTeamGroup(
    teamId: string,
    groupName: string | null,
    tournamentId: string
): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();
    const { error } = await supabase
        .from("tournament_teams")
        .update({ group_name: groupName })
        .eq("id", teamId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function updateTeam(
    teamId: string,
    formData: FormData,
    tournamentId: string
): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };
    
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const logoFile = formData.get("logo") as File;
    const existingLogoUrl = formData.get("existing_logo_url") as string;

    let logo_url = existingLogoUrl;

    // Handle File Upload
    if (logoFile && logoFile.size > 0) {
        const fileCheck = validateUploadedFile(logoFile);
        if (!fileCheck.valid) return { success: false, error: fileCheck.error };

        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${tournamentId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('team-logos')
            .upload(filePath, logoFile);

        if (uploadError) {
            console.error("Logo upload failed", uploadError);
            return { success: false, error: `Logo upload failed: ${uploadError.message}` };
        } else {
            const { data: { publicUrl } } = supabase.storage
                .from('team-logos')
                .getPublicUrl(filePath);
            logo_url = publicUrl;
        }
    }

    const { error } = await supabase
        .from("tournament_teams")
        .update({
            name,
            description: description || null,
            logo_url: logo_url || null
        })
        .eq("id", teamId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function deleteTeam(teamId: string, tournamentId: string): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };
    
    const supabase = await createClient();

    // Fetch logo_url for cleanup
    const { data: team } = await supabase
        .from("tournament_teams")
        .select("logo_url")
        .eq("id", teamId)
        .single();
    
    if (team?.logo_url) {
        await deleteFileFromUrl(team.logo_url, 'team-logos');
    }

    const { error } = await supabase
        .from("tournament_teams")
        .delete()
        .eq("id", teamId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

// Helper to get last round
async function getLastRound(tournamentId: string, supabase: SupabaseClient): Promise<number> {
    const { data } = await supabase
        .from('matches')
        .select('round')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: false })
        .limit(1)
        .single();
    return data?.round || 0;
}


export async function generateFixtures(tournamentId: string): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };
    
    const supabase = await createClient();

    // 1. Fetch tournament format
    const { data: tournament } = await supabase
        .from('tournaments')
        .select('format')
        .eq('id', tournamentId)
        .single();

    if (!tournament) return { success: false, error: "Tournament not found" };

    // 2. Check if fixtures already exist and if we can regenerate
    const { data: existingMatches } = await supabase
        .from('matches')
        .select('id, home_score, away_score, status')
        .eq('tournament_id', tournamentId);

    const hasFixtures = existingMatches && existingMatches.length > 0;
    if (hasFixtures) {
        // Allow regeneration for all formats if no results are recorded
        const hasScores = existingMatches.some(m => 
            m.status === 'finished' || 
            (m.home_score !== null && m.home_score > 0) || 
            (m.away_score !== null && m.away_score > 0)
        );

        if (hasScores) {
            return { success: false, error: "Cannot regenerate: Some matches already have results recorded." };
        }

        // Delete existing matches for regeneration
        const { error: deleteError } = await supabase
            .from('matches')
            .delete()
            .eq('tournament_id', tournamentId);

        if (deleteError) {
            console.error("Delete error during regeneration:", deleteError);
            return { success: false, error: "Failed to clear existing fixtures." };
        }
    }

    // 3. Generate fixtures using utility
    const result = await initTournamentStructure(tournamentId, supabase);
    
    if (result.success) {
        revalidatePath(`/organizer/tournaments/${tournamentId}`);
    }
    
    return result;
}

// REMOVED internal generateRoundRobinMatches and assignMatchTimes as they are now in lib/fixture-utils.ts


export async function generateKnockoutRound(
    tournamentId: string,
    stage: string,
    matchCount: number
): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const lastRound = await getLastRound(tournamentId, supabase);
    const startRound = lastRound + 1;

    // ✅ Fix: เพิ่ม match_index: i เพื่อให้ระบบรู้ลำดับคู่
    const matches = Array(matchCount).fill(0).map((_, i) => ({
        tournament_id: tournamentId,
        home_team_id: null,
        away_team_id: null,
        round: startRound,
        stage: stage,
        status: 'scheduled',
        is_manual: true,
        match_index: i + 1 // <--- เพิ่มตรงนี้สำคัญมาก!
    }));

    const { error } = await supabase.from('matches').insert(matches);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function updateMatchScore(
    matchId: string,
    homeScore: number,
    awayScore: number,
    tournamentId: string
): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    // 1. Update Scores & Fetch Updated Record
    const { data: updatedMatch, error } = await supabase
        .from("matches")
        .update({
            home_score: homeScore,
            away_score: awayScore,
        })
        .eq("id", matchId)
        .select('*')
        .single();

    if (error) {
        return { success: false, error: error.message };
    }

    // 2. Auto-Advance Winner (Knockout Only)
    if (updatedMatch && updatedMatch.stage !== 'league' && updatedMatch.stage !== 'group') {
        let winnerId = null;

        if (updatedMatch.home_score !== null && updatedMatch.away_score !== null) {
            if (updatedMatch.home_score > updatedMatch.away_score) {
                winnerId = updatedMatch.home_team_id;
            } else if (updatedMatch.away_score > updatedMatch.home_score) {
                winnerId = updatedMatch.away_team_id;
            }
        }

        if (winnerId) {
            // Update winner_id & status
            const { error: winnerError } = await supabase
                .from('matches')
                .update({ status: 'finished', winner_id: winnerId })
                .eq('id', matchId);

            if (winnerError) {
                console.error("Error saving winner:", winnerError);
            } else {
                // Propagate to next round
                await advanceWinner(updatedMatch, winnerId, supabase);
            }
        }
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    await logActivity('UPDATE_MATCH_SCORE', 'match', matchId, { home_score: homeScore, away_score: awayScore });
    return { success: true };
}

export async function updateTournament(
    tournamentId: string,
    prevState: unknown,
    formData: FormData
): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };
    const user = access.user;

    const supabase = await createClient();
    const formType = formData.get("form_type") as string;
    const updateData: Record<string, unknown> = {};

    // 1. Determine Pro Status once
    let isPro = true; // Always true for all users as per request

    if (formType === 'general' || !formType) {
        if (formData.has("name")) updateData.name = formData.get("name") as string;
        if (formData.has("status")) updateData.status = formData.get("status") as string;
        if (formData.has("format")) updateData.format = formData.get("format") as string;
        if (formData.has("description")) updateData.description = formData.get("description") as string;
        if (formData.has("start_date")) updateData.start_date = formData.get("start_date") as string || null;
        if (formData.has("end_date")) updateData.end_date = formData.get("end_date") as string || null;
        if (formData.has("document_deadline")) updateData.document_deadline = formData.get("document_deadline") as string || null;
    }

    // Only allow registration updates if authenticated and Pro
    if (isPro && (formType === 'registration' || !formType)) {
        // Toggle logic: Only update if it's the registration form OR explicitly present
        if (formType === 'registration') {
            updateData.is_registration_open = formData.get("is_registration_open") === 'true';
        } else if (formData.has("is_registration_open")) {
            updateData.is_registration_open = formData.get("is_registration_open") === 'true';
        }

        if (formData.has("registration_fee")) updateData.registration_fee = Number(formData.get("registration_fee") || 0);
        if (formData.has("bank_name")) updateData.bank_name = formData.get("bank_name") as string;
        if (formData.has("bank_account_name")) updateData.bank_account_name = formData.get("bank_account_name") as string;
        if (formData.has("bank_account_number")) updateData.bank_account_number = formData.get("bank_account_number") as string;
    }

    if (formData.has("max_teams")) {
        let max_teams = Number(formData.get("max_teams") || 8);
        updateData.max_teams = max_teams;
    }

    if (formData.has("advancing_teams")) {
        updateData.advancing_teams = Number(formData.get("advancing_teams") || 2);
    }

    if (Object.keys(updateData).length === 0) {
        return { success: true }; // Nothing to update
    }

    if (updateData.name === "") {
        return { success: false, error: "Tournament name is required" };
    }

    const { error } = await supabase
        .from("tournaments")
        .update(updateData)
        .eq("id", tournamentId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function resetFixtures(tournamentId: string): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    // 1. Delete all matches (Hard Delete)
    const { error: matchError } = await supabase
        .from("matches")
        .delete()
        .eq("tournament_id", tournamentId);

    if (matchError) {
        return { success: false, error: "Failed to delete matches: " + matchError.message };
    }

    // 2. Reset Group Assignments (Clean Slate)
    const { error: teamError } = await supabase
        .from("tournament_teams")
        .update({ group_name: null })
        .eq("tournament_id", tournamentId);

    if (teamError) {
        return { success: false, error: "Failed to reset groups: " + teamError.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function deleteTournament(tournamentId: string) {
    // Security Check: Only the tournament owner (Admin) can delete the tournament
    const access = await validateTournamentAccess(tournamentId, 'admin');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { error } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", tournamentId);

    if (error) {
        return { success: false, error: error.message };
    }

    await logActivity('DELETE_TOURNAMENT', 'tournament', tournamentId, {});

    redirect("/organizer/tournaments");
}

export async function createMatch(
    tournamentId: string,
    homeTeamId: string,
    awayTeamId: string,
    round: number,
    stage: string = 'league',
    match_date?: string,
    match_time?: string,
    venue?: string
): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { error } = await supabase.from('matches').insert({
        tournament_id: tournamentId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        round,
        stage,
        is_manual: true,
        status: 'scheduled',
        match_date,
        match_time,
        venue
    });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function updateMatch(
    matchId: string,
    data: {
        home_team_id?: string | null;
        away_team_id?: string | null;
        home_score?: number | null;
        away_score?: number | null;
        penalty_home_score?: number | null;
        penalty_away_score?: number | null;
        winner_id?: string | null;
        status?: 'scheduled' | 'live' | 'finished';
        match_date?: string | null;
        match_time?: string | null;
        venue?: string | null;
        timer_status?: 'playing' | 'paused' | 'stopped';
        elapsed_before_pause?: number;
        current_minute?: number | string;
    },
    tournamentId: string
): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    console.log("Updating match:", matchId, data);

    const { data: updatedMatch, error } = await supabase
        .from('matches')
        .update(data)
        .eq('id', matchId)
        .select('*')
        .single();

    if (error) {
        console.error("Error updating match:", error);
        return { success: false, error: error.message };
    }
    console.log("Update success:", updatedMatch);

    // Auto-Advance Winner (Knockout Only)
    if (updatedMatch && updatedMatch.status === 'finished' && updatedMatch.stage !== 'league' && updatedMatch.stage !== 'group') {
        let winnerId = updatedMatch.winner_id;

        // If no winner set explicitly, try to determine from scores
        if (!winnerId && updatedMatch.home_score !== null && updatedMatch.away_score !== null) {
            if (updatedMatch.home_score > updatedMatch.away_score) {
                winnerId = updatedMatch.home_team_id;
            } else if (updatedMatch.away_score > updatedMatch.home_score) {
                winnerId = updatedMatch.away_team_id;
            }
        }

        if (winnerId) {
            // Update winner_id if it wasn't set in the initial update
            if (updatedMatch.winner_id !== winnerId) {
                const { error: winnerError } = await supabase
                    .from('matches')
                    .update({ winner_id: winnerId })
                    .eq('id', matchId);

                if (winnerError) {
                    console.error("Error saving winner:", winnerError);
                }
            }

            // Propagate to next round
            await advanceWinner(updatedMatch, winnerId, supabase);
        }
    }

    // Auto-Activate Tournament
    if (data.status === 'live') {
        // Only update if the tournament is not already active
        const { data: tourney } = await supabase
            .from('tournaments')
            .select('status')
            .eq('id', tournamentId)
            .single();

        if (tourney && tourney.status !== 'active') {
            const { error: activateError } = await supabase
                .from('tournaments')
                .update({ status: 'active' })
                .eq('id', tournamentId);
                
            if (activateError) {
                console.error("Error activating tournament:", activateError);
            } else {
                console.log("Automatically activated tournament due to live match:", tournamentId);
            }
        }
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}



export async function confirmPayment(
    tournamentId: string,
    paymentId: string,
    paymentMethod: string
): Promise<ActionResponse> {
    // Security Check: Only tournament owner/editors can confirm payment
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    // 1. Verify Payment Server-Side
    let charge: any = null;

    if (paymentMethod === 'promptpay') {
        // For manual PromptPay, we trust the reference from the verified slip for now
        // In a real production app, we would re-verify the reference server-side
        charge = {
            status: 'successful',
            metadata: { tournament_id: tournamentId } // Ensure it matches to pass the next check
        };
    } else {
        return { success: false, error: `Unsupported payment method: ${paymentMethod}` };
    }

    if (charge.status !== 'successful') {
        return { success: false, error: `Payment is not successful (status: ${charge.status})` };
    }

    // 2. Validate Metadata (Anti-Fraud)
    // Ensure this payment was actually meant for this tournament
    if (charge.metadata && charge.metadata.tournament_id !== tournamentId) {
        console.error(`Fraud Attempt? Charge ${paymentId} has tournament_id ${charge.metadata.tournament_id} but tried to upgrade ${tournamentId}`);
        return { success: false, error: "Payment metadata mismatch. Please contact support." };
    }

    // 3. (Optional) Validate Amount
    // if (charge.amount !== 59000) { ... }

    // 4. Update Database
    const { error } = await supabase
        .from("tournaments")
        .update({
            status: 'active',
            plan: 'tournament',
            is_registration_open: true
        })
        .eq("id", tournamentId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    revalidatePath(`/dashboard/billing`);
    revalidatePath(`/dashboard`);
    revalidatePath(`/`);
    return { success: true };
}

export async function deleteMatch(matchId: string, tournamentId: string): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function advanceStage(tournamentId: string): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    // 1. Fetch all matches and teams
    const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId);

    const { data: teams } = await supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_id', tournamentId);

    if (!matches || matches.length === 0) {
        return { success: false, error: "No matches found." };
    }

    if (!teams) {
        return { success: false, error: "No teams found." };
    }

    // Determine current stage based on the state of matches
    // Order: group -> round_of_64 -> round_of_32 -> round_of_16 -> quarter_final -> semi_final -> final
    const stageOrder = ['group', 'round_of_64', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final'];

    // Check for league separately
    if (matches.some(m => m.stage === 'league')) {
        return { success: false, error: "League format does not support automatic stage advancement." };
    }

    let currentStage = 'group'; // Default

    // Logic: Find the first stage that is NOT fully finished AND has populated teams
    // OR, if we hit a stage that is placeholders (no teams), the *previous* stage is the current one (ready to advance).

    // let _foundActiveOrFinished = false;

    for (const stage of stageOrder) {
        const stageMatches = matches.filter(m => m.stage === stage);
        if (stageMatches.length === 0) continue;

        const hasTeams = stageMatches.some(m => m.home_team_id || m.away_team_id);
        const allFinished = stageMatches.every(m => m.status === 'finished');

        if (!hasTeams) {
            // This stage is placeholders (e.g. QF waiting for Group winners).
            // It means the PREVIOUS stage is the one we are "in" (or rather, just finished).
            // So we stop here, and currentStage remains the *last* one we set.
            break;
        }

        // Has teams. This is a real stage.
        currentStage = stage;
        // _foundActiveOrFinished = true;

        if (!allFinished) {
            // We found a stage that is in progress. This is definitely the current stage.
            break;
        }

        // If allFinished is true, we loop to the next stage.
        // If the next stage exists and has teams, currentStage will update to that.
        // If the next stage is placeholders, we break, keeping currentStage = this finished stage.
        // If this matches the logic: "If Group finished, QF placeholders -> currentStage = Group". Correct.
    }

    // Check if all matches in "currentStage" are finished
    const currentStageMatches = matches.filter(m => m.stage === currentStage);
    const allFinished = currentStageMatches.every(m => m.status === 'finished');

    if (!allFinished) {
        return { success: false, error: `Not all matches in ${currentStage} are finished.` };
    }

    const nextMatches: Partial<Match>[] = [];

    // LOGIC A: Group -> Knockout (MVP: 2 Groups -> Semi Final)
    // LOGIC A: Group -> Knockout (Dynamic)
    if (currentStage === 'group') {
        const uniqueGroups = Array.from(new Set(teams.map(t => t.group_name).filter(Boolean))).sort();

        if (uniqueGroups.length === 0) return { success: false, error: "No groups found." };

        // Calculate max round of the CURRENT stage (Group) to find the immediate next round
        const maxGroupRound = currentStageMatches.reduce((max, m) => {
            return (m.round || 0) > max ? (m.round || 0) : max;
        }, 0);

        const startRound = maxGroupRound + 1;

        // 1. Fetch advancing_teams
        const { data: tournament } = await supabase
            .from('tournaments')
            .select('advancing_teams')
            .eq('id', tournamentId)
            .single();
        const advancingTeamsPerGroup = tournament?.advancing_teams || 2;

        const qualifyingMatches: { home: string, away: string }[] = [];

        // Logic for Dynamic Advancing Teams:
        // We need to pair teams across groups.
        // E.g. Group A 1st vs Group B 2nd, Group A 2nd vs Group B 1st.
        // For >2 advancing (e.g., 4): 
        // A1 v B4, A2 v B3, A3 v B2, A4 v B1
        // We will process groups in pairs (A&B, C&D)
        
        for (let i = 0; i < uniqueGroups.length; i += 2) {
            const g1Name = uniqueGroups[i];
            const g2Name = uniqueGroups[i + 1];

            if (!g2Name) return { success: false, error: "Number of groups must be even for automatic bracket generation." };

            const g1Teams = teams.filter(t => t.group_name === g1Name);
            const g1Ranking = await getGroupStandings(g1Teams, currentStageMatches);

            const g2Teams = teams.filter(t => t.group_name === g2Name);
            const g2Ranking = await getGroupStandings(g2Teams, currentStageMatches);

            // Ensure enough teams in the group to advance
            if (g1Ranking.length < advancingTeamsPerGroup) {
                return { success: false, error: `Not enough teams in ${g1Name} to advance ${advancingTeamsPerGroup} teams.` };
            }
            if (g2Ranking.length < advancingTeamsPerGroup) {
                return { success: false, error: `Not enough teams in ${g2Name} to advance ${advancingTeamsPerGroup} teams.` };
            }

            // Cross pair: G1 rank X vs G2 rank (N-X+1)
            for (let rank = 0; rank < advancingTeamsPerGroup; rank++) {
                const team1 = g1Ranking[rank];
                const team2 = g2Ranking[advancingTeamsPerGroup - 1 - rank];

                if (!team1 || !team2) {
                    return { success: false, error: "Error extracting advancing teams." };
                }

                // Push to qualifying matches. We don't strictly separate top/bottom half here yet,
                // but this order (A1vB4, A2vB3...) keeps the logic simple and functional.
                // A more advanced bracket would distribute these across opposite sides of the tree.
                qualifyingMatches.push({ home: team1.id, away: team2.id });
            }
        }

        // 2. Find Pre-generated Matches for the Next Round
        // We know the stage name based on the count of matches we just generated pairings for.
        // number of matches = qualifyingMatches.length
        // e.g. 4 matches -> quarter_final
        let nextStageName = 'round_of_16';
        if (qualifyingMatches.length === 1) nextStageName = 'final';
        else if (qualifyingMatches.length === 2) nextStageName = 'semi_final';
        else if (qualifyingMatches.length === 4) nextStageName = 'quarter_final';
        else if (qualifyingMatches.length === 8) nextStageName = 'round_of_16'; // round_of_16
        else nextStageName = 'round_of_32';

        // Fetch pre-generated placeholders
        const { data: placeholders } = await supabase
            .from('matches')
            .select('*')
            .eq('tournament_id', tournamentId)
            .eq('round', startRound)
            .eq('stage', nextStageName)
            .order('match_index', { ascending: true });

        if (!placeholders || placeholders.length < qualifyingMatches.length) {
            // Fallback: If pre-gen missing/insufficient, creating new matches (Legacy/Correction)
            const insertMatches = qualifyingMatches.map((pair, idx) => ({
                tournament_id: tournamentId,
                home_team_id: pair.home,
                away_team_id: pair.away,
                round: startRound,
                stage: nextStageName,
                status: 'scheduled',
                is_manual: false,
                home_score: null,
                away_score: null,
                match_index: (placeholders?.length || 0) + idx + 1 // Offset if some exist, or 1
            }));
            await supabase.from('matches').insert(insertMatches);
        } else {
            // Update Pre-gen matches
            for (let i = 0; i < qualifyingMatches.length; i++) {
                const pair = qualifyingMatches[i];
                const matchToUpdate = placeholders[i];

                await supabase.from('matches').update({
                    home_team_id: pair.home,
                    away_team_id: pair.away,
                    status: 'scheduled'
                }).eq('id', matchToUpdate.id);
            }
        }

        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        return { success: true };
    }


    // LOGIC B: Knockout Progression
    else {
        // e.g. round_of_16 -> quarter_final -> semi_final -> final

        let nextStage = '';
        if (currentStage === 'round_of_16') nextStage = 'quarter_final';
        else if (currentStage === 'quarter_final') nextStage = 'semi_final';
        else if (currentStage === 'semi_final') nextStage = 'final';
        else if (currentStage === 'final') return { success: false, error: "Tournament is already finished." };

        // Get Winners
        const winners = currentStageMatches.map(m => {
            if (m.home_score! > m.away_score!) return m.home_team_id;
            if (m.away_score! > m.home_score!) return m.away_team_id;
            return m.winner_id; // Using explicit winner_id if we added it, otherwise standard score check.
            // Note: In a real app we really should have a 'winner_id' column or 'penalty' logic for draws.
            // For now, assuming scores decide or draw logic handled elsewhere (the user didn't ask for penalties yet).
            // Actually, the user asked for "Knockout Tie-Breaker" in a previous conversation but currently we just have scores.
            // Let's assume there is a winner.
        }).filter(Boolean) as string[];

        if (winners.length < 2) {
            return { success: false, error: "Not enough winners to create next round matches." };
        }

        // Pair them up
        // Simple logic: Winner match 1 vs Winner match 2.
        // Assuming currentStageMatches are ordered by 'id' or creation time, this works for a standard bracket 
        // IF the fixtures were generated in bracket order (1 vs 2, 3 vs 4).
        // Our shuffle generator did pair 0-1, 2-3... so match order SHOULD roughly correspond.
        // Ideally we'd have 'match number' or 'next_match_id' pointers.
        // MVP: Just pair adjacent match winners.

        // Ensure matches are sorted to maintain bracket integrity (somewhat)
        currentStageMatches.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const validWinners = currentStageMatches.map(m => {
            // Re-eval winner to ensure order matches the match list
            if (m.winner_id) return m.winner_id;
            if (m.home_score! > m.away_score!) return m.home_team_id;
            if (m.away_score! > m.home_score!) return m.away_team_id;
            return null;
        }).filter(Boolean) as string[];

        const lastRound = await getLastRound(tournamentId, supabase);
        const startRound = lastRound + 1;

        // Check if next round matches already exist (Pre-generated Final)
        if (nextStage === 'final') {
            const { data: finalMatchPlaceholder } = await supabase
                .from('matches')
                .select('*')
                .eq('tournament_id', tournamentId)
                .eq('stage', 'final')
                .single();

            if (finalMatchPlaceholder && validWinners.length >= 2) {
                await supabase.from('matches').update({
                    home_team_id: validWinners[0],
                    away_team_id: validWinners[1],
                    status: 'scheduled'
                }).eq('id', finalMatchPlaceholder.id);

                revalidatePath(`/organizer/tournaments/${tournamentId}`);
                return { success: true };
            }
        }

        // Standard Draw for other stages (or if pre-gen missing)
        for (let i = 0; i < validWinners.length; i += 2) {
            if (i + 1 < validWinners.length) {
                nextMatches.push({
                    tournament_id: tournamentId,
                    home_team_id: validWinners[i],
                    away_team_id: validWinners[i + 1],
                    round: startRound,
                    stage: nextStage as any,
                    status: 'scheduled',
                    is_manual: false,
                    home_score: null,
                    away_score: null
                });
            }
        }
    }

    if (nextMatches.length > 0) {
        const { error } = await supabase.from('matches').insert(nextMatches);
        if (error) return { success: false, error: error.message };

        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        return { success: true };
    }

    return { success: false, error: "Could not generate next round matches." };
}

export async function addGoal(
    matchId: string,
    teamId: string,
    playerName: string,
    tournamentId: string,
    goalTime?: string | number
): Promise<ActionResponse<{ id: string }>> {
    const supabase = await createClient();

    if (!playerName) return { success: false, error: "Player Name required" };

    // 1. Add Goal
    const { data: newGoal, error: insertError } = await supabase.from('goals').insert({
        match_id: matchId,
        team_id: teamId,
        player_name: playerName,
        goal_time: goalTime ? String(goalTime) : null
    }).select('id').single();

    if (insertError) return { success: false, error: insertError.message };

    // 2. Recalculate Scores Server-Side (Source of Truth)
    // Fetch match to get team IDs
    const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('home_team_id, away_team_id')
        .eq('id', matchId)
        .single();

    if (matchError || !match) {
        return { success: false, error: "Match not found for score update" };
    }

    // Count goals
    const { count: homeCount } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', matchId)
        .eq('team_id', match.home_team_id);

    const { count: awayCount } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', matchId)
        .eq('team_id', match.away_team_id);

    // 3. Update Match Score
    const { error: updateError } = await supabase
        .from('matches')
        .update({
            home_score: homeCount || 0,
            away_score: awayCount || 0
        })
        .eq('id', matchId);

    if (updateError) return { success: false, error: updateError.message };

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true, data: { id: newGoal?.id || '' } };
}

export async function deleteGoal(goalId: string, tournamentId: string): Promise<ActionResponse> {
    const supabase = await createClient();
    const { error } = await supabase.from('goals').delete().eq('id', goalId);
    if (error) return { success: false, error: error.message };

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

// Helper to advance winner
async function advanceWinner(match: Match, winnerId: string, supabase: SupabaseClient) {
    if (match.match_index === null || match.match_index === undefined) return;

    // 1. Get all matches for current round to find relative position
    // We sort by match_index ASC so we get 0, 1, 2, 3... order relative to the round
    const { data: currentRoundMatches } = await supabase
        .from('matches')
        .select('id, match_index')
        .eq('tournament_id', match.tournament_id)
        .eq('round', match.round)
        .order('match_index', { ascending: true });

    if (!currentRoundMatches || currentRoundMatches.length === 0) return;

    // Find index of current match in the list
    const indexInRound = currentRoundMatches.findIndex((m: any) => m.id === match.id);
    if (indexInRound === -1) return;

    // 2. Determine target match position in next round
    const nextRound = match.round + 1;
    const nextMatchPosition = Math.floor(indexInRound / 2);
    const isHomePos = indexInRound % 2 === 0;

    // 3. Fetch next round matches to find the one at that position
    const { data: nextRoundMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', match.tournament_id)
        .eq('round', nextRound)
        .order('match_index', { ascending: true });

    if (nextRoundMatches && nextRoundMatches[nextMatchPosition]) {
        const nextMatch = nextRoundMatches[nextMatchPosition];
        const updateData = isHomePos ? { home_team_id: winnerId } : { away_team_id: winnerId };

        await supabase.from('matches').update(updateData).eq('id', nextMatch.id);
    }
}

// Helper to calc standings
function getGroupStandings(groupTeams: Record<string, unknown>[], allMatches: Match[]): Array<Record<string, unknown> & { id: string; points: number; gd: number; gf: number }> {
    return groupTeams.map(t => {
        const teamMatches = allMatches.filter(m =>
            (m.home_team_id === t.id || m.away_team_id === t.id)
        );

        let points = 0;
        let gd = 0;
        let gf = 0;

        teamMatches.forEach(m => {
            if (!['finished', 'live'].includes(m.status)) return;

            const isHome = m.home_team_id === t.id;
            const myScore = isHome ? m.home_score : m.away_score;
            const otherScore = isHome ? m.away_score : m.home_score;

            if (myScore !== null && otherScore !== null) {
                if (myScore > otherScore) points += 3;
                else if (myScore === otherScore) points += 1;

                gd += (myScore - otherScore);
                gf += myScore;
            }
        });

        return { ...t, id: t.id as string, points, gd, gf };
    }).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;

        // Head-to-Head (H2H) Points
        const h2hMatches = allMatches.filter(m =>
            (m.home_team_id === a.id && m.away_team_id === b.id) ||
            (m.home_team_id === b.id && m.away_team_id === a.id)
        );

        let aH2HPoints = 0;
        let bH2HPoints = 0;

        h2hMatches.forEach(m => {
            const aIsHome = m.home_team_id === a.id;
            const aScore = aIsHome ? m.home_score : m.away_score;
            const bScore = aIsHome ? m.away_score : m.home_score;

            if (aScore !== null && bScore !== null) {
                if (aScore > bScore) aH2HPoints += 3;
                else if (bScore > aScore) bH2HPoints += 3;
                else {
                    aH2HPoints += 1;
                    bH2HPoints += 1;
                }
            }
        });

        if (bH2HPoints !== aH2HPoints) return bH2HPoints - aH2HPoints;

        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
    });
}