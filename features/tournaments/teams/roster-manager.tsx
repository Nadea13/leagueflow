"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Player, TournamentTeam } from "@/types/index";
import { getPlayers, deletePlayer } from "@/actions/tournaments/player";
import { EditTeamForm } from "@/features/teams/edit-team-form";

import { AddPlayerForm } from "@/features/teams/add-player-form";
import { SquadList } from "@/features/teams/squad-list";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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

import { Tab } from "@/components/ui/tab";
import { Trash2, Users, LayoutGrid, Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface RosterDialogProps {
    team: TournamentTeam;
    tournamentId: string;
    trigger?: React.ReactNode;
    readOnly?: boolean;
}

export function RosterDialog({ team, tournamentId, trigger, readOnly = false }: RosterDialogProps) {
    const t = useTranslations("Roster");
    const tCommon = useTranslations("Common");
    const { toast } = useToast();

    // UI State
    const [open, setOpen] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const [mobileTab, setMobileTab] = useState<'roster' | 'team'>('roster');
    const [teamName, setTeamName] = useState(team.name);
    const [playerToDelete, setPlayerToDelete] = useState<string | null>(null);


    const fetchPlayers = useCallback(async () => {
        const result = await getPlayers(team.id);
        if (result.success && result.data) {
            setPlayers(result.data);
        } else {
            toast({
                title: tCommon("error"),
                description: t("no_players"),
                variant: "destructive",
            });
        }
    }, [team.id, tCommon, t, toast]);

    useEffect(() => {
        if (open) {
            // Use a microtask to avoid "setState in effect" lint error
            Promise.resolve().then(() => fetchPlayers());
        }
    }, [open, fetchPlayers]);

    const confirmDeletePlayer = async () => {
        if (!playerToDelete) return;

        const result = await deletePlayer(playerToDelete);
        setPlayerToDelete(null);
        if (result.success) {
            toast({
                title: tCommon("success"),
                description: t("deleted_success"),
            });
            fetchPlayers();
        } else {
            toast({
                title: tCommon("error"),
                description: result.error || tCommon("error"),
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="icon" className="bg-background/50 backdrop-blur-sm border-border/10 hover:border-primary/30 text-muted-foreground/40 hover:text-primary transition-all">
                        {readOnly ? (
                            <Eye className="h-4 w-4" />
                        ) : (
                            <Users className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                            {readOnly ? t("view_squad") : t("manage_squad")}
                        </span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="p-2 md:p-4 max-w-4xl max-h-[90vh] space-y-1 md:space-y-2 gap-0 bg-card border rounded-xl overflow-hidden flex flex-col">
                <div className="bg-card flex-shrink-0">
                    <div className="flex items-start gap-1 md:gap-2">
                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-full flex items-center justify-center border shrink-0">
                            {team.logo_url ? (
                                <Image
                                    src={team.logo_url}
                                    alt={team.name}
                                    width={48}
                                    height={48}
                                    className="p-1 h-full w-full rounded-full object-contain"
                                />
                            ) : (
                                <span className="text-sm font-black text-primary">
                                    {team.name.substring(0, 2).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black tracking-tighter leading-none text-foreground">
                                {teamName}
                            </h2>
                            <div className="flex items-center gap-2 md:gap-3">
                                <Badge variant="default" className="text-[8px] font-black tracking-widest px-2 py-0.5">
                                    {team.sport?.toUpperCase()}
                                </Badge>
                                <span className="text-[10px] font-black tracking-wider text-primary/60">
                                    {players.length} {tCommon("players")}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 md:space-y-2">
                    <Tab
                        value={mobileTab}
                        onChange={(val) => setMobileTab(val as 'roster' | 'team')}
                        className="w-full"
                        fullWidth={true}
                        options={[
                            { label: tCommon("players"), value: 'roster', icon: Users },
                            { label: tCommon("team"), value: 'team', icon: LayoutGrid }
                        ]}
                    />

                    <div className={cn("space-y-1 md:space-y-2", mobileTab !== 'roster' && "hidden")}>
                        {!(readOnly || team.managed_by_manager) && (
                            <AddPlayerForm
                                teamId={team.id}
                                onSuccess={fetchPlayers}
                                effectivelyLocked={readOnly}
                            />
                        )}

                        <SquadList
                            players={players}
                            team={team as TournamentTeam}
                            effectivelyLocked={readOnly}
                            refreshPlayers={fetchPlayers}
                            onDeletePlayer={setPlayerToDelete}
                            t={t}
                            tCommon={tCommon}
                        />
                    </div>

                    <div className={cn("space-y-1 md:space-y-2", mobileTab !== 'team' && "hidden")}>
                        <EditTeamForm
                            team={team}
                            onNameChange={setTeamName}
                            isLocked={readOnly}
                            context="organizer"
                            tournamentId={tournamentId}
                        />
                    </div>
                </div>

                <AlertDialog open={!!playerToDelete} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
                    <AlertDialogContent className="bg-card border rounded-xl shadow-2xl max-w-md p-0">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl p-2 md:p-4 mb-0 border-b font-black tracking-tighter leading-none flex items-center gap-2">
                                {tCommon("delete") || "Delete"}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="p-2 md:p-4 text-sm font-medium text-muted-foreground/80">
                                {t("delete_desc")}
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
                                className="bg-destructive hover:bg-destructive/90 transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                {tCommon("delete") || "Delete"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>
        </Dialog>
    );
}
