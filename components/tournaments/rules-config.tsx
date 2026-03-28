"use client";

import { useState, useEffect } from "react";
import { TournamentRules } from "@/types/index";
import { getTournamentRules, updateTournamentRules } from "@/app/[locale]/organizer/tournaments/[id]/rules-actions";
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
        const { tournament_id, created_at, updated_at, ...ruleData } = rules;
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
        <div className="bg-white/5 border border-white/5 p-6 relative overflow-hidden group transition-all duration-500 hover:bg-white/[0.07]">
            <div className="absolute top-0 left-0 w-1 h-full bg-secondary translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
            
            <div className="relative z-10 space-y-6">
                <div className="flex flex-col gap-1">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-3">
                        <Settings2 className="h-6 w-6 text-secondary" />
                        {t("title")}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">{t("description")}</p>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    {/* Match Duration */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase italic tracking-widest text-secondary/80 flex items-center gap-2">
                            <span className="w-8 h-[1px] bg-secondary/30" />
                            {t("match_duration")}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{t("half_duration")}</Label>
                                <Input
                                    type="number"
                                    value={rules.half_duration}
                                    onChange={e => updateField('half_duration', parseInt(e.target.value) || 0)}
                                    min={1}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{t("extra_time")}</Label>
                                <Input
                                    type="number"
                                    value={rules.extra_time_duration}
                                    onChange={e => updateField('extra_time_duration', parseInt(e.target.value) || 0)}
                                    min={0}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{t("max_substitutions")}</Label>
                                <Input
                                    type="number"
                                    value={rules.max_substitutions}
                                    onChange={e => updateField('max_substitutions', parseInt(e.target.value) || 0)}
                                    min={0}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Squad Size */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase italic tracking-widest text-secondary/80 flex items-center gap-2">
                            <span className="w-8 h-[1px] bg-secondary/30" />
                            {t("squad_size")}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{t("min_squad_size")}</Label>
                                <Input
                                    type="number"
                                    value={rules.min_squad_size || ""}
                                    onChange={e => updateField('min_squad_size', e.target.value ? parseInt(e.target.value) : null)}
                                    placeholder={t("no_limit")}
                                    min={1}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{t("max_squad_size")}</Label>
                                <Input
                                    type="number"
                                    value={rules.max_squad_size || ""}
                                    onChange={e => updateField('max_squad_size', e.target.value ? parseInt(e.target.value) : null)}
                                    placeholder={t("no_limit")}
                                    min={1}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Disciplinary Rules */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase italic tracking-widest text-secondary/80 flex items-center gap-2">
                            <span className="w-8 h-[1px] bg-secondary/30" />
                            {t("disciplinary")}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{t("yellow_ban_threshold")}</Label>
                                <Input
                                    type="number"
                                    value={rules.yellow_card_ban_threshold}
                                    onChange={e => updateField('yellow_card_ban_threshold', parseInt(e.target.value) || 1)}
                                    min={1}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                />
                                <p className="text-[9px] font-bold uppercase text-muted-foreground/40 tracking-wider px-1">{t("yellow_ban_desc")}</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{t("red_ban_matches")}</Label>
                                <Input
                                    type="number"
                                    value={rules.red_card_ban_matches}
                                    onChange={e => updateField('red_card_ban_matches', parseInt(e.target.value) || 1)}
                                    min={1}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                />
                                <p className="text-[9px] font-bold uppercase text-muted-foreground/40 tracking-wider px-1">{t("red_ban_desc")}</p>
                            </div>
                        </div>
                    </div>

                    {/* Point System */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase italic tracking-widest text-secondary/80 flex items-center gap-2">
                            <span className="w-8 h-[1px] bg-secondary/30" />
                            {t("point_system")}
                        </h4>
                        <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{t("win")}</Label>
                                <Input
                                    type="number"
                                    value={rules.points_for_win}
                                    onChange={e => updateField('points_for_win', parseInt(e.target.value) || 0)}
                                    min={0}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{t("draw")}</Label>
                                <Input
                                    type="number"
                                    value={rules.points_for_draw}
                                    onChange={e => updateField('points_for_draw', parseInt(e.target.value) || 0)}
                                    min={0}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/60">{t("loss")}</Label>
                                <Input
                                    type="number"
                                    value={rules.points_for_loss}
                                    onChange={e => updateField('points_for_loss', parseInt(e.target.value) || 0)}
                                    min={0}
                                    className="bg-white/5 border-white/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button 
                            type="submit" 
                            disabled={isSaving}
                            className="h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-10 rounded-none font-black uppercase italic tracking-tighter transition-all relative group overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                             <span className="relative z-10 flex items-center gap-2">
                                 {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                 {tCommon("save")}
                             </span>
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
