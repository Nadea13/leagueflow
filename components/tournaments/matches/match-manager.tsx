"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Match, Team } from "@/types/index";
import { MatchCard } from "@/components/tournaments/matches/match-card";
import { MatchGenerator } from "@/components/tournaments/matches/match-generator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { advanceStage } from "@/actions/organizer/tournaments/general";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Calendar as CalendarIcon,
    ArrowRight,
    ChevronRight,
    ChevronLeft,
    Loader2,
    Trophy,
    Settings2,
    CalendarCheck
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ExportToImageButton } from "@/components/ui/export-to-image-button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { addDays, subDays, addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { formatDate } from "@/lib/date";

interface FixturesManagerProps {
    teams: Team[];
    matches: Match[];
    tournamentId: string;
    format?: string;
    isPro?: boolean;
    hideControls?: boolean;
    startDate?: string | null;
    endDate?: string | null;
    externalEditMode?: boolean;
    externalFilterStage?: string;
    externalSelectedDate?: string | null;
}

export function MatchManager({
    matches,
    teams,
    tournamentId,
    format: tournamentFormat,
    hideControls = false,
    startDate,
    endDate,
    externalEditMode = false,
    externalFilterStage = "all",
    externalSelectedDate = null
}: FixturesManagerProps) {
    const t = useTranslations("Tournament");
    const tMatch = useTranslations("Match");
    const tFixtures = useTranslations("Fixtures");
    const tBracket = useTranslations("Bracket");
    const locale = useLocale();

    const [isEditMode, setIsEditMode] = useState(externalEditMode);
    const [filterStage, setFilterStage] = useState<string>(externalFilterStage);
    const [selectedDate, setSelectedDate] = useState<string | null>(externalSelectedDate);

    // Sync external states
    useEffect(() => {
        setIsEditMode(externalEditMode);
    }, [externalEditMode]);

    useEffect(() => {
        setFilterStage(externalFilterStage);
    }, [externalFilterStage]);

    useEffect(() => {
        setSelectedDate(externalSelectedDate);
    }, [externalSelectedDate]);

    const [isAdvancing, setIsAdvancing] = useState(false);
    const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Extract dates with matches for the calendar indicator
    const datesWithMatches = useMemo(() => {
        return new Set(matches.map(m => m.match_date).filter(Boolean));
    }, [matches]);

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

    // Filter Logic
    const filteredMatches = matches.filter(match => {
        // Date Filter
        const matchesDate = !selectedDate || match.match_date === selectedDate;
        if (!matchesDate) return false;

        // Stage Filter
        if (filterStage === "all") return true;
        if (filterStage.startsWith("Group")) {
            const groupLetter = filterStage.split(" ")[1];
            if (match.stage !== 'group') return false;
            const homeGroup = teams.find(t => t.id === match.home_team_id)?.group_name;
            const awayGroup = teams.find(t => t.id === match.away_team_id)?.group_name;
            return homeGroup === groupLetter || awayGroup === groupLetter;
        }
        return match.stage === filterStage;
    });

    // Group matches by date and stage
    const groupedMatches = filteredMatches.reduce((acc: Record<string, Record<string, Match[]>>, match) => {
        const date = match.match_date || "TBD";

        // Determine stage label
        let stageLabel = "";
        if (match.stage === 'round_of_16') stageLabel = tBracket("round_of_16");
        else if (match.stage === 'quarter_final') stageLabel = tBracket("quarter_final");
        else if (match.stage === 'semi_final') stageLabel = tBracket("semi_final");
        else if (match.stage === 'final') stageLabel = tBracket("final");
        else if (match.stage === 'group') stageLabel = tMatch("group");
        else stageLabel = match.stage?.replace('_', ' ').toUpperCase() || "UNKNOWN";

        if (!acc[date]) acc[date] = {};
        if (!acc[date][stageLabel]) acc[date][stageLabel] = [];
        acc[date][stageLabel].push(match);
        return acc;
    }, {});

    const sortedDates = Object.keys(groupedMatches)
        .sort((a, b) => {
            if (a === "TBD") return 1;
            if (b === "TBD") return -1;
            return new Date(a).getTime() - new Date(b).getTime(); // Chronological for manager
        });

    const handleAdvance = async () => {
        setAdvanceDialogOpen(false);
        setIsAdvancing(true);
        try {
            const result = await advanceStage(tournamentId);
            if (!result.success) {
                alert(result.error);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to advance stage");
        } finally {
            setIsAdvancing(false);
        }
    };

    return (
        <div className="space-y-2 md:space-y-3">
            {matches.length === 0 ? (
                <EmptyState
                    icon={CalendarIcon}
                    title={tFixtures("ready_to_start")}
                    description={tFixtures("generate_instruction")}
                    className="py-24 border border-dashed"
                />
            ) : (
                <>
                    {/* Navigation & Filter Header */}
                    <div className="flex flex-col gap-2 md:gap-3">
                        {!hideControls && (
                        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
                            <div className="flex items-center border w-full md:w-auto md:min-w-[400px]">
                                <button
                                    onClick={() => setSelectedDate(null)}
                                    className={cn(
                                        "p-2 ml-1 text-xs font-black tracking-tighter transition-all shrink-0",
                                        selectedDate === null
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground/60 hover:text-primary"
                                    )}
                                >
                                    {locale === 'th' ? "ทั้งหมด" : "All"}
                                </button>

                                <div className="flex items-center flex-1">
                                    <button
                                        onClick={goToPrevDay}
                                        className="p-2 md:p- hover:text-primary text-muted-foreground/60 transition-colors shrink-0"
                                    >
                                        <ChevronLeft className="h-6 w-6" />
                                    </button>

                                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                        <PopoverTrigger asChild>
                                            <button className="group flex items-center justify-center gap-2 md:gap-3 transition-all flex-1">
                                                <CalendarIcon className="h-6 w-6 text-primary animate-pulse shrink-0" />
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] font-black tracking-tighter text-primary leading-none">
                                                        {selectedDate ? formatDate(selectedDate, "EEE", locale) : (locale === 'th' ? "วันนี้" : "TODAY")}
                                                    </span>
                                                    <span className="text-sm font-black tracking-tight group-hover:text-primary transition-colors">
                                                        {selectedDate ? formatDate(selectedDate, "d MMM yyyy", locale) : formatDate(new Date(), "d MMM yyyy", locale)}
                                                    </span>
                                                </div>
                                            </button>
                                        </PopoverTrigger>

                                        <PopoverContent className="w-80 p-0 bg-card shadow-2xl" align="center">
                                            <div className="p-2 border-b flex items-center justify-between bg-muted/5">
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
                                            <div className="p-2 space-y-2 md:space-y-3">
                                                <div className="grid grid-cols-7 gap-1">
                                                    {(locale === 'th' ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']).map((d, idx) => (
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

                                                        // Check if date is within tournament range
                                                        const isOutsideRange = !!((startDate && dateStr < startDate) || (endDate && dateStr > endDate));

                                                        return (
                                                            <button
                                                                key={dateStr}
                                                                disabled={isOutsideRange}
                                                                onClick={() => {
                                                                    setSelectedDate(dateStr);
                                                                    setIsCalendarOpen(false);
                                                                }}
                                                                className={cn(
                                                                    "h-8 flex flex-col items-center justify-center relative transition-all",
                                                                    isSel ? "bg-primary text-primary-foreground font-black" : "hover:bg-muted",
                                                                    isToday && !isSel && "border border-primary text-primary",
                                                                    isOutsideRange && "opacity-30 cursor-not-allowed grayscale"
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
                                                    className="w-full py-2 border text-[10px] font-black hover:border-primary transition-all"
                                                >
                                                    {locale === 'th' ? "กลับไปที่วันนี้" : "BACK TO TODAY"}
                                                </button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>

                                    <button
                                        onClick={goToNextDay}
                                        className="p-2 hover:text-primary text-muted-foreground/60 transition-colors shrink-0"
                                    >
                                        <ChevronRight className="h-6 w-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Stage Filter - Integrated Style */}
                            <div className="w-full">
                                <Select value={filterStage} onValueChange={setFilterStage}>
                                    <SelectTrigger className="w-full focus:ring-0 font-black">
                                        <div className="flex flex-col items-start">
                                            <SelectValue placeholder={tMatch("round")} />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="bg-background rounded-none shadow-2xl">
                                        <SelectItem value="all" className="font-black text-xs">{tMatch("round")} ({tMatch("all")})</SelectItem>
                                        <SelectItem value="group" className="font-black text-xs">{tMatch("group")}</SelectItem>
                                        {['A', 'B', 'C', 'D'].map(l => (
                                            <SelectItem key={l} value={`Group ${l}`} className="font-black text-xs">{tMatch("group")} {l}</SelectItem>
                                        ))}
                                        <SelectItem value="round_of_16" className="font-black text-xs">{tMatch("round_of_16")}</SelectItem>
                                        <SelectItem value="quarter_final" className="font-black text-xs">{tMatch("quarter_final")}</SelectItem>
                                        <SelectItem value="semi_final" className="font-black text-xs">{tMatch("semi_final")}</SelectItem>
                                        <SelectItem value="final" className="font-black text-xs">{tMatch("final")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        )}

                        {/* Management Controls */}
                        {!hideControls && (
                            <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3 border p-2 md:p-3">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id="edit-mode"
                                            checked={isEditMode}
                                            onCheckedChange={setIsEditMode}
                                            className="data-[state=checked]:bg-primary"
                                        />
                                        <Label htmlFor="edit-mode" className="text-[10px] font-black tracking-widest text-muted-foreground cursor-pointer flex items-center gap-2">
                                            <Settings2 className="h-3 w-3" />
                                            {t("edit_mode")}
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2 text-primary/40">
                                        <CalendarCheck className="h-4 w-4" />
                                        <span className="text-[10px] font-black tracking-widest">
                                            {matches.length} {tFixtures("matches")}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <MatchGenerator
                                        tournamentId={tournamentId}
                                        hasFixtures={matches.length > 0}
                                        format={tournamentFormat}
                                        className="h-10 w-auto px-4 text-[10px] font-black tracking-tighter"
                                    />
                                    <Button
                                        onClick={() => setAdvanceDialogOpen(true)}
                                        disabled={isAdvancing}
                                        className="h-10 px-4 bg-primary text-primary-foreground font-black tracking-tighter hover:bg-primary/90 transition-all text-[10px] rounded-none"
                                    >
                                        {isAdvancing ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                                        ) : (
                                            <ArrowRight className="h-3.5 w-3.5 mr-2" />
                                        )}
                                        {tFixtures("proceed_knockout")}
                                    </Button>
                                    <ExportToImageButton
                                        targetId="fixtures-canvas"
                                        filename="fixtures"
                                        label={t("export") || "Export"}
                                        className="h-10 px-4 border-border/40 text-[10px] font-black tracking-tighter rounded-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Match List */}
                    <div id="fixtures-canvas" className="space-y-2 md:space-y-3">
                        {filteredMatches.length === 0 ? (
                            <EmptyState
                                title="NO MATCHES FOUND"
                                description="Adjust your filters or select a different date to see more fixtures."
                                icon={CalendarIcon}
                                action={
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedDate(null);
                                            setFilterStage("all");
                                        }}
                                    >
                                        {t("reset_filter")}
                                    </Button>
                                }
                            />
                        ) : (
                            sortedDates.map(date => (
                                <div key={date} className="space-y-2 md:space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    {/* Date Header */}
                                    <div className="flex items-center gap-2 md:gap-3">
                                        <h2 className="text-base md:text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                            {date === "TBD" ? (locale === 'th' ? "รอกำหนดการ" : "To Be Determined") : formatDate(date, "EEEE, d MMM yyyy", locale)}
                                        </h2>
                                    </div>

                                    <div className="space-y-2 md:space-y-3">
                                        {Object.entries(groupedMatches[date]).map(([stageLabel, stageMatches]) => (
                                            <div key={stageLabel} className="space-y-2 md:space-y-3">
                                                {/* Stage Header */}
                                                <div className="flex items-center gap-3 group/stage">
                                                    <div className="h-px flex-1 bg-border mr-2 md:mr-3" />
                                                    <div className="flex flex-col">
                                                        <h4 className="text-lg font-black tracking-tight text-primary">
                                                            {stageLabel}
                                                        </h4>
                                                    </div>
                                                    <div className="h-px flex-1 bg-border ml-2 md:ml-3" />
                                                </div>

                                                <div className="grid grid-cols-1 gap-2 md:gap-3">
                                                    {stageMatches
                                                        .sort((a, b) => (a.match_time || "") > (b.match_time || "") ? 1 : -1)
                                                        .map((match) => (
                                                            <MatchCard
                                                                key={match.id}
                                                                match={match}
                                                                tournamentId={tournamentId}
                                                                isEditMode={isEditMode}
                                                                teams={teams}
                                                            />
                                                        ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            <AlertDialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
                <AlertDialogContent className="bg-background border-border/40 rounded-none shadow-2xl max-w-md p-0 overflow-hidden">
                    <div className="p-6 space-y-6">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-black tracking-tighter text-foreground flex items-center gap-3">
                                <Trophy className="h-6 w-6 text-primary" />
                                {tFixtures("proceed_knockout")}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm font-medium text-muted-foreground/60">
                                {tFixtures("confirm_advance_knockout")}
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="flex flex-col gap-2">
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleAdvance();
                                }}
                                className="w-full rounded-none bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all h-12 text-xs font-black tracking-widest"
                            >
                                <ArrowRight className="h-4 w-4 mr-2" />
                                {tFixtures("proceed") || "Proceed"}
                            </AlertDialogAction>
                            <AlertDialogCancel className="w-full rounded-none border-border/40 bg-muted/5 hover:bg-muted/10 hover:text-foreground transition-all h-12 text-xs font-black tracking-widest">
                                {t("cancel") || "Cancel"}
                            </AlertDialogCancel>
                        </div>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
