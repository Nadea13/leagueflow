"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { Calendar, MapPin, Trophy, AlertCircle, CheckCircle2, Users, ImageIcon, X, Upload, User, Phone, FileText, Loader2, Smartphone, CreditCard } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PromptPayQR } from "./promptpay-qr";
import { registerTeam } from "@/actions/register-team";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// Schema generator based on fee
const createFormSchema = (isFree: boolean, t: any) => z.object({
    teamName: z.string().min(2, t("team_name_error")),
    contactName: z.string().min(2, t("contact_name_error")),
    contactPhone: z.string().min(10, t("contact_phone_error")),
    logoFile: z.any()
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
        ? z.any().optional()
        : z.any()
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
    };
}

export function RegistrationForm({ tournament }: RegistrationFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const t = useTranslations("Registration");
    const isFree = Number(tournament.registration_fee) <= 0;
    const formSchema = useMemo(() => createFormSchema(isFree, t), [isFree, t]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            teamName: "",
            contactName: "",
            contactPhone: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("tournamentId", tournament.id);
            formData.append("teamName", values.teamName);
            formData.append("contactName", values.contactName);
            formData.append("contactPhone", values.contactPhone);
            if (values.logoFile?.[0]) {
                formData.append("logoFile", values.logoFile[0]);
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
        } catch (error) {
            toast.error("An unexpected error occurred");
            console.error(error);
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
                    <Button onClick={() => window.location.href = `/dashboard/tournaments/${tournament.id}`}>
                        {t("go_to_dashboard")}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

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
                                    <div className="flex gap-4 items-center">
                                        {/* Nested Logo Upload Field */}
                                        <FormField
                                            control={form.control}
                                            name="logoFile"
                                            render={({ field: { value, onChange, ...fieldProps } }) => (
                                                <div className="shrink-0">
                                                    <label htmlFor="logo-upload-field" className="cursor-pointer group relative block">
                                                        <div className="h-11 w-11 rounded-none border border-input flex items-center justify-center overflow-hidden bg-muted/5 hover:bg-muted/10 transition-colors">
                                                            {previewUrl ? (
                                                                <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                                                            ) : (
                                                                <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                                                            )}
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-none">
                                                                <Upload className="h-4 w-4 text-white" />
                                                            </div>
                                                        </div>
                                                        <Input
                                                            {...fieldProps}
                                                            id="logo-upload-field"
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(event) => {
                                                                const file = event.target.files && event.target.files[0];
                                                                if (file) {
                                                                    onChange(event.target.files);
                                                                    const reader = new FileReader();
                                                                    reader.onloadend = () => {
                                                                        setPreviewUrl(reader.result as string);
                                                                    };
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                        />

                                        <Input placeholder={t("team_name_placeholder")} {...field} className="h-11 flex-1" />
                                    </div>
                                </FormControl>
                                <div className="flex flex-col gap-1">
                                    <FormMessage />
                                    <FormField
                                        control={form.control}
                                        name="logoFile"
                                        render={({ fieldState }) =>
                                            fieldState.error ? (
                                                <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
                                            ) : <></>
                                        }
                                    />
                                </div>
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

                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">{t("payment_details")}</h3>
                                    <p className="text-sm text-muted-foreground">{t("scan_or_transfer")}</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8 items-start">
                                {/* QR Code Section */}
                                {tournament.bank_account_number && (
                                    <div className="p-2 bg-white rounded-none shadow-sm border">
                                        <PromptPayQR
                                            phoneNumber={tournament.bank_account_number}
                                            amount={Number(tournament.registration_fee)}
                                        />
                                    </div>
                                )}

                                {/* Bank Details & Upload */}
                                <div className="space-y-6">
                                    <div className="bg-muted/50 rounded-none p-5 space-y-3 text-sm">
                                        <div className="flex justify-between items-center pb-2 border-b border-border/50">
                                            <span className="text-muted-foreground">{t("bank_label")}</span>
                                            <span className="font-medium text-foreground">{tournament.bank_name || "-"}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-2 border-b border-border/50">
                                            <span className="text-muted-foreground">{t("account_name_label")}</span>
                                            <span className="font-medium text-foreground">{tournament.bank_account_name || "-"}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">{t("account_no_label")}</span>
                                            <span className="font-mono font-medium text-primary text-base">{tournament.bank_account_number || "-"}</span>
                                        </div>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="slipFile"
                                        render={({ field: { onChange, value, ...rest } }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                                    {t("upload_slip_label")}
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="group relative">
                                                        {!previewUrl ? (
                                                            <div className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors rounded-none p-8 text-center cursor-pointer bg-muted/5 hover:bg-muted/10 relative">
                                                                <Input
                                                                    type="file"
                                                                    accept="image/jpeg,image/png,image/webp"
                                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            onChange(e.target.files);
                                                                            setPreviewUrl(URL.createObjectURL(file));
                                                                        }
                                                                    }}
                                                                    {...rest}
                                                                />
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <div className="p-3 bg-primary/10 rounded-none text-primary group-hover:scale-110 transition-transform">
                                                                        <Upload className="w-5 h-5" />
                                                                    </div>
                                                                    <div className="text-sm font-medium text-foreground">
                                                                        {t("click_to_upload")}
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {t("file_types_hint")}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="relative rounded-none overflow-hidden border bg-muted/30 p-2">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-16 w-16 relative rounded-none overflow-hidden border">
                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                        <img
                                                                            src={previewUrl}
                                                                            alt="Slip preview"
                                                                            className="object-cover w-full h-full"
                                                                        />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium truncate text-foreground">{t("slip_preview")}</p>
                                                                        <p className="text-xs text-muted-foreground">{t("ready_to_submit")}</p>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="text-muted-foreground hover:text-destructive"
                                                                        onClick={() => {
                                                                            onChange(undefined);
                                                                            setPreviewUrl(null);
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
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <div className="pt-4">
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 text-base font-semibold shadow-md active:scale-[0.99] transition-all"
                        size="lg"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                {isFree ? t("registering") : t("verifying_registering")}
                            </>
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
