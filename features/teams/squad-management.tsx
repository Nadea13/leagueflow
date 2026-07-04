'use client';

import React, { useState, useCallback, useEffect } from "react";
import { Player, Team, Registration, Tournament } from "@/types/index";
import { cn } from "@/lib/utils";
import { getPlayers, deletePlayer, importRoster, toggleRosterLock } from "@/actions/manager/team";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Users, AlertCircle, Lock, Unlock, LayoutGrid, ArrowLeft } from "lucide-react";
import { Tab } from "@/components/ui/tab";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { AddPlayerForm } from "@/features/teams/add-player-form";
import { EditTeamForm } from "@/features/teams/edit-team-form";
import { SquadList } from "@/features/teams/squad-list";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SquadManagementProps {
    team: Team & {
        participations?: { tournament_id: string }[];
        registrations?: Registration[];
        is_roster_locked?: boolean;
        isParticipation?: boolean;
        tournament?: Tournament;
        team_id?: string | null;
    };
    initialPlayers: Player[];
}

export function SquadManagement({ team, initialPlayers }: SquadManagementProps) {
    const t = useTranslations("Roster");
    const tCommon = useTranslations("Common");
    const tSports = useTranslations("Sports");
    const { toast } = useToast();

    const [players, setPlayers] = useState<Player[]>(initialPlayers);

    const refreshPlayers = useCallback(async () => {
        const { getPlayers } = await import("@/actions/manager/team");
        const res = await getPlayers(team.id);
        if (res.success && res.data) setPlayers(res.data);
    }, [team.id]);

    // Team Edit State
    const [teamName, setTeamName] = useState(team.name);

    // Import Roster State
    const [isImporting, setIsImporting] = useState(false);
    const [mobileTab, setMobileTab] = useState<'roster' | 'team'>('roster');

    // Synergy State
    const [isLocked, setIsLocked] = useState(team.is_roster_locked || false);
    const [isLocking, setIsLocking] = useState(false);

    // Deadline check
    const documentDeadline = team.tournament?.document_deadline;
    const isDeadlinePassed = documentDeadline ? new Date() > new Date(documentDeadline) : false;
    const effectivelyLocked = isLocked || isDeadlinePassed;

    // Delete confirmation state
    const [playerToDelete, setPlayerToDelete] = useState<string | null>(null);

    const handleImportRoster = useCallback(async (sourceId: string) => {
        setIsImporting(true);
        const result = await importRoster(team.id, sourceId);
        setIsImporting(false);

        if (result.success) {
            toast({
                title: tCommon("success"),
                description: "Roster automatically imported from My Team"
            });
            // Refresh players list
            const res = await getPlayers(team.id);
            if (res.success && res.data) setPlayers(res.data);
        }
    }, [team.id, toast, tCommon]);

    // Auto-import roster if participation is empty and has linked team
    useEffect(() => {
        if (team.isParticipation && players.length === 0 && team.team_id && !isImporting) {
            handleImportRoster(team.team_id);
        }
    }, [team.isParticipation, team.team_id, players.length, isImporting, handleImportRoster]);

    const handleToggleLock = async () => {
        setIsLocking(true);
        const result = await toggleRosterLock(team.id, !isLocked);
        setIsLocking(false);

        if (result.success) {
            setIsLocked(!isLocked);
            toast({
                title: tCommon("success"),
                description: !isLocked ? "Roster locked. Only Organizer can unlock now." : "Roster unlocked."
            });
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };


    const confirmDeletePlayer = async () => {
        if (!playerToDelete) return;
        const playerId = playerToDelete;
        setPlayerToDelete(null);

        const result = await deletePlayer(playerId, team.id);
        if (result.success) {
            toast({ title: tCommon("success"), description: t("deleted_success") });
            setPlayers(players.filter(p => p.id !== playerId));
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    return (
        <div className="space-y-2 md:space-y-4">
            {/* Top Navigation & Action Bar */}
            <div className="flex md:items-start justify-between gap-2 md:gap-4">
                <div className="flex items-center gap-2 md:gap-4">
                    <Button variant="ghost" size="icon" asChild className="h-10 w-10 shrink-0 hover:bg-primary/10 hover:text-primary transition-all">
                        <Link href="/dashboard/teams">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex gap-2 md:gap-4">
                        <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
                            {teamName}
                        </h1>
                        <div className="flex items-center gap-2 md:gap-3">
                            <Badge variant="default" className="text-[10px] font-black tracking-wider rounded-full px-2">
                                {tSports(team.sport)}
                            </Badge>
                            <span className="text-[10px] font-black tracking-wider text-primary/60">
                                {players.length} {tCommon("players") || "Players"}
                            </span>
                            {isLocked && (
                                <div>
                                    <Badge variant="destructive" className="text-[10px] font-black tracking-wider">
                                        <Lock className="h-3 w-3 mr-1.5" />
                                        {tCommon("secured")}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-start gap-2">
                    <Button
                        variant={effectivelyLocked ? "outline" : "warning"}
                        onClick={handleToggleLock}
                        disabled={isLocking || isDeadlinePassed}
                        title={effectivelyLocked ? t("unlock_roster") : t("submit_lock")}
                    >
                        {isLocking ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : effectivelyLocked ? (
                            <Unlock className="h-4 w-4" />
                        ) : (
                            <Lock className="h-4 w-4" />
                        )}
                        <span className="hidden md:inline">
                            {effectivelyLocked ? t("unlock_roster") : t("submit_lock")}
                        </span>
                    </Button>
                </div>
            </div>

            {isDeadlinePassed && (
                <div className="bg-destructive/10 border border-destructive p-4 flex items-start gap-3 text-destructive animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <h4 className="font-bold text-sm tracking-tight">{t("deadline_passed")}</h4>
                        <p className="text-xs opacity-90">
                            {t("deadline_locked_desc", { date: new Date(documentDeadline!).toLocaleString() })}
                        </p>
                    </div>
                </div>
            )}

            {/* Custom Mobile Tab Switcher */}
            <div className="lg:hidden">
                <Tab
                    value={mobileTab}
                    onChange={(val) => setMobileTab(val as 'roster' | 'team')}
                    className="w-full bg-card"
                    fullWidth={true}
                    options={[
                        { label: tCommon("players"), value: 'roster', icon: Users },
                        { label: tCommon("team"), value: 'team', icon: LayoutGrid }
                    ]}
                />
            </div>

            <div className="flex flex-col lg:flex-row gap-4 items-start">
                <div className={cn(
                    "flex-1 w-full min-w-0 space-y-2 md:space-y-4",
                    mobileTab !== 'roster' && "hidden lg:block"
                )}>
                    <AddPlayerForm
                        teamId={team.id}
                        onSuccess={refreshPlayers}
                        effectivelyLocked={effectivelyLocked}
                    />
                    <SquadList
                        players={players}
                        team={team}
                        effectivelyLocked={effectivelyLocked}
                        refreshPlayers={refreshPlayers}
                        onDeletePlayer={setPlayerToDelete}
                        t={t}
                        tCommon={tCommon}
                    />
                </div>

                <div className={cn(
                    "w-full lg:w-[380px] shrink-0 space-y-6 lg:sticky lg:top-6",
                    mobileTab !== 'team' && "hidden lg:block"
                )}>
                    <EditTeamForm
                        team={team}
                        onNameChange={setTeamName}
                        isLocked={effectivelyLocked}
                    />
                </div>
            </div>

            <AlertDialog open={!!playerToDelete} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
                <AlertDialogContent className="bg-card border rounded-xl shadow-2xl max-w-md p-0">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl p-2 md:p-4 mb-0 border-b font-black tracking-tighter leading-none flex items-center">
                            {t("remove_player") || "Remove Player"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="p-2 md:p-4 text-sm font-medium text-muted-foreground/80">
                            {t("delete_confirm")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="p-2 md:p-4 border-t grid grid-cols-2 gap-1 md:gap-2">
                        <AlertDialogCancel className="mt-0">
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmDeletePlayer();
                            }}
                            className="bg-destructive hover:bg-destructive/90 transition-all flex items-center justify-center"
                        >
                            <Trash2 className="h-4 w-4" />
                            {tCommon("delete") || "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
