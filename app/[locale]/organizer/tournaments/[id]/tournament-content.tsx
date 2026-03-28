"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ChevronLeft, Copy, ExternalLink, Calendar, List, Trophy, GitBranch, Award, BarChart3, BookOpen, AlertTriangle, ArrowLeft, ChevronRight, Search, Settings, Users, Bell, Lock, Unlock, FileText, View, Camera, MoreVertical, Edit2, ArrowRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddTeamForm } from "@/components/tournaments/add-team-form";
import { FixtureGenerator } from "@/components/tournaments/fixture-generator";
import { StandingsTable } from "@/components/tournaments/standings-table";
import { TeamList } from "@/components/tournaments/team-list";
import { GroupStandings } from "@/components/tournaments/group-standings";
import { TournamentBracket } from "@/components/tournaments/tournament-bracket";
import { Match, Team, Goal, MatchEvent } from "@/types/index";
import { ShareButton } from "@/components/tournaments/share-button";
import { TopScorersTable } from "@/components/tournaments/top-scorers-table";
import { calculateStandings } from "@/utils/standings";
import { SettingsTab } from "@/components/tournaments/settings-tab";
import { FixturesManager } from "@/components/tournaments/fixtures-manager";
import { FixturesCalendar } from "@/components/tournaments/fixtures-calendar";
import { NextRoundButton } from "@/components/tournaments/next-round-button";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { TournamentStats } from "@/components/tournaments/tournament-stats";
import { PlayerStatsTable } from "@/components/tournaments/player-stats-table";
import { BannedPlayersCard } from "@/components/tournaments/banned-players-card";
import { AnnouncementsCard } from "@/components/tournaments/announcements-card";
import { RegistrationsTable } from "@/components/tournaments/registrations-table";
import { calculatePlayerStats, getBannedPlayers } from "@/utils/player-stats";

interface TournamentContentProps {
    tournament: any;
    initialMatches: Match[];
    initialTeams: Team[];
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
    initialIsPro,
    id,
    userRole
}: TournamentContentProps) {
    const t = useTranslations("Tournament");
    const tCommon = useTranslations("Common");
    const tSettings = useTranslations("Settings");
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { toast } = useToast();
    const supabase = createClient();

    // State
    const [tournament, setTournament] = useState(initialTournament);
    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [teams, setTeams] = useState<Team[]>(initialTeams);
    const [goals, setGoals] = useState<Goal[]>(initialGoals);
    const [fixtureView, setFixtureView] = useState<'list' | 'calendar'>('list');
    const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);

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
        setTournament(initialTournament);
        setMatches(initialMatches);
        setTeams(initialTeams);
        setGoals(initialGoals);
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
                const events = data.map((e: any) => ({
                    ...e,
                    player_name: e.players?.name || "Unknown",
                }));
                setMatchEvents(events);
            }
        };

        if (matches.length > 0) {
            fetchEvents();
        }
    }, [matches]);

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
                const playersWithTeam = data.map((p: any) => {
                    const team = teams.find(t => t.id === p.team_id);
                    return {
                        ...p,
                        teamName: team?.name,
                        teamLogoUrl: team?.logo_url,
                    };
                });
                setAllPlayersForStats(playersWithTeam);
            }
        };

        fetchAllPlayers();
    }, [teams]);

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
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setTeams(prev => [...prev, payload.new as Team]);
                } else if (payload.eventType === 'UPDATE') {
                    setTeams(prev => prev.map(t => t.id === payload.new.id ? payload.new as Team : t));
                } else if (payload.eventType === 'DELETE') {
                    setTeams(prev => prev.filter(t => t.id !== payload.old.id));
                }
                router.refresh();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tournaments',
                filter: `id=eq.${id}`
            }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    setTournament(payload.new);
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
    const isPro = initialIsPro || (tournament?.plan && tournament.plan !== 'free');

    // Calculate Standings
    const calculatedStandings = calculateStandings(teams, matches);

    // Player stats
    const playerStats = calculatePlayerStats(matchEvents, allPlayersForStats, null);
    const bannedPlayers = getBannedPlayers(matchEvents, allPlayersForStats, null);

    return (
        <div className="flex flex-col gap-6">
            {/* Top Navigation & Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-none h-10 w-10 shrink-0 border border-border/50 hover:bg-secondary hover:text-black transition-all">
                        <Link href="/dashboard">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                        <span>{tCommon("tournaments")}</span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-foreground">{tournament?.name}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <ShareButton tournamentId={id} />
                </div>
            </div>

            {/* Main Title Area */}
            <div className="pb-6 border-b-4 border-secondary/20 relative flex flex-wrap items-baseline justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <div className="flex items-baseline gap-3">
                        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-foreground flex items-baseline gap-3">
                            {tournament?.name}
                            {isPro && (
                                <Badge variant="default" className="text-[10px] h-4 px-1.5 uppercase font-black tracking-widest bg-primary text-primary-foreground border-none">
                                    PRO
                                </Badge>
                            )}
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-secondary">
                                {teams.length} {tCommon("teams") || "Teams"}
                            </span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-none uppercase font-black italic text-[10px] border-secondary/30">{tournament?.format}</Badge>
                        <Badge className={cn(
                            "rounded-none uppercase font-black italic text-[10px] border-none",
                            tournament?.status === 'active' && "bg-green-600 hover:bg-green-700",
                            tournament?.status === 'completed' && "bg-gray-500 hover:bg-gray-600",
                            (!tournament?.status || tournament?.status === 'draft') && "bg-yellow-500 hover:bg-yellow-600 text-black"
                        )}>
                            {tSettings(tournament?.status || 'draft')}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <TournamentStats teams={teams} matches={matches} goals={goals} />

            {/* Tabs */}
            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="flex p-1 bg-muted/20 rounded-none gap-1 border border-border h-auto w-full md:w-max">
                    <TabsTrigger
                        value="overview"
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 text-[10px] font-black uppercase italic transition-all rounded-none border-none data-[state=active]:!bg-secondary data-[state=active]:!text-secondary-foreground data-[state=active]:shadow-[0_0_15px_rgba(0,196,154,0.3)] text-muted-foreground hover:text-secondary hover:bg-white/5"
                    >
                        <Trophy className="h-3.5 w-3.5" />
                        {t("overview")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="teams"
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 text-[10px] font-black uppercase italic transition-all rounded-none border-none data-[state=active]:!bg-secondary data-[state=active]:!text-secondary-foreground data-[state=active]:shadow-[0_0_15px_rgba(0,196,154,0.3)] text-muted-foreground hover:text-secondary hover:bg-white/5"
                    >
                        <Users className="h-3.5 w-3.5" />
                        {t("teams")} ({teams?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger
                        value="fixtures"
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 text-[10px] font-black uppercase italic transition-all rounded-none border-none data-[state=active]:!bg-secondary data-[state=active]:!text-secondary-foreground data-[state=active]:shadow-[0_0_15px_rgba(0,196,154,0.3)] text-muted-foreground hover:text-secondary hover:bg-white/5"
                    >
                        <Calendar className="h-3.5 w-3.5" />
                        {t("fixtures")}
                    </TabsTrigger>
                    {userRole === 'admin' && (
                        <TabsTrigger
                            value="settings"
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 text-[10px] font-black uppercase italic transition-all rounded-none border-none data-[state=active]:!bg-secondary data-[state=active]:!text-secondary-foreground data-[state=active]:shadow-[0_0_15px_rgba(0,196,154,0.3)] text-muted-foreground hover:text-secondary hover:bg-white/5"
                        >
                            <Settings className="h-3.5 w-3.5" />
                            {t("settings")}
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {/* Left Column: Main Tournament Data (Spans 2) */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* 0. Tournament Description (Added) */}
                            {tournament?.description && (
                                <Card className="bg-card border border-border/40 relative overflow-hidden rounded-none shadow-lg group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
                                    <CardHeader className="pb-2 pt-6">
                                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{t("overview")}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div
                                            className="prose prose-invert prose-sm max-w-none text-muted-foreground/80 font-medium leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: tournament.description }}
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {/* 1. League Table (For 'league' AND 'league_ha') */}
                           {(tournament?.format === 'league' || tournament?.format === 'league_ha') && (
                                <Card className="bg-card border border-border/40 relative overflow-hidden rounded-none shadow-lg group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                                    <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                                    <CardHeader className="pb-4 pt-6 relative z-10">
                                        <CardTitle className="text-2xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                                            <Trophy className="h-5 w-5 text-secondary" />
                                            {t("standings")}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="relative z-10">
                                        <StandingsTable standings={calculatedStandings} />
                                    </CardContent>
                                </Card>
                            )}

                            {/* 2. Group Standings (Only for 'group_knockout') */}
                            {tournament?.format === 'group_knockout' && (
                                <div className="space-y-6">
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                                            <Trophy className="h-5 w-5 text-secondary" />
                                            {t("group_standings")}
                                        </h2>
                                        <p className="text-[10px] font-bold uppercase text-muted-foreground/60">{t("group_standings_desc")}</p>
                                    </div>
                                    <div className="relative z-10">
                                        <GroupStandings teams={teams} matches={matches} />
                                    </div>
                                </div>
                            )}

                            {/* 3. Knockout Bracket (For 'knockout' OR 'group_knockout') */}
                            {(tournament?.format === 'knockout' || tournament?.format === 'group_knockout') && (
                                <div className="space-y-6">
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                                            <GitBranch className="h-5 w-5 text-secondary" />
                                            {t("bracket")}
                                        </h2>
                                        <p className="text-[10px] font-bold uppercase text-muted-foreground/60">{t("bracket_desc")}</p>
                                    </div>
                                    <div className="relative z-10">
                                        <TournamentBracket matches={matches} />
                                    </div>
                                </div>
                            )}

                            {/* 4. Top Scorers */}
                            <div className="space-y-6">
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                                            <Award className="h-5 w-5 text-secondary" />
                                            {t("top_scorers")}
                                        </h2>
                                        <p className="text-[10px] font-bold uppercase text-muted-foreground/60">{t("top_scorers_desc") || "Golden boot race"}</p>
                                    </div>
                                    {!isPro && (
                                        <Badge variant="outline" className="rounded-none border-secondary/30 text-secondary text-[10px] uppercase font-black italic shadow-[0_0_10px_rgba(0,196,154,0.1)]">
                                            {t("pro_badge")}
                                        </Badge>
                                    )}
                                </div>

                                {isPro ? (
                                    <div className="relative z-10">
                                        <TopScorersTable goals={goals} teams={teams} />
                                    </div>
                                ) : (
                                    <div className="relative z-10 border border-border/20 bg-muted/5 p-12 rounded-none text-center">
                                        <div className="space-y-4">
                                            <p className="text-xs font-bold uppercase text-muted-foreground/60 tracking-wider leading-relaxed max-w-sm mx-auto">
                                                {t("upsell_pro_required")}
                                            </p>
                                            <Button variant="ghost" asChild className="rounded-none border border-secondary/20 hover:bg-secondary/10 font-black uppercase italic text-[10px] tracking-widest text-secondary transition-all hover:-translate-y-0.5 shadow-[0_4px_10px_rgba(0,196,154,0.1)]">
                                                <Link href="/dashboard/billing">{t("upsell_view_plans")}</Link>
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 5. Player Stats */}
                            {isPro && playerStats.length > 0 && (
                                <Card className="bg-card border border-border/40 relative overflow-hidden rounded-none shadow-lg group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                                    <CardHeader className="pb-4 pt-6 relative z-10">
                                        <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                                            <Trophy className="h-5 w-5 text-secondary" />
                                            {t("player_stats")}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="relative z-10 p-0">
                                        <div className="overflow-x-auto">
                                            <PlayerStatsTable stats={playerStats} />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                            {/* 6. Banned Players Alert */}
                            <BannedPlayersCard bannedPlayers={bannedPlayers} />
                        </div>

                        {/* Right Column: Announcements (Spans 1) */}
                        <div className="lg:col-span-1">
                            <AnnouncementsCard
                                tournamentId={id}
                                isEditable={userRole === 'admin' || userRole === 'editor'}
                            />
                        </div>
                    </div>
                </TabsContent>

                {/* Teams Tab */}
                <TabsContent value="teams" className="space-y-8 outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {/* Main Content: Registrations & Teams List */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Registrations Section (Admin Only) */}
                            {userRole === 'admin' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                                                <BookOpen className="h-5 w-5 text-primary" />
                                                {useTranslations("Registrations")("title")}
                                            </h3>
                                            <p className="text-[10px] font-bold uppercase text-muted-foreground/60">{tSettings("registration_settings_desc")}</p>
                                        </div>
                                        {!isPro && (
                                            <Badge variant="secondary" className="rounded-none bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                                                {tSettings("plan_pro_badge")}
                                            </Badge>
                                        )}
                                    </div>

                                    {!isPro && (
                                        <div className="p-4 bg-primary/5 border border-primary/10 flex items-center gap-3">
                                            <AlertTriangle className="h-4 w-4 text-primary" />
                                            <p className="text-[11px] text-primary font-bold uppercase tracking-tight">
                                                {t("upsell_pro_feature")} 
                                                <Button variant="link" asChild className="p-0 h-auto font-black underline text-primary ml-2 uppercase">
                                                    <Link href="/dashboard/billing">{tSettings("upgrade_button")}</Link>
                                                </Button>
                                            </p>
                                        </div>
                                    )}

                                    <div className={cn(!isPro && "opacity-40 grayscale pointer-events-none")}>
                                        <RegistrationsTable tournamentId={id} />
                                    </div>
                                </div>
                            )}

                            {/* Participating Teams */}
                            <div className="space-y-6">
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                                    <Users className="h-5 w-5 text-secondary" />
                                    {t("participating_teams")} <span className="text-muted-foreground/40 ml-1">[{teams?.length || 0}]</span>
                                </h3>
                                <TeamList
                                    teams={teams}
                                    tournamentId={id}
                                    isPro={isPro}
                                    showGroupSelector={tournament?.format?.includes("group")}
                                    organizerId={tournament?.user_id}
                                />
                            </div>
                        </div>

                        {/* Management Sidebar */}
                        <div className="lg:col-span-1 space-y-8">
                            {/* Add Team Section */}
                            <div className="space-y-6 group">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                                        <Plus className="h-5 w-5 text-secondary" />
                                        {t("add_team")}
                                    </h3>
                                    <p className="text-[9px] font-bold uppercase text-muted-foreground/40 italic">Manual Entry Management</p>
                                </div>

                                <AddTeamForm 
                                    tournamentId={id} 
                                    isLimitReached={!isPro && (teams?.length || 0) >= 8} 
                                />

                                {/* Public Registration Link - Only for Pro */}
                                {isPro && (
                                    <div className="pt-6 space-y-4">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{t("public_link")}</Label>
                                            <p className="text-[9px] text-muted-foreground/40 italic">Share this link for teams to register</p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/5 p-1">
                                            <Input
                                                readOnly
                                                value={typeof window !== 'undefined' ? `${window.location.origin}/register/${id}` : `/register/${id}`}
                                                className="bg-transparent border-none font-mono text-[10px] h-8 focus-visible:ring-0 text-muted-foreground"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-all shrink-0 rounded-none"
                                                onClick={() => {
                                                    const url = `${window.location.origin}/register/${id}`;
                                                    navigator.clipboard.writeText(url);
                                                    toast({ title: tCommon("copied"), description: tCommon("copied_desc") });
                                                }}
                                                title={tCommon("copy_link")}
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                asChild
                                                className="h-8 w-8 hover:bg-secondary/20 hover:text-secondary transition-all shrink-0 rounded-none"
                                                title={tCommon("open_link")}
                                            >
                                                <a href={`/register/${id}`} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Fixtures Tab */}
                <TabsContent value="fixtures" className="space-y-8 outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {/* Main Schedule Column */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Unwrapped Header */}
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
                                <div className="space-y-1">
                                    <h3 className="text-4xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-3">
                                        <Calendar className="h-8 w-8 text-secondary" />
                                        {t("match_schedule")}
                                    </h3>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">
                                        {t("manage_fixtures")}
                                    </p>
                                </div>

                                {/* View Toggle - Moved to Header */}
                                <div className="flex bg-white/5 p-1 rounded-none border border-white/5 self-start md:self-auto">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "rounded-none h-8 px-4 font-black uppercase italic tracking-tighter text-[10px] transition-all",
                                            fixtureView === 'list' && "bg-secondary text-secondary-foreground shadow-lg shadow-secondary/20"
                                        )}
                                        onClick={() => setFixtureView('list')}
                                    >
                                        <List className="h-3.5 w-3.5 mr-2" />
                                        List
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "rounded-none h-8 px-4 font-black uppercase italic tracking-tighter text-[10px] transition-all",
                                            fixtureView === 'calendar' && "bg-secondary text-secondary-foreground shadow-lg shadow-secondary/20"
                                        )}
                                        onClick={() => setFixtureView('calendar')}
                                    >
                                        <Calendar className="h-3.5 w-3.5 mr-2" />
                                        Calendar
                                    </Button>
                                </div>
                            </div>

                            {/* Fixtures View */}
                            <div className="min-h-[400px]">
                                {fixtureView === 'list' ? (
                                    <FixturesManager
                                        teams={teams}
                                        matches={matches}
                                        tournamentId={id}
                                        goals={goals}
                                        isPro={isPro}
                                    />
                                ) : (
                                    <FixturesCalendar matches={matches} />
                                )}
                            </div>
                        </div>

                        {/* Sidebar Management Column */}
                        <div className="lg:col-span-1 space-y-8">
                            {/* Generation Controls Block */}
                            <div className="space-y-4">
                                <div className="space-y-1 pb-4 border-b border-white/5">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-secondary">Control Center</h4>
                                    <p className="text-[9px] text-muted-foreground italic">Generate and manage tournament stages</p>
                                </div>
                                
                                <FixtureGenerator 
                                    tournamentId={id} 
                                    hasFixtures={hasFixtures} 
                                    format={tournament?.format}
                                    className="h-14 font-black uppercase italic tracking-tighter text-sm"
                                />

                                {!(tournament?.format === 'league' || tournament?.format === 'league_ha') && (
                                    <NextRoundButton
                                        tournamentId={id}
                                        matches={matches}
                                        format={tournament?.format || 'league'}
                                        // NextRoundButton likely needs high visibility if it's the primary "advance" action
                                    />
                                )}

                                {/* Extra Information / Status */}
                                <div className="p-4 bg-white/5 border-l-2 border-secondary/30 space-y-2">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground/60 leading-tight">
                                        Current Format: <span className="text-foreground">{tournament?.format?.replace('_', ' ').toUpperCase()}</span>
                                    </p>
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground/60 leading-tight">
                                        Teams: <span className="text-foreground">{teams.length}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Settings Tab */}
                {userRole === 'admin' && (
                    <TabsContent value="settings" className="outline-none focus-visible:ring-0">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main Settings Column */}
                            <div className="lg:col-span-2">
                                <SettingsTab tournament={tournament} hasFixtures={hasFixtures} userPlan={userPlan} />
                            </div>

                            {/* Sidebar Info Column */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-1 pb-4 border-b border-white/5">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-secondary">Configuration Overview</h4>
                                        <p className="text-[9px] text-muted-foreground italic">Quick status and tournament details</p>
                                    </div>
                                    
                                    <div className="p-4 bg-white/5 border-l-2 border-secondary/30 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Status</span>
                                            <Badge className="rounded-none bg-white/5 text-foreground border-white/10 text-[9px] font-black uppercase px-2 py-0.5">
                                                {tournament?.status?.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Plan</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-secondary italic">
                                                {isPro ? 'PRO ACCESS' : 'FREE PLAN'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Team Slots</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
                                                {teams.length} / {tournament?.max_teams || 8}
                                            </span>
                                        </div>
                                        <div className="pt-2 border-t border-white/5">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">Last Updated</p>
                                            <p className="text-[10px] font-black text-foreground italic">
                                                {new Date(tournament?.updated_at || tournament?.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 border-l-2 border-white/10 bg-white/5 space-y-2">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Quick Help</h5>
                                        <p className="text-[11px] text-muted-foreground/60 leading-relaxed italic">
                                            Adjust your tournament rules, schedule parameters, and registration details from the main settings panel.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
