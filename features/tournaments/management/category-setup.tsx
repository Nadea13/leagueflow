"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { createTournamentCategory } from "@/actions/tournaments/general";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionResponse } from "@/types/index";

interface CategorySetupProps {
    tournamentId: string;
    ageCategories: { id: number; category_name: string }[];
    tournamentName: string;
}

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

export function CategorySetup({ tournamentId, ageCategories, tournamentName }: CategorySetupProps) {
    const t = useTranslations("CategorySetup");
    const [ageCategoryId, setAgeCategoryId] = useState<string>(
        ageCategories && ageCategories.length > 0 ? ageCategories[0].id.toString() : ""
    );
    const [genderType, setGenderType] = useState<string>("open");
    const [maxTeams, setMaxTeams] = useState<string>("8");
    const [registrationFee, setRegistrationFee] = useState<string>("0");
    const [state, formAction, isPending] = useActionState(
        async (_prevState: ActionResponse, _formData: FormData) => {
            if (!ageCategoryId) {
                return { success: false, error: t("err_age") };
            }
            if (!maxTeams || parseInt(maxTeams) <= 0) {
                return { success: false, error: t("err_limit") };
            }
            return createTournamentCategory(
                tournamentId,
                parseInt(ageCategoryId),
                genderType,
                parseInt(maxTeams),
                parseFloat(registrationFee) || 0
            );
        },
        initialState
    );

    return (
        <div className="flex items-center justify-center min-h-[70vh] px-4 py-12">
            <Card className="w-full max-w-[480px] bg-card border p-0 overflow-hidden shadow-2xl rounded-xl">
                <CardHeader className="relative p-2 md:p-4 border-b">
                    <CardTitle className="text-2xl font-black tracking-tighter text-foreground leading-none">
                        {t("title")}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm">
                        {t.rich("desc", {
                            name: tournamentName,
                            span: (chunks) => <span className="text-primary font-bold">{chunks}</span>
                        })}
                    </CardDescription>
                </CardHeader>

                <form action={formAction}>
                    <CardContent className="p-2 md:p-4 space-y-1 md:space-y-2">
                        {/* Age Category Selector */}
                        <div className="space-y-1">
                            <Label>{t("age_category")}</Label>
                            <Select name="age_category_id" value={ageCategoryId} onValueChange={setAgeCategoryId}>
                                <SelectTrigger className="bg-transparent w-full text-foreground focus-visible:ring-0">
                                    <SelectValue placeholder={t("select_age")} />
                                </SelectTrigger>
                                <SelectContent className="border-border">
                                    {ageCategories.map((cat) => (
                                        <SelectItem
                                            key={cat.id}
                                            value={cat.id.toString()}
                                            className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tighter"
                                        >
                                            {cat.category_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Gender Type Selector */}
                        <div className="space-y-1">
                            <Label>{t("gender_group")}</Label>
                            <Select name="gender_type" value={genderType} onValueChange={setGenderType}>
                                <SelectTrigger className="bg-transparent w-full text-foreground focus-visible:ring-0">
                                    <SelectValue placeholder={t("select_gender")} />
                                </SelectTrigger>
                                <SelectContent className="border-border">
                                    <SelectItem value="open" className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tighter">
                                        {t("gender_open")}
                                    </SelectItem>
                                    <SelectItem value="male" className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tighter">
                                        {t("gender_male")}
                                    </SelectItem>
                                    <SelectItem value="female" className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tighter">
                                        {t("gender_female")}
                                    </SelectItem>
                                    <SelectItem value="mixed" className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tighter">
                                        {t("gender_mixed")}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Max Teams Input */}
                        <div className="space-y-1">
                            <Label>{t("team_limit")}</Label>
                            <Input
                                type="text"
                                name="max_teams"
                                value={maxTeams}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, "");
                                    setMaxTeams(val);
                                }}
                                placeholder={t("team_limit_hint")}
                                className="bg-transparent text-foreground focus-visible:ring-0"
                            />
                        </div>

                        {/* Registration Fee Input */}
                        <div className="space-y-1">
                            <Label>{t("fee")}</Label>
                            <Input
                                type="text"
                                name="registration_fee"
                                value={registrationFee}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9.]/g, "");
                                    // Limit to one decimal point
                                    if ((val.match(/\./g) || []).length <= 1) {
                                        setRegistrationFee(val);
                                    }
                                }}
                                placeholder={t("fee_hint")}
                                className="bg-transparent text-foreground focus-visible:ring-0"
                            />
                        </div>

                        {state.error && (
                            <div className="text-xs font-bold text-destructive bg-destructive/10 rounded-sm border border-destructive p-2">
                                {state.error}
                            </div>
                        )}
                    </CardContent>

                    <div className="border-t p-2 md:p-4">
                        <SubmitButton className="w-full">
                            {isPending ? t("setting_up") : t("setup_btn")}
                        </SubmitButton>
                    </div>
                </form>
            </Card>
        </div>
    );
}
