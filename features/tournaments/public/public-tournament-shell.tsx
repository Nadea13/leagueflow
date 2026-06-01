"use client";

import { useState, useEffect, useMemo } from "react";
import { Trophy, Calendar, ArrowLeft, Award, Megaphone, MapPin, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tab } from "@/components/ui/tab";
import { Standings } from "@/features/tournaments/ranking/standings";
import { PublicMatches } from "@/features/tournaments/public/public-matches-list";
import { StandingsGroups } from "@/features/tournaments/ranking/standings-groups";
import { ShareButton } from "@/features/tournaments/shared/share-button";
import { Match, MatchEvent, Team, Goal, Tournament, Player, Announcement } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { useRouter, usePathname, Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sponsor } from "@/actions/tournaments/sponsor";

interface PublicTournamentShellProps {
    tournament: Tournament;
    initialTeams: Team[];
    initialMatches: Match[];
    initialEvents: MatchEvent[];
    initialGoals: Goal[];
    initialPlayers: Player[];
    categories?: { id: string; name: string }[];
    selectedCategoryId?: string;
    announcements?: Announcement[];
    sponsors?: Sponsor[];
}

export function PublicTournamentShell({
    tournament: initialTournament,
    initialTeams,
    initialMatches,
    initialEvents,
    categories = [],
    selectedCategoryId,
    announcements = [],
    sponsors = []
}: PublicTournamentShellProps) {
    const t = useTranslations("PublicView");
    const tTournament = useTranslations("Tournament");
    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [events, setEvents] = useState<MatchEvent[]>(initialEvents);
    const [tournament, setTournament] = useState(initialTournament);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const marqueeTeams = (() => {
        if (initialTeams.length === 0) return [];
        let list = [...initialTeams];
        while (list.length < 12) {
            list = [...list, ...initialTeams];
        }
        return list;
    })();

    const canvasStandings = useMemo(() => {
        if (!tournament.canvas_data || !tournament.canvas_data.nodes) return null;

        const standingNodes = tournament.canvas_data.nodes.filter(n => n.type === 'standingNode');
        if (standingNodes.length === 0) return null;

        const edges = tournament.canvas_data.edges || [];
        const nodes = tournament.canvas_data.nodes;

        return standingNodes.map(node => {
            const label = (node.data as any)?.label || "Standings";

            const sourceEdge = edges.find(e => e.target === node.id && e.targetHandle === 'in');
            const sourceGroupNode = sourceEdge ? nodes.find(n => n.id === sourceEdge.source) : null;

            let nodeTeams: string[] = [];
            if (!sourceGroupNode || sourceGroupNode.type !== 'groupNode') {
                nodeTeams = (Array.isArray((node.data as any)?.teams) ? (node.data as any).teams : []).filter((name: string) => name && name !== "TBD");
            } else {
                const teamCount = (sourceGroupNode.data as any)?.teamCount || 0;
                const staticTeams = (sourceGroupNode.data as any)?.teams || [];

                nodeTeams = Array.from({ length: teamCount }).map((_, index) => {
                    const handleId = `team-in-${index}`;
                    const edge = edges.find(e => e.target === sourceGroupNode.id && e.targetHandle === handleId);

                    if (!edge) return staticTeams[index] || "TBD";

                    const sNode = nodes.find(n => n.id === edge.source);
                    if (!sNode) return staticTeams[index] || "TBD";

                    if (sNode.type === 'teamListNode') {
                        const teamIdMatch = edge.sourceHandle?.match(/team-(.+)/);
                        if (teamIdMatch) {
                            const teamId = teamIdMatch[1];
                            const team = initialTeams.find(t => String(t.id) === String(teamId));
                            return team?.name || "TBD";
                        }
                    }

                    if (sNode.type === 'standingNode' || sNode.type === 'groupNode') {
                        const rankMatch = edge.sourceHandle?.match(/rank-(\d+)/);
                        if (rankMatch) {
                            const rankIndex = parseInt(rankMatch[1], 10);
                            const rankings = (sNode.data as any)?.rankings || [];
                            if (rankings[rankIndex]) return rankings[rankIndex];
                            const rankSuffix = rankIndex === 0 ? "1st" : rankIndex === 1 ? "2nd" : rankIndex === 2 ? "3rd" : `${rankIndex + 1}th`;
                            return `${rankSuffix} Place (${(sNode.data as any).label})`;
                        }
                    }

                    return staticTeams[index] || `Team ${index + 1}`;
                }).filter(name => name && name !== "TBD");
            }

            // Map IDs to names for easier lookup (both team_id and id to handle matches referencing teams)
            const teamIdToName = new Map<string, string>();
            initialTeams.forEach((t) => {
                if (t.name) {
                    if ((t as any).team_id) teamIdToName.set((t as any).team_id, t.name);
                    if (t.id) teamIdToName.set(t.id, t.name);
                }
            });

            // Initialize stats map for all teams in this node (by name)
            const statsMap: Record<string, {
                name: string;
                logo_url?: string;
                team_id?: string;
                mp: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number;
            }> = {};

            nodeTeams.forEach((name, index) => {
                const key = name === "TBD" ? `TBD-${index}` : name;
                const dbTeam = initialTeams.find(t => t.name === name);
                statsMap[key] = {
                    name,
                    logo_url: dbTeam?.logo_url ?? undefined,
                    team_id: dbTeam?.id,
                    mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0
                };
            });

            // Calculate stats from matches
            matches.forEach(m => {
                const homeName = m.home_team_id ? teamIdToName.get(m.home_team_id) : (m as any).placeholder_home || (m as any).placeholder_a;
                const awayName = m.away_team_id ? teamIdToName.get(m.away_team_id) : (m as any).placeholder_away || (m as any).placeholder_b;

                if (!homeName || !awayName) return;

                const h = statsMap[homeName];
                const a = statsMap[awayName];

                if (m.status === 'finished' || m.status === 'live') {
                    if (h && a) {
                        const hScore = typeof m.home_score === 'object' && m.home_score !== null && 'total' in m.home_score ? Number((m.home_score as { total?: number }).total) || 0 : Number(m.home_score) || 0;
                        const aScore = typeof m.away_score === 'object' && m.away_score !== null && 'total' in m.away_score ? Number((m.away_score as { total?: number }).total) || 0 : Number(m.away_score) || 0;

                        h.mp++; a.mp++;
                        h.gf += hScore; h.ga += aScore;
                        a.gf += aScore; a.ga += hScore;

                        if (hScore > aScore) {
                            h.w++; h.pts += 3;
                            a.l++;
                        } else if (hScore < aScore) {
                            a.w++; a.pts += 3;
                            h.l++;
                        } else {
                            h.d++; h.pts += 1;
                            a.d++; a.pts += 1;
                        }
                    }
                }
            });

            const calculated = Object.values(statsMap).map((s) => ({
                tournament_id: tournament.id,
                team_id: s.team_id || s.name,
                team: {
                    name: s.name,
                    logo_url: s.logo_url
                },
                played: s.mp,
                won: s.w,
                drawn: s.d,
                lost: s.l,
                gf: s.gf,
                ga: s.ga,
                gd: s.gf - s.ga,
                pts: s.pts
            })).sort((a, b) => {
                if (b.pts !== a.pts) return b.pts - a.pts;
                if (b.gd !== a.gd) return b.gd - a.gd;
                return b.gf - a.gf;
            });

            return {
                label,
                standings: calculated
            };
        });
    }, [tournament.canvas_data, initialTeams, matches, tournament.id]);

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

    const handleCategoryChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('category_id', value);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    useEffect(() => {
        const supabase = createClient();

        const tourneyChannel = supabase
            .channel(`public-tournament-${initialTournament.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'tournaments',
                filter: `id=eq.${initialTournament.id}`
            }, (payload) => {
                setTournament(payload.new as Tournament);
            })
            .subscribe();

        const matchChannel = supabase
            .channel(`public-matches-${initialTournament.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'matches',
                filter: `tournament_id=eq.${initialTournament.id}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setMatches(prev => [...prev, payload.new as Match]);
                } else if (payload.eventType === 'UPDATE') {
                    setMatches(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
                } else if (payload.eventType === 'DELETE') {
                    setMatches(prev => prev.filter(m => m.id !== payload.old.id));
                }
            })
            .subscribe();

        const eventChannel = supabase
            .channel(`public-events-${initialTournament.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'match_events'
            }, (payload) => {
                const matchIds = matches.map(m => m.id);
                if (payload.new && !matchIds.includes((payload.new as MatchEvent).match_id)) return;
                if (payload.old && !matchIds.includes((payload.old as MatchEvent).match_id)) return;

                if (payload.eventType === 'INSERT') {
                    setEvents(prev => [payload.new as MatchEvent, ...prev]);
                } else if (payload.eventType === 'DELETE') {
                    setEvents(prev => prev.filter(e => e.id !== payload.old.id));
                } else if (payload.eventType === 'UPDATE') {
                    setEvents(prev => prev.map(e => e.id === payload.new.id ? { ...e, ...payload.new } : e));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(tourneyChannel);
            supabase.removeChannel(matchChannel);
            supabase.removeChannel(eventChannel);
        };
    }, [initialTournament.id, matches.length, matches]);

    const getInitials = (name: string) => {
        const parts = name.trim().split(/\s+/);
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <main className="container mx-auto px-2 md:px-0 py-6 max-w-6xl">
            {/* Unified Header Block - Styled like squad-management */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
                <div className="flex items-center gap-2 md:gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="h-10 w-10 shrink-0 hover:bg-primary/10 hover:text-primary transition-all"
                    >
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2 md:gap-4">
                            <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
                                {tournament?.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                <Badge variant="default">
                                    {tournament?.format?.replace('_', ' ')}
                                </Badge>
                                <span className="text-[10px] font-black tracking-wider text-primary/60">
                                    {initialTeams.length}/{tournament?.max_teams} {tTournament("teams")}
                                </span>
                                <Badge className={cn(
                                    tournament?.status === 'ongoing' && "bg-green-600 hover:bg-green-700 shadow-green-900/20",
                                    tournament?.status === 'finished' && "bg-gray-500 hover:bg-gray-600 shadow-gray-900/20",
                                    tournament?.status === 'upcoming' && "bg-amber-600 hover:bg-amber-700 shadow-amber-900/20",
                                    (!tournament?.status || tournament?.status === 'draft') && "bg-yellow-500 hover:bg-yellow-600 text-black shadow-yellow-900/10"
                                )}>
                                    {tTournament(tournament?.status || 'draft')}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0 self-end md:self-auto">
                    {categories.length > 0 && (
                        <div className="flex items-center gap-2 w-full md:w-auto max-w-[280px]">
                            <Select value={selectedCategoryId} onValueChange={handleCategoryChange}>
                                <SelectTrigger className="w-[180px] bg-background/50 border h-9 text-xs">
                                    <SelectValue placeholder="เลือกหมวดหมู่" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={c.id} className="text-xs">
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <ShareButton tournamentId={tournament.id} />
                </div>
            </div>


            {/* Teams Block (Marquee) */}
            <div className="space-y-4 overflow-hidden relative mb-6">
                {initialTeams.length > 0 ? (
                    <div className="relative w-full overflow-hidden py-4">
                        <style>{`
                            @keyframes marquee {
                                0% { transform: translateX(0); }
                                100% { transform: translateX(-50%); }
                            }
                            .animate-marquee {
                                display: flex;
                                width: max-content;
                                animation: marquee 25s linear infinite;
                            }
                            .animate-marquee:hover {
                                animation-play-state: paused;
                            }
                        `}</style>
                        <div className="animate-marquee">
                            {/* First Group */}
                            {marqueeTeams.map((team, index) => (
                                <div
                                    key={`team-1-${team.id}-${index}`}
                                    className="w-24 h-24 mx-2 border rounded-full flex items-center justify-center overflow-hidden bg-background hover:border-primary/50 transition-all shrink-0 cursor-pointer"
                                    title={team.name}
                                >
                                    {team.logo_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={team.logo_url} className="w-full h-full object-contain p-2" alt={team.name} />
                                    ) : (
                                        <span className="font-black text-3xl text-muted-foreground">
                                            {getInitials(team.name)}
                                        </span>
                                    )}
                                </div>
                            ))}
                            {/* Duplicate Group for Infinite Scroll Effect */}
                            {marqueeTeams.map((team, index) => (
                                <div
                                    key={`team-2-${team.id}-${index}`}
                                    className="w-24 h-24 mx-2 border rounded-full flex items-center justify-center overflow-hidden bg-background hover:border-primary/50 transition-all shrink-0 cursor-pointer"
                                    title={team.name}
                                >
                                    {team.logo_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={team.logo_url} className="w-full h-full object-contain p-2" alt={team.name} />
                                    ) : (
                                        <span className="font-black text-3xl text-muted-foreground">
                                            {getInitials(team.name)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground/60 bg-muted/20 p-4 border border-dashed text-center rounded-lg">
                        ยังไม่มีรายชื่อทีมที่สมัครเข้าร่วมในหมวดหมู่นี้
                    </p>
                )}
            </div>

            {/* Public Navigation */}
            <Tab
                value={currentTab}
                onChange={handleTabChange}
                className="w-full md:w-max mb-6"
                itemClassName="flex-1 md:flex-none"
                options={[
                    { value: 'overview', label: t("overview"), icon: Trophy },
                    { value: 'standings', label: t("league_table"), icon: Award },
                    { value: 'matches', label: t("matches"), icon: Calendar },
                ]}
            />

            {currentTab === 'overview' && (
                <div className="space-y-2 md:space-y-4">
                    {/* Announcements Block */}
                    {announcements.length > 0 && (
                        <div className="space-y-2 md:space-y-4">
                            <h2 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-1 md:gap-2">
                                <Megaphone className="h-5 w-5 text-primary" />
                                บอร์ดประกาศ (Announcements)
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {announcements.map((ann) => (
                                    <div
                                        key={ann.id}
                                        className={cn(
                                            "p-4 border bg-card/40 backdrop-blur-sm relative rounded-lg transition-colors hover:bg-card/60",
                                            ann.is_pinned && "border-primary/30 bg-primary/5 hover:bg-primary/[0.07]"
                                        )}
                                    >
                                        {ann.is_pinned && (
                                            <Badge className="absolute top-3 right-3 text-[9px] font-black tracking-wider border-none bg-primary/20 text-primary" variant="default">
                                                Pinned
                                            </Badge>
                                        )}
                                        <h4 className="font-bold text-sm text-foreground pr-12">{ann.title}</h4>
                                        {ann.content && (
                                            <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap leading-relaxed">
                                                {ann.content}
                                            </p>
                                        )}
                                        <span className="text-[9px] text-muted-foreground/50 mt-3 block font-bold">
                                            {new Date(ann.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* General Information */}
                    <div className="space-y-2 md:space-y-4">
                        <h2 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-1 md:gap-2">
                            <Info className="h-5 w-5 text-primary" />
                            {t("about_tournament")}
                        </h2>
                        <div className="p-2 md:p-4 border bg-card/40 backdrop-blur-sm rounded-xl space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Date range */}
                                <div className="flex items-start gap-3">
                                    <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider block">วันแข่งขัน (Dates)</span>
                                        <span className="text-sm font-bold text-foreground">
                                            {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : "-"}
                                            {tournament.end_date && ` - ${new Date(tournament.end_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`}
                                        </span>
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="flex items-start gap-1 md:gap-2">
                                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider block">สถานที่แข่งขัน (Venue / Location)</span>
                                        {tournament.location_name ? (
                                            <div className="space-y-1">
                                                <span className="text-sm font-bold text-foreground block">{tournament.location_name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm font-bold text-foreground">-</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Embedded Map Canvas */}
                            {tournament.location_name && (
                                <div className="w-full h-72 border rounded-sm overflow-hidden shadow-inner bg-muted/20 relative mt-4">
                                    <iframe
                                        title="Venue Location Map"
                                        width="100%"
                                        height="100%"
                                        className="border-0"
                                        loading="lazy"
                                        allowFullScreen
                                        referrerPolicy="no-referrer-when-downgrade"
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(tournament.location_name)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sponsors Block */}
                    {sponsors && sponsors.length > 0 && (
                        <div className="space-y-2 md:space-y-4 text-center mt-6">
                            <h2 className="tracking-tighter text-foreground flex items-center justify-center gap-1 md:gap-2 font-black text-xl">
                                Sponsored By
                            </h2>
                            <div className="flex flex-wrap gap-4 items-center justify-center">
                                {sponsors.map((sponsor) => {
                                    const content = (
                                        <div
                                            className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
                                            title={sponsor.sponsor_name}
                                        >
                                            {sponsor.logo_img ? (
                                                <img src={sponsor.logo_img} className="w-full h-full object-contain" alt={sponsor.sponsor_name} />
                                            ) : (
                                                <span className="font-black text-2xl text-muted-foreground">
                                                    {getInitials(sponsor.sponsor_name)}
                                                </span>
                                            )}
                                        </div>
                                    );

                                    if (sponsor.link_url) {
                                        return (
                                            <a
                                                key={sponsor.id}
                                                href={sponsor.link_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="transition-transform hover:scale-105"
                                            >
                                                {content}
                                            </a>
                                        );
                                    }

                                    return (
                                        <div key={sponsor.id}>
                                            {content}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {currentTab === 'standings' && (
                <div className="space-y-2 md:space-y-4">
                    <div className="flex flex-col gap-1 mb-2 md:mb-4">
                        <h2 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                            <Trophy className="h-5 w-5 text-primary" />
                            {t("league_table")}
                        </h2>
                        <p className="text-[10px] font-bold text-muted-foreground/60">{t("league_table_desc")}</p>
                    </div>

                    {canvasStandings && canvasStandings.length > 0 ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {canvasStandings.map((group) => (
                                <div key={group.label} className="space-y-3">
                                    <h3 className="text-lg font-black tracking-tighter text-foreground flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 bg-primary rounded-full shrink-0" />
                                        {group.label}
                                    </h3>
                                    <div className="bg-card border relative overflow-hidden transition-colors rounded-lg">
                                        <Standings standings={group.standings} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <StandingsGroups teams={initialTeams} matches={matches} isPublic={true} />
                    )}
                </div>
            )}

            {currentTab === 'matches' && (
                <div className="space-y-4 md:space-y-6">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                            <Calendar className="h-5 w-5 text-primary" />
                            {t("fixtures_results")}
                        </h2>
                        <p className="text-[10px] font-bold text-muted-foreground/60">{t("fixtures_results_desc")}</p>
                    </div>
                    <PublicMatches matches={matches} tournamentId={tournament.id} events={events} teams={initialTeams} />
                </div>
            )}
        </main>
    );
}
