"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Team } from "@/types/index";
import { useTranslations } from "next-intl";
import { Trophy, AlertCircle, CheckCircle2, Users, ImageIcon, X, Upload, User, FileText, Loader2, Smartphone } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PromptPayQR } from "./promptpay-qr";
import { registerTeam } from "@/actions/manager/register-team";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// Schema generator based on fee
const createFormSchema = (isFree: boolean, t: (key: string) => string) => z.object({
    teamName: z.string().min(2, t("team_name_error")),
    contactName: z.string().min(2, t("contact_name_error")),
    contactPhone: z.string().min(10, t("contact_phone_error")),
    description: z.string().optional(),
    logoFile: z.instanceof(FileList).optional()
        .optional()
        .refine(
            (files) => !files || files.length === 0 || files[0].size <= 5 * 1024 * 1024,
            t("logo_size_error")
        )
        .refine(
            (files) => !files || files.length === 0 || ["image/jpeg", "image/png", "image/webp"].includes(files[0].type),
            t("logo_type_error")
        ),
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
    initialTeams?: Team[];
}

export function RegistrationForm({ tournament, initialTeams }: RegistrationFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
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
            setLogoPreviewUrl(null);
            return;
        }

        const selectedTeam = initialTeams?.find(t => t.id === teamId);
        if (selectedTeam) {
            form.setValue("teamName", selectedTeam.name);
            form.setValue("description", selectedTeam.description || "");
            setLogoPreviewUrl(selectedTeam.logo_url || null);
        }
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("tournamentId", tournament.id);
            formData.append("teamName", values.teamName);
            formData.append("contactName", values.contactName);
            formData.append("contactPhone", values.contactPhone);
            if (values.description) {
                formData.append("description", values.description);
            }
            if (selectedTeamId && selectedTeamId !== "new") {
                formData.append("existingTeamId", selectedTeamId);
            }
            if (values.logoFile?.[0]) {
                formData.append("logoFile", values.logoFile[0]);
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
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-none flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{t("success_title")}</h2>
                <p className="text-muted-foreground max-w-md mb-8">
                    {t("success_desc")} {!isFree && t("success_desc_paid")}
                </p>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => window.location.reload()}>
                        {t("register_another")}
                    </Button>
                    <Button onClick={() => window.location.href = `/manager/tournaments`}>
                        {t("go_to_dashboard")}
                    </Button>
                </div>
            </div>
        );
    }

    const isRegistrationClosed = !tournament.is_registration_open || tournament.status === 'completed';

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {isRegistrationClosed && (
                    <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-none">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <div>
                            <p className="font-bold">{t("registration_closed_title")}</p>
                            <p className="text-sm opacity-90">{t("registration_closed_desc")}</p>
                        </div>
                    </div>
                )}
                
                {initialTeams && initialTeams.length > 0 && (
                    <div className="space-y-4 p-4 border rounded-none bg-primary/5 border-primary/10">
                        <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-bold tracking-wider">{t("use_existing_team") || "Use Existing Team"}</h4>
                        </div>
                        <Select value={selectedTeamId} onValueChange={handleSelectTeam}>
                            <SelectTrigger className="rounded-none bg-background">
                                <SelectValue placeholder={t("select_team_placeholder") || "Select one of your teams..."} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">{t("create_new_team") || "Create New Team"}</SelectItem>
                                {initialTeams.map((team) => (
                                    <SelectItem key={team.id} value={team.id}>
                                        {team.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="teamName"
                        render={({ field }) => (
                            <FormItem className="w-full md:col-span-2">
                                <FormLabel className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    {t("team_name_label")}
                                </FormLabel>
                                <FormControl>
                                    <Input placeholder={t("team_name_placeholder")} {...field} className="h-11" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem className="w-full md:col-span-2">
                                <FormLabel className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    {t("team_description_label")}
                                </FormLabel>
                                <FormControl>
                                    <Textarea 
                                        placeholder={t("team_description_placeholder")} 
                                        {...field} 
                                        className="min-h-[100px] resize-none border-none bg-primary/5 focus-visible:ring-1 focus-visible:ring-primary/50" 
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="logoFile"
                        render={({ field: { value: _value, onChange, ...fieldProps } }) => (
                            <FormItem className="w-full md:col-span-2">
                                <FormLabel className="flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                    {t("team_logo_label") || "Team Logo"}
                                </FormLabel>
                                <FormControl>
                                    <div className="group relative">
                                        {!logoPreviewUrl ? (
                                            <div className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors rounded-none p-6 text-center cursor-pointer bg-muted/5 hover:bg-muted/10 relative">
                                                <Input
                                                    {...fieldProps}
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    onChange={(event) => {
                                                        const file = event.target.files && event.target.files[0];
                                                        if (file) {
                                                            onChange(event.target.files);
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setLogoPreviewUrl(reader.result as string);
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="p-2 bg-primary/10 rounded-none text-primary group-hover:scale-110 transition-transform">
                                                        <Upload className="w-4 h-4" />
                                                    </div>
                                                    <div className="text-sm font-medium text-foreground">
                                                        {t("click_to_upload_logo") || t("click_to_upload")}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative rounded-none overflow-hidden border bg-muted/30 p-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-16 w-16 relative rounded-none overflow-hidden border bg-foreground">
                                                        <Image src={logoPreviewUrl} alt="Logo preview" width={64} height={64} className="object-contain w-full h-full" unoptimized />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate text-foreground">{t("logo_preview") || "Logo Preview"}</p>
                                                        <p className="text-xs text-muted-foreground">{t("ready_to_submit")}</p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-destructive"
                                                        onClick={() => {
                                                            onChange(undefined);
                                                            setLogoPreviewUrl(null);
                                                            setSelectedTeamId("new");
                                                        }}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="contactName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    {t("contact_name_label")}
                                </FormLabel>
                                <FormControl>
                                    <Input placeholder={t("contact_name_placeholder")} {...field} className="h-11" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                                    {t("contact_phone_label")}
                                </FormLabel>
                                <FormControl>
                                    <Input placeholder={t("contact_phone_placeholder")} {...field} className="h-11" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {!isFree && (
                    <>
                        <Separator />

                        <div className="bg-card border border-border/10 shadow-2xl rounded-none p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-8 bg-primary" />
                            <div className="bg-gradient-to-r from-primary/10 to-transparent px-6 py-4 border-b border-border/10 relative -mx-6 -mt-6 mb-6">
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                <h3 className="text-sm font-black tracking-widest text-primary flex items-center gap-2">
                                    <Smartphone className="w-4 h-4" />
                                    {t("payment_details")}
                                </h3>
                            </div>
                            <p className="text-xs font-bold tracking-tighter text-muted-foreground/60 mb-6">
                                {t("scan_or_transfer")}
                            </p>

                            <div className="grid md:grid-cols-2 gap-8 items-stretch">
                                {tournament.bank_account_number && (
                                    <div className="rounded-none shadow-sm border">
                                        <PromptPayQR
                                            phoneNumber={tournament.bank_account_number}
                                            amount={Number(tournament.registration_fee)}
                                        />
                                    </div>
                                )}

                                <div className="flex flex-col h-full gap-6">
                                    <div className="bg-card border border-border/10 shadow-xl rounded-none p-6 space-y-4 text-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-8 bg-primary/30" />
                                        <div className="flex justify-between items-center pb-3 border-b border-border/5">
                                            <span className="text-[10px] font-black tracking-widest text-muted-foreground/40">{t("bank_label")}</span>
                                            <span className="font-black text-foreground">{tournament.bank_name || "-"}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-3 border-b border-border/5">
                                            <span className="text-[10px] font-black tracking-widest text-muted-foreground/40">{t("account_name_label")}</span>
                                            <span className="font-black text-foreground">{tournament.bank_account_name || "-"}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-1">
                                            <span className="text-[10px] font-black tracking-widest text-muted-foreground/40">{t("account_no_label")}</span>
                                            <span className="font-mono font-bold text-primary text-lg leading-none tracking-tighter">{tournament.bank_account_number || "-"}</span>
                                        </div>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="slipFile"
                                        render={({ field: { onChange, value: _value, ...rest } }) => (
                                            <FormItem className="flex-1 flex flex-col">
                                                <FormLabel className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                                    {t("upload_slip_label")}
                                                </FormLabel>
                                                <FormControl className="flex-1">
                                                    <div className="group relative h-full flex flex-col">
                                                        {!slipPreviewUrl ? (
                                                            <div className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors rounded-none p-12 py-20 text-center cursor-pointer bg-muted/5 hover:bg-muted/10 relative flex-1 flex items-center justify-center min-h-[300px]">
                                                                <Input
                                                                    type="file"
                                                                    accept="image/jpeg,image/png,image/webp"
                                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            onChange(e.target.files);
                                                                            setSlipPreviewUrl(URL.createObjectURL(file));
                                                                        }
                                                                    }}
                                                                    {...rest}
                                                                />
                                                                <div className="flex flex-col items-center gap-4">
                                                                    <div className="p-4 bg-primary/10 rounded-none text-primary group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                                                                        <Upload className="w-8 h-8" />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-sm font-black tracking-widest text-foreground">
                                                                            {t("click_to_upload")}
                                                                        </div>
                                                                        <p className="text-[10px] font-bold tracking-widest text-muted-foreground/40">
                                                                            {t("file_types_hint")}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="relative rounded-none overflow-hidden border bg-muted/30 p-4">
                                                                <div className="flex flex-col gap-4">
                                                                    <div className="relative aspect-[3/4] w-full max-h-[400px] rounded-none overflow-hidden border bg-foreground flex items-center justify-center">
                                                                        <Image
                                                                            src={slipPreviewUrl}
                                                                            alt="Slip preview"
                                                                            width={300}
                                                                            height={400}
                                                                            className="object-contain w-full h-full"
                                                                            unoptimized
                                                                        />
                                                                        <Button
                                                                            type="button"
                                                                            variant="destructive"
                                                                            size="icon"
                                                                            className="absolute top-2 right-2 h-8 w-8 rounded-none shadow-md"
                                                                            onClick={() => {
                                                                                onChange(undefined);
                                                                                setSlipPreviewUrl(null);
                                                                            }}
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-semibold truncate text-foreground">{t("slip_preview")}</p>
                                                                            <p className="text-xs text-muted-foreground">{t("ready_to_submit")}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <div className="pt-4">
                    <Button
                        type="submit"
                        disabled={isSubmitting || isRegistrationClosed}
                        className="w-full h-12 text-base font-semibold shadow-md active:scale-[0.99] transition-all"
                        size="lg"
                        variant="default"
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
                    <p className="text-center text-xs text-muted-foreground mt-4">
                        {isFree
                            ? t("terms_free")
                            : t("terms_paid")}
                    </p>
                </div>
            </form>
        </Form>
    );
}
