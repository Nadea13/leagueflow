"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { updateTournament, resetFixtures, deleteTournament } from "@/actions/organizer/tournaments/general";
import { getPlans } from "@/actions/admin/plans";
import { PaymentSection } from "@/components/billing/payment-section";
import { Plan } from "@/types";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTransition } from "react";
import { ActionResponse, Tournament, TournamentTeam } from "@/types/index";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
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
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, RefreshCw, CreditCard, AlertTriangle, ClipboardEdit, Trash2 } from "lucide-react";

import { Collaborators } from "@/components/tournaments/collaborators";
import { VenueManager } from "@/components/tournaments/venue-manager";
import { RulesConfig } from "@/components/tournaments/rules-config";

import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

export function TournamentSettings({ tournament, hasFixtures, userPlan, teams }: { tournament: Tournament; hasFixtures: boolean; userPlan?: string; teams: TournamentTeam[] }) {
    const tournamentId = tournament.id;
    const t = useTranslations("Settings");
    const tBilling = useTranslations("Billing");
    const tCommon = useTranslations("Common");
    const tDialog = useTranslations("Dialog");
    const router = useRouter();
    const updateTournamentWithId = updateTournament.bind(null, tournament.id);
    const [state, formAction] = useActionState(updateTournamentWithId, initialState);
    const [isPending, startTransition] = useTransition();

    const isPro = true; // Pro locks removed for all

    const { toast } = useToast();

    // Payment State
    const [showPayment, setShowPayment] = useState(false);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isFetchingPlans, setIsFetchingPlans] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Delete Tournament State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [description, setDescription] = useState(tournament.description || "");
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    const searchParams = useSearchParams();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (searchParams.get("action") === "upgrade" && !isPro && !showPayment) {
            setShowPayment(true);
        }
    }, [searchParams, isPro, showPayment]);


    // Fetch plans on mount if not provided
    useEffect(() => {
        const fetchPlans = async () => {
            setIsFetchingPlans(true);
            try {
                const res = await getPlans({ role: 'organizer' });
                if (res.success && res.data) {
                    setPlans(res.data as Plan[]);
                }
            } finally {
                setIsFetchingPlans(false);
            }
        };
        fetchPlans();
    }, []);

    const tournamentPlan = plans.find(p =>
        p.name?.trim() === 'Per Tournament' ||
        p.duration?.toLowerCase().includes('tournament')
    );

    const togglePayment = () => {
        setShowPayment(!showPayment);
    };


    const handlePaymentSuccess = () => {
        setShowPayment(false);
        router.refresh();
        toast({ title: tBilling("payment_success"), description: tBilling("payment_success_desc") });
    };

    // Use useEffect to handle server action state changes and show toasts
    useEffect(() => {
        if (state.success) {
            toast({
                title: tCommon("success"),
                description: t("update_success_desc") || "Tournament updated successfully",
            });
        } else if (state.error) {
            toast({
                title: tCommon("error"),
                description: state.error,
                variant: "destructive",
            });
        }
    }, [state, tCommon, t, toast]);

    const handleReset = () => {
        setResetDialogOpen(false);
        startTransition(async () => {
            const res = await resetFixtures(tournament.id);
            if (res.success) {
                toast({
                    title: tCommon("success"),
                    description: t("reset_success_desc") || "Fixtures reset successfully",
                });
            } else {
                toast({
                    title: tCommon("error"),
                    description: res.error,
                    variant: "destructive",
                });
            }
        });
    };

    const handleDelete = () => {
        startTransition(async () => {
            const res = await deleteTournament(tournament.id);
            if (res.success) {
                toast({
                    title: tCommon("success"),
                    description: t("delete_success_desc") || "Tournament deleted successfully",
                });
            } else {
                toast({
                    title: tCommon("error"),
                    description: res.error,
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <div className="space-y-4 md:space-y-6">
            {/* General Info */}
            <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                        <ClipboardEdit className="h-5 w-5 text-secondary" />
                        {t("general_info")}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">{t("update_details")}</p>
                </div>

                <div className="bg-background border rounded-none relative overflow-hidden group hover:bg-muted/5 transition-colors p-2 md:p-3 shadow-sm">
                    <div className="relative z-10">
                        <form action={formAction} className="space-y-2 md:space-y-3">
                            <input type="hidden" name="form_type" value="general" />
                            <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-secondary/70">{tDialog("name")}</Label>
                                    <Input
                                        type="text"
                                        id="name"
                                        name="name"
                                        defaultValue={tournament.name}
                                        placeholder={tDialog("name")}
                                        className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="status" className="text-[10px] font-black uppercase tracking-widest text-secondary/70">{t("status")}</Label>
                                    <Select name="status" defaultValue={tournament.status || "draft"}>
                                        <SelectTrigger className="w-full h-12 bg-foreground/5 border-foreground/10 rounded-none focus:ring-0">
                                            <SelectValue placeholder={t("select_status")} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-neutral-950 border-foreground/10 rounded-none">
                                            <SelectItem value="draft" className="focus:bg-foreground/10 focus:text-secondary">{t("draft")}</SelectItem>
                                            <SelectItem value="active" className="focus:bg-foreground/10 focus:text-secondary">{t("active")}</SelectItem>
                                            <SelectItem value="completed" className="focus:bg-foreground/10 focus:text-secondary">{t("completed")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="format" className="text-[10px] font-black uppercase tracking-widest text-secondary/70">{t("format")}</Label>
                                    <Select name="format" defaultValue={tournament.format || "league"}>
                                        <SelectTrigger className="w-full h-12 bg-foreground/5 border-foreground/10 rounded-none focus:ring-0">
                                            <SelectValue placeholder={t("select_format")} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-neutral-950 border-foreground/10 rounded-none">
                                            <SelectItem value="league" className="focus:bg-foreground/10 focus:text-secondary">{t("format_league")}</SelectItem>
                                            <SelectItem value="league_ha" className="focus:bg-foreground/10 focus:text-secondary">{t("format_league_ha")}</SelectItem>
                                            <SelectItem value="knockout" className="focus:bg-foreground/10 focus:text-secondary">{t("format_knockout")}</SelectItem>
                                            <SelectItem value="group_knockout" className="focus:bg-foreground/10 focus:text-secondary">
                                                {t("format_group_knockout")}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="max_teams" className="text-[10px] font-black uppercase tracking-widest text-secondary/70 flex items-center justify-between">
                                        {tDialog("max_teams")}
                                    </Label>
                                    <Input
                                        type="number"
                                        id="max_teams"
                                        name="max_teams"
                                        defaultValue={tournament.max_teams || 8}
                                        min="2"
                                        max={128}
                                        className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="start_date" className="text-[10px] font-black uppercase tracking-widest text-secondary/70">{tDialog("start_date")}</Label>
                                    <Input
                                        type="date"
                                        id="start_date"
                                        name="start_date"
                                        defaultValue={tournament.start_date ? new Date(tournament.start_date).toISOString().split('T')[0] : ""}
                                        className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12 [color-scheme:dark]"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="end_date" className="text-[10px] font-black uppercase tracking-widest text-secondary/70">{tDialog("end_date")}</Label>
                                    <Input
                                        type="date"
                                        id="end_date"
                                        name="end_date"
                                        defaultValue={tournament.end_date ? new Date(tournament.end_date).toISOString().split('T')[0] : ""}
                                        className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12 [color-scheme:dark]"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="document_deadline" className="text-[10px] font-black uppercase tracking-widest text-secondary/70">{t("document_deadline")}</Label>
                                    <Input
                                        type="date"
                                        id="document_deadline"
                                        name="document_deadline"
                                        defaultValue={tournament.document_deadline ? new Date(tournament.document_deadline).toISOString().split('T')[0] : ""}
                                        className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12 [color-scheme:dark]"
                                    />
                                </div>

                                {tournament.format === "group_knockout" && (
                                    <div className="space-y-1">
                                        <Label htmlFor="advancing_teams" className="text-[10px] font-black uppercase tracking-widest text-secondary/70">
                                            {t("advancing_teams_per_group", { defaultValue: "Advancing Teams Per Group" })}
                                        </Label>
                                        <Select name="advancing_teams" defaultValue={tournament.advancing_teams?.toString() || "2"} required>
                                            <SelectTrigger className="w-full h-12 bg-foreground/5 border-foreground/10 rounded-none focus:ring-0">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-neutral-950 border-foreground/10 rounded-none">
                                                {[1, 2, 3, 4].map((num) => (
                                                    <SelectItem key={num} value={num.toString()} className="focus:bg-foreground/10 focus:text-secondary">
                                                        {num}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="col-span-full space-y-1">
                                    <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-secondary/70">{tDialog("description")}</Label>
                                    <div className="pro-editor-wrapper relative">
                                        <ReactQuill
                                            theme="snow"
                                            value={description}
                                            onChange={setDescription}
                                            placeholder={tDialog("description_placeholder")}
                                            className="pro-editor h-auto text-foreground"
                                            modules={{
                                                toolbar: [
                                                    [{ 'header': [1, 2, false] }],
                                                    ['bold', 'underline'],
                                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                    ['clean']
                                                ]
                                            }}
                                        />
                                    </div>
                                    <input type="hidden" name="description" value={description} />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    className="h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-10 rounded-none font-black uppercase tracking-tighter transition-all relative group overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-foreground/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                    <span className="relative z-10 flex items-center gap-2">
                                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        {tCommon("save")}
                                    </span>
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Rules and Venue Section */}
            <RulesConfig tournamentId={tournamentId} />
            <VenueManager tournamentId={tournamentId} />

            {/* Collaborators */}
            <Collaborators tournamentId={tournamentId} togglePayment={togglePayment} />

            {/* Billing & Subscription */}
            {/* Temporarily hidden during development */}
            {/*
            <div className="space-y-4 md:space-y-6">
                ... (billing section hidden)
            </div>
            */}
            {/* Mobile Configuration Overview - Shown only on mobile before Danger Zone */}
            <div className="lg:hidden space-y-2 md:space-y-3 border-foreground/5">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                        <ClipboardEdit className="h-5 w-5 text-secondary" />
                        Configuration Overview
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Status and details summary</p>
                </div>

                <Card className="bg-background border rounded-none relative overflow-hidden group hover:bg-muted/5 transition-all p-3 md:p-6 shadow-xl shadow-black/20">
                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary shadow-[4px_0_15px_rgba(0,196,154,0.1)]" />
                    <div className="space-y-2 md:space-y-3">
                        <div className="flex justify-between items-center border-b border-foreground/5 pb-2 md:pb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Status</span>
                            <Badge className="rounded-none bg-foreground/5 text-foreground border-foreground/10 text-[9px] font-black uppercase px-3 py-1">
                                {tournament?.status?.toUpperCase()}
                            </Badge>
                        </div>
                        <div className="flex justify-between items-center border-b border-foreground/5 pb-2 md:pb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Plan</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-secondary">
                                {isPro ? 'PRO ACCESS' : 'FREE PLAN'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-foreground/5 pb-2 md:pb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Team Slots</span>
                            <span className="text-[11px] font-black uppercase tracking-widest text-foreground">
                                {teams.length} / {tournament?.max_teams || 8}
                            </span>
                        </div>
                        <div className="pt-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">Last Updated</p>
                            <p className="text-[11px] font-black text-foreground">
                                {mounted ? new Date(tournament?.updated_at || tournament?.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '...'}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Danger Zone */}
            <div className="space-y-4 md:space-y-6">
                <div className="flex items-center gap-2 md:gap-3 my-4 md:my-6">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <h3 className="text-xl font-black uppercase tracking-tighter text-destructive">
                        {t("danger_zone")}
                    </h3>
                </div>

                <div className="grid gap-4 md:gap-6">
                    <div className="bg-background border border-destructive/10 rounded-none relative overflow-hidden group hover:bg-destructive/[0.04] transition-colors p-2 md:p-3">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
                            <div className="space-y-2 md:space-y-3">
                                <h4 className="text-lg font-black uppercase tracking-tight text-destructive">{t("delete_tournament")}</h4>
                                <p className="text-xs font-medium text-muted-foreground max-w-md">{t("delete_desc")}</p>
                            </div>
                            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        className="w-full sm:w-auto h-12 rounded-none bg-destructive text-foreground hover:bg-red-600 font-black uppercase tracking-tighter transition-all px-4 md:px-6 shadow-none hover:shadow-[0_0_30_rgba(239,68,68,0.4)]"
                                    >
                                        <Trash2 className="h-5 w-5 mr-2 md:mr-3" />
                                        {t("delete_tournament")}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-neutral-950 border-destructive/20 rounded-none shadow-2xl max-w-md p-4 md:p-6">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-destructive flex items-center gap-2 md:gap-3">
                                            <Trash2 className="h-6 w-6" />
                                            {t("delete_tournament")}
                                        </DialogTitle>
                                        <DialogDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 mt-2 md:mt-3">
                                            {t("delete_desc")}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-2 md:space-y-3 py-4 md:py-6">
                                        <Label htmlFor="confirm-tournament-delete" className="text-[10px] font-black uppercase tracking-widest text-destructive/40">
                                            {t("type_to_confirm", { text: tournament.name })}
                                        </Label>
                                        <Input
                                            id="confirm-tournament-delete"
                                            value={deleteConfirmText}
                                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                                            autoComplete="off"
                                            className="bg-destructive/5 border-destructive/20 rounded-none h-14 focus-visible:ring-0 focus-visible:border-destructive transition-all font-black text-foreground text-lg"
                                        />
                                    </div>
                                    <DialogFooter className="flex flex-row justify-end gap-2 md:gap-3">
                                        <Button
                                            variant="ghost"
                                            onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText(""); }}
                                            disabled={isPending}
                                            className="rounded-none border-foreground/10 font-black uppercase tracking-tighter px-4 md:px-6 h-12"
                                        >
                                            {tCommon("cancel")}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={handleDelete}
                                            disabled={isPending || deleteConfirmText !== tournament.name}
                                            className="rounded-none border border-destructive/20 bg-destructive/90 text-foreground hover:bg-destructive hover:shadow-[0_0_15_rgba(220,38,38,0.3)] transition-all h-12 text-[11px] font-black uppercase tracking-widest px-8"
                                        >
                                            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                            {t("delete_tournament")}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {hasFixtures && (
                        <div className="bg-background border border-destructive/10 rounded-none relative overflow-hidden group hover:bg-destructive/[0.04] transition-colors p-2 md:p-3">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-3">
                                <div className="space-y-2 md:space-y-3">
                                    <h4 className="text-lg font-black uppercase tracking-tight text-destructive">{t("reset_fixtures")}</h4>
                                    <p className="text-xs font-medium text-muted-foreground max-w-md">{t("reset_desc")}</p>
                                </div>
                                <Button
                                    variant="destructive"
                                    onClick={() => setResetDialogOpen(true)}
                                    disabled={isPending}
                                    className="w-full sm:w-auto h-12 rounded-none bg-destructive text-foreground hover:bg-red-600 font-black uppercase tracking-tighter transition-all px-6 shadow-none hover:shadow-[0_0_30_rgba(239,68,68,0.4)]"
                                >
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-3" /> : <RefreshCw className="h-5 w-5 mr-3" />}
                                    {t("reset_fixtures")}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <AlertDialogContent className="bg-card border-border/10 rounded-none shadow-2xl max-w-md p-4 md:p-6">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                            <RefreshCw className="h-5 w-5 text-destructive" />
                            {t("reset_fixtures")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                            {t("reset_desc")}?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-row justify-end gap-2 md:gap-3 mt-4 md:mt-6">
                        <AlertDialogCancel className="rounded-none border-border/10 bg-muted/30 dark:bg-foreground/5 hover:bg-muted dark:hover:bg-foreground/10 hover:text-foreground transition-all h-10 text-[11px] font-black uppercase tracking-widest px-4 md:px-6 mt-0">
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleReset();
                            }}
                            className="rounded-none border border-destructive/20 bg-destructive/90 text-foreground hover:bg-destructive hover:shadow-[0_0_15_rgba(220,38,38,0.3)] transition-all h-10 text-[11px] font-black uppercase tracking-widest px-4 md:px-6"
                        >
                            <RefreshCw className="h-3.5 w-3.5 mr-2" />
                            {t("reset_fixtures")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
