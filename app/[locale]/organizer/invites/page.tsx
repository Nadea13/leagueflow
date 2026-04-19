"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Users, ArrowRight } from "lucide-react";
import { getPendingInvites, acceptInvite } from "@/app/[locale]/organizer/tournaments/[id]/collaborator-actions";

export default function InvitesPage() {
    const t = useTranslations("Collaborators");
    const tCommon = useTranslations("Common");

    const [invites, setInvites] = useState<Array<{
        id: string;
        tournament_id: string;
        tournament_name?: string;
        role: string;
    }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
    const [errorIds, setErrorIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const load = async () => {
            const res = await getPendingInvites();
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
                setAcceptedIds(prev => new Set(prev).add(inviteId));
            } else {
                setErrorIds(prev => new Set(prev).add(inviteId));
            }
        });
    };

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex items-start justify-between border-b-4 border-secondary/20 pb-4 md:pb-6 relative">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-[calc(-0.05em)] uppercase italic leading-none">
                        {t("pending_invites_title")}
                    </h1>
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2 opacity-70">
                        {t("pending_invites_desc")}
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : invites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-border bg-muted/5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-muted group-hover:bg-secondary/40 transition-colors" />
                    <div className="p-8 bg-background border border-border rotate-12 transition-transform group-hover:rotate-0 shadow-xl mb-6 relative z-10">
                        <Users className="h-12 w-12 text-muted-foreground opacity-30 -rotate-12 group-hover:rotate-0 transition-transform" />
                    </div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tight relative z-10">
                        {t("no_pending_invites")}
                    </h3>
                    <p className="text-[11px] uppercase font-bold text-muted-foreground/60 mt-2 opacity-60 flex items-center gap-2 relative z-10">
                         <span className="w-4 h-[1px] bg-muted-foreground/30" />
                        {t("pending_invites_desc")}
                         <span className="w-4 h-[1px] bg-muted-foreground/30" />
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {invites.map((invite) => {
                        const isAccepted = acceptedIds.has(invite.id);
                        const hasError = errorIds.has(invite.id);

                        return (
                            <Card
                                key={invite.id}
                                className={`flex flex-col ${isAccepted ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/20' : ''}`}
                            >
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg font-bold">
                                            {invite.tournament_name || t("unknown_tournament")}
                                        </CardTitle>
                                    </div>
                                    <Badge variant="outline" className="capitalize">
                                        {t(`roles.${invite.role}` as Parameters<typeof t>[0])}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <div className="text-sm text-muted-foreground">
                                        {isAccepted ? (
                                            <div className="flex items-center gap-2 text-green-600">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span>{t("accepted")}</span>
                                            </div>
                                        ) : hasError ? (
                                            <div className="flex items-center gap-2 text-red-600">
                                                <XCircle className="h-4 w-4" />
                                                <span>{tCommon("error")}</span>
                                            </div>
                                        ) : (
                                            <span>{t("invite_pending_action")}</span>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-4">
                                    {isAccepted ? (
                                        <Button variant="default" className="w-full gap-2" asChild>
                                            <Link href={`/organizer/tournaments/${invite.tournament_id}`}>
                                                {tCommon("manage")}
                                                <ArrowRight className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    ) : hasError ? (
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => {
                                                setErrorIds(prev => {
                                                    const next = new Set(prev);
                                                    next.delete(invite.id);
                                                    return next;
                                                });
                                                handleAccept(invite.tournament_id, invite.id);
                                            }}
                                            disabled={isPending}
                                        >
                                            {t("retry")}
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full"
                                            onClick={() => handleAccept(invite.tournament_id, invite.id)}
                                            disabled={isPending}
                                        >
                                            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                            {t("accept")}
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

