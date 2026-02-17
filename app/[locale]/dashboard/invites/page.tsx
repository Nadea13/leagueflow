"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Users, Trophy, ArrowRight } from "lucide-react";
import { getPendingInvites, acceptInvite } from "@/app/[locale]/dashboard/tournaments/[id]/collaborator-actions";

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
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t("pending_invites_title")}</h1>
                <p className="text-muted-foreground">{t("pending_invites_desc")}</p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : invites.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="text-lg">{t("no_pending_invites")}</p>
                        </div>
                    </CardContent>
                </Card>
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
                                        {t(`roles.${invite.role}` as any)}
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
                                            <Link href={`/dashboard/tournaments/${invite.tournament_id}`}>
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

