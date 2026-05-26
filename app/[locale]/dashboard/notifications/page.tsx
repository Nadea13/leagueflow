"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Bell, Check, X, ShieldAlert } from "lucide-react";
import { getAllUserInvites, acceptInvite, rejectInvite } from "@/actions/organizer/tournaments/staff";
import { EmptyState } from "@/components/shared/empty-state";
import { useToast } from "@/hooks/use-toast";

export default function NotificationsPage() {
    const t = useTranslations("Collaborators");
    const { toast } = useToast();

    const [invites, setInvites] = useState<Array<{
        id: string;
        tournament_id: string;
        tournament_name?: string;
        role: string;
        status: 'pending' | 'accepted' | 'rejected';
    }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [actionState, setActionState] = useState<Record<string, 'accepted' | 'rejected' | 'error' | null>>({});

    useEffect(() => {
        const load = async () => {
            const res = await getAllUserInvites();
            if (res.success && res.data) {
                setInvites(res.data);
            }
            setIsLoading(false);
        };
        load();
    }, []);

    const handleAccept = async (tournamentId: string, inviteId: string) => {
        startTransition(async () => {
            const res = await acceptInvite(tournamentId);
            if (res.success) {
                setActionState(prev => ({ ...prev, [inviteId]: 'accepted' }));
                toast({
                    title: "Accepted Invitation",
                    description: "You are now a collaborator on this tournament.",
                });
            } else {
                setActionState(prev => ({ ...prev, [inviteId]: 'error' }));
                toast({
                    title: "Error",
                    description: res.error || "Failed to accept the invitation.",
                    variant: "destructive",
                });
            }
        });
    };

    const handleReject = async (tournamentId: string, inviteId: string) => {
        startTransition(async () => {
            const res = await rejectInvite(tournamentId);
            if (res.success) {
                setActionState(prev => ({ ...prev, [inviteId]: 'rejected' }));
                toast({
                    title: "Declined Invitation",
                    description: "You have declined the invitation.",
                });
            } else {
                setActionState(prev => ({ ...prev, [inviteId]: 'error' }));
                toast({
                    title: "Error",
                    description: res.error || "Failed to decline the invitation.",
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <div className="flex flex-col gap-2 md:gap-4 max-w-4xl mx-auto">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                        Notifications
                    </h1>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : invites.length === 0 ? (
                <EmptyState
                    title={t("no_pending_invites") || "No new notifications"}
                    description={t("pending_invites_desc") || "You're all caught up!"}
                    icon={Bell}
                    action={<div />}
                />
            ) : (
                <div className="space-y-2 md:space-y-4">
                    {invites.map((invite) => {
                        const currentStatus = actionState[invite.id] || invite.status;

                        return (
                            <Card
                                key={invite.id}
                                className={`transition-all overflow-hidden border hover:border-primary/35 rounded-lg group/item ${
                                    currentStatus === 'accepted' ? 'border-primary/40 bg-primary/5' :
                                    currentStatus === 'rejected' ? 'border-destructive/40 bg-destructive/5' : ''
                                }`}
                            >
                                <CardContent className="p-2 md:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="h-10 w-10 border rounded-full group-hover/item:border-primary/30 transition-all shrink-0 p-1 bg-muted/30 flex items-center justify-center">
                                            <div className={`w-full h-full rounded-full flex items-center justify-center ${
                                                currentStatus === 'accepted' ? 'bg-green-500/10 text-green-500' :
                                                currentStatus === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'
                                            }`}>
                                                <Bell className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-relaxed">
                                                You have been invited to join <span className="font-black text-foreground">{invite.tournament_name || "Unknown Tournament"}</span> as <span className="font-black text-foreground">{invite.role?.replace('_', ' ')}</span>
                                            </p>
                                            <span className="text-[10px] text-muted-foreground/50 font-bold tracking-widest block">
                                                Tournament Invitation
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        {currentStatus === 'accepted' ? (
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-500/10 px-3 py-1.5 rounded-full">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span>Accepted</span>
                                            </div>
                                        ) : currentStatus === 'rejected' ? (
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full">
                                                <XCircle className="h-4 w-4" />
                                                <span>Declined</span>
                                            </div>
                                        ) : currentStatus === 'error' ? (
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-500/10 px-3 py-1.5 rounded-full">
                                                <ShieldAlert className="h-4 w-4" />
                                                <span>Error occurred</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => handleReject(invite.tournament_id, invite.id)}
                                                    disabled={isPending}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    onClick={() => handleAccept(invite.tournament_id, invite.id)}
                                                    disabled={isPending}
                                                >
                                                    <Check className="h-4 w-4" />
                                                    Accept
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
