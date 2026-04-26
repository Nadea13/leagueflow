"use client";

import { useState, useEffect } from "react";
import { TournamentRules } from "@/types/index";
import { getTournamentRules, updateTournamentRules } from "@/actions/organizer/tournaments/rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Settings2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface RulesConfigProps {
    tournamentId: string;
}

export function RulesConfig({ tournamentId }: RulesConfigProps) {
    const tCommon = useTranslations("Common");
    const t = useTranslations("Rules");
    const { toast } = useToast();

    const [rules, setRules] = useState<TournamentRules | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const result = await getTournamentRules(tournamentId);
            if (result.success && result.data) {
                setRules(result.data);
            }
            setIsLoading(false);
        };
        load();
    }, [tournamentId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rules) return;

        setIsSaving(true);
        const { tournament_id: _, created_at: __, updated_at: ___, ...ruleData } = rules;
        const result = await updateTournamentRules(tournamentId, ruleData);

        if (result.success) {
            toast({ title: tCommon("success"), description: t("saved_success") });
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    if (isLoading || !rules) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const updateField = (field: keyof TournamentRules, value: number | null) => {
        setRules(prev => prev ? { ...prev, [field]: value } : prev);
    };

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col gap-1">
                <h3 className="text-xl font-black uppercase tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                    <Settings2 className="h-5 w-5 text-secondary" />
                    {t("title")}
                </h3>
            </div>

            <div className="bg-card border rounded-none relative overflow-hidden transition-colors p-2 md:p-3">
                <div className="relative z-10 space-y-4 md:space-y-6">
                    <form onSubmit={handleSave} className="space-y-2 md:space-y-3">
                    {/* Match Duration */}
                    <div className="space-y-2 md:space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-secondary/70">{t("half_duration")}</Label>
                                <Input
                                    type="number"
                                    value={rules.half_duration}
                                    onChange={e => updateField('half_duration', parseInt(e.target.value) || 0)}
                                    min={1}
                                    className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-10"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-secondary/70">{t("extra_time")}</Label>
                                <Input
                                    type="number"
                                    value={rules.extra_time_duration}
                                    onChange={e => updateField('extra_time_duration', parseInt(e.target.value) || 0)}
                                    min={0}
                                    className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-10"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-secondary/70">{t("max_substitutions")}</Label>
                                <Input
                                    type="number"
                                    value={rules.max_substitutions}
                                    onChange={e => updateField('max_substitutions', parseInt(e.target.value) || 0)}
                                    min={0}
                                    className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-10"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Squad Size */}
                    <div className="space-y-2 md:space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-secondary/70">{t("min_squad_size")}</Label>
                                <Input
                                    type="number"
                                    value={rules.min_squad_size || ""}
                                    onChange={e => updateField('min_squad_size', e.target.value ? parseInt(e.target.value) : null)}
                                    placeholder={t("no_limit")}
                                    min={1}
                                    className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-10"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-secondary/70">{t("max_squad_size")}</Label>
                                <Input
                                    type="number"
                                    value={rules.max_squad_size || ""}
                                    onChange={e => updateField('max_squad_size', e.target.value ? parseInt(e.target.value) : null)}
                                    placeholder={t("no_limit")}
                                    min={1}
                                    className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-10"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Disciplinary Rules */}
                    <div className="space-y-2 md:space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-secondary/70">{t("yellow_ban_threshold")}</Label>
                                <Input
                                    type="number"
                                    value={rules.yellow_card_ban_threshold}
                                    onChange={e => updateField('yellow_card_ban_threshold', parseInt(e.target.value) || 1)}
                                    min={1}
                                    className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-10"
                                />
                                <p className="text-[9px] font-bold uppercase text-muted-foreground/40 tracking-wider px-1">{t("yellow_ban_desc")}</p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-secondary/70">{t("red_ban_matches")}</Label>
                                <Input
                                    type="number"
                                    value={rules.red_card_ban_matches}
                                    onChange={e => updateField('red_card_ban_matches', parseInt(e.target.value) || 1)}
                                    min={1}
                                    className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-10"
                                />
                                <p className="text-[9px] font-bold uppercase text-muted-foreground/40 tracking-wider px-1">{t("red_ban_desc")}</p>
                            </div>
                        </div>
                    </div>

                    {/* Point System */}
                    <div className="space-y-2 md:space-y-3">
                        <div className="grid grid-cols-3 gap-2 md:gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-secondary/70">{t("win")}</Label>
                                <Input
                                    type="number"
                                    value={rules.points_for_win}
                                    onChange={e => updateField('points_for_win', parseInt(e.target.value) || 0)}
                                    min={0}
                                    className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-10"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-secondary/70">{t("draw")}</Label>
                                <Input
                                    type="number"
                                    value={rules.points_for_draw}
                                    onChange={e => updateField('points_for_draw', parseInt(e.target.value) || 0)}
                                    min={0}
                                    className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-10"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-secondary/70">{t("loss")}</Label>
                                <Input
                                    type="number"
                                    value={rules.points_for_loss}
                                    onChange={e => updateField('points_for_loss', parseInt(e.target.value) || 0)}
                                    min={0}
                                    className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-10"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button 
                            type="submit" 
                            disabled={isSaving}
                            className="h-10 bg-secondary hover:bg-secondary px-10 rounded-none font-black uppercase tracking-tighter transition-all relative overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                 {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
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
