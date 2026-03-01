"use client";

import { useState, useEffect } from "react";
import { TournamentRules } from "@/types/index";
import { getTournamentRules, updateTournamentRules } from "@/app/[locale]/dashboard/tournaments/[id]/rules-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Settings2 } from "lucide-react";
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
        <div className="space-y-6 border rounded-none p-6 bg-background shadow-sm">
            <div>
                <h3 className="font-semibold leading-none tracking-tight mb-2 flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    {t("title")}
                </h3>
                <p className="text-sm text-muted-foreground">{t("description")}</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Match Duration */}
                <div>
                    <h4 className="text-sm font-medium mb-3">{t("match_duration")}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">{t("half_duration")}</Label>
                            <Input
                                type="number"
                                value={rules.half_duration}
                                onChange={e => updateField('half_duration', parseInt(e.target.value) || 0)}
                                min={1}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{t("extra_time")}</Label>
                            <Input
                                type="number"
                                value={rules.extra_time_duration}
                                onChange={e => updateField('extra_time_duration', parseInt(e.target.value) || 0)}
                                min={0}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{t("max_substitutions")}</Label>
                            <Input
                                type="number"
                                value={rules.max_substitutions}
                                onChange={e => updateField('max_substitutions', parseInt(e.target.value) || 0)}
                                min={0}
                            />
                        </div>
                    </div>
                </div>

                {/* Squad Size */}
                <div>
                    <h4 className="text-sm font-medium mb-3">{t("squad_size")}</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">{t("min_squad_size")}</Label>
                            <Input
                                type="number"
                                value={rules.min_squad_size || ""}
                                onChange={e => updateField('min_squad_size', e.target.value ? parseInt(e.target.value) : null)}
                                placeholder={t("no_limit")}
                                min={1}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{t("max_squad_size")}</Label>
                            <Input
                                type="number"
                                value={rules.max_squad_size || ""}
                                onChange={e => updateField('max_squad_size', e.target.value ? parseInt(e.target.value) : null)}
                                placeholder={t("no_limit")}
                                min={1}
                            />
                        </div>
                    </div>
                </div>

                {/* Disciplinary Rules */}
                <div>
                    <h4 className="text-sm font-medium mb-3">{t("disciplinary")}</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">{t("yellow_ban_threshold")}</Label>
                            <Input
                                type="number"
                                value={rules.yellow_card_ban_threshold}
                                onChange={e => updateField('yellow_card_ban_threshold', parseInt(e.target.value) || 1)}
                                min={1}
                            />
                            <p className="text-[10px] text-muted-foreground">{t("yellow_ban_desc")}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{t("red_ban_matches")}</Label>
                            <Input
                                type="number"
                                value={rules.red_card_ban_matches}
                                onChange={e => updateField('red_card_ban_matches', parseInt(e.target.value) || 1)}
                                min={1}
                            />
                            <p className="text-[10px] text-muted-foreground">{t("red_ban_desc")}</p>
                        </div>
                    </div>
                </div>

                {/* Point System */}
                <div>
                    <h4 className="text-sm font-medium mb-3">{t("point_system")}</h4>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">{t("win")}</Label>
                            <Input
                                type="number"
                                value={rules.points_for_win}
                                onChange={e => updateField('points_for_win', parseInt(e.target.value) || 0)}
                                min={0}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{t("draw")}</Label>
                            <Input
                                type="number"
                                value={rules.points_for_draw}
                                onChange={e => updateField('points_for_draw', parseInt(e.target.value) || 0)}
                                min={0}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{t("loss")}</Label>
                            <Input
                                type="number"
                                value={rules.points_for_loss}
                                onChange={e => updateField('points_for_loss', parseInt(e.target.value) || 0)}
                                min={0}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                        {t("save_rules")}
                    </Button>
                </div>
            </form>
        </div>
    );
}
