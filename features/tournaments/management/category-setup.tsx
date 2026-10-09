"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { createTournamentCategory } from "@/actions/tournaments/general";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionResponse } from "@/types/index";
import { cn } from "@/lib/utils";
import { ArrowDownCircle, PlusCircle, Globe, Mars, Venus, UsersRound, Loader2 } from "lucide-react";

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
    const [bankName, setBankName] = useState<string>("PromptPay");
    const [bankAccountNumber, setBankAccountNumber] = useState<string>("");
    const [bankAccountName, setBankAccountName] = useState<string>("");

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

            const hasBankInfo = bankAccountNumber.trim() || bankAccountName.trim();
            const bankDetails = hasBankInfo
                ? {
                      bank_name: bankName,
                      bank_account_name: bankAccountName.trim(),
                      bank_account_number: bankAccountNumber.trim(),
                  }
                : null;

            return createTournamentCategory(
                tournamentId,
                ageCatRes.id,
                genderType,
                parseInt(maxTeams),
                parseFloat(registrationFee) || 0,
                null,
                bankDetails
            );
        },
        initialState
    );

    return (
        <div className="flex items-center justify-center h-full min-h-[calc(100vh-6rem)] w-full p-2 sm:p-4 my-auto">
            <div className="w-full sm:max-w-[640px] h-[85vh] max-h-[90vh] bg-card border border-border shadow-2xl rounded-sm overflow-hidden flex flex-col my-auto">
                {/* Dialog-style Header */}
                <div className="flex flex-col gap-1 sm:text-left border-b p-3 md:p-4 shrink-0 bg-card">
                    <h2 className="text-lg md:text-xl font-black tracking-tighter text-foreground leading-none">
                        {t("title")}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {t.rich("desc", {
                            name: tournamentName,
                            span: (chunks) => <span className="text-primary font-bold">{chunks}</span>
                        })}
                    </p>
                </div>

                {/* Dialog-style Form Body (Scrollable inside card) */}
                <form action={formAction} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                        {/* Age Category Type & Input */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">
                                {t("age_category")} <span className="text-destructive">*</span>
                            </Label>
                            <div className="grid grid-cols-3 border bg-card rounded-sm divide-x overflow-hidden">
                                {[
                                    { id: "under", label: ageValue ? t("age_under", { age: ageValue }) : t("type_under"), icon: <ArrowDownCircle className="h-4 w-4" /> },
                                    { id: "over", label: ageValue ? t("age_over", { age: ageValue }) : t("type_over"), icon: <PlusCircle className="h-4 w-4" /> },
                                    { id: "open", label: t("age_open"), icon: <Globe className="h-4 w-4" /> },
                                ].map((typeItem) => {
                                    const isSelected = ageType === typeItem.id;
                                    return (
                                        <button
                                            key={typeItem.id}
                                            type="button"
                                            disabled={isPending}
                                            onClick={() => {
                                                setAgeType(typeItem.id as "under" | "over" | "open");
                                                if (typeItem.id === "open") setAgeValue("");
                                            }}
                                            className={cn(
                                                "group flex flex-col items-center justify-center p-2.5 text-center transition-all cursor-pointer gap-1.5",
                                                isSelected
                                                    ? "bg-primary/10 text-primary font-bold"
                                                    : "hover:bg-muted/30 text-muted-foreground hover:text-primary"
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
                                <div className="space-y-1 pt-1">
                                    <Label className="text-xs font-bold">
                                        {ageType === "under" 
                                            ? "ระบุตัวเลขอายุ (เช่น 13 สื่อถึง U13)"
                                            : "ระบุตัวเลขอายุ (เช่น 35 สื่อถึง 35+)"} <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        type="text"
                                        size="sm"
                                        value={ageValue}
                                        disabled={isPending}
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
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">
                                {t("gender_group")} <span className="text-destructive">*</span>
                            </Label>
                            <div className="grid grid-cols-3 border bg-card rounded-sm divide-x overflow-hidden">
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
                                            disabled={isPending}
                                            onClick={() => setGenderType(genderItem.id)}
                                            className={cn(
                                                "group flex flex-col items-center justify-center p-2.5 text-center transition-all cursor-pointer gap-1.5",
                                                isSelected
                                                    ? "bg-primary/10 text-primary font-bold"
                                                    : "hover:bg-muted/30 text-muted-foreground hover:text-primary"
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

                        {/* Max Teams and Registration Fee Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Max Teams Input */}
                            <div className="space-y-1">
                                <Label className="text-xs font-bold">
                                    {t("team_limit")} <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    type="text"
                                    size="sm"
                                    name="max_teams"
                                    value={maxTeams}
                                    disabled={isPending}
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
                                <Label className="text-xs font-bold">
                                    {t("fee")} (THB)
                                </Label>
                                <Input
                                    type="text"
                                    size="sm"
                                    name="registration_fee"
                                    value={registrationFee}
                                    disabled={isPending}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9.]/g, "");
                                        if ((val.match(/\./g) || []).length <= 1) {
                                            setRegistrationFee(val);
                                        }
                                    }}
                                    placeholder={t("fee_hint")}
                                    className="bg-transparent text-foreground focus-visible:ring-0"
                                />
                            </div>
                        </div>

                        {/* Bank Details Section */}
                        <div className="-mx-4 border-t border-border" />
                        <div className="space-y-3">
                            <div className="flex flex-col gap-0.5">
                                <Label className="text-xs font-bold text-foreground">
                                    {t("bank_section_title")}
                                </Label>
                                <span className="text-[11px] text-muted-foreground">
                                    {t("bank_section_desc")}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">{t("promptpay_id")}</Label>
                                    <Input
                                        type="text"
                                        size="sm"
                                        value={bankAccountNumber}
                                        disabled={isPending}
                                        onChange={(e) => setBankAccountNumber(e.target.value)}
                                        placeholder={t("promptpay_placeholder")}
                                        className="bg-transparent text-foreground focus-visible:ring-0"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">{t("bank_name")}</Label>
                                        <Input
                                            type="text"
                                            size="sm"
                                            value={bankName}
                                            disabled={isPending}
                                            onChange={(e) => setBankName(e.target.value)}
                                            placeholder="PromptPay / ธนาคาร"
                                            className="bg-transparent text-foreground focus-visible:ring-0"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">{t("account_name")}</Label>
                                        <Input
                                            type="text"
                                            size="sm"
                                            value={bankAccountName}
                                            disabled={isPending}
                                            onChange={(e) => setBankAccountName(e.target.value)}
                                            placeholder={t("account_name_placeholder")}
                                            className="bg-transparent text-foreground focus-visible:ring-0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {state.error && (
                            <div className="text-xs font-medium text-destructive bg-destructive/10 rounded-sm border border-destructive/20 p-2.5">
                                {state.error}
                            </div>
                        )}
                    </div>

                    {/* Dialog-style Footer */}
                    <div className="shrink-0 flex flex-row items-center justify-end gap-2 border-t p-4 sm:p-5 bg-card">
                        <Button
                            size="sm"
                            type="submit"
                            disabled={isPending}
                            className="w-full sm:w-auto min-w-[140px]"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t("setting_up")}
                                </>
                            ) : (
                                t("setup_btn")
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
