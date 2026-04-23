"use client";

import { useActionState, useTransition, useEffect, useState } from "react";
import { updateTournament } from "@/actions/organizer/tournaments/general";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Check, AlertTriangle, ClipboardEdit, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionResponse, Tournament } from "@/types/index";

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

interface RegistrationSettingsProps {
    tournament: Tournament;
    isPro: boolean;
    onUpgrade: () => void;
}

export function RegistrationSettings({ tournament, onUpgrade }: Omit<RegistrationSettingsProps, 'isPro'>) {
    const isPro = true; // Pro locks removed for all
    const t = useTranslations("Settings");
    const tCommon = useTranslations("Common");
    const { toast } = useToast();
    const [isPending] = useTransition();
    const [mounted, setMounted] = useState(false);

    const updateTournamentWithId = updateTournament.bind(null, tournament.id);
    const [state, formAction] = useActionState(updateTournamentWithId, initialState);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (state.success) {
            toast({
                title: tCommon("success"),
                description: t("update_success_desc") || "Registration settings updated",
            });
        } else if (state.error) {
            toast({
                title: tCommon("error"),
                description: state.error,
                variant: "destructive",
            });
        }
    }, [state, tCommon, t, toast]);

    if (!mounted) return null;


    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                        <ClipboardEdit className="h-5 w-5 text-secondary" />
                        {t("registration_settings")}
                    </h3>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground/60">{t("registration_settings_desc")}</p>
                </div>
                {!isPro && (
                    <Badge variant="secondary" className="rounded-none bg-secondary text-secondary-foreground text-[10px] font-black px-3 py-1 uppercase tracking-widest">
                        {t("pro_badge")}
                    </Badge>
                )}
            </div>

            <div className="bg-background border rounded-none relative overflow-hidden group hover:bg-muted/5 transition-colors p-2 md:p-3 shadow-sm">             
                <div className="relative z-10 space-y-4 md:space-y-6">
                    {!isPro && (
                        <div className="p-4 bg-secondary/5 border border-secondary/20 text-[11px] text-secondary font-black uppercase tracking-wider flex items-center gap-3">
                            <AlertTriangle className="h-4 w-4" />
                            <span>
                                {t("upsell_pro_feature", { defaultValue: "Tournament registrations are a Pro feature." })} 
                                <button onClick={onUpgrade} className="underline ml-2 hover:text-foreground transition-colors">{t("upgrade_button")}</button>
                            </span>
                        </div>
                    )}

                    <form action={formAction} className={cn("flex flex-col gap-2 md:gap-3", !isPro && "opacity-40 grayscale pointer-events-none")}>
                        <input type="hidden" name="form_type" value="registration" />
                        <input type="hidden" name="name" value={tournament.name} />
                        <input type="hidden" name="status" value={tournament.status || "draft"} />
                        <input type="hidden" name="format" value={tournament.format || "league"} />
                        <input type="hidden" name="max_teams" value={tournament.max_teams || 8} />

                        <div className="flex items-center justify-between p-2 md:p-3 bg-foreground/5 border-none rounded-none">
                            <div className="space-y-1">
                                <Label htmlFor="is_registration_open" className="text-sm md:text-lg font-black uppercase tracking-tight text-foreground">
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

                        <div className="space-y-2 md:space-y-3">
                            <div className="space-y-1">
                                <Label htmlFor="registration_fee" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{t("registration_fee")}</Label>
                                <Input
                                    type="number"
                                    id="registration_fee"
                                    name="registration_fee"
                                    defaultValue={tournament.registration_fee ?? undefined}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    disabled={!isPro}
                                    className="h-12 bg-foreground/5 border-none rounded-none focus-visible:ring-1 focus-visible:ring-primary/50 transition-all placeholder:text-muted-foreground/30 font-bold uppercase tracking-tighter"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="bank_account_number" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{t("promptpay_id")}</Label>
                                <Input
                                    type="text"
                                    id="bank_account_number"
                                    name="bank_account_number"
                                    defaultValue={tournament.bank_account_number ?? undefined}
                                    placeholder="08xxxxxxxx or ID Card"
                                    disabled={!isPro}
                                    className="h-12 bg-foreground/5 border-none rounded-none focus-visible:ring-1 focus-visible:ring-primary/50 transition-all placeholder:text-muted-foreground/30 font-bold uppercase tracking-tighter"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="bank_name" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{t("bank_name")}</Label>
                                    <Select name="bank_name" defaultValue={tournament.bank_name || "PromptPay"} disabled={!isPro}>
                                        <SelectTrigger id="bank_name" className="h-12 bg-foreground/5 border-none rounded-none focus:ring-1 focus:ring-primary/50 transition-all font-bold uppercase tracking-tighter">
                                            <SelectValue placeholder={t("select_bank")} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-neutral-950 border-foreground/10 rounded-none">
                                            <SelectItem value="PromptPay">PromptPay</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="bank_account_name" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{t("account_name")}</Label>
                                    <Input
                                        type="text"
                                        id="bank_account_name"
                                        name="bank_account_name"
                                        defaultValue={tournament.bank_account_name ?? undefined}
                                        placeholder={t("account_name")}
                                        disabled={!isPro}
                                        className="h-12 bg-foreground/5 border-none rounded-none focus-visible:ring-1 focus-visible:ring-primary/50 transition-all placeholder:text-muted-foreground/30 font-bold uppercase tracking-tighter"
                                    />
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                disabled={!isPro || isPending}
                                className="w-full h-12 rounded-none bg-secondary text-secondary-foreground font-black uppercase tracking-tighter hover:bg-secondary/90 transition-all relative group overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-foreground/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    {tCommon("save")}
                                </span>
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

