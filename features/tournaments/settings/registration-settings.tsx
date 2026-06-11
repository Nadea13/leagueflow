"use client";

import { useActionState, useEffect, useState } from "react";
import { updateTournament } from "@/actions/tournaments/general";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2 } from "lucide-react";
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

export function RegistrationSettings({ tournament }: Omit<RegistrationSettingsProps, 'isPro'>) {
    const isPro = true; // Pro locks removed for all
    const t = useTranslations("Settings");
    const tCommon = useTranslations("Common");
    const { toast } = useToast();
    const [mounted, setMounted] = useState(false);

    const updateTournamentWithId = updateTournament.bind(null, tournament.id);
    const [state, formAction, isPending] = useActionState(updateTournamentWithId, initialState);

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
        <div className="space-y-2 md:space-y-4">
            <div className="relative overflow-hidden group transition-colors">
                <div className="relative z-10 space-y-2 md:space-y-3">
                    <form action={formAction} className={cn("flex flex-col gap-2 md:gap-3", !isPro && "opacity-40 grayscale pointer-events-none")}>
                        <input type="hidden" name="form_type" value="registration" />
                        <input type="hidden" name="name" value={tournament.name} />
                        <input type="hidden" name="status" value={tournament.status || "draft"} />
                        <input type="hidden" name="max_teams" value={tournament.max_teams || 8} />

                        <div className="flex items-center justify-between p-2 md:p-4 border rounded-lg">
                            <div className="space-y-1">
                                <Label>{t("allow_registration")}</Label>
                                <p className="text-[10px] font-bold text-muted-foreground tracking-wider">
                                    {t("allow_registration_desc")}
                                </p>
                            </div>
                            <Switch
                                id="is_registration_open"
                                name="is_registration_open"
                                value="true"
                                defaultChecked={tournament.is_registration_open}
                                disabled={!isPro}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>

                        <div className="space-y-2 md:space-y-4">
                            <div className="space-y-1">
                                <Label>{t("registration_fee")}</Label>
                                <Input
                                    type="number"
                                    id="registration_fee"
                                    name="registration_fee"
                                    defaultValue={tournament.registration_fee ?? undefined}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    disabled={!isPro}
                                    className="bg-transparent"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t("promptpay_id")}</Label>
                                <Input
                                    type="text"
                                    id="bank_account_number"
                                    name="bank_account_number"
                                    defaultValue={tournament.bank_account_number ?? undefined}
                                    placeholder="08xxxxxxxx or ID Card"
                                    disabled={!isPro}
                                    className="bg-transparent"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                                <div className="space-y-1">
                                    <Label>{t("bank_name")}</Label>
                                    <Select name="bank_name" defaultValue={tournament.bank_name || "PromptPay"} disabled={!isPro}>
                                        <SelectTrigger id="bank_name" className="bg-transparent w-full">
                                            <SelectValue placeholder={t("select_bank")} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-neutral-950 border-foreground/10">
                                            <SelectItem value="PromptPay">PromptPay</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>{t("account_name")}</Label>
                                    <Input
                                        type="text"
                                        id="bank_account_name"
                                        name="bank_account_name"
                                        defaultValue={tournament.bank_account_name ?? undefined}
                                        placeholder={t("account_name")}
                                        disabled={!isPro}
                                        className="bg-transparent"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={!isPro || isPending}
                                    className="md:w-fit w-full"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        {tCommon("save")}
                                    </span>
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

