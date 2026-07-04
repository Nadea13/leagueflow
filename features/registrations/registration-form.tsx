"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Team } from "@/types/index";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, X, Upload, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PromptPayQR } from "./promptpay-qr";
import { registerTeam } from "@/actions/manager/register-team";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import { LogoUploader } from "@/components/shared/logo-uploader";

// Schema generator based on fee
const createFormSchema = (isFree: boolean, t: (key: string) => string) => z.object({
    teamName: z.string().min(2, t("team_name_error")),
    contactName: z.string().min(2, t("contact_name_error")),
    contactPhone: z.string().min(10, t("contact_phone_error")),
    description: z.string().optional(),
    logoFile: z.unknown().optional(),
    slipFile: isFree
        ? z.instanceof(FileList).optional()
        : z.instanceof(FileList)
            .refine((files) => files?.length === 1, t("slip_required"))
            .refine(
                (files) => files?.[0]?.size <= 5 * 1024 * 1024,
                t("slip_size_error")
            )
            .refine(
                (files) => ["image/jpeg", "image/png", "image/webp"].includes(files?.[0]?.type),
                t("slip_type_error")
            ),
});

interface RegistrationFormProps {
    tournament: {
        id: string;
        name: string;
        registration_fee: number;
        bank_account_number: string;
        bank_name: string;
        bank_account_name: string;
        is_registration_open: boolean;
        status: string;
    };
    tournamentCategoryId?: string;
    initialTeams?: Team[];
    categories?: {
        id: string | number;
        gender_type: string;
        max_teams: number;
        age_categories?: unknown;
    }[];
    isRegistrationDisabled?: boolean;
    isFull?: boolean;
    isPastDeadline?: boolean;
}

export function RegistrationForm({
    tournament,
    tournamentCategoryId,
    initialTeams,
    categories,
    isRegistrationDisabled,
    isFull,
    isPastDeadline
}: RegistrationFormProps) {
    const tCommon = useTranslations("Common");
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(null);
    const [selectedTeamId, setSelectedTeamId] = useState<string>("");

    const t = useTranslations("Registration");
    const isFree = Number(tournament.registration_fee) <= 0;
    const formSchema = useMemo(() => createFormSchema(isFree, t), [isFree, t]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            teamName: "",
            contactName: "",
            contactPhone: "",
            description: "",
        },
    });

    const handleSelectTeam = (teamId: string) => {
        setSelectedTeamId(teamId);
        if (teamId === "new") {
            form.setValue("teamName", "");
            form.setValue("description", "");
            form.setValue("contactName", "");
            form.setValue("contactPhone", "");
            form.setValue("logoFile", undefined);
            setLogoPreviewUrl(null);
            setLogoFile(null);
            return;
        }

        const selectedTeam = initialTeams?.find(t => t.id === teamId);
        if (selectedTeam) {
            form.setValue("teamName", selectedTeam.name);
            form.setValue("description", selectedTeam.description || "");
            form.setValue("contactName", selectedTeam.contact_name || "");
            form.setValue("contactPhone", selectedTeam.contact_phone || "");
            setLogoPreviewUrl(selectedTeam.logo_url || null);
            setLogoFile(null);
        }
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("tournamentId", tournament.id);
            if (tournamentCategoryId) {
                formData.append("tournamentCategoryId", tournamentCategoryId);
            }
            formData.append("teamName", values.teamName);
            formData.append("contactName", values.contactName);
            formData.append("contactPhone", values.contactPhone);
            if (values.description) {
                formData.append("description", values.description);
            }
            if (selectedTeamId && selectedTeamId !== "new") {
                formData.append("existingTeamId", selectedTeamId);
            }
            if (logoFile) {
                formData.append("logoFile", logoFile);
            } else if (logoPreviewUrl && !logoPreviewUrl.startsWith('data:')) {
                formData.append("logoUrl", logoPreviewUrl);
            }

            if (!isFree && values.slipFile?.[0]) {
                formData.append("slipFile", values.slipFile[0]);
            }

            const result = await registerTeam(formData);

            if (result.success) {
                setSuccess(true);
                toast.success(result.message || t("reg_success_toast"));
            } else {
                toast.error(result.error || t("reg_failed_toast"));
            }
        } catch (_error) {
            toast.error("An unexpected error occurred");
            console.error(_error);
        } finally {
            setIsSubmitting(false);
        }
    }

    if (success) {
        return (
            <div className="space-y-2 md:space-y-4">
                <div className="relative overflow-hidden">
                    <EmptyState
                        title={t("success_title")}
                        description={`${t("success_desc")} ${!isFree ? t("success_desc_paid") : ""}`}
                        icon={CheckCircle2}
                        className="py-12"
                        action={
                            <div className="flex gap-4">
                                <Button variant="outline" onClick={() => window.location.reload()}>
                                    {t("register_another")}
                                </Button>
                                <Button onClick={() => window.location.href = `/dashboard`}>
                                    {t("go_to_dashboard")}
                                </Button>
                            </div>
                        }
                    />
                </div>
            </div>
        );
    }

    const isRegistrationClosed = !tournament.is_registration_open || tournament.status === 'completed';
    const isExistingTeam = selectedTeamId !== "" && selectedTeamId !== "new";

    return (
        <div className="bg-card space-y-2 md:space-y-4 p-2 md:p-4 border rounded-xl">

            <div className="relative overflow-hidden">
                {isRegistrationDisabled ? (
                    <EmptyState
                        title={t("registration_closed_title")}
                        description={
                            isFull
                                ? t("registration_closed_full_desc")
                                : (isPastDeadline ? t("registration_closed_deadline_desc") : t("registration_closed_desc"))
                        }
                        icon={AlertCircle}
                        className="min-h-[300px]"
                        action={
                            categories && categories.length > 0 ? (
                                <div className="flex flex-col space-y-1">
                                    <Label>เลือกรุ่นการแข่งขันอื่น</Label>
                                    <Select
                                        value={tournamentCategoryId || ""}
                                        onValueChange={(val) => {
                                            const params = new URLSearchParams(searchParams.toString());
                                            params.set("category", val);
                                            router.push(`${pathname}?${params.toString()}`);
                                        }}
                                    >
                                        <SelectTrigger className="w-[220px] bg-transparent text-foreground focus-visible:ring-0">
                                            <SelectValue placeholder="เลือกรุ่นการแข่งขัน" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => {
                                                const ageCategoriesData = (Array.isArray(cat.age_categories) ? cat.age_categories[0] : cat.age_categories) as unknown as { category_name: string | null } | null;
                                                const ageName = ageCategoriesData?.category_name || "General";
                                                const gender = cat.gender_type === 'open' ? 'Open'
                                                    : cat.gender_type === 'male' ? 'Male'
                                                        : cat.gender_type === 'female' ? 'Female'
                                                            : 'Mixed';
                                                const label = `${ageName} (${gender})`;
                                                return (
                                                    <SelectItem key={String(cat.id)} value={String(cat.id)} className="text-sm tracking-tighter">
                                                        {label}
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <Button asChild variant="outline">
                                    <Link href="/manager/tournaments">
                                        {tCommon("back_to_dashboard")}
                                    </Link>
                                </Button>
                            )
                        }
                    />
                ) : (
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 md:space-y-3">
                        {isRegistrationClosed && (
                            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 text-destructive">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                <div>
                                    <p className="font-bold">{t("registration_closed_title")}</p>
                                    <p className="text-sm opacity-90">{t("registration_closed_desc")}</p>
                                </div>
                            </div>
                        )}

                        {initialTeams && initialTeams.length > 0 && (
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 md:gap-4 p-2 md:p-4 border rounded-sm">
                                <h4 className="text-xs font-bold tracking-wider">{t("use_existing_team")}</h4>
                                <Select value={selectedTeamId} onValueChange={handleSelectTeam}>
                                    <SelectTrigger className="w-full md:w-auto">
                                        <SelectValue placeholder={t("select_team_placeholder")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new" className="text-sm tracking-tighter">{t("create_new_team")}</SelectItem>
                                        {initialTeams.map((team) => (
                                            <SelectItem key={team.id} value={team.id} className="text-sm tracking-tighter">
                                                {team.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {categories && categories.length > 0 && (
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 md:gap-4 p-2 md:p-4 border rounded-sm">
                                <h4 className="text-xs font-bold tracking-wider">Tournament Category</h4>
                                <Select
                                    value={tournamentCategoryId || ""}
                                    onValueChange={(val) => {
                                        const params = new URLSearchParams(searchParams.toString());
                                        params.set("category", val);
                                        router.push(`${pathname}?${params.toString()}`);
                                    }}
                                >
                                    <SelectTrigger className="w-full md:w-auto">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => {
                                            const ageCategoriesData = (Array.isArray(cat.age_categories) ? cat.age_categories[0] : cat.age_categories) as unknown as { category_name: string | null } | null;
                                            const ageName = ageCategoriesData?.category_name || "General";
                                            const gender = cat.gender_type === 'open' ? 'Open'
                                                : cat.gender_type === 'male' ? 'Male'
                                                    : cat.gender_type === 'female' ? 'Female'
                                                        : 'Mixed';
                                            const label = `${ageName} (${gender})`;
                                            return (
                                                <SelectItem key={String(cat.id)} value={String(cat.id)} className="text-sm tracking-tighter">
                                                    {label}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                            <div className="w-full col-span-2 space-y-1">
                                <Label>{t("team_logo_label")}</Label>
                                <LogoUploader
                                    id="logo-upload"
                                    initialUrl={logoPreviewUrl}
                                    disabled={isExistingTeam || isSubmitting}
                                    onFileChange={(file) => {
                                        setLogoFile(file);
                                        if (file) {
                                            setLogoPreviewUrl(URL.createObjectURL(file));
                                        } else {
                                            setLogoPreviewUrl(null);
                                        }
                                    }}
                                    onRemove={() => {
                                        setLogoFile(null);
                                        setLogoPreviewUrl(null);
                                    }}
                                    uploadLabel={t("team_logo_label")}
                                    clickToUploadLabel={t("click_to_upload_logo")}
                                    previewLabel="Logo preview"
                                />
                            </div>

                            <div className="space-y-1 col-span-2">
                                <Label>{t("team_name_label")} <span className="text-destructive">*</span></Label>
                                <Input
                                    {...form.register("teamName")}
                                    disabled={isExistingTeam}
                                />
                                {form.formState.errors.teamName && (
                                    <p className="text-[10px] font-black tracking-widest text-destructive mt-1">
                                        {form.formState.errors.teamName.message}
                                    </p>
                                )}
                            </div>

                            <div className="w-full col-span-2 space-y-1">
                                <Label>{t("team_description_label")}</Label>
                                <Textarea
                                    {...form.register("description")}
                                    className="bg-transparent w-full focus-visible:ring-0 resize-none min-h-[80px] text-sm"
                                    disabled={isExistingTeam}
                                />
                                {form.formState.errors.description && (
                                    <p className="text-[10px] font-black tracking-widest text-destructive mt-1">
                                        {form.formState.errors.description.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <Label>{t("contact_name_label")} <span className="text-destructive">*</span></Label>
                                <Input
                                    {...form.register("contactName")}
                                    disabled={isExistingTeam}
                                />
                                {form.formState.errors.contactName && (
                                    <p className="text-[10px] font-black tracking-widest text-destructive mt-1">
                                        {form.formState.errors.contactName.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <Label>{t("contact_phone_label")} <span className="text-destructive">*</span></Label>
                                <Input
                                    {...form.register("contactPhone")}
                                    className="bg-transparent text-foreground focus-visible:ring-0 text-sm"
                                    disabled={isExistingTeam}
                                />
                                {form.formState.errors.contactPhone && (
                                    <p className="text-[10px] font-black tracking-widest text-destructive mt-1">
                                        {form.formState.errors.contactPhone.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        {!isFree && (
                            <>
                                <div className="grid md:grid-cols-2 gap-2 md:gap-3">
                                    {tournament.bank_account_number && (
                                        <div className="border rounded-lg p-2 md:p-4 space-y-2 md:space-y-4">
                                            <PromptPayQR
                                                phoneNumber={tournament.bank_account_number}
                                                amount={Number(tournament.registration_fee)}
                                            />
                                            <div className="space-y-2 md:space-y-4 text-sm relative overflow-hidden">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black tracking-widest text-muted-foreground">{t("bank_label")}</span>
                                                    <span className="font-black text-foreground">{tournament.bank_name}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black tracking-widest text-muted-foreground">{t("account_name_label")}</span>
                                                    <span className="font-black text-foreground">{tournament.bank_account_name}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black tracking-widest text-muted-foreground">{t("account_no_label")}</span>
                                                    <span className="font-mono font-bold text-primary text-lg leading-none tracking-tighter">{tournament.bank_account_number}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col">
                                        <div className="flex-1 flex flex-col space-y-1">
                                            <div className="group relative h-full flex flex-col">
                                                {!slipPreviewUrl ? (
                                                    <div className="py-24 border-2 border-dashed rounded-lg hover:border-primary/40 transition-colors text-center cursor-pointer relative flex-1 flex items-center justify-center">
                                                        <input
                                                            type="file"
                                                            accept="image/jpeg,image/png,image/webp"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                            {...form.register("slipFile", {
                                                                onChange: (e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        setSlipPreviewUrl(URL.createObjectURL(file));
                                                                    }
                                                                }
                                                            })}
                                                        />
                                                        <div className="flex flex-col items-center gap-4">
                                                            <div className="p-4 bg-primary/5 text-primary rounded-sm transition-transform shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                                                                <Upload className="w-8 h-8" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="text-sm tracking-wide text-foreground">
                                                                    {t("click_to_upload")}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="relative overflow-hidden border p-2 md:p-4 rounded-lg">
                                                        <div className="flex flex-col gap-2 md:gap-4">
                                                            <div className="relative aspect-[3/4] w-full max-h-[360px] overflow-hidden flex items-center justify-center">
                                                                <Image
                                                                    src={slipPreviewUrl}
                                                                    alt="Slip preview"
                                                                    width={300}
                                                                    height={400}
                                                                    className="object-contain w-full h-full"
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="destructive"
                                                                    size="icon"
                                                                    className="absolute top-0 right-0 h-8 w-8"
                                                                    onClick={() => {
                                                                        form.setValue("slipFile", undefined);
                                                                        setSlipPreviewUrl(null);
                                                                    }}
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex-1 space-y-1">
                                                                    <p className="text-xs font-black tracking-wide truncate text-foreground">{t("slip_preview")}</p>
                                                                    <p className="text-[10px] font-bold text-muted-foreground">{t("ready_to_submit")}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {form.formState.errors.slipFile && (
                                                <p className="text-[10px] font-black tracking-wide text-destructive">
                                                    {form.formState.errors.slipFile.message as string}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="space-y-2 md:space-y-3">
                            <Button
                                type="submit"
                                variant="default"
                                disabled={isSubmitting || isRegistrationClosed}
                                className="w-full"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        {isFree ? t("registering") : t("verifying_registering")}
                                    </>
                                ) : isRegistrationClosed ? (
                                    t("registration_closed_title")
                                ) : (
                                    isFree ? t("confirm_registration") : t("confirm_and_pay")
                                )}
                            </Button>
                            <p className="text-center text-[10px] font-bold tracking-widest text-muted-foreground/40">
                                {isFree
                                    ? t("terms_free")
                                    : t("terms_paid")}
                            </p>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
