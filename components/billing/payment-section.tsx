"use client";

import { Plan } from "@/types";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Check, Loader2, RefreshCw, X, UploadCloud, CreditCard } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import generatePayload from "promptpay-qr";
import { QRCodeSVG } from "qrcode.react";
import { recordPayment, updateProfilePaymentStatus } from "@/app/[locale]/dashboard/billing/actions";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { confirmPayment } from "@/app/[locale]/organizer/tournaments/[id]/actions";
import { Input } from "@/components/ui/input";
import { verifySlip } from "@/app/[locale]/dashboard/billing/slip-actions";

interface PaymentSectionProps {
    plan: Plan;
    tournaments?: { id: string; name: string; status: string; }[] | null;
    onCancel: () => void;
    onSuccess: () => void;
    externalSelectedTournament?: string;
}

export function PaymentSection({ plan, tournaments, onCancel, onSuccess, externalSelectedTournament }: PaymentSectionProps) {
    const t = useTranslations("Billing");
    const tCommon = useTranslations("Common");
    const { toast } = useToast();

    const [selectedTournament, setSelectedTournament] = useState<string>("");
    const [isGeneratingQR, setIsGeneratingQR] = useState(false);
    const [isUploadingSlip, setIsUploadingSlip] = useState(false);
    const [paymentState, setPaymentState] = useState<{
        qrCode: string | null;
        status: 'pending' | 'success' | 'failed';
    }>({ qrCode: null, status: 'pending' });

    const promptPayId = process.env.NEXT_PUBLIC_PROMPTPAY_ID || "0800000000";
    const accountName = process.env.NEXT_PUBLIC_PROMPTPAY_NAME || "LeagueFlow";

    // Derive legacy plan type for backend compatibility
    // Logic: 'lifetime' -> 'tournament', '1 month' -> 'monthly', '1 year' -> 'yearly'
    const getPlanType = (): 'tournament' | 'monthly' | 'yearly' => {
        const duration = plan.duration?.toLowerCase();
        const name = plan.name?.toLowerCase();
        if (duration?.includes('tournament') || name?.includes('tournament') || duration === 'lifetime') return 'tournament';
        if (duration?.includes('year') || name?.includes('yearly')) return 'yearly';
        return 'monthly'; // Default to monthly for '1 month' or others
    };

    const planType = getPlanType();

    // All tournaments are eligible (no plan column in tournaments table)
    const eligibleTournaments = tournaments || [];

    // Prices from Plan
    const getPrice = () => plan.discounted_price || plan.price;

    const isGeneratingRef = useRef(false);

    const handleGenerateQR = async () => {
        const activeTournament = externalSelectedTournament || selectedTournament;
        if (planType === 'tournament' && !activeTournament) {
            toast({ title: tCommon("error"), description: t("select_tournament_hint"), variant: "destructive" });
            return;
        }

        if (isGeneratingRef.current) return;
        isGeneratingRef.current = true;
        setIsGeneratingQR(true);

        try {
            const amount = getPrice();
            const payload = generatePayload(promptPayId, { amount });

            setPaymentState({
                qrCode: payload,
                status: 'pending'
            });

        } catch (error) {
            toast({ title: tCommon("error"), description: tCommon("something_went_wrong"), variant: "destructive" });
        } finally {
            setIsGeneratingQR(false);
            isGeneratingRef.current = false;
        }
    };

    const handleUploadSlip = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingSlip(true);
        try {
            const formData = new FormData();
            formData.append("slip", file);

            const res = await verifySlip(formData);
            if (res.success && res.data) {
                const referenceNo = res.data.referenceNo;
                const activeTournament = externalSelectedTournament || selectedTournament;
                const publicUrl = res.data.publicUrl;

                // For Scenario 5: End-to-End Billing Verification
                // Instead of confirming immediately, we record as 'pending' and store publicUrl.
                // Admin will verify and execute the actual plan/tournament upgrades.
                const chargeIdPayload = JSON.stringify({ ref: referenceNo, url: publicUrl });

                await recordPayment({
                    amount: getPrice(),
                    status: 'pending',
                    payment_method: 'promptpay',
                    charge_id: chargeIdPayload,
                    plan_type: planType,
                    tournament_id: planType === 'tournament' ? activeTournament : undefined
                });

                setPaymentState(prev => ({ ...prev, status: 'success' }));
                toast({ title: tCommon("success"), description: t("payment_pending_verification", { defaultValue: "Slip uploaded successfully. Awaiting admin verification." }) });

                setTimeout(() => {
                    onSuccess();
                }, 2000);

            } else {
                toast({ title: tCommon("error"), description: res.error || "Invalid slip", variant: "destructive" });
            }
        } catch (error) {
            toast({
                title: tCommon("error"),
                description: (error as any).message || tCommon("something_went_wrong"),
                variant: "destructive"
            });
        } finally {
            setIsUploadingSlip(false);
            e.target.value = '';
        }
    };

    const hasAutoGeneratedRef = useRef(false);
    // const isGeneratingRef = useRef(false); // Declared above now

    // Reset auto-gen guard when plan changes
    useEffect(() => {
        hasAutoGeneratedRef.current = false;
        setPaymentState({ qrCode: null, status: 'pending' });
    }, [plan.id, plan.price]);

    // Auto-Generate QR for plans (Safe Version)
    useEffect(() => {
        // Use external selection if provided, otherwise internal
        const activeTournament = externalSelectedTournament || selectedTournament;
        const canGenerate = planType !== 'tournament' || !!activeTournament;

        if (
            canGenerate &&
            !paymentState.qrCode &&
            !isGeneratingQR &&
            !hasAutoGeneratedRef.current
        ) {
            hasAutoGeneratedRef.current = true; // Lock immediately
            handleGenerateQR();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planType, selectedTournament, externalSelectedTournament, paymentState.qrCode]);

    // ... (rest of code)



    return (
        <div className="bg-background border rounded-none p-6 animate-in fade-in slide-in-from-top-2 relative">
            <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onCancel}>
                <X className="w-4 h-4" />
            </Button>

            <div className="mb-6">
                <h4 className="font-semibold text-lg">{t("pay_with_promptpay")}</h4>
                <p className="text-sm text-muted-foreground">{t("scan_desc")}</p>
                <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-medium">
                        {t("plan_prefix")}
                        {
                            plan.name?.trim() === 'Starter' ? t('free.title') :
                                (plan.name?.trim() === 'Per Tournament' || planType === 'tournament') ? t('tournament.title') :
                                    (plan.name?.trim() === 'Monthly Pro' || planType === 'monthly') ? t('monthly.title') :
                                        (plan.name?.trim() === 'Yearly Pro' || planType === 'yearly') ? t('yearly.title') :
                                            (plan.name?.trim() === 'Manager Pro') ? t('manager_pro.title') :
                                                plan.name
                        }
                    </span>
                    <div className="flex items-baseline gap-2">
                        {plan.discounted_price ? (
                            <>
                                <span className="text-xs text-muted-foreground line-through">
                                    ฿{plan.price}
                                </span>
                                <span className="text-sm font-bold text-primary">฿{plan.discounted_price}</span>
                            </>
                        ) : (
                            <span className="text-sm font-bold text-primary">฿{plan.price}</span>
                        )}
                    </div>
                </div>
            </div>

            {planType === 'tournament' && !externalSelectedTournament && (
                <div className="mb-6 max-w-sm">
                    <label className="text-sm font-medium mb-1.5 block">{t("select_tournament_label")}</label>
                    <div className="flex gap-2">
                        <Select
                            value={selectedTournament}
                            onValueChange={(val) => {
                                setSelectedTournament(val);
                                setPaymentState({ qrCode: null, status: 'pending' });
                                hasAutoGeneratedRef.current = false;
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t("select_tournament_placeholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                {eligibleTournaments.length > 0 ? (
                                    eligibleTournaments.map((tournamentItem: any) => (
                                        <SelectItem key={tournamentItem.id} value={tournamentItem.id}>{tournamentItem.name}</SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="none" disabled>{t("no_tournaments")}</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            <div className="flex flex-col items-center justify-center min-h-[300px]">
                {isGeneratingQR ? (
                    <div className="text-center space-y-4">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                        <p className="text-muted-foreground">{tCommon("loading")}</p>
                    </div>
                ) : !paymentState.qrCode ? (
                    planType !== 'tournament' ? (
                        <div className="text-center space-y-4">
                            {/* Keep the button just in case, or if auto-gen fails/is guarded */}
                            <Button onClick={handleGenerateQR} disabled={isGeneratingQR}>
                                {isGeneratingQR ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {tCommon("generate_qr")}
                            </Button>
                        </div>
                    ) : (
                        <div className="text-muted-foreground text-center">
                            {t("select_tournament_hint")}
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-center space-y-6 w-full">
                        {paymentState.status === 'success' ? (
                            <div className="text-center space-y-2 py-8">
                                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-none flex items-center justify-center mx-auto">
                                    <Check className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">{t("payment_pending_title", { defaultValue: "Verification Pending" })}</h3>
                                <p className="text-muted-foreground">{t("payment_pending_desc", { defaultValue: "Your slip was uploaded successfully. An admin will verify your payment shortly." })}</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-1 rounded-xl shadow-sm border border-border/50 bg-white relative mb-4">
                                    <div className="flex justify-center mix-blend-multiply relative">
                                        <QRCodeSVG value={paymentState.qrCode} size={200} />
                                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[60px] h-[60px] rounded-none p-1 shadow-sm flex items-center justify-center overflow-hidden">
                                            <svg viewBox="0 0 651 492" fill="none" className="w-14" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M128.153 0.622788C135.849 0.231453 143.567 -0.333771 151.264 0.253231C219.943 0.318454 288.644 0.253186 357.323 0.274927C388.195 0.427113 420.154 7.07982 445.699 25.2334C467.223 40.278 482.441 63.1929 490.399 88.0209C495.312 103.196 497.986 119.11 498.421 135.046C498.356 203.052 498.443 271.079 498.378 339.084C547.99 386.935 597.711 434.7 647.346 482.53C648.998 484.16 651.237 486.269 650.585 488.835C649.389 491.139 646.389 491.356 644.106 491.617C479.833 491.574 315.559 491.617 151.307 491.617C122.457 491.769 92.8678 487.487 66.9963 474.072C51.9516 466.311 38.5158 455.332 28.2107 441.896C10.9484 419.525 2.29562 391.457 0.404166 363.52C-0.269799 356.65 0.0780405 349.737 0.186745 342.845C0.186745 266.709 0.186745 190.572 0.186745 114.436C0.752006 91.0863 7.42643 67.3454 21.9276 48.7352C36.4069 29.799 57.7347 17.211 80.106 9.86263C95.6506 4.7318 111.869 1.9055 128.153 0.622788ZM99.2596 63.7799C88.3675 67.3236 78.345 74.1937 72.1054 83.9118C65.7136 93.8257 62.7351 105.827 63.1047 117.567C63.1047 150.7 63.1047 183.833 63.1047 216.966C92.0199 216.966 120.935 216.987 149.872 216.966V169.505C149.785 161.679 153.264 153.678 159.721 149.091C166.221 144.395 174.526 143.156 182.396 143.351C195.571 143.351 208.746 143.351 221.921 143.351C221.987 115.675 221.9 87.9992 221.965 60.3231C192.028 60.2361 162.091 60.3231 132.175 60.2796C121.131 59.2143 109.826 60.3448 99.2596 63.7799ZM280.426 60.2579C280.295 87.9557 280.382 115.653 280.382 143.351C294.34 143.373 308.319 143.351 322.277 143.351C329.734 143.395 337.582 145.047 343.518 149.808C349.409 154.461 352.518 162.07 352.431 169.484C352.431 185.311 352.279 201.138 352.344 216.966C381.303 217.009 410.262 216.966 439.199 216.966V115.98C439.395 107.957 438.112 99.8696 435.286 92.3473C431.372 81.716 423.306 72.7805 413.262 67.6062C400.087 60.7579 384.76 58.9969 370.128 60.2796C340.235 60.2578 310.341 60.3448 280.448 60.2361L280.426 60.2579ZM63.1264 274.644C63.1047 309.625 63.1264 344.584 63.1264 379.565C63.3655 387.87 64.9961 396.284 68.9964 403.654C73.7576 412.676 81.8887 419.634 91.0851 423.895C104.325 430.091 119.239 431.982 133.719 431.33C163.134 431.352 192.549 431.33 221.943 431.33C221.943 403.654 221.965 375.956 221.943 348.28C207.964 348.28 194.006 348.28 180.048 348.28C172.591 348.258 164.743 346.584 158.808 341.823C152.916 337.149 149.829 329.54 149.916 322.104V274.644C121 274.644 92.0852 274.644 63.1482 274.644H63.1264ZM352.236 278.057C352.149 292.993 352.214 307.929 352.214 322.843C352.453 329.213 350.823 335.931 346.409 340.714C341.474 345.91 334.104 348.171 327.082 348.085C310.95 348.019 294.818 348.171 278.687 347.997C278.317 351.606 278.6 355.215 278.513 358.846C278.491 382.609 278.578 406.35 278.469 430.113C285.318 430.373 292.188 430.156 299.036 430.221C367.628 430.178 436.22 430.308 504.813 430.156C475.332 400.545 445.656 371.152 416.154 341.562C394.761 320.495 373.824 298.929 352.257 278.057H352.236Z" fill="white" />
                                                <path d="M352.236 278.057C373.824 298.929 394.739 320.496 416.132 341.562C445.634 371.152 475.311 400.545 504.791 430.156C436.199 430.308 367.607 430.178 299.014 430.221C292.144 430.156 285.296 430.374 278.447 430.113C278.556 406.35 278.447 382.609 278.491 358.846C278.578 355.216 278.295 351.585 278.665 347.998C294.797 348.172 310.928 347.998 327.06 348.085C334.082 348.172 341.474 345.911 346.388 340.715C350.801 335.932 352.431 329.214 352.192 322.843C352.192 307.908 352.127 292.972 352.214 278.057L352.236 278.057Z" fill="#54A69A" />
                                                <path d="M280.426 60.2579C280.295 87.9557 280.382 115.653 280.382 143.351C294.34 143.373 308.319 143.351 322.277 143.351C329.734 143.395 337.582 145.047 343.518 149.808C349.409 154.461 352.518 162.07 352.431 169.484C352.431 185.311 352.279 201.138 352.344 216.966C381.303 217.009 410.262 216.966 439.199 216.966V115.98C439.395 107.957 438.112 99.8696 435.286 92.3473C431.372 81.716 423.306 72.7805 413.262 67.6062C400.087 60.7579 384.76 58.9969 370.128 60.2796C340.235 60.2578 310.341 60.3448 280.448 60.2361L280.426 60.2579Z" fill="#113566" />
                                                <path d="M99.2596 63.7799C88.3675 67.3236 78.345 74.1937 72.1054 83.9118C65.7136 93.8257 62.7351 105.827 63.1047 117.567V216.966C92.0199 216.966 120.935 216.987 149.872 216.966V169.505C149.785 161.679 153.264 153.678 159.721 149.091C166.221 144.395 174.526 143.156 182.396 143.351H221.921C221.987 115.675 221.9 87.9992 221.965 60.3231C192.028 60.2361 162.091 60.3231 132.175 60.2796C121.131 59.2143 109.826 60.3448 99.2596 63.7799Z" fill="#113566" />
                                                <path d="M63.1264 274.644C63.1047 309.625 63.1264 344.584 63.1264 379.565C63.3655 387.87 64.9961 396.284 68.9964 403.654C73.7576 412.676 81.8887 419.634 91.0851 423.895C104.325 430.091 119.239 431.982 133.719 431.33C163.134 431.352 192.549 431.33 221.943 431.33C221.943 403.654 221.965 375.956 221.943 348.28H180.048C172.591 348.258 164.743 346.584 158.808 341.823C152.916 337.149 149.829 329.54 149.916 322.104V274.644H63.1482H63.1264Z" fill="#113566" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                                    <div className="text-center w-full space-y-4">
                                        <div className="bg-muted/30 p-3 border rounded-none">
                                            <p className="text-lg font-bold text-foreground leading-tight mb-1">{accountName}</p>
                                            <p className="text-sm font-semibold text-muted-foreground flex items-center justify-center gap-1.5 pt-1 border-t border-border/50">
                                                <CreditCard className="w-4 h-4 text-primary" />
                                                {promptPayId}
                                            </p>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-2">
                                            {t("paid_instruction", { defaultValue: "Please scan the QR code to pay, then upload your transfer slip to complete." })}
                                        </p>
                                        <div className="relative">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleUploadSlip}
                                                disabled={isUploadingSlip}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <Button className="w-full relative pointer-events-none" variant="outline" disabled={isUploadingSlip}>
                                                {isUploadingSlip ? (
                                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {tCommon("loading")}</>
                                                ) : (
                                                    <><UploadCloud className="w-4 h-4 mr-2" /> {t("upload_slip", { defaultValue: "Upload Payment Slip" })}</>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
