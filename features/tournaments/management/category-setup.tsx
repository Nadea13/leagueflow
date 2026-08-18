"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { createTournamentCategory } from "@/actions/tournaments/general";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionResponse } from "@/types/index";
import { cn } from "@/lib/utils";
import { ArrowDownCircle, PlusCircle, Globe, Mars, Venus, UsersRound } from "lucide-react";

interface CategorySetupProps {
    tournamentId: string;
    ageCategories: { id: number; category_name: string }[];
    tournamentName: string;
}

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

export function CategorySetup({ tournamentId, tournamentName }: CategorySetupProps) {
    const t = useTranslations("CategorySetup");
    const [ageType, setAgeType] = useState<"under" | "over" | "open">("under");
    const [ageValue, setAgeValue] = useState<string>("");
    const [genderType, setGenderType] = useState<string>("male");
    const [maxTeams, setMaxTeams] = useState<string>("8");
    const [registrationFee, setRegistrationFee] = useState<string>("0");
    const [state, formAction, isPending] = useActionState(
        async (_prevState: ActionResponse, _formData: FormData) => {
            let formattedCategoryName = "Open";
            let minAge = 0;
            let maxAge = 99;

            if (ageType === "under") {
                if (!ageValue.trim()) {
                    return { success: false, error: "กรุณากรอกตัวเลขอายุสำหรับรุ่น Under" };
                }
                const parsedAge = parseInt(ageValue, 10);
                formattedCategoryName = `U${parsedAge}`;
                minAge = 0;
                maxAge = parsedAge;
            } else if (ageType === "over") {
                if (!ageValue.trim()) {
                    return { success: false, error: "กรุณากรอกตัวเลขอายุสำหรับรุ่น Over" };
                }
                const parsedAge = parseInt(ageValue, 10);
                formattedCategoryName = `${parsedAge}+`;
                minAge = parsedAge;
                maxAge = 99;
            } else {
                formattedCategoryName = "Open";
                minAge = 0;
                maxAge = 99;
            }

            if (!maxTeams || parseInt(maxTeams) <= 0) {
                return { success: false, error: t("err_limit") };
            }

            const { getOrCreateAgeCategory } = await import("@/actions/tournaments/general");
            const ageCatRes = await getOrCreateAgeCategory(formattedCategoryName, minAge, maxAge);
            if (!ageCatRes.success || !ageCatRes.id) {
                return { success: false, error: ageCatRes.error || "เกิดข้อผิดพลาดในการสร้างรุ่นอายุ" };
            }

            return createTournamentCategory(
                tournamentId,
                ageCatRes.id,
                genderType,
                parseInt(maxTeams),
                parseFloat(registrationFee) || 0
            );
        },
        initialState
    );

    return (
        <div className="flex items-center justify-center min-h-[70vh] w-full px-0 sm:px-4 py-0 sm:py-12">
            <Card className="w-full sm:max-w-[480px] bg-card border-0 sm:border p-0 overflow-hidden shadow-none sm:shadow-2xl rounded-none sm:rounded-xl">
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
                        {/* Age Category Type & Input */}
                        <div className="space-y-1">
                            <Label>{t("age_category")}</Label>
                            <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                                {[
                                    { id: "under", label: "Under (U)", icon: <ArrowDownCircle className="h-4 w-4" /> },
                                    { id: "over", label: "Over (+)", icon: <PlusCircle className="h-4 w-4" /> },
                                    { id: "open", label: "Open (ทั่วไป)", icon: <Globe className="h-4 w-4" /> },
                                ].map((typeItem) => {
                                    const isSelected = ageType === typeItem.id;
                                    return (
                                        <button
                                            key={typeItem.id}
                                            type="button"
                                            onClick={() => {
                                                setAgeType(typeItem.id as "under" | "over" | "open");
                                                if (typeItem.id === "open") setAgeValue("");
                                            }}
                                            className={cn(
                                                "group flex flex-col items-center justify-center p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                                isSelected
                                                    ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                                                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
                                            )}
                                        >
                                            <div className={cn(
                                                "p-1.5 rounded-full transition-colors",
                                                isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                            )}>
                                                {typeItem.icon}
                                            </div>
                                            <span className="text-xs font-bold truncate w-full transition-colors">
                                                {typeItem.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {ageType !== "open" && (
                                <div className="mt-2 space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                        {ageType === "under" 
                                            ? "ระบุตัวเลขอายุ (เช่น 13 สื่อถึง U13)"
                                            : "ระบุตัวเลขอายุ (เช่น 35 สื่อถึง 35+)"}
                                    </Label>
                                    <Input
                                        type="text"
                                        value={ageValue}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, "");
                                            setAgeValue(val);
                                        }}
                                        placeholder={
                                            ageType === "under"
                                                ? "ตัวอย่าง 13 (สำหรับ U13)"
                                                : "ตัวอย่าง 35 (สำหรับ 35+)"
                                        }
                                        className="bg-transparent text-foreground focus-visible:ring-0"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Gender Type Selector */}
                        <div className="space-y-1">
                            <Label>{t("gender_group")}</Label>
                            <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                                {[
                                    { id: "male", label: t("gender_male"), icon: <Mars className="h-4 w-4" /> },
                                    { id: "female", label: t("gender_female"), icon: <Venus className="h-4 w-4" /> },
                                    { id: "mixed", label: t("gender_mixed"), icon: <UsersRound className="h-4 w-4" /> },
                                ].map((genderItem) => {
                                    const isSelected = genderType === genderItem.id;
                                    return (
                                        <button
                                            key={genderItem.id}
                                            type="button"
                                            onClick={() => setGenderType(genderItem.id)}
                                            className={cn(
                                                "group flex flex-col items-center justify-center p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                                isSelected
                                                    ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                                                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
                                            )}
                                        >
                                            <div className={cn(
                                                "p-1.5 rounded-full transition-colors",
                                                isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                            )}>
                                                {genderItem.icon}
                                            </div>
                                            <span className="text-xs font-bold truncate w-full transition-colors">
                                                {genderItem.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
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
