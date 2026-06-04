"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useMatchEvents } from "@/hooks/use-match-events";
import { useMatchTimer } from "@/hooks/use-match-timer";
import { Match, MatchEvent } from "@/types";
import { Trophy, Square } from "lucide-react";
import { cn } from "@/lib/utils";

const fontImports: Record<string, string> = {
    inter: "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap');",
    orbitron: "@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');",
    montserrat: "@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800;900&display=swap');",
    "bebas-neue": "@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');",
    outfit: "@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');"
};

const fontFamilies: Record<string, string> = {
    inter: "font-family: 'Inter', sans-serif;",
    orbitron: "font-family: 'Orbitron', sans-serif;",
    montserrat: "font-family: 'Montserrat', sans-serif;",
    "bebas-neue": "font-family: 'Bebas Neue', sans-serif;",
    outfit: "font-family: 'Outfit', sans-serif;"
};

interface OverlayNotification {
    id: string;
    type: "goal" | "yellow_card" | "red_card";
    player: string;
    minute: number;
    teamName: string;
    teamColor: "home" | "away";
}

function BroadcastOverlayContent() {
    const params = useParams();
    const searchParams = useSearchParams();

    const id = params.id as string;
    const matchId = params.matchId as string;

    // Search Query Configuration
    const layout = searchParams.get("layout") || "top-bar"; // 'top-bar' | 'minimal-left' | 'minimal-right'
    const bgType = searchParams.get("bg") || "transparent"; // 'transparent' | 'chromakey'
    const size = searchParams.get("size") || "medium"; // 'small' | 'medium' | 'large'
    const showTimeline = searchParams.get("timeline") === "true"; // show mini ticker of recent goals/cards
    
    // Customization parameters
    const font = searchParams.get("font") || "inter";
    const scoreBg = searchParams.get("scoreBg") || "#ef4444";
    const teamNameMode = searchParams.get("teamNameMode") || "abbr";
    const showLogos = searchParams.get("showLogos") !== "false";
    const headerText = searchParams.get("headerText") || "";
    const posX = searchParams.get("posX") || "center"; // left | center | right
    const posY = searchParams.get("posY") || "top"; // top | bottom
    const alertDuration = Number(searchParams.get("alertDuration")) || 6;
    const rounded = searchParams.get("rounded") || "md";

    const homeBarDir = searchParams.get("homeBarDir") || "none";
    const homeBarColor = searchParams.get("homeBarColor") || "#10b981";
    const awayBarDir = searchParams.get("awayBarDir") || "none";
    const awayBarColor = searchParams.get("awayBarColor") || "#3b82f6";

    // Canvas Block Positioning Coordinates Parsing
    const positionsParam = searchParams.get("positions");
    const blockConfigs: Record<string, { 
        x: number; 
        y: number; 
        w: number; 
        h: number; 
        fontSize: number; 
        rTL: number; 
        rTR: number; 
        rBL: number; 
        rBR: number; 
    }> = {};
    if (positionsParam) {
        positionsParam.split(";").forEach((item) => {
            const parts = item.split(":");
            const blockId = parts[0];
            if (blockId) {
                blockConfigs[blockId] = {
                    x: Number(parts[1]) || 0,
                    y: Number(parts[2]) || 0,
                    w: Number(parts[3]) || 0,
                    h: Number(parts[4]) || 0,
                    fontSize: Number(parts[5]) || 0,
                    rTL: parts[6] !== undefined ? Number(parts[6]) : 8,
                    rTR: parts[7] !== undefined ? Number(parts[7]) : 8,
                    rBL: parts[8] !== undefined ? Number(parts[8]) : 8,
                    rBR: parts[9] !== undefined ? Number(parts[9]) : 8,
                };
            }
        });
    }

    // Match State
    const [match, setMatch] = useState<Match | null>(null);
    const [tournamentName, setTournamentName] = useState<string>("");
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    // Fetch initial match
    useEffect(() => {
        const fetchTournament = async () => {
            const { data, error } = await supabase
                .from("tournaments")
                .select("name")
                .eq("id", id)
                .single();
            if (!error && data) {
                setTournamentName(data.name);
            }
        };
        fetchTournament();

        const fetchMatch = async () => {
            const { data, error } = await supabase
                .from("matches")
                .select(`
                    *,
                    home_team:teams!matches_home_team_id_fkey(id, name, logo_img),
                    away_team:teams!matches_away_team_id_fkey(id, name, logo_img)
                `)
                .eq("id", matchId)
                .single();

            if (!error && data) {
                const mappedMatch = {
                    ...data,
                    home_team: data.home_team ? {
                        ...data.home_team,
                        logo_url: (data.home_team as any).logo_img || null
                    } : null,
                    away_team: data.away_team ? {
                        ...data.away_team,
                        logo_url: (data.away_team as any).logo_img || null
                    } : null
                };
                setMatch(mappedMatch as unknown as Match);
            }
            setLoading(false);
        };

        fetchMatch();

        // Subscribe to matches updates using exact same channel pattern as console
        const channel = supabase
            .channel(`match-${matchId}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
                (payload) => {
                    const updated = payload.new as Partial<Match>;
                    setMatch((prev) => (prev ? { ...prev, ...updated } : null));
                }
            )
            .subscribe();

        // Polling fallback to guarantee sync even if realtime websocket fails/disconnects
        const pollInterval = setInterval(() => {
            fetchMatch();
        }, 3000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, [matchId, supabase]);

    // Match Hooks (using existing application hooks for real-time consistency)
    const { events } = useMatchEvents(matchId, id, undefined, true);
    const { time } = useMatchTimer(match || ({} as Match), id, events);

    // Live Notification Ticker System
    const [activeNotification, setActiveNotification] = useState<OverlayNotification | null>(null);
    const eventsCountRef = useRef<number>(0);
    const initialEventsLoaded = useRef<boolean>(false);

    useEffect(() => {
        if (!match) return;

        // Populate initially to prevent old events firing animations on page load
        if (!initialEventsLoaded.current) {
            if (events && events.length > 0) {
                eventsCountRef.current = events.length;
                initialEventsLoaded.current = true;
            }
            return;
        }

        if (events && events.length > eventsCountRef.current) {
            // New event added (events array is sorted descending by created_at)
            const newEvent = events[0];
            eventsCountRef.current = events.length;

            if (
                newEvent &&
                (newEvent.event_type === "goal" ||
                    newEvent.event_type === "yellow_card" ||
                    newEvent.event_type === "red_card")
            ) {
                const teamColor = newEvent.team_id === match.home_team_id ? "home" : "away";
                const teamName =
                    newEvent.team_id === match.home_team_id
                        ? match.home_team?.name || "Home"
                        : match.away_team?.name || "Away";

                const notifyTimer = setTimeout(() => {
                    setActiveNotification({
                        id: newEvent.id,
                        type: newEvent.event_type as "goal" | "yellow_card" | "red_card",
                        player: newEvent.player_name || "Unknown",
                        minute: newEvent.minute,
                        teamName: teamName,
                        teamColor: teamColor as "home" | "away",
                    });
                }, 0);

                // Clear after alertDuration seconds
                const clearTimer = setTimeout(() => {
                    setActiveNotification(null);
                }, alertDuration * 1000);

                return () => {
                    clearTimeout(notifyTimer);
                    clearTimeout(clearTimer);
                };
            }
        } else if (events && events.length < eventsCountRef.current) {
            // Event deleted, just update count without showing banner
            eventsCountRef.current = events.length;
        }
    }, [events, match, alertDuration]);

    if (loading || !match) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white/50 text-xs font-mono select-none">
                Connecting overlay channel...
            </div>
        );
    }

    // Time calculations
    const displayMinutes = Math.floor(time / 60);
    const displaySeconds = time % 60;
    const timeString = `${displayMinutes}:${String(displaySeconds).padStart(2, "0")}`;

    // Get goals
    const isHomeTeam = (tid: string) => tid === match.home_team_id || tid === match.home_team?.id;
    const isAwayTeam = (tid: string) => tid === match.away_team_id || tid === match.away_team?.id;

    const getScoreValue = (score: unknown): number => {
        if (!score) return 0;
        if (typeof score === 'object' && score !== null && 'total' in score) {
            return Number((score as Record<string, unknown>).total) || 0;
        }
        return Number(score) || 0;
    };

    const dbHomeScore = getScoreValue(match.home_score);
    const dbAwayScore = getScoreValue(match.away_score);

    const homeScore = match.status === 'finished' ? dbHomeScore : Math.max(dbHomeScore, events.filter((e: MatchEvent) => e.team_id && isHomeTeam(e.team_id) && e.event_type === 'goal').length);
    const awayScore = match.status === 'finished' ? dbAwayScore : Math.max(dbAwayScore, events.filter((e: MatchEvent) => e.team_id && isAwayTeam(e.team_id) && e.event_type === 'goal').length);

    // Size presets
    const sizeClasses = {
        small: "scale-75 origin-center",
        medium: "scale-100",
        large: "scale-125 origin-center",
    };

    // Filter goals for mini timeline
    const goalEvents = events.filter((e) => e.event_type === "goal");

    const displayHeaderText = headerText || tournamentName;

    return (
        <div
            className={cn(
                "min-h-screen w-full select-none overflow-hidden relative transition-colors duration-300 custom-font-style",
                bgType === "chromakey" ? "bg-[#00ff00]" : "bg-transparent"
            )}
        >
            <style dangerouslySetInnerHTML={{ __html: `
                ${fontImports[font] || fontImports.inter}
                .custom-font-style {
                    ${fontFamilies[font] || fontFamilies.inter}
                }
            ` }} />

            {/* Scoreboard positioning wrapper */}
            <div className={cn(
                "fixed inset-0 p-8 pointer-events-none flex flex-col gap-3",
                posY === "top" ? "justify-start" : "justify-end",
                posX === "left" ? "items-start" : posX === "right" ? "items-end" : "items-center"
            )}>
                {/* Scoreboard Content Group */}
                <div className={cn("pointer-events-auto flex flex-col items-center", sizeClasses[size as keyof typeof sizeClasses])}>
                    
                    {searchParams.get("blocks") !== null ? (
                        searchParams.get("positions") !== null ? (
                            /* Canvas Layout Builder (Absolute coordinates positioning) */
                            <div className="relative w-[400px] h-[180px] bg-transparent">
                                {(searchParams.get("blocks") || "").split(",").filter(Boolean).map((blockId) => {
                                    const cfg = blockConfigs[blockId] || { x: 0, y: 0, w: 80, h: 40, fontSize: 14, rTL: 8, rTR: 8, rBL: 8, rBR: 8 };
                                    const absoluteStyle: React.CSSProperties = {
                                        position: "absolute",
                                        left: "50%",
                                        top: "50%",
                                        transform: `translate(calc(-50% + ${cfg.x}px), calc(-50% + ${cfg.y}px))`,
                                        width: `${cfg.w}px`,
                                        height: `${cfg.h}px`,
                                        fontSize: `${cfg.fontSize}px`,
                                        borderTopLeftRadius: `${cfg.rTL}px`,
                                        borderTopRightRadius: `${cfg.rTR}px`,
                                        borderBottomLeftRadius: `${cfg.rBL}px`,
                                        borderBottomRightRadius: `${cfg.rBR}px`,
                                    };

                                    // 1. Home Name
                                    if (blockId === "name-home") {
                                        return (
                                            <div 
                                                key={blockId} 
                                                style={absoluteStyle}
                                                className="font-extrabold tracking-tight text-white flex items-center justify-center select-none bg-black/85 overflow-hidden"
                                            >
                                                {teamNameMode === "abbr" ? match.home_team?.name?.substring(0, 3) : match.home_team?.name}
                                                {homeBarDir !== "none" && (
                                                    <div
                                                        style={{
                                                            position: "absolute",
                                                            backgroundColor: homeBarColor,
                                                            ...(homeBarDir === "top" && { top: 0, left: 0, right: 0, height: "4px" }),
                                                            ...(homeBarDir === "right" && { top: 0, bottom: 0, right: 0, width: "4px" }),
                                                            ...(homeBarDir === "bottom" && { bottom: 0, left: 0, right: 0, height: "4px" }),
                                                            ...(homeBarDir === "left" && { top: 0, bottom: 0, left: 0, width: "4px" }),
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        );
                                    }
                                    // 2. Home Logo
                                    if (blockId === "logo-home") {
                                        return (
                                            <div 
                                                key={blockId} 
                                                style={absoluteStyle}
                                                className="p-1 shrink-0 flex items-center justify-center select-none bg-black/85 font-black text-[10px] tracking-tighter"
                                            >
                                                {match.home_team?.logo_url ? (
                                                    <img src={match.home_team.logo_url} alt="" className="max-w-full max-h-full object-contain rounded-sm" />
                                                ) : (
                                                    <span>{match.home_team?.name?.substring(0, 3)}</span>
                                                )}
                                            </div>
                                        );
                                    }
                                    // 3. Score
                                    if (blockId === "score") {
                                        return (
                                            <div 
                                                key={blockId} 
                                                style={{ ...absoluteStyle, backgroundColor: scoreBg }}
                                                className="flex items-center text-white font-black justify-center tracking-tighter shadow-inner"
                                            >
                                                <span>{homeScore}</span>
                                                <span className="mx-2 text-white/50 text-base font-normal">-</span>
                                                <span>{awayScore}</span>
                                            </div>
                                        );
                                    }
                                    // 3a. Home Score
                                    if (blockId === "score-home") {
                                        return (
                                            <div 
                                                key={blockId} 
                                                style={{ ...absoluteStyle, backgroundColor: scoreBg }}
                                                className="flex items-center text-white font-black justify-center tracking-tighter shadow-inner"
                                            >
                                                <span>{homeScore}</span>
                                            </div>
                                        );
                                    }
                                    // 3b. Away Score
                                    if (blockId === "score-away") {
                                        return (
                                            <div 
                                                key={blockId} 
                                                style={{ ...absoluteStyle, backgroundColor: scoreBg }}
                                                className="flex items-center text-white font-black justify-center tracking-tighter shadow-inner"
                                            >
                                                <span>{awayScore}</span>
                                            </div>
                                        );
                                    }
                                    // 4. Away Name
                                    if (blockId === "name-away") {
                                        return (
                                            <div 
                                                key={blockId} 
                                                style={absoluteStyle}
                                                className="font-extrabold tracking-tight text-white flex items-center justify-center select-none bg-black/85 overflow-hidden"
                                            >
                                                {teamNameMode === "abbr" ? match.away_team?.name?.substring(0, 3) : match.away_team?.name}
                                                {awayBarDir !== "none" && (
                                                    <div
                                                        style={{
                                                            position: "absolute",
                                                            backgroundColor: awayBarColor,
                                                            ...(awayBarDir === "top" && { top: 0, left: 0, right: 0, height: "4px" }),
                                                            ...(awayBarDir === "right" && { top: 0, bottom: 0, right: 0, width: "4px" }),
                                                            ...(awayBarDir === "bottom" && { bottom: 0, left: 0, right: 0, height: "4px" }),
                                                            ...(awayBarDir === "left" && { top: 0, bottom: 0, left: 0, width: "4px" }),
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        );
                                    }
                                    // 5. Away Logo
                                    if (blockId === "logo-away") {
                                        return (
                                            <div 
                                                key={blockId} 
                                                style={absoluteStyle}
                                                className="p-1 shrink-0 flex items-center justify-center select-none bg-black/85 font-black text-[10px] tracking-tighter"
                                            >
                                                {match.away_team?.logo_url ? (
                                                    <img src={match.away_team.logo_url} alt="" className="max-w-full max-h-full object-contain rounded-sm" />
                                                ) : (
                                                    <span>{match.away_team?.name?.substring(0, 3)}</span>
                                                )}
                                            </div>
                                        );
                                    }
                                    // 6. Timer
                                    if (blockId === "timer") {
                                        return (
                                            <div 
                                                key={blockId} 
                                                style={absoluteStyle}
                                                className="flex items-center justify-center text-white font-mono font-bold select-none bg-black/85"
                                            >
                                                {match.status === "finished" ? (
                                                    <span className="font-extrabold tracking-widest text-xs">FT</span>
                                                ) : match.status === "live" ? (
                                                    <span className={cn("font-bold", match.timer_status === "paused" && "")}>
                                                        {timeString}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-extrabold tracking-wider">PRE</span>
                                                )}
                                            </div>
                                        );
                                    }
                                    // 7. Header/Watermark Text
                                    if (blockId === "header-text" && displayHeaderText) {
                                        return (
                                            <div 
                                                key={blockId} 
                                                style={absoluteStyle}
                                                className="text-center font-black tracking-widest flex items-center justify-center select-none bg-black/85"
                                            >
                                                {displayHeaderText}
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        ) : (
                            /* Modular Blocks Flex Scoreboard */
                            <div 
                                className={cn(
                                    "flex",
                                    searchParams.get("orientation") === "vertical" ? "flex-col items-stretch" : "flex-row items-center",
                                    searchParams.get("blockBg") === "docked" ? cn("bg-black/85 shadow-2xl p-1.5", rounded === "none" ? "rounded-none" : rounded === "full" ? "rounded-full" : "rounded-xl") : "bg-transparent"
                                )}
                                style={{ gap: `${searchParams.get("blockGap") || "8"}px` }}
                            >
                                {(searchParams.get("blocks") || "").split(",").filter(Boolean).map((blockId) => {
                                    const activeRoundedClass = rounded === "none" ? "rounded-none" : rounded === "full" ? "rounded-full" : "rounded-xl";
                                    const isSpaced = searchParams.get("blockBg") !== "docked";
                                    
                                    // 1. Home Name
                                    if (blockId === "name-home") {
                                        return (
                                            <div 
                                                key={blockId} 
                                                className={cn(
                                                    "px-4 py-2 font-extrabold tracking-tight text-white text-sm flex items-center justify-center min-w-[70px] select-none h-12 relative overflow-hidden",
                                                    isSpaced ? cn("bg-black/85", activeRoundedClass) : "border-0"
                                                )}
                                            >
                                                {teamNameMode === "abbr" ? match.home_team?.name?.substring(0, 3) : match.home_team?.name}
                                                {homeBarDir !== "none" && (
                                                    <div
                                                        style={{
                                                            position: "absolute",
                                                            backgroundColor: homeBarColor,
                                                            ...(homeBarDir === "top" && { top: 0, left: 0, right: 0, height: "4px" }),
                                                            ...(homeBarDir === "right" && { top: 0, bottom: 0, right: 0, width: "4px" }),
                                                            ...(homeBarDir === "bottom" && { bottom: 0, left: 0, right: 0, height: "4px" }),
                                                            ...(homeBarDir === "left" && { top: 0, bottom: 0, left: 0, width: "4px" }),
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        );
                                    }
                                    // 2. Home Logo
                                    if (blockId === "logo-home") {
                                        return (
                                            <div 
                                                key={blockId} 
                                                className={cn(
                                                    "p-1 shrink-0 flex items-center justify-center h-12 w-12 select-none font-black text-[10px] tracking-tighter",
                                                    isSpaced ? cn("bg-black/85", activeRoundedClass) : "border-0"
                                                )}
                                            >
                                                {match.home_team?.logo_url ? (
                                                    <img src={match.home_team.logo_url} alt="" className="w-8 h-8 object-contain rounded-sm" />
                                                ) : (
                                                    <span>{match.home_team?.name?.substring(0, 3)}</span>
                                                )}
                                            </div>
                                        );
                                    }
                                    // 3. Score
                                    if (blockId === "score") {
                                        return (
                                            <div 
                                                key={blockId} 
                                                className={cn(
                                                    "flex items-center text-white font-black text-xl h-12 px-5 justify-center tracking-tighter shadow-inner min-w-[90px]",
                                                    isSpaced ? cn("border border-white/10", activeRoundedClass) : "border-0"
                                                )}
                                                style={{ backgroundColor: scoreBg }}
                                            >
                                                <span>{homeScore}</span>
                                                <span className="mx-2 text-white/50 text-base font-normal">-</span>
                                                <span>{awayScore}</span>
                                            </div>
                                        );
                                    }
                                    // 3a. Home Score
                                    if (blockId === "score-home") {
                                        return (
                                            <div 
                                                key={blockId} 
                                                className={cn(
                                                    "flex items-center text-white font-black text-xl h-12 px-4 justify-center tracking-tighter shadow-inner min-w-[45px]",
                                                    isSpaced ? cn("border border-white/10", activeRoundedClass) : "border-0"
                                                )}
                                                style={{ backgroundColor: scoreBg }}
                                            >
                                                <span>{homeScore}</span>
                                            </div>
                                        );
                                    }
                                    // 3b. Away Score
                                    if (blockId === "score-away") {
                                        return (
                                            <div 
                                                key={blockId} 
                                                className={cn(
                                                    "flex items-center text-white font-black text-xl h-12 px-4 justify-center tracking-tighter shadow-inner min-w-[45px]",
                                                    isSpaced ? cn("border border-white/10", activeRoundedClass) : "border-0"
                                                )}
                                                style={{ backgroundColor: scoreBg }}
                                            >
                                                <span>{awayScore}</span>
                                            </div>
                                        );
                                    }
                                    // 4. Away Name
                                    if (blockId === "name-away") {
                                        return (
                                            <div 
                                                key={blockId} 
                                                className={cn(
                                                    "px-4 py-2 font-extrabold tracking-tight text-white text-sm flex items-center justify-center min-w-[70px] select-none h-12 relative overflow-hidden",
                                                    isSpaced ? cn("bg-black/85", activeRoundedClass) : "border-0"
                                                )}
                                            >
                                                {teamNameMode === "abbr" ? match.away_team?.name?.substring(0, 3) : match.away_team?.name}
                                                {awayBarDir !== "none" && (
                                                    <div
                                                        style={{
                                                            position: "absolute",
                                                            backgroundColor: awayBarColor,
                                                            ...(awayBarDir === "top" && { top: 0, left: 0, right: 0, height: "4px" }),
                                                            ...(awayBarDir === "right" && { top: 0, bottom: 0, right: 0, width: "4px" }),
                                                            ...(awayBarDir === "bottom" && { bottom: 0, left: 0, right: 0, height: "4px" }),
                                                            ...(awayBarDir === "left" && { top: 0, bottom: 0, left: 0, width: "4px" }),
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        );
                                    }
                                    // 5. Away Logo
                                    if (blockId === "logo-away") {
                                        return (
                                            <div 
                                                key={blockId} 
                                                className={cn(
                                                    "p-1 shrink-0 flex items-center justify-center h-12 w-12 select-none font-black text-[10px] tracking-tighter",
                                                    isSpaced ? cn("bg-black/85", activeRoundedClass) : "border-0"
                                                )}
                                            >
                                                {match.away_team?.logo_url ? (
                                                    <img src={match.away_team.logo_url} alt="" className="w-8 h-8 object-contain rounded-sm" />
                                                ) : (
                                                    <span>{match.away_team?.name?.substring(0, 3)}</span>
                                                )}
                                            </div>
                                        );
                                    }
                                    // 6. Timer
                                    if (blockId === "timer") {
                                        return (
                                            <div 
                                                key={blockId} 
                                                className={cn(
                                                    "flex items-center justify-center px-4 text-white font-mono text-sm font-bold min-w-[90px] h-12 select-none",
                                                    isSpaced ? cn("bg-black/85", activeRoundedClass) : "border-0"
                                                )}
                                            >
                                                {match.status === "finished" ? (
                                                    <span className="text-red-500 font-extrabold tracking-widest text-xs">FT</span>
                                                ) : match.status === "live" ? (
                                                    <span className={cn("text-emerald-400 font-bold", match.timer_status === "paused" && "text-amber-400")}>
                                                        {timeString}
                                                    </span>
                                                ) : (
                                                    <span className="text-white/60 text-xs font-extrabold tracking-wider">PRE</span>
                                                )}
                                            </div>
                                        );
                                    }
                                    // 7. Header/Watermark Text
                                    if (blockId === "header-text" && displayHeaderText) {
                                        return (
                                            <div 
                                                key={blockId} 
                                                className={cn(
                                                    "px-4 text-[10px] font-black text-white/70 tracking-widest flex items-center justify-center select-none h-12",
                                                    isSpaced ? cn("bg-black/85", activeRoundedClass) : "border-0"
                                                )}
                                            >
                                                {displayHeaderText}
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        )
                    ) : (
                        /* Legacy Scoreboards (Fallback) */
                        <>
                            {/* Top Bar Scoreboard Style */}
                            {layout === "top-bar" && (
                                <div className="flex flex-col items-center">
                                    {displayHeaderText && (
                                        <div className="bg-black/85 text-[10px] font-black text-white/70 tracking-widest px-4 py-1.5 rounded-t-xl border-t border-x border-white/10 mb-[-1px] select-none">
                                            {displayHeaderText}
                                        </div>
                                    )}
                                    <div className={cn(
                                        "flex items-center bg-black/85 shadow-2xl overflow-hidden h-14",
                                        displayHeaderText ? "rounded-b-xl rounded-t-none" : "rounded-xl"
                                    )}>
                                        {/* Home Team */}
                                        <div className="flex items-center gap-3 px-5 py-2">
                                            {showLogos && (
                                                match.home_team?.logo_url ? (
                                                    <img
                                                        src={match.home_team.logo_url}
                                                        alt={match.home_team.name}
                                                        className="w-7 h-7 object-contain rounded-sm"
                                                    />
                                                ) : (
                                                    <div className="w-7 h-7 bg-white/5 rounded flex items-center justify-center text-[10px] font-black tracking-tighter select-none">
                                                        {match.home_team?.name?.substring(0, 3)}
                                                    </div>
                                                )
                                            )}
                                            <span className="font-extrabold tracking-tight text-white text-base max-w-[120px] truncate">
                                                {teamNameMode === "abbr" ? match.home_team?.name?.substring(0, 3) : match.home_team?.name}
                                            </span>
                                        </div>

                                        {/* Score Box */}
                                        <div 
                                            className="flex items-center text-white font-black text-2xl h-full px-6 border-x border-white/15 min-w-[100px] justify-center tracking-tighter shadow-inner"
                                            style={{ backgroundColor: scoreBg }}
                                        >
                                            <span>{homeScore}</span>
                                            <span className="mx-2 text-white/50 text-base font-normal">-</span>
                                            <span>{awayScore}</span>
                                        </div>

                                        {/* Away Team */}
                                        <div className="flex items-center gap-3 px-5 py-2 flex-row-reverse">
                                            {showLogos && (
                                                match.away_team?.logo_url ? (
                                                    <img
                                                        src={match.away_team.logo_url}
                                                        alt={match.away_team.name}
                                                        className="w-7 h-7 object-contain rounded-sm"
                                                    />
                                                ) : (
                                                    <div className="w-7 h-7 bg-white/5 rounded flex items-center justify-center text-[10px] font-black tracking-tighter select-none">
                                                        {match.away_team?.name?.substring(0, 3)}
                                                    </div>
                                                )
                                            )}
                                            <span className="font-extrabold tracking-tight text-white text-base max-w-[120px] truncate">
                                                {teamNameMode === "abbr" ? match.away_team?.name?.substring(0, 3) : match.away_team?.name}
                                            </span>
                                        </div>

                                        {/* Timer / Status Area */}
                                        <div className="flex items-center justify-center bg-white/5 border-l border-white/10 px-5 text-white h-full font-mono text-sm font-bold min-w-[95px]">
                                            {match.status === "finished" ? (
                                                <span className="text-red-500 font-extrabold tracking-widest text-xs">FT</span>
                                            ) : match.status === "live" ? (
                                                <span className={cn("text-emerald-400 font-bold", match.timer_status === "paused" && "text-amber-400")}>
                                                    {timeString}
                                                </span>
                                            ) : (
                                                <span className="text-white/60 text-xs font-extrabold tracking-wider">PRE</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Minimal Corner Scoreboard Style */}
                            {(layout === "minimal-left" || layout === "minimal-right") && (
                                <div className="bg-black/90 rounded-xl shadow-2xl p-3 flex flex-col gap-2 min-w-[240px]">
                                    {/* Header with Timer/Status */}
                                    <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[10px] font-bold text-white/50 tracking-wider">
                                        <span>{displayHeaderText || "LEAGUEFLOW OVERLAY"}</span>
                                        <span className={cn("font-mono text-xs text-white", match.status === "live" && match.timer_status === "paused" && "text-amber-400")}>
                                            {match.status === "finished" ? "FULL TIME" : match.status === "live" ? timeString : "UPCOMING"}
                                        </span>
                                    </div>

                                    {/* Home Row */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {showLogos && (
                                                <div className="w-5 h-5 bg-white/5 rounded flex items-center justify-center overflow-hidden text-[8px] font-black tracking-tighter">
                                                    {match.home_team?.logo_url ? (
                                                        <img src={match.home_team.logo_url} alt="" className="w-4 h-4 object-contain" />
                                                    ) : (
                                                        <span>{match.home_team?.name?.substring(0, 3)}</span>
                                                    )}
                                                </div>
                                            )}
                                            <span className="font-extrabold text-sm text-white tracking-tight">
                                                {teamNameMode === "abbr" ? match.home_team?.name?.substring(0, 3) : match.home_team?.name}
                                            </span>
                                        </div>
                                        <span className="font-black text-lg" style={{ color: scoreBg }}>{homeScore}</span>
                                    </div>

                                    {/* Away Row */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {showLogos && (
                                                <div className="w-5 h-5 bg-white/5 rounded flex items-center justify-center overflow-hidden text-[8px] font-black tracking-tighter">
                                                    {match.away_team?.logo_url ? (
                                                        <img src={match.away_team.logo_url} alt="" className="w-4 h-4 object-contain" />
                                                    ) : (
                                                        <span>{match.away_team?.name?.substring(0, 3)}</span>
                                                    )}
                                                </div>
                                            )}
                                            <span className="font-extrabold text-sm text-white tracking-tight">
                                                {teamNameMode === "abbr" ? match.away_team?.name?.substring(0, 3) : match.away_team?.name}
                                            </span>
                                        </div>
                                        <span className="font-black text-lg" style={{ color: scoreBg }}>{awayScore}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Mini Goal Scorer Timeline Ticker Overlay */}
                    {showTimeline && goalEvents.length > 0 && (
                        <div className="flex flex-col gap-1 mt-2.5 max-h-[160px] overflow-hidden items-center select-none">
                            {goalEvents.slice(0, 3).map((e) => (
                                <div key={e.id} className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 text-[10px] font-bold text-white/80 shadow-md">
                                    <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>{e.player_name} ({e.minute}&apos;)</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Live Ticker Alert Popup Banner */}
            <div className={cn(
                "absolute left-0 right-0 flex justify-center pointer-events-none z-50",
                posY === "top" ? "bottom-10" : "top-10"
            )}>
                <div
                    className={cn(
                        "transition-all duration-700 transform flex items-center gap-4 bg-black/95 border border-white/15 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] px-8 py-4 pointer-events-auto",
                        activeNotification
                            ? "translate-y-0 opacity-100 scale-100"
                            : posY === "top" ? "translate-y-10 opacity-0 scale-90" : "-translate-y-10 opacity-0 scale-90"
                    )}
                >
                    {activeNotification?.type === "goal" && (
                        <>
                            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-emerald-500/35 animate-bounce">
                                <Trophy className="w-6 h-6 text-black fill-black" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-emerald-400 font-black text-2xl tracking-tighter leading-none">GOAL!</span>
                                <span className="text-white font-extrabold text-lg mt-0.5 leading-none">
                                    {activeNotification.player}
                                </span>
                                <span className="text-white/50 font-bold text-xs mt-1">
                                    {activeNotification.teamName} • {activeNotification.minute}&apos;
                                </span>
                            </div>
                        </>
                    )}

                    {(activeNotification?.type === "yellow_card" || activeNotification?.type === "red_card") && (
                        <>
                            <div
                                className={cn(
                                    "w-10 h-12 rounded flex items-center justify-center transform rotate-6",
                                    activeNotification.type === "yellow_card"
                                        ? "bg-yellow-400 shadow-yellow-400/25"
                                        : "bg-red-600 shadow-red-600/25"
                                )}
                            >
                                <Square className={cn("w-5 h-6", activeNotification.type === "yellow_card" ? "text-black fill-black" : "text-white fill-white")} />
                            </div>
                            <div className="flex flex-col">
                                <span
                                    className={cn(
                                        "font-black text-2xl tracking-tighter leading-none",
                                        activeNotification.type === "yellow_card" ? "text-yellow-400" : "text-red-500"
                                    )}
                                >
                                    {activeNotification.type === "yellow_card" ? "YELLOW CARD" : "RED CARD"}
                                </span>
                                <span className="text-white font-extrabold text-lg mt-0.5 leading-none">
                                    {activeNotification.player}
                                </span>
                                <span className="text-white/50 font-bold text-xs mt-1">
                                    {activeNotification.teamName} • {activeNotification.minute}&apos;
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function BroadcastOverlay() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center text-white/50 text-xs font-mono select-none">
                Loading overlay...
            </div>
        }>
            <BroadcastOverlayContent />
        </Suspense>
    );
}
