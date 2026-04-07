"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, Mail, Loader2, UserCheck, Clock } from "lucide-react";
import { TournamentMember } from "@/types";
import {
    inviteCollaborator,
    getCollaborators,
    removeCollaborator
} from "@/actions/organizer/tournaments/collaborator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
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

interface CollaboratorsCardProps {
    tournamentId: string;
    isPro?: boolean;
    togglePayment?: () => void;
}

export function CollaboratorsCard({ tournamentId, isPro, togglePayment }: CollaboratorsCardProps) {
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
    const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

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
        if (!isPro) return;
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

    const confirmRemove = async () => {
        if (!removeMemberId || !isPro) return;
        const memberId = removeMemberId;
        setRemoveMemberId(null);

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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-3">
                        <Users className="h-5 w-5 text-secondary" />
                        {t("title")}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">{t("description")}</p>
                </div>

                <Dialog open={isPro && dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button 
                            size="sm" 
                            disabled={!isPro}
                            onClick={() => !isPro && togglePayment?.()}
                            className="h-10 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6 rounded-none font-black uppercase italic tracking-tighter transition-all relative group/btn overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                            <span className="relative z-10 flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                {t("invite")}
                            </span>
                        </Button>
                    </DialogTrigger>
                    {isPro && (
                        <DialogContent className="sm:max-w-[500px] bg-[#0A0A0A] border-white/5 rounded-none p-0 overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-secondary" />
                            <DialogHeader className="p-8 pb-4">
                                <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-3">
                                    <Mail className="h-8 w-8 text-secondary" />
                                    {t("invite_title")}
                                </DialogTitle>
                                <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 pt-2">
                                    {t("invite_desc")}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="px-8 py-6 space-y-6">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase italic tracking-widest text-secondary/70">{t("email_placeholder")}</Label>
                                    <Input
                                        type="email"
                                        placeholder="collaborator@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                                        className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                    />
                                </div>
                                <div className="flex justify-end gap-4">
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => setDialogOpen(false)}
                                        className="h-12 rounded-none border-white/10 font-black uppercase italic tracking-tighter px-8 hover:bg-white/5"
                                    >
                                        {tCommon("cancel")}
                                    </Button>
                                    <Button 
                                        onClick={handleInvite} 
                                        disabled={isInviting || !email.trim()}
                                        className="h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-10 rounded-none font-black uppercase italic tracking-tighter transition-all relative group/save overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/save:translate-y-0 transition-transform duration-300" />
                                        <span className="relative z-10 flex items-center gap-2">
                                            {isInviting ? <Loader2 className="h-4 w-4 animate-spin text-secondary-foreground" /> : <Mail className="h-4 w-4" />}
                                            {t("send_invite")}
                                        </span>
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    )}
                </Dialog>
            </div>

            <div className="bg-background border rounded-none relative overflow-hidden group hover:bg-muted/5 transition-colors p-4 md:p-6 shadow-sm">
                <div className="absolute top-0 left-0 w-1 h-full bg-muted group-hover:bg-secondary/40 transition-colors" />
                
                <div className="relative z-10 space-y-6">

                {!isPro && (
                    <div className="p-4 bg-secondary/[0.03] border border-secondary/10 relative overflow-hidden group/upsell">
                        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/80">{t("title")} (PRO)</h4>
                                <p className="text-xs font-medium text-muted-foreground/60 max-w-sm">
                                    {t("upgrade_desc") || "Collaborate with your team to manage this tournament."}
                                </p>
                            </div>
                            <Button
                                onClick={togglePayment}
                                className="h-10 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-8 rounded-none font-black uppercase italic tracking-tighter transition-all relative group/upbtn overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/upbtn:translate-y-0 transition-transform duration-300" />
                                <span className="relative z-10 flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    {tCommon("upgrade_to_pro")}
                                </span>
                            </Button>
                        </div>
                    </div>
                )}

                <div className={cn("space-y-3", !isPro && "opacity-40 grayscale pointer-events-none")}>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                        </div>
                    ) : collaborators.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center border border-white/5 bg-background/50">
                            <div className="h-16 w-16 bg-muted/20 flex items-center justify-center mb-6 relative group/icon">
                                <div className="absolute inset-0 bg-secondary/10 scale-0 group-hover/icon:scale-100 transition-transform" />
                                <Users className="h-8 w-8 text-secondary/40 relative z-10" />
                            </div>
                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-muted-foreground/40">{t("no_collaborators")}</h3>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {collaborators.map((collab) => (
                                <div
                                    key={collab.id}
                                    className="flex items-center justify-between p-4 bg-muted/20 border border-white/5 hover:bg-muted/30 transition-colors group/item"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-muted/20 flex items-center justify-center group-hover/item:bg-secondary/10 transition-colors">
                                            {collab.status === 'accepted' ? (
                                                <UserCheck className="h-5 w-5 text-secondary" />
                                            ) : (
                                                <Clock className="h-5 w-5 text-muted-foreground/40" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black uppercase italic tracking-tight text-foreground">{collab.email}</span>
                                                <Badge variant="outline" className="rounded-none border-secondary/20 bg-secondary/5 text-[9px] font-black uppercase italic tracking-widest px-2 py-0 text-secondary/70">
                                                    {collab.role}
                                                </Badge>
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/40">
                                                {collab.status === 'accepted' ? t("status_accepted") : t("status_pending")}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-none transition-all"
                                        onClick={() => setRemoveMemberId(collab.id)}
                                        disabled={isPending}
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <AlertDialog open={!!removeMemberId} onOpenChange={(open) => !open && setRemoveMemberId(null)}>
                <AlertDialogContent className="bg-card border-border/10 rounded-none shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-destructive" />
                            {t("remove_collaborator") || "Remove Collaborator"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                            {t("confirm_remove")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-none border-border/10 bg-white/5 hover:bg-white/10 hover:text-foreground transition-all h-10 text-[11px] font-black uppercase tracking-widest">
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmRemove();
                            }}
                            className="rounded-none border border-destructive/20 bg-destructive/90 text-white hover:bg-destructive hover:shadow-[0_0_15_rgba(220,38,38,0.3)] transition-all h-10 text-[11px] font-black uppercase tracking-widest"
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            {t("remove") || "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </div>
        </div>
    );
}

