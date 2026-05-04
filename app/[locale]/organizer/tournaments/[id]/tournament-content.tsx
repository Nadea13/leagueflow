"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Copy, ExternalLink, Calendar, List, Trophy, GitBranch, Award, ArrowLeft, Settings, Users, Plus, ClipboardEdit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Tab } from "@/components/ui/tab";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamForm } from "@/components/tournaments/teams/team-form";
import { Standings } from "@/components/tournaments/ranking/standings";
import { Teams } from "@/components/tournaments/teams/team-list";
import { StandingsGroups } from "@/components/tournaments/ranking/standings-groups";
import { Bracket } from "@/components/tournaments/ranking/bracket";
import { Match, Goal, MatchEvent, Tournament, Player, TournamentTeam } from "@/types/index";
import { ShareButton } from "@/components/tournaments/shared/share-button";
import { TopScorers } from "@/components/tournaments/ranking/top-scorers";
import { calculateStandings } from "@/lib/standings";
import { TournamentSettings } from "@/components/tournaments/settings/tournament-settings";
import { MatchManager } from "@/components/tournaments/matches/match-manager";

import { ProgressionLogic } from "@/components/tournaments/matches/progression-logic";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { TournamentStats } from "@/components/tournaments/shared/overview-stats";
import { PlayerStats } from "@/components/tournaments/ranking/player-stats";
import { BannedPlayers } from "@/components/tournaments/ranking/banned-players";
import { Announcements } from "@/components/tournaments/management/announcements";
import { Registrations } from "@/components/tournaments/management/registrations";
import { calculatePlayerStats, getBannedPlayers } from "@/lib/player-stats";
import { RegistrationSettings } from "@/components/tournaments/settings/registration-settings";

interface TournamentContentProps {
    tournament: Tournament;
    initialMatches: Match[];
    initialTeams: (TournamentTeam & { team?: { user_id: string | null } })[];
    initialGoals: Goal[];
    userPlan: string | undefined;
    initialIsPro: boolean;
    id: string;
    userRole: 'admin' | 'editor' | 'viewer' | null;
}

export function TournamentContent({
    tournament: initialTournament,
    initialMatches,
    initialTeams,
    initialGoals,
    userPlan,
    initialIsPro: _initialIsPro,
    id,
    userRole
}: TournamentContentProps) {
    const t = useTranslations("Tournament");
    const tCommon = useTranslations("Common");
    const tSettings = useTranslations("Settings");
    const tRegistrations = useTranslations("Registrations");
    const tSports = useTranslations("Sports");
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { toast } = useToast();
    const supabase = createClient();

    // State
    const [tournament, setTournament] = useState(initialTournament);
    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [teams, setTeams] = useState<(TournamentTeam & { team?: { user_id: string | null } })[]>(initialTeams);
    const [goals, setGoals] = useState<Goal[]>(initialGoals);
    const [teamSubTab, setTeamSubTab] = useState<'list' | 'add'>('list');
    const [fixtureSubTab, setFixtureSubTab] = useState<'schedule' | 'standings'>('schedule');
    const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setTimeout(() => setMounted(true), 0);
    }, []);

    const currentTab = searchParams.get('tab') || 'overview';

    const handleTabChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === 'overview') {
            params.delete('tab');
        } else {
            params.set('tab', value);
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // Update state when props change (server revalidation)
    useEffect(() => {
        setTimeout(() => {
            setTournament(initialTournament);
            setMatches(initialMatches);
            setTeams(initialTeams);
            setGoals(initialGoals);
        }, 0);
    }, [initialTournament, initialMatches, initialTeams, initialGoals]);

    // Fetch match events for player stats
    useEffect(() => {
        const fetchEvents = async () => {
            const matchIds = matches.map(m => m.id);
            if (matchIds.length === 0) {
                setMatchEvents([]);
                return;
            }

            const { data } = await supabase
                .from("match_events")
                .select("*, players(name)")
                .in("match_id", matchIds);

            if (data) {
                const events = (data as (MatchEvent & { players: { name: string } | null })[]).map((e) => ({
                    ...e,
                    player_name: e.players?.name || "Unknown",
                }));
                setMatchEvents(events);
            }
        };

        if (matches.length > 0) {
            fetchEvents();
        }
    }, [matches, supabase]);

    // Fetch all players from all teams for stats
    const [allPlayersForStats, setAllPlayersForStats] = useState<{ id: string; name: string; team_id: string; teamName?: string; teamLogoUrl?: string | null }[]>([]);
    useEffect(() => {
        const fetchAllPlayers = async () => {
            const teamIds = teams.map(t => t.id);
            if (teamIds.length === 0) return;

            const { data } = await supabase
                .from("players")
                .select("id, name, team_id")
                .in("team_id", teamIds);

            if (data) {
                const playersWithTeam = (data as Player[]).map((p) => {
                    const team = teams.find(t => t.id === p.team_id);
                    return {
                        ...p,
                        teamName: team?.name,
                        teamLogoUrl: team?.logo_url,
                    };
                });
                setAllPlayersForStats(playersWithTeam as unknown as { id: string; name: string; team_id: string; teamName?: string; teamLogoUrl?: string | null }[]);
            }
        };

        fetchAllPlayers();
    }, [teams, supabase]);

    // Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel(`tournament-${id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'matches',
                filter: `tournament_id=eq.${id}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setMatches(prev => [...prev, payload.new as Match]);
                } else if (payload.eventType === 'UPDATE') {
                    setMatches(prev => prev.map(m => m.id === payload.new.id ? payload.new as Match : m));
                } else if (payload.eventType === 'DELETE') {
                    setMatches(prev => prev.filter(m => m.id !== payload.old.id));
                }
                router.refresh(); // Refresh mainly for server actions/derived states if needed
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tournament_teams',
                filter: `tournament_id=eq.${id}`
            }, () => {
                // Rely on router.refresh() to update the filtered teams list from the server
                router.refresh();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tournaments',
                filter: `id=eq.${id}`
            }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    setTournament(payload.new as Tournament);
                }
                router.refresh();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, router, supabase]);

    // Derived State
    const hasFixtures = matches.length > 0;
    const isPro = true; // Always true as per user request to remove locks

    // Calculate Standings
    const calculatedStandings = calculateStandings(teams, matches);
    const isLeague = tournament?.format === 'league' || tournament?.format === 'league_ha';
    const hasStandings = isLeague ? teams.length > 0 : teams.some(t => t.group_name);

    // Player stats
    const playerStats = calculatePlayerStats(matchEvents, allPlayersForStats, null);
    const bannedPlayers = getBannedPlayers(matchEvents, allPlayersForStats, null);

    const registrationUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/register/${id}`
        : `/register/${id}`;

    const copyRegistrationLink = () => {
        navigator.clipboard.writeText(registrationUrl);
        toast({
            title: tCommon("copied"),
            description: tCommon("copied_desc"),
            className: "rounded-none border-primary font-bold"
        });
    };

    return (
        <div className="flex flex-col gap-2 md:gap-6">
            {/* Unified Header Block */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6 relative group">
                <div className="flex items-start gap-2 md:gap-6 w-full">
                    <Button variant="ghost" size="icon" asChild className="rounded-none h-10 w-10 shrink-0 hover:bg-primary/10 hover:text-primary transition-all">
                        <Link href="/dashboard">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>

                    <div className="flex flex-col flex-1 gap-1 md:gap-2 text-[9px] md:text-[10px] text-muted-foreground/40 min-w-0">
                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-2 font-black tracking-[0.2em] flex-wrap">
                            {/* Metadata Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="default" className="rounded-none font-black text-[9px] bg-primary text-black px-2 shadow-[0_0_10px_rgba(0,196,154,0.3)]">
                                    {tSports(tournament?.sport || 'football')}
                                </Badge>

                                <Badge variant="outline" className="rounded-none font-black text-[9px] border-none text-muted-foreground">
                                    {tournament?.format?.replace('_', ' ')}
                                </Badge>

                                <span className="text-[10px] font-black tracking-widest text-primary">
                                    {teams.length} {tCommon("teams")}
                                </span>

                                <Badge className={cn(
                                    "font-black border-none px-3 py-1 shadow-lg h-4 md:h-5",
                                    tournament?.status === 'active' && "bg-green-600 hover:bg-green-700 shadow-green-900/20",
                                    tournament?.status === 'completed' && "bg-gray-500 hover:bg-gray-600 shadow-gray-900/20",
                                    (!tournament?.status || tournament?.status === 'draft') && "bg-yellow-500 hover:bg-yellow-600 text-black shadow-yellow-900/10"
                                )}>
                                    {tSettings(tournament?.status || 'draft')}
                                </Badge>
                            </div>
                        </div>

                        {/* Title Section */}
                        <div className="flex flex-wrap items-center gap-3 md:gap-4">
                            <h1 className="text-2xl md:text-5xl font-black tracking-tighter leading-[0.9] text-foreground">
                                {tournament?.name}
                            </h1>
                        </div>
                    </div>

                    <div className="md:hidden shrink-0">
                        <ShareButton tournamentId={id} />
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-3 self-end md:self-start pt-2 md:pt-0">
                    <ShareButton tournamentId={id} />
                </div>
            </div>

            {/* Stats Overview */}
            <div className="hidden md:block">
                <TournamentStats teams={teams} matches={matches} goals={goals} />
            </div>

            {/* Tabs Navigation */}
            <Tab
                value={currentTab}
                onChange={handleTabChange}
                className="w-full md:w-max"
                itemClassName="flex-1 md:flex-none"
                options={[
                    { value: 'overview', label: t("overview"), icon: Trophy },
                    { value: 'teams', label: t("teams"), icon: Users, badge: teams?.length || 0 },
                    { value: 'fixtures', label: t("fixtures"), icon: Calendar },
                    ...(userRole === 'admin' ? [
                        { value: 'settings', label: t("settings"), icon: Settings }
                    ] : [])
                ]}
            />

            {currentTab === 'overview' && (
                <div className="space-y-4 md:space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 md:gap-6 items-start">
                        {/* Right Column: Sidebar (Actions & Announcements) - First in DOM for mobile top priority */}
                        <div className="lg:col-span-1 space-y-2 md:space-y-6 lg:order-2">
                            {tournament?.status !== 'draft' && (
                                <>
                                    <Card className="bg-card border p-4 md:p-6 space-y-2 md:space-y-3">
                                        {/* Action Bar Header */}
                                        <div>
                                            <h2 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                                <Settings className="h-5 w-5 text-primary" />
                                                {t("actions")}
                                            </h2>
                                        </div>

                                        <div className="space-y-2 md:space-y-3">
                                            <div className="space-y-2 md:space-y-3">
                                                <div className="p-2 md:p-3 bg-muted/10 border border-border/40 text-[11px] break-all font-mono text-muted-foreground/70 relative transition-all group-hover:bg-muted/20 group-hover:border-primary/20 line-clamp-2">
                                                    {mounted ? registrationUrl : tCommon("loading") || "..."}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 md:gap-3">
                                                <Button
                                                    variant="default"
                                                    size="default"
                                                    onClick={copyRegistrationLink}
                                                >
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    {tCommon("copy_link")}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="default"
                                                    onClick={() => window.open(registrationUrl, '_blank')}
                                                >
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    {tCommon("open_link")}
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </>
                            )}

                            {/* Announcements Section */}
                            <div className="space-y-4 md:space-y-6">
                                <Announcements
                                    tournamentId={id}
                                    isEditable={userRole === 'admin' || userRole === 'editor'}
                                />
                            </div>
                        </div>

                        {/* Left Column: Main Tournament Data (Spans 2) - Second in DOM, lg:order-1 for desktop left alignment */}
                        <div className="lg:col-span-2 space-y-2 md:space-y-6 lg:order-1">

                            {/* 1. Match Schedule */}
                            <div className="bg-card border p-4 md:p-6 space-y-2 md:space-y-3">
                                <div className="flex flex-col gap-1">
                                    <h2 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                        <Calendar className="h-5 w-5 text-primary" />
                                        {t("match_schedule")}
                                    </h2>
                                </div>
                                <div className="relative overflow-hidden transition-colors">
                                    <MatchManager
                                        teams={teams}
                                        matches={matches}
                                        tournamentId={id}
                                        format={tournament?.format}
                                        isPro={isPro}
                                        hideControls={true}
                                        startDate={tournament?.start_date}
                                        endDate={tournament?.end_date}
                                    />
                                </div>
                            </div>

                            {/* 3. Knockout Bracket (For 'knockout' OR 'group_knockout') */}
                            {(tournament?.format === 'knockout' || tournament?.format === 'group_knockout') && (
                                <div className="bg-card border p-4 md:p-6 space-y-4 md:space-y-6">
                                    <div className="flex flex-col">
                                        <h2 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                            <GitBranch className="h-5 w-5 text-primary" />
                                            {t("bracket")}
                                        </h2>
                                    </div>
                                    <div className="relative z-10">
                                        <Bracket matches={matches} />
                                    </div>
                                </div>
                            )}

                            {/* 4. Top Scorers */}
                            {goals.length > 0 && (
                                <div className="space-y-4 md:space-y-6">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                                <Award className="h-5 w-5 text-primary" />
                                                {t("top_scorers")}
                                            </h2>
                                            {/* Pro locks removed */}
                                        </div>
                                        <p className="text-[10px] font-bold text-muted-foreground/60">{t("top_scorers_desc") || "Golden boot race"}</p>
                                    </div>

                                    <Card className="bg-background border rounded-none relative overflow-hidden group hover:bg-muted/2 transition-colors shadow-xl shadow-black/20">
                                        <CardContent className="p-0 z-0">
                                            <TopScorers goals={goals} teams={teams} />
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* 5. Player Stats */}
                            {playerStats.length > 0 && (
                                <div className="space-y-4 md:space-y-6">
                                    <div className="flex flex-col gap-1">
                                        <h2 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                            <Users className="h-5 w-5 text-primary" />
                                            {t("player_stats")}
                                        </h2>
                                        <p className="text-[10px] font-bold text-muted-foreground/60">Comprehensive performance tracking</p>
                                    </div>
                                    <Card className="bg-background border rounded-none relative overflow-hidden group hover:bg-muted/2 transition-colors p-0 shadow-xl shadow-black/20">
                                        <CardContent className="p-0 z-0">
                                            <div className="overflow-x-auto">
                                                <PlayerStats stats={playerStats} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* 6. Banned Players Alert */}
                            <BannedPlayers bannedPlayers={bannedPlayers} />
                        </div>
                    </div>
                </div>
            )}

            {/* Teams Tab */}
            {currentTab === 'teams' && (
                <div className="space-y-2 md:space-y-3 outline-none">
                    {/* Mobile Sub-Tabs */}
                    <div className="md:hidden">
                        <Tab
                            value={teamSubTab}
                            onChange={(val) => setTeamSubTab(val as 'list' | 'add')}
                            className="w-full"
                            fullWidth={true}
                            options={[
                                { value: 'list', label: t("participating_teams"), icon: Users },
                                { value: 'add', label: t("add_team"), icon: Plus }
                            ]}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 md:gap-3 items-start">
                        {/* Main Content: Registrations & Teams List */}
                        <div className={cn(
                            "lg:col-span-2",
                            teamSubTab !== 'list' && "hidden md:block"
                        )}>
                            {/* Registrations Section (Admin Only) */}
                            {userRole === 'admin' && (
                                <div className={cn(teamSubTab !== 'list' && "hidden md:block")}>
                                    {tournament.is_registration_open && (
                                        <Registrations tournamentId={id} />
                                    )}
                                </div>
                            )}

                            {/* Participating Teams */}
                            <div className={cn(
                                "bg-card border p-4 md:p-6 space-y-4 md:space-y-6",
                                teamSubTab !== 'list' && "hidden md:block"
                            )}>
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                        <Users className="h-5 w-5 text-primary" />
                                        <span>{t("participating_teams")}</span>
                                        <span className="text-muted-foreground/40">[{teams?.length || 0}]</span>
                                    </h3>
                                </div>
                                <div className="relative overflow-hidden transition-colors">
                                    <Teams
                                        teams={teams}
                                        tournamentId={id}
                                        isPro={isPro}
                                        showGroupSelector={tournament?.format?.includes("group")}
                                        organizerId={tournament?.user_id}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={cn(
                            "lg:col-span-1 space-y-4 md:space-y-6",
                            teamSubTab !== 'add' && "hidden md:block"
                        )}>
                            {/* Tournament Actions - Matching Overview Tab Style */}
                            {tournament?.status !== 'draft' && (
                                <div className="bg-card border rounded-none relative overflow-hidden transition-colors p-4 md:p-6 space-y-2 md:space-y-3">
                                    <div className="flex flex-col gap-1">
                                        <h3 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                            <Settings className="h-5 w-5 text-primary" />
                                            {t("actions")}
                                        </h3>
                                    </div>

                                    <div className="space-y-2 md:space-y-3">
                                        <div className="space-y-2 md:space-y-3">
                                            <div className="p-2 md:p-3 bg-muted/10 border border-border/40 text-[11px] break-all font-mono text-muted-foreground/70 relative transition-all group-hover:bg-muted/20 group-hover:border-primary/20 line-clamp-2">
                                                {mounted ? registrationUrl : tCommon("loading") || "..."}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                                            <Button
                                                variant="default"
                                                size="default"
                                                onClick={copyRegistrationLink}
                                            >
                                                <Copy className="h-4 w-4" />
                                                {tCommon("copy_link")}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="default"
                                                onClick={() => window.open(registrationUrl, '_blank')}
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                {tCommon("open_link")}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Registration Settings (Administrative) */}
                            {userRole === 'admin' && (
                                <RegistrationSettings
                                    tournament={tournament}
                                    onUpgrade={() => router.push(`${pathname}?tab=settings&action=upgrade`)}
                                />
                            )}

                            {/* Add Team Section */}
                            <div className="bg-card border relative overflow-hidden transition-colors p-4 md:p-6 space-y-2 md:space-y-3">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                        <Plus className="h-5 w-5 text-primary" />
                                        {t("add_team")}
                                    </h3>
                                </div>

                                <TeamForm
                                    tournamentId={id}
                                    isLimitReached={false}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fixtures Tab */}
            {currentTab === 'fixtures' && (
                <div className="space-y-2 md:space-y-3 outline-none">
                    {/* Mobile Sub-Tabs */}
                    <div className="md:hidden">
                        <Tab
                            value={fixtureSubTab}
                            onChange={(val) => setFixtureSubTab(val as 'schedule' | 'standings')}
                            options={[
                                { value: 'schedule', label: t("match_schedule"), icon: Calendar },
                                { value: 'standings', label: t("standings"), icon: Trophy }
                            ]}
                            className="h-10 border w-full"
                            itemClassName="flex-1 px-4"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 items-start">
                        {/* Main Schedule Column */}
                        <div className={cn(
                            "lg:col-span-2 space-y-2 md:space-y-3",
                            fixtureSubTab !== 'schedule' && "hidden md:block"
                        )}>
                            <div className="bg-card border relative overflow-hidden transition-colors p-4 md:p-6 space-y-2 md:space-y-3">
                                {/* Unwrapped Header */}
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 md:gap-3">
                                    <div className="flex flex-col">
                                        <h3 className="text-xl font-black tracking-tighter text-foreground flex justify-start items-center gap-2 md:gap-3">
                                            <Calendar className="h-5 w-5 text-primary" />
                                            {t("match_schedule")}
                                        </h3>
                                    </div>
                                </div>

                                {/* Fixtures View */}
                                <div className="min-h-[400px] relative overflow-hidden transition-colors">
                                    <MatchManager
                                        teams={teams}
                                        matches={matches}
                                        tournamentId={id}
                                        format={tournament?.format}
                                        isPro={isPro}
                                        startDate={tournament?.start_date}
                                        endDate={tournament?.end_date}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Management Column */}
                        {(hasStandings || (!isLeague && matches.length > 0)) && (
                            <div className={cn(
                                "lg:col-span-1 space-y-4 md:space-y-6",
                                fixtureSubTab !== 'standings' && "hidden md:block"
                            )}>
                                {/* Generation Controls Block */}
                                <div className="bg-card border relative overflow-hidden transition-colors p-4 md:p-6 space-y-2 md:space-y-3">
                                    {hasStandings && (
                                        <>
                                            <div className="flex flex-col gap-1">
                                                <h3 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                                    <Trophy className="h-5 w-5 text-primary" />
                                                    {t("standings")}
                                                </h3>
                                            </div>

                                            <div className="space-y-2 md:space-y-3">
                                                {isLeague ? (
                                                    <div className="bg-background border rounded-none relative overflow-hidden transition-colors shadow-xl shadow-black/20">
                                                        <Standings standings={calculatedStandings} />
                                                    </div>
                                                ) : (
                                                    <div className="relative z-10">
                                                        <StandingsGroups teams={teams} matches={matches} columns={1} />
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {(!isLeague && matches.length > 0) && (
                                        <div className={cn(hasStandings && "pt-4 border-t border-border/40")}>
                                            <ProgressionLogic
                                                tournamentId={id}
                                                matches={matches}
                                                format={tournament?.format || 'league'}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {(userRole === 'admin' && currentTab === 'settings') && (
                <div className="outline-none focus-visible:ring-0">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                        {/* Main Settings Column */}
                        <div className="lg:col-span-2">
                            <TournamentSettings tournament={tournament} hasFixtures={hasFixtures} userPlan={userPlan} teams={teams} />
                        </div>

                        {/* Sidebar Info Column */}
                        <div className="lg:col-span-1 space-y-4 md:space-y-6 hidden lg:block">
                            <div className="space-y-4 md:space-y-6">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                        <ClipboardEdit className="h-5 w-5 text-primary" />
                                        Configuration Overview
                                    </h3>
                                </div>

                                <Card className="bg-card border rounded-none relative overflow-hidden p-2 md:p-3">
                                    <div className="space-y-4 md:space-y-6">
                                        <div className="flex justify-between items-center border-b border-foreground/5 pb-2 md:pb-3">
                                            <span className="text-[10px] font-black tracking-widest text-muted-foreground/60">Status</span>
                                            <Badge className="rounded-none bg-foreground/5 text-foreground border-foreground/10 text-[9px] font-black px-3 py-1">
                                                {tournament?.status?.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-foreground/5 pb-2 md:pb-3">
                                            <span className="text-[10px] font-black tracking-widest text-muted-foreground/60">Plan</span>
                                            <span className="text-[10px] font-black tracking-widest text-primary">
                                                {isPro ? 'PRO ACCESS' : 'FREE PLAN'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-foreground/5 pb-2 md:pb-3">
                                            <span className="text-[10px] font-black tracking-widest text-muted-foreground/60">Team Slots</span>
                                            <span className="text-[11px] font-black tracking-widest text-foreground">
                                                {teams.length} / {tournament?.max_teams || 8}
                                            </span>
                                        </div>
                                        <div className="pt-2 md:pt-3">
                                            <p className="text-[9px] font-black tracking-widest text-muted-foreground/40 mb-1">Last Updated</p>
                                            <p className="text-[11px] font-black text-foreground">
                                                {mounted ? new Date(tournament?.updated_at || tournament?.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '...'}
                                            </p>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="bg-card border rounded-none relative overflow-hidden p-2 md:p-3">
                                    <div className="space-y-2 md:space-y-3">
                                        <h5 className="text-[10px] font-black tracking-widest text-primary">Quick Help</h5>
                                        <p className="text-[11px] text-muted-foreground/80 leading-relaxed font-medium">
                                            Adjust your tournament rules, schedule parameters, and registration details from the main settings panel.
                                        </p>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
