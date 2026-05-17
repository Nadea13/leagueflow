"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { addDays, subDays, addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MatchCard } from "../matches/match-card";
import { getPublicMatches } from "@/actions/public/public-matches";
import { formatDate } from "@/lib/date";
import { Link } from "@/i18n/routing";
import { Match, Tournament } from "@/types";

type PublicMatch = Match & { tournaments: Tournament };

export function PublicMatchesHome() {
    const t = useTranslations("Home");

    const locale = useLocale();
    const [matches, setMatches] = useState<PublicMatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedDate, setSelectedDate] = useState<string | null>(() => {
        // Default to today's date in YYYY-MM-DD format
        return format(new Date(), 'yyyy-MM-dd');
    });

    // Extract all unique tournaments from matches
    const allTournaments = useMemo(() => {
        const unique = new Map();
        matches.forEach((m) => {
            if (m.tournaments && !unique.has(m.tournament_id)) {
                unique.set(m.tournament_id, {
                    id: m.tournament_id,
                    name: m.tournaments.name
                });
            }
        });
        return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [matches]);

    const selectedRef = useRef<HTMLButtonElement>(null);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Month for the calendar picker dropdown
    const [viewDate, setViewDate] = useState(new Date());

    useEffect(() => {
        const fetchMatches = async () => {
            setIsLoading(true);
            try {
                const data = await getPublicMatches();
                setMatches(data || []);
            } catch (_error) {
                console.error("Failed to fetch matches:", _error);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(fetchMatches, 300);
        return () => clearTimeout(timer);
    }, []);

    // Scroll logic (less critical now without scroller, but useful for reference)
    useEffect(() => {
        if (selectedDate && selectedRef.current) {
            selectedRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, [selectedDate]);

    const goToPrevDay = () => {
        const current = selectedDate ? new Date(selectedDate) : new Date();
        const prev = subDays(current, 1);
        setSelectedDate(format(prev, 'yyyy-MM-dd'));
    };

    const goToNextDay = () => {
        const current = selectedDate ? new Date(selectedDate) : new Date();
        const next = addDays(current, 1);
        setSelectedDate(format(next, 'yyyy-MM-dd'));
    };

    // Calendar Grid Logic
    const calendarDays = useMemo(() => {
        const startOfViewMonth = startOfMonth(viewDate);
        const endOfViewMonth = endOfMonth(viewDate);
        const firstDay = getDay(startOfViewMonth);
        
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        
        const interval = eachDayOfInterval({ start: startOfViewMonth, end: endOfViewMonth });
        interval.forEach(day => days.push(day));
        
        return days;
    }, [viewDate]);





    // Set of dates that have matches for the dot indicator
    const datesWithMatches = useMemo(() => {
        return new Set(matches.map(m => m.match_date).filter(Boolean));
    }, [matches]);

    const filteredMatches = useMemo(() => {
        return matches.filter(m => {
            
            const matchesDate = !selectedDate || m.match_date === selectedDate;
            
            return matchesDate;
        });
    }, [matches, selectedDate]);

    // Group matches by date and tournament
    const groupedMatches = filteredMatches.reduce((acc: Record<string, Record<string, PublicMatch[]>>, match) => {
        const date = match.match_date || "TBD";
        const tournamentName = match.tournaments?.name || "Tournament";
        if (!acc[date]) acc[date] = {};
        if (!acc[date][tournamentName]) acc[date][tournamentName] = [];
        acc[date][tournamentName].push(match);
        return acc;
    }, {});

    const sortedDates = Object.keys(groupedMatches)
        .sort((a, b) => {
            if (a === "TBD") return 1;
            if (b === "TBD") return -1;
            return new Date(b).getTime() - new Date(a).getTime();
        });

    return (
        <div className="space-y-6">

            {/* Navigation Header */}
            {!isLoading && (
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                    <div className="flex items-center gap-1 bg-muted/5 border border-border/40 p-1 w-full">
                        <button
                            onClick={() => setSelectedDate(null)}
                            className={cn(
                                "px-6 py-2 text-xs font-black tracking-tighter transition-all shrink-0",
                                selectedDate === null 
                                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                                    : "text-muted-foreground/60 hover:text-primary"
                            )}
                        >
                            {locale === 'th' ? "ทั้งหมด" : "ALL"}
                        </button>
                        
                        <div className="h-4 w-[1px] bg-border/40 mx-1 shrink-0" />

                        <div className="flex items-center flex-1">
                            <button
                                onClick={goToPrevDay}
                                className="p-3 hover:text-primary text-muted-foreground/40 transition-colors shrink-0"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>

                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <button className="px-4 py-2 flex items-center justify-center gap-4 hover:bg-muted/10 transition-all border-x border-border/10 flex-1 min-h-[56px]">
                                        <CalendarIcon className="h-5 w-5 text-primary animate-pulse shrink-0" />
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-black tracking-tighter text-primary leading-none mb-1">
                                                {selectedDate ? formatDate(selectedDate, "EEE", locale) : (locale === 'th' ? "วันนี้" : "TODAY")}
                                            </span>
                                            <span className="text-base font-black tracking-tight">
                                                {selectedDate ? formatDate(selectedDate, "d MMM yyyy", locale) : formatDate(new Date(), "d MMM yyyy", locale)}
                                            </span>
                                        </div>
                                    </button>
                                </PopoverTrigger>

                                <PopoverContent className="w-80 p-0 bg-background border-border/40 shadow-2xl" align="center">
                                    <div className="p-4 border-b border-border/40 flex items-center justify-between bg-muted/5">
                                        <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-1 hover:text-primary">
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <span className="text-sm font-black tracking-tighter">
                                            {viewDate.toLocaleString(locale === 'th' ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' })}
                                        </span>
                                        <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-1 hover:text-primary">
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="p-4">
                                        <div className="grid grid-cols-7 gap-1 mb-2">
                                            {(locale === 'th' ? ['อา','จ','อ','พ','พฤ','ศ','ส'] : ['S','M','T','W','T','F','S']).map((d, idx) => (
                                                <div key={`${d}-${idx}`} className="text-[10px] text-center font-black opacity-30">{d}</div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-1">
                                            {calendarDays.map((day, i) => {
                                                if (!day) return <div key={`empty-${i}`} />;
                                                const dateStr = format(day, 'yyyy-MM-dd');
                                                const isSel = selectedDate === dateStr;
                                                const hasMatch = datesWithMatches.has(dateStr);
                                                const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

                                                return (
                                                    <button
                                                        key={dateStr}
                                                        onClick={() => {
                                                            setSelectedDate(dateStr);
                                                            setIsCalendarOpen(false);
                                                        }}
                                                        className={cn(
                                                            "h-9 flex flex-col items-center justify-center relative transition-all",
                                                            isSel ? "bg-primary text-primary-foreground font-black" : "hover:bg-muted/10",
                                                            isToday && !isSel && "border border-primary/30 text-primary"
                                                        )}
                                                    >
                                                        <span className="text-xs">{format(day, 'd')}</span>
                                                        {hasMatch && (
                                                            <div className={cn(
                                                                "absolute bottom-1 h-1 w-1 rounded-full",
                                                                isSel ? "bg-primary-foreground" : "bg-primary"
                                                            )} />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
                                                setViewDate(new Date());
                                                setIsCalendarOpen(false);
                                            }}
                                            className="w-full mt-4 py-2 border border-border/40 text-[10px] font-black hover:border-primary transition-all"
                                        >
                                            {locale === 'th' ? "กลับไปที่วันนี้" : "BACK TO TODAY"}
                                        </button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <button
                                onClick={goToNextDay}
                                className="p-2 hover:text-primary text-muted-foreground/40 transition-colors"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                <div className="flex-1 w-full space-y-12">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-6 bg-muted/5 border border-dashed border-border/40 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative">
                                <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
                            </div>
                            <p className="text-primary font-black tracking-[0.3em] text-xs animate-pulse relative z-10">{t("searching") || "LOADING MATCHES..."}</p>
                        </div>
                    ) : filteredMatches.length === 0 ? (
                        <div className="text-center py-24 border border-dashed border-border/40 bg-muted/5 relative overflow-hidden group">
                            <p className="text-4xl font-black tracking-tighter text-muted-foreground/10 mb-2">{t("no_results") || "NO MATCHES FOUND"}</p>
                            <Button 
                                variant="outline" 
                                onClick={() => {
                                    setSelectedDate(null);
                                }}
                                className="font-black tracking-tighter"
                            >
                                {locale === 'th' ? "ดูแมตช์ทั้งหมด" : "SEE ALL MATCHES"}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {sortedDates.map(date => (
                                <div key={date} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="flex items-center gap-4 bg-muted/5 border-l-4 border-primary p-4">
                                        <CalendarIcon className="h-6 w-6 text-primary" />
                                        <h3 className="text-2xl font-black tracking-tighter">
                                            {date === "TBD" ? (locale === 'th' ? "รอกำหนดการ" : "To Be Determined") : formatDate(date, "EEEE, d MMM yyyy", locale)}
                                        </h3>
                                    </div>

                                    <div className="space-y-12 pl-4 sm:pl-8 border-l border-border/10">
                                        {Object.entries(groupedMatches[date]).map(([tournamentName, tournamentMatches]) => (
                                            <div key={tournamentName} className="space-y-6">
                                                <div className="flex items-center gap-3 group/tour">
                                                    <div className="h-8 w-1 bg-primary/20 group-hover/tour:bg-primary transition-all" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black tracking-[0.2em] text-primary/40 leading-none mb-1">TOURNAMENT</span>
                                                        <h4 className="text-lg font-black tracking-tight text-foreground group-hover/tour:text-primary transition-colors">
                                                            {tournamentName}
                                                        </h4>
                                                    </div>
                                                    <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent ml-4" />
                                                </div>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {tournamentMatches.map((match) => (
                                                        <MatchCard 
                                                            key={match.id} 
                                                            match={match} 
                                                            tournamentId={match.tournament_id}
                                                            isPublic={true}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {!isLoading && allTournaments.length > 0 && (
                    <div className="w-full lg:w-80 shrink-0 space-y-6">
                        <div className="bg-muted/5 border border-border/40 p-6 sticky top-24 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <Trophy className="h-6 w-6 text-primary" />
                                    <h3 className="text-2xl font-black tracking-tighter">
                                        {locale === 'th' ? "รายการแข่ง" : "TOURNAMENTS"}
                                    </h3>
                                </div>
                            </div>

                            <div className="space-y-2">

                                {allTournaments.map((tournament) => (
                                    <Link
                                        key={tournament.id}
                                        href={`/${tournament.id}`}
                                        className="w-full text-left px-4 py-4 text-sm font-black tracking-tight transition-all relative group border-l-2 block border-transparent text-muted-foreground/40 hover:text-foreground hover:bg-muted/5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="truncate pr-4">{tournament.name}</span>
                                            <Trophy className="h-3 w-3 transition-all duration-300 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-40" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
