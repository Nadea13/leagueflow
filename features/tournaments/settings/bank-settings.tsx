"use client";

import { useActionState, useEffect, useState } from "react";
import { updateTournament } from "@/actions/tournaments/general";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations, useLocale } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { ActionResponse, Tournament } from "@/types/index";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import QRCode from "qrcode";
import generatePayload from "promptpay-qr";
import { Copy, Check, ShieldCheck, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

const BANK_OPTIONS = [
    { value: "PromptPay", label: "พร้อมเพย์ (PromptPay)", color: "from-blue-600 to-indigo-700" },
];

interface BankSettingsProps {
    tournament: Tournament;
}

export function BankSettings({ tournament }: BankSettingsProps) {
    const t = useTranslations("Settings");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const isThai = locale === "th";
    const { toast } = useToast();

    const updateTournamentWithId = updateTournament.bind(null, tournament.id);
    const [state, formAction, isPending] = useActionState(updateTournamentWithId, initialState);

    const [bankName, setBankName] = useState(tournament.bank_name || "PromptPay");
    const [bankAccountName, setBankAccountName] = useState(tournament.bank_account_name || "");
    const [bankAccountNumber, setBankAccountNumber] = useState(tournament.bank_account_number || "");
    const [copied, setCopied] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

    useEffect(() => {
        async function generateQR() {
            const cleanNumber = bankAccountNumber.replace(/[^0-9]/g, "");
            if (cleanNumber.length >= 9) {
                try {
                    const fn = typeof generatePayload === "function" ? generatePayload : (generatePayload as unknown as { default: typeof generatePayload })?.default || generatePayload;
                    if (typeof fn === "function") {
                        const payload = fn(cleanNumber, {});
                        const url = await QRCode.toDataURL(payload, {
                            margin: 1,
                            width: 300,
                            color: {
                                dark: "#000000",
                                light: "#ffffff",
                            },
                        });
                        setQrCodeUrl(url);
                        return;
                    }
                } catch (err) {
                    console.error("QR Generation error:", err);
                }
            }
            setQrCodeUrl("");
        }
        generateQR();
    }, [bankAccountNumber]);

    useEffect(() => {
        if (state.success) {
            toast({
                title: tCommon("success"),
                description: isThai ? "บันทึกข้อมูลธนาคารเรียบร้อยแล้ว" : "Bank settings saved successfully",
            });
        } else if (state.error) {
            toast({
                title: tCommon("error"),
                description: state.error,
                variant: "destructive",
            });
        }
    }, [state, tCommon, isThai, toast]);

    const handleCopy = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 lg:gap-4">
            {/* Bank Edit Form */}
            <form action={formAction} className="md:col-span-7 space-y-1 lg:space-y-2">
                <input type="hidden" name="form_type" value="general" />

                <div className="space-y-1">
                    <Label htmlFor="bank_name">{isThai ? "เลือกธนาคาร / ช่องทางชำระเงิน" : "Bank / Payment Method"}</Label>
                    <Select
                        name="bank_name"
                        value={bankName}
                        onValueChange={setBankName}
                    >
                        <SelectTrigger id="bank_name" className="w-full">
                            <SelectValue placeholder={isThai ? "เลือกธนาคาร" : "Select Bank"} />
                        </SelectTrigger>
                        <SelectContent>
                            {BANK_OPTIONS.map((b) => (
                                <SelectItem key={b.value} value={b.value} className="font-semibold text-xs cursor-pointer">
                                    {b.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <Label htmlFor="bank_account_name">{isThai ? "ชื่อบัญชี" : "Account Name"}</Label>
                    <Input
                        type="text"
                        id="bank_account_name"
                        name="bank_account_name"
                        value={bankAccountName}
                        onChange={(e) => setBankAccountName(e.target.value)}
                        placeholder={isThai ? "เช่น นายสมชาย สายลุย" : "e.g. Somchai Sailui"}
                    />
                </div>

                <div className="space-y-1">
                    <Label htmlFor="bank_account_number">{isThai ? "เลขบัญชี / เบอร์พร้อมเพย์" : "Account / PromptPay Number"}</Label>
                    <Input
                        type="text"
                        id="bank_account_number"
                        name="bank_account_number"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        placeholder={isThai ? "เช่น 099-XXX-XXXX หรือ 123-4-56789-0" : "e.g. 099-XXX-XXXX"}
                    />
                </div>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending} className="w-full md:w-auto">
                        {isPending ? (isThai ? "กำลังบันทึก..." : "Saving...") : (t("save_changes") || (isThai ? "บันทึกการเปลี่ยนแปลง" : "Save Changes"))}
                    </Button>
                </div>
            </form>

            {/* Live Preview Card */}
            <div className="md:col-span-5">

                <div className="border p-2 lg:p-4 rounded-sm space-y-1 lg:space-y-2 relative overflow-hidden">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center">
                            <div>
                                <h4 className="text-sm font-bold">{bankName || "PromptPay"}</h4>
                                <p className="text-[10px] text-muted-foreground">
                                    {isThai ? "การโอนเงิน/ชำระเงินค่าสมัคร" : "Registration Fee Payment"}
                                </p>
                            </div>
                        </div>
                        <Badge variant="default" className="text-[10px]">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Verified
                        </Badge>
                    </div>

                    <div className="space-y-2 bg-background/80 p-3 rounded-md border border-border/50">
                        <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                                {isThai ? "ชื่อบัญชี" : "Account Name"}
                            </span>
                            <span className="text-xs font-semibold text-foreground">
                                {bankAccountName || (isThai ? "ยังไม่ได้ระบุ" : "Not specified")}
                            </span>
                        </div>

                        <div className="pt-1 flex items-center justify-between border-t border-border/40">
                            <div>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                                    {isThai ? "เลขบัญชี / พร้อมเพย์" : "Account Number"}
                                </span>
                                <span className="text-sm font-bold font-mono text-primary">
                                    {bankAccountNumber || "—"}
                                </span>
                            </div>

                            {bankAccountNumber && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => handleCopy(bankAccountNumber)}
                                >
                                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                    {copied ? (isThai ? "คัดลอกแล้ว" : "Copied") : (isThai ? "คัดลอก" : "Copy")}
                                </Button>
                            )}
                        </div>

                        {/* PromptPay Open-Amount QR Code */}
                        {qrCodeUrl && (
                            <div className="pt-3 border-t border-border/40 flex flex-col items-center justify-center text-center space-y-1.5">
                                <div className="bg-white p-2.5 rounded-md shadow-sm border border-border/50 flex flex-col items-center">
                                    <Image
                                        src={qrCodeUrl}
                                        alt="PromptPay QR Code"
                                        width={160}
                                        height={160}
                                        className="w-[140px] h-[140px] object-contain"
                                    />
                                    <span className="text-[10px] font-bold text-slate-800 mt-1 flex items-center gap-1">
                                        <QrCode className="w-3 h-3 text-primary" />
                                        PromptPay QR Code
                                    </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-medium">
                                    {isThai ? "สแกนด้วยแอปธนาคาร (ไม่ระบุจำนวนเงิน)" : "Scan via banking app (Open amount)"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
