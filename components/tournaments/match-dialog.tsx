"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { ActionResponse, Team, Match } from "@/types/index";
import { createMatch, updateMatch } from "@/actions/organizer/tournaments/general";
import { Loader2 } from "lucide-react";

interface MatchDialogProps {
    tournamentId: string;
    teams: Team[];
    match?: Match; // If provided, edit mode
    trigger?: React.ReactNode;
    defaultRound?: number;
    onSuccess?: () => void;
}

export function MatchDialog({ tournamentId, teams, match, trigger, defaultRound = 1, onSuccess }: MatchDialogProps) {
    const t = useTranslations("Match");
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [homeTeamId, setHomeTeamId] = useState<string>("");
    const [awayTeamId, setAwayTeamId] = useState<string>("");
    const [round, setRound] = useState<number>(defaultRound);

    // New Fields
    const [matchDate, setMatchDate] = useState<string>("");
    const [matchTime, setMatchTime] = useState<string>("");
    const [venue, setVenue] = useState<string>("");

    const isEdit = !!match;

    useEffect(() => {
        if (open) {
            if (match) {
                setHomeTeamId(match.home_team_id || "");
                setAwayTeamId(match.away_team_id || "");
                setRound(match.round);
                setMatchDate(match.match_date || "");
                setMatchTime(match.match_time || "");
                setVenue(match.venue || "");
            } else {
                setHomeTeamId("");
                setAwayTeamId("");
                setRound(defaultRound);
                setMatchDate("");
                setMatchTime("");
                setVenue("");
            }
        }
    }, [open, match, defaultRound]);

    // Format Time Helper
    const formatTime = (timeStr?: string | null) => {
        if (!timeStr) return "";
        const [h, m] = timeStr.split(':');
        return `${h.padStart(2, '0')}:${m}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let result: ActionResponse;

            if (isEdit && match) {
                result = await updateMatch(match.id, {
                    home_team_id: homeTeamId,
                    away_team_id: awayTeamId,
                    match_date: matchDate || null,
                    match_time: matchTime || null,
                    venue: venue || null
                }, tournamentId);
            } else {
                result = await createMatch(
                    tournamentId,
                    homeTeamId,
                    awayTeamId,
                    round,
                    'league', // Defaulting to league, might need to change if context provides stage
                    matchDate,
                    matchTime,
                    venue
                );
            }

            if (result.success) {
                setOpen(false);
                if (onSuccess) onSuccess();
            } else {
                alert(result.error);
            }
        } catch (error) {
            alert("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline">{t("add_match")}</Button>}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEdit ? t("edit_match") : t("add_new_match")}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? t("update_match_details") : t("schedule_new_match_manually")}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">{t("round")}</Label>
                        <Input
                            type="number"
                            value={round}
                            onChange={(e) => setRound(Number(e.target.value))}
                            className="col-span-3"
                            disabled={isEdit} // Usually we don't move rounds easily, but could enable if needed
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">{t("home")}</Label>
                        <Select value={homeTeamId} onValueChange={setHomeTeamId}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder={t("select_home_team")} />
                            </SelectTrigger>
                            <SelectContent>
                                {teams.map((t) => (
                                    <SelectItem key={t.id} value={t.id} disabled={t.id === awayTeamId}>
                                        {t.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">{t("away")}</Label>
                        <Select value={awayTeamId} onValueChange={setAwayTeamId}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder={t("select_away_team")} />
                            </SelectTrigger>
                            <SelectContent>
                                {teams.map((t) => (
                                    <SelectItem key={t.id} value={t.id} disabled={t.id === homeTeamId}>
                                        {t.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">{t("date")}</Label>
                        <Input
                            type="date"
                            value={matchDate}
                            onChange={(e) => setMatchDate(e.target.value)}
                            className="col-span-3"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">{t("time")}</Label>
                        <Input
                            type="time"
                            value={formatTime(matchTime)}
                            onChange={(e) => setMatchTime(e.target.value)}
                            className="col-span-3"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">{t("location")}</Label>
                        <Input
                            placeholder={t("location")}
                            value={venue}
                            onChange={(e) => setVenue(e.target.value)}
                            className="col-span-3"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading || !homeTeamId || !awayTeamId}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEdit ? t("save") : t("create")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
