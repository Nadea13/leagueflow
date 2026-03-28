"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { updateTournament, resetFixtures, deleteTournament, confirmPayment } from "@/app/[locale]/organizer/tournaments/[id]/actions";
import { getPlans } from "@/actions/plans";
import { PaymentSection } from "@/components/billing/payment-section";
import { Plan } from "@/types";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTransition } from "react";
import { ActionResponse } from "@/types/index";
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
import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Loader2, RefreshCw, Clock, Settings, MapPin, BookOpen, UserPlus, Users, CreditCard, AlertTriangle, ClipboardEdit } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Link } from "@/i18n/routing";
import { createPromptPayCharge } from "@/app/[locale]/actions/payment";
import { CollaboratorsCard } from "@/components/tournaments/collaborators-card";
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

export function SettingsTab({ tournament, hasFixtures, userPlan }: { tournament: any; hasFixtures: boolean; userPlan?: string }) {
    const tournamentId = tournament.id;
    const t = useTranslations("Settings");
    const tBilling = useTranslations("Billing");
    const tCommon = useTranslations("Common");
    const tDialog = useTranslations("Dialog");
    const router = useRouter();
    const updateTournamentWithId = updateTournament.bind(null, tournament.id);
    const [state, formAction] = useActionState(updateTournamentWithId, initialState);
    const [isPending, startTransition] = useTransition();

    const isGlobalPro = userPlan === 'monthly' || userPlan === 'yearly';
    const isTournamentPro = tournament.plan && tournament.plan !== 'free';
    const isPro = isGlobalPro || isTournamentPro;

    const { toast } = useToast();

    // Payment State
    const [showPayment, setShowPayment] = useState(false);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isFetchingPlans, setIsFetchingPlans] = useState(false);

    // Delete Tournament State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [description, setDescription] = useState(tournament.description || "");
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    const searchParams = useSearchParams();

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
        <div className="space-y-6">
            {/* General Info */}
            <div className="bg-white/5 border border-white/5 p-6 relative overflow-hidden group transition-all duration-500 hover:bg-white/[0.07]">
                <div className="absolute top-0 left-0 w-1 h-full bg-secondary translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                
                <div className="relative z-10 space-y-6">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-3">
                            <Settings className="h-6 w-6 text-secondary" />
                            {t("general_info")}
                        </h3>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">{t("update_details")}</p>
                    </div>

                    <form action={formAction} className="space-y-6">
                        <input type="hidden" name="form_type" value="general" />
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{tDialog("name")}</Label>
                                <Input 
                                    type="text" 
                                    id="name" 
                                    name="name" 
                                    defaultValue={tournament.name} 
                                    placeholder={tDialog("name")}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status" className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{t("status")}</Label>
                                <Select name="status" defaultValue={tournament.status || "draft"}>
                                    <SelectTrigger className="w-full h-12 bg-white/5 border-white/10 rounded-none focus:ring-0">
                                        <SelectValue placeholder={t("select_status")} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-neutral-950 border-white/10 rounded-none">
                                        <SelectItem value="draft" className="focus:bg-white/10 focus:text-secondary">{t("draft")}</SelectItem>
                                        <SelectItem value="active" className="focus:bg-white/10 focus:text-secondary">{t("active")}</SelectItem>
                                        <SelectItem value="completed" className="focus:bg-white/10 focus:text-secondary">{t("completed")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="format" className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{t("format")}</Label>
                                <Select name="format" defaultValue={tournament.format || "league"}>
                                    <SelectTrigger className="w-full h-12 bg-white/5 border-white/10 rounded-none focus:ring-0">
                                        <SelectValue placeholder={t("select_format")} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-neutral-950 border-white/10 rounded-none">
                                        <SelectItem value="league" className="focus:bg-white/10 focus:text-secondary">{t("format_league")}</SelectItem>
                                        <SelectItem value="league_ha" className="focus:bg-white/10 focus:text-secondary">{t("format_league_ha")}</SelectItem>
                                        <SelectItem value="knockout" className="focus:bg-white/10 focus:text-secondary">{t("format_knockout")}</SelectItem>
                                        <SelectItem value="group_knockout" disabled={!isPro} className="focus:bg-white/10 focus:text-secondary">
                                            {t("format_group_knockout")} {!isPro && t("pro_only")}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="max_teams" className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60 flex items-center justify-between">
                                    {tDialog("max_teams")}
                                    {!isPro && (
                                        <span className="text-[9px] text-secondary font-black uppercase tracking-tighter bg-secondary/10 px-2 py-0.5">
                                            Max 8
                                        </span>
                                    )}
                                </Label>
                                <Input
                                    type="number"
                                    id="max_teams"
                                    name="max_teams"
                                    defaultValue={tournament.max_teams || 8}
                                    min="2"
                                    max={isPro ? 128 : 8}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="start_date" className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{tDialog("start_date")}</Label>
                                <Input
                                    type="date"
                                    id="start_date"
                                    name="start_date"
                                    defaultValue={tournament.start_date ? new Date(tournament.start_date).toISOString().split('T')[0] : ""}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12 [color-scheme:dark]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="end_date" className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{tDialog("end_date")}</Label>
                                <Input
                                    type="date"
                                    id="end_date"
                                    name="end_date"
                                    defaultValue={tournament.end_date ? new Date(tournament.end_date).toISOString().split('T')[0] : ""}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12 [color-scheme:dark]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="document_deadline" className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{t("document_deadline")}</Label>
                                <Input
                                    type="date"
                                    id="document_deadline"
                                    name="document_deadline"
                                    defaultValue={tournament.document_deadline ? new Date(tournament.document_deadline).toISOString().split('T')[0] : ""}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12 [color-scheme:dark]"
                                />
                            </div>
                            {tournament.format === "group_knockout" && (
                                <div className="space-y-2">
                                    <Label htmlFor="advancing_teams" className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">
                                        {t("advancing_teams_per_group", { defaultValue: "Advancing Teams Per Group" })}
                                    </Label>
                                    <Select name="advancing_teams" defaultValue={tournament.advancing_teams?.toString() || "2"} required>
                                        <SelectTrigger className="w-full h-12 bg-white/5 border-white/10 rounded-none focus:ring-0">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-neutral-950 border-white/10 rounded-none">
                                            {[1, 2, 3, 4].map((num) => (
                                                <SelectItem key={num} value={num.toString()} className="focus:bg-white/10 focus:text-secondary">
                                                    {num}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="col-span-full">
                                <Label htmlFor="description" className="text-[10px] mb-2 font-black uppercase italic tracking-widest text-muted-foreground/60">{tDialog("description")}</Label>
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
                                                ['bold', 'italic', 'underline'],
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
                                className="h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-10 rounded-none font-black uppercase italic tracking-tighter transition-all relative group overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <span className="relative z-10 flex items-center gap-2">
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    {tCommon("save")}
                                </span>
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Rules and Venue Section */}
            <div className="grid gap-6">
                <RulesConfig tournamentId={tournamentId} />
                <VenueManager tournamentId={tournamentId} />
            </div>

            {/* Registration Settings Card */}
            <div className="bg-white/5 border border-white/5 p-6 relative overflow-hidden group transition-all duration-500 hover:bg-white/[0.07]">
                <div className="absolute top-0 left-0 w-1 h-full bg-secondary translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-3">
                                <ClipboardEdit className="h-6 w-6 text-secondary" />
                                {t("registration_settings")}
                            </h3>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">{t("registration_settings_desc")}</p>
                        </div>
                        {!isPro && (
                            <Badge variant="secondary" className="rounded-none bg-secondary text-secondary-foreground text-[10px] font-black px-3 py-1 uppercase tracking-widest">
                                {t("pro_badge")}
                            </Badge>
                        )}
                    </div>

                    {!isPro && (
                        <div className="p-4 bg-secondary/5 border border-secondary/20 text-[11px] text-secondary font-black uppercase tracking-wider flex items-center gap-3">
                            <AlertTriangle className="h-4 w-4" />
                            <span>
                                {t("upsell_pro_feature", { defaultValue: "Tournament registrations are a Pro feature." })} 
                                <button onClick={togglePayment} className="underline ml-2 hover:text-white transition-colors">{t("upgrade_button")}</button>
                            </span>
                        </div>
                    )}

                    <form action={formAction} className={cn("space-y-6", !isPro && "opacity-40 grayscale pointer-events-none")}>
                        <input type="hidden" name="form_type" value="registration" />
                        <input type="hidden" name="name" value={tournament.name} />
                        <input type="hidden" name="status" value={tournament.status || "draft"} />
                        <input type="hidden" name="format" value={tournament.format || "league"} />
                        <input type="hidden" name="max_teams" value={tournament.max_teams || 8} />

                        <div className="flex items-center justify-between p-6 bg-white/5 border border-white/5">
                            <div className="space-y-1">
                                <Label htmlFor="is_registration_open" className="text-lg font-black uppercase italic tracking-tight text-foreground">
                                    {t("allow_registration")}
                                </Label>
                                <p className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-wider">
                                    {t("allow_registration_desc")}
                                </p>
                            </div>
                            <Switch
                                id="is_registration_open"
                                name="is_registration_open"
                                value="true"
                                defaultChecked={tournament.is_registration_open}
                                disabled={!isPro}
                                className="data-[state=checked]:bg-secondary"
                            />
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="registration_fee" className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{t("registration_fee")}</Label>
                                <Input
                                    type="number"
                                    id="registration_fee"
                                    name="registration_fee"
                                    defaultValue={tournament.registration_fee}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    disabled={!isPro}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bank_account_number" className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{t("promptpay_id")}</Label>
                                <Input
                                    type="text"
                                    id="bank_account_number"
                                    name="bank_account_number"
                                    defaultValue={tournament.bank_account_number}
                                    placeholder="08xxxxxxxx or ID Card"
                                    disabled={!isPro}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bank_name" className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{t("bank_name")}</Label>
                                <Select name="bank_name" defaultValue={tournament.bank_name || "PromptPay"} disabled={!isPro}>
                                    <SelectTrigger id="bank_name" className="w-full h-12 bg-white/5 border-white/10 rounded-none focus:ring-0">
                                        <SelectValue placeholder={t("select_bank")} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-neutral-950 border-white/10 rounded-none">
                                        <SelectItem value="PromptPay">PromptPay</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bank_account_name" className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{t("account_name")}</Label>
                                <Input
                                    type="text"
                                    id="bank_account_name"
                                    name="bank_account_name"
                                    defaultValue={tournament.bank_account_name}
                                    placeholder={t("account_name")}
                                    disabled={!isPro}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button 
                                type="submit" 
                                disabled={!isPro || isPending}
                                className="h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-10 rounded-none font-black uppercase italic tracking-tighter transition-all relative group overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <span className="relative z-10 flex items-center gap-2">
                                    <Check className="h-4 w-4" />
                                    {tCommon("save")}
                                </span>
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Collaborators and Billing */}
            <div className="grid lg:grid-cols-1 gap-6">
                <CollaboratorsCard tournamentId={tournamentId} isPro={isPro} togglePayment={togglePayment} />

                {/* Billing & Subscription Card */}
                <div className="bg-white/5 border border-white/5 p-6 relative overflow-hidden group transition-all duration-500 hover:bg-white/[0.07]">
                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                    
                    <div className="relative z-10 space-y-6">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-3">
                                <CreditCard className="h-6 w-6 text-secondary" />
                                {t("billing_title")}
                            </h3>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">{t("billing_desc")}</p>
                        </div>

                        <div className="p-8 bg-white/5 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 overflow-hidden relative group/plan">
                            <div className="space-y-1 relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("billing_plan_label")}</p>
                                <h4 className="text-3xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-3">
                                    {isGlobalPro ? (userPlan === 'monthly' ? t("plan_monthly") : t("plan_yearly")) : (isTournamentPro ? t("plan_tournament") : t("plan_free"))}
                                    <Badge variant="outline" className={cn(
                                        "rounded-none border-2 font-black uppercase italic tracking-widest px-3",
                                        isPro ? "border-secondary/40 text-secondary bg-secondary/5" : "border-white/10 text-muted-foreground"
                                    )}>
                                        {isPro ? t("plan_pro_badge") : t("plan_free_badge")}
                                    </Badge>
                                </h4>
                            </div>
                            {!isPro && (
                                <Button
                                    onClick={togglePayment}
                                    disabled={showPayment}
                                    className="w-full sm:w-auto h-14 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-10 rounded-none font-black uppercase italic tracking-tighter transition-all relative group overflow-hidden z-10"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                    <span className="relative z-10">{t("upgrade_button")}</span>
                                </Button>
                            )}
                        </div>

                        {/* Payment Section */}
                        {!isPro && showPayment && (
                            <div className="bg-neutral-950 border border-secondary/20 p-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                {isFetchingPlans ? (
                                    <div className="flex items-center justify-center p-12">
                                        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
                                    </div>
                                ) : tournamentPlan ? (
                                    <PaymentSection
                                        plan={tournamentPlan}
                                        tournaments={[tournament]}
                                        externalSelectedTournament={tournament.id}
                                        onCancel={() => setShowPayment(false)}
                                        onSuccess={handlePaymentSuccess}
                                    />
                                ) : (
                                    <div className="text-center p-8 text-secondary font-black uppercase italic tracking-tighter border border-secondary/20 bg-secondary/5">
                                        FAILED TO LOAD PRICING DATA
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Link 
                                href="/dashboard/billing" 
                                className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/40 hover:text-secondary transition-colors"
                            >
                                {t("view_pricing")} →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="">
                <div className="bg-red-500/5 border border-red-500/10 p-6 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-red-500/[0.03] rotate-12 transition-transform group-hover:scale-110" />
                    
                    <div className="relative z-10 space-y-6">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-3xl font-black uppercase italic tracking-tighter text-red-500 flex items-center gap-3">
                                <AlertTriangle className="h-7 w-7" />
                                {t("danger_zone")}
                            </h3>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500/40">{t("delete_desc")}</p>
                        </div>

                        <div className="space-y-6">
                            {hasFixtures && (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 p-8 bg-red-500/[0.02] border border-red-500/5">
                                    <div className="space-y-1">
                                        <h4 className="text-xl font-black uppercase italic tracking-tight text-red-500/80">{t("reset_fixtures")}</h4>
                                        <p className="text-[11px] font-bold uppercase text-red-500/40 tracking-wider max-w-md">{t("reset_desc")}</p>
                                    </div>
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => setResetDialogOpen(true)} 
                                            disabled={isPending} 
                                            className="w-full sm:w-auto h-14 rounded-none border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white font-black uppercase italic tracking-tighter transition-all px-10"
                                        >
                                        {isPending ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <RefreshCw className="h-5 w-5 mr-3" />}
                                        {t("reset_fixtures")}
                                    </Button>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 p-8 bg-red-500/[0.02] border border-red-500/5">
                                <div className="space-y-1">
                                    <h4 className="text-xl font-black uppercase italic tracking-tight text-red-500/80">{t("delete_tournament")}</h4>
                                    <p className="text-[11px] font-bold uppercase text-red-500/40 tracking-wider max-w-md">{t("delete_desc")}</p>
                                </div>
                                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            className="w-full sm:w-auto h-14 rounded-none border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white font-black uppercase italic tracking-tighter transition-all px-10"
                                        >
                                            <X className="h-5 w-5 mr-3" />
                                            {t("delete_tournament")}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-neutral-950 border-red-500/20 rounded-none max-w-lg p-12">
                                        <DialogHeader className="space-y-6">
                                            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-red-500">{t("delete_tournament")}</DialogTitle>
                                            <DialogDescription className="text-[11px] uppercase font-bold text-red-500/60 leading-relaxed tracking-wider">
                                                {t("delete_desc")}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="py-10 space-y-4">
                                            <Label htmlFor="confirm-tournament-delete" className="text-[11px] font-black uppercase italic tracking-widest text-red-500/40">
                                                {t("type_to_confirm", { text: tournament.name })}
                                            </Label>
                                            <Input 
                                                id="confirm-tournament-delete" 
                                                value={deleteConfirmText} 
                                                onChange={(e) => setDeleteConfirmText(e.target.value)} 
                                                autoComplete="off"
                                                className="bg-red-500/5 border-red-500/20 rounded-none h-14 focus-visible:ring-0 focus-visible:border-red-500 transition-all font-black text-foreground text-lg"
                                            />
                                        </div>
                                        <DialogFooter className="gap-6 mt-8">
                                            <Button 
                                                variant="ghost" 
                                                onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText(""); }} 
                                                disabled={isPending}
                                                className="rounded-none border-white/10 font-black uppercase italic tracking-tighter px-10 h-14"
                                            >
                                                {tCommon("cancel")}
                                            </Button>
                                            <Button 
                                                variant="destructive" 
                                                onClick={handleDelete} 
                                                disabled={isPending || deleteConfirmText !== tournament.name}
                                                className="rounded-none bg-red-500 hover:bg-red-600 font-black uppercase italic tracking-tighter px-10 h-14"
                                            >
                                                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : t("delete_tournament")}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <AlertDialogContent className="bg-card border-border/10 rounded-none shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                            <RefreshCw className="h-5 w-5 text-destructive" />
                            {t("reset_fixtures")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                            {t("reset_desc")}?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-none border-border/10 bg-white/5 hover:bg-white/10 hover:text-foreground transition-all h-10 text-[11px] font-black uppercase tracking-widest">
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleReset();
                            }}
                            className="rounded-none border border-destructive/20 bg-destructive/90 text-white hover:bg-destructive hover:shadow-[0_0_15_rgba(220,38,38,0.3)] transition-all h-10 text-[11px] font-black uppercase tracking-widest"
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
