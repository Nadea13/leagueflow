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
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 bg-card border overflow-hidden flex flex-col">
                <div className="p-4 md:p-6 bg-card flex-shrink-0">
                    <div className="flex items-start gap-4 md:gap-6">
                        <div className="h-10 w-10 md:h-12 md:w-12 flex items-center justify-center border shrink-0">
                            {team.logo_url ? (
                                <Image
                                    src={team.logo_url}
                                    alt={team.name}
                                    width={48}
                                    height={48}
                                    className="p-1 h-full w-full object-contain"
                                />
                            ) : (
                                <span className="text-sm font-black text-primary">
                                    {team.name.substring(0, 2).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div className="space-y-1 md:space-y-2">
                            <div className="flex items-center gap-2 md:gap-3">
                                <Badge variant="default" className="text-[8px] font-black tracking-widest px-2 py-0.5">
                                    {team.sport?.toUpperCase()}
                                </Badge>
                                <span className="text-[10px] font-black tracking-wider text-primary/60">
                                    {players.length} {tCommon("players")}
                                </span>
                            </div>
                            <h2 className="text-2xl font-black tracking-tighter leading-none text-foreground">
                                {teamName}
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6 space-y-2 md:space-y-3 pb-0 md:pb-3">
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

                    <div className={cn("space-y-6", mobileTab !== 'roster' && "hidden")}>
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

                    <div className={cn("space-y-6", mobileTab !== 'team' && "hidden")}>
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
                    <AlertDialogContent className="bg-card border-border/10 shadow-2xl max-w-md">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2">
                                <Trash2 className="h-5 w-5 text-destructive" />
                                {tCommon("delete")}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                                {t("delete_desc")}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6">
                            <AlertDialogCancel className="border-border/10 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground transition-all h-10 text-[11px] font-black tracking-widest">
                                {tCommon("cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    confirmDeletePlayer();
                                }}
                                className="border border-destructive/20 bg-destructive/90 text-foreground hover:bg-destructive hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all h-10 text-[11px] font-black tracking-widest"
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                {tCommon("delete")}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>
        </Dialog>
    );
}
