"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, Mail, Loader2, UserCheck, Clock } from "lucide-react";
import { TournamentMember } from "@/types";
import {
    inviteCollaborator,
    getCollaborators,
    removeCollaborator
} from "@/app/[locale]/dashboard/tournaments/[id]/collaborator-actions";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface CollaboratorsCardProps {
    tournamentId: string;
}

export function CollaboratorsCard({ tournamentId }: CollaboratorsCardProps) {
    const t = useTranslations("Collaborators");
    const tCommon = useTranslations("Common");
    const { toast } = useToast();

    const [collaborators, setCollaborators] = useState<TournamentMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [isInviting, setIsInviting] = useState(false);

    // Load collaborators
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const res = await getCollaborators(tournamentId);
            if (res.success && res.data) {
                setCollaborators(res.data);
            }
            setIsLoading(false);
        };
        load();
    }, [tournamentId]);

    const handleInvite = async () => {
        if (!email.trim()) return;

        setIsInviting(true);
        const res = await inviteCollaborator(tournamentId, email.trim(), 'editor');

        if (res.success && res.data) {
            setCollaborators(prev => [...prev, res.data!]);
            setEmail("");
            setDialogOpen(false);
            toast({ title: t("invite_sent"), description: t("invite_sent_desc") });
        } else {
            toast({ title: tCommon("error"), description: res.error, variant: "destructive" });
        }
        setIsInviting(false);
    };

    const handleRemove = async (memberId: string) => {
        if (!confirm(t("confirm_remove"))) return;

        startTransition(async () => {
            const res = await removeCollaborator(memberId, tournamentId);
            if (res.success) {
                setCollaborators(prev => prev.filter(c => c.id !== memberId));
                toast({ title: t("removed"), description: t("removed_desc") });
            } else {
                toast({ title: tCommon("error"), description: res.error, variant: "destructive" });
            }
        });
    };

    return (
        <div className="space-y-6 border rounded-none p-6 bg-background shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold leading-none tracking-tight mb-2 flex items-center gap-2"><Users className="h-4 w-4" />{t("title")}</h3>
                    <p className="text-sm text-muted-foreground">{t("description")}</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">{t("invite")}</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t("invite_title")}</DialogTitle>
                            <DialogDescription>{t("invite_desc")}</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Input
                                type="email"
                                placeholder={t("email_placeholder")}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                {tCommon("cancel")}
                            </Button>
                            <Button onClick={handleInvite} disabled={isInviting || !email.trim()}>
                                {isInviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {t("send_invite")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : collaborators.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>{t("no_collaborators")}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {collaborators.map((collab) => (
                        <div
                            key={collab.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-none border"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-none bg-primary/10 flex items-center justify-center">
                                    {collab.status === 'accepted' ? (
                                        <UserCheck className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Clock className="h-4 w-4 text-amber-500" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{collab.email}</span>
                                        <Badge variant="outline" className="text-xs capitalize">
                                            {collab.role}
                                        </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {collab.status === 'accepted' ? t("status_accepted") : t("status_pending")}
                                    </span>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemove(collab.id)}
                                disabled={isPending}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
