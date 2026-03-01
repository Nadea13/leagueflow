"use client";

import { Product } from "@/types";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Check, Loader2, RefreshCw, Clock, X } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { createPromptPayCharge, checkChargeStatus } from "@/app/[locale]/actions/payment";
import { recordPayment, updateProfilePaymentStatus } from "@/app/[locale]/dashboard/billing/actions";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { confirmPayment } from "@/app/[locale]/dashboard/tournaments/[id]/actions";

interface PaymentSectionProps {
    product: Product;
    tournaments?: { id: string; name: string; status: string; }[] | null;
    onCancel: () => void;
    onSuccess: () => void;
}

export function PaymentSection({ product, tournaments, onCancel, onSuccess }: PaymentSectionProps) {
    const t = useTranslations("Billing");
    const tCommon = useTranslations("Common");
    const { toast } = useToast();

    const [selectedTournament, setSelectedTournament] = useState<string>("");
    const [isGeneratingQR, setIsGeneratingQR] = useState(false);
    const [isCheckingStatus, setIsCheckingStatus] = useState(false);
    const [paymentState, setPaymentState] = useState<{
        qrCode: string | null;
        chargeId: string | null;
        status: 'pending' | 'success' | 'failed';
    }>({ qrCode: null, chargeId: null, status: 'pending' });
    const [timeLeft, setTimeLeft] = useState(24 * 60 * 60);

    // Derive legacy plan type for backend compatibility
    // Logic: 'lifetime' -> 'tournament', '1 month' -> 'monthly', '1 year' -> 'yearly'
    const getPlanType = (): 'tournament' | 'monthly' | 'yearly' => {
        const duration = product.duration?.toLowerCase();
        if (duration === 'lifetime') return 'tournament';
        if (duration === '1 year' || duration === 'year') return 'yearly';
        return 'monthly'; // Default to monthly for '1 month' or others
    };

    const planType = getPlanType();

    // All tournaments are eligible (no plan column in tournaments table)
    const eligibleTournaments = tournaments || [];

    // Prices from Product
    const getPrice = () => product.discounted_price || product.price;

    const isGeneratingRef = useRef(false);

    const handleGenerateQR = async () => {
        if (planType === 'tournament' && !selectedTournament) {
            toast({ title: tCommon("error"), description: t("select_tournament_hint"), variant: "destructive" });
            return;
        }

        if (isGeneratingRef.current) return;
        isGeneratingRef.current = true;
        setIsGeneratingQR(true);
        setTimeLeft(24 * 60 * 60);

        try {
            const amount = getPrice() * 100; // Satang
            const metadata = {
                plan_type: planType,
                tournament_id: planType === 'tournament' ? selectedTournament : undefined
            };

            const res = await createPromptPayCharge(amount, metadata);
            if (res.success && res.data) {
                setPaymentState({
                    qrCode: res.data.qr_image,
                    chargeId: res.data.charge_id,
                    status: 'pending'
                });

                // Update profile to pending
                if (planType === 'monthly' || planType === 'yearly') {
                    await updateProfilePaymentStatus({
                        payment_status: 'pending',
                        payment_id: res.data.charge_id,
                        payment_method: 'promptpay',
                        // Do NOT update plan here, only when paid
                    });
                }

            } else {
                toast({ title: tCommon("error"), description: res.error || t("error_payment_system"), variant: "destructive" });
            }
        } catch (error) {
            toast({ title: tCommon("error"), description: tCommon("something_went_wrong"), variant: "destructive" });
        } finally {
            setIsGeneratingQR(false);
            isGeneratingRef.current = false;
        }
    };

    const checkStatus = useCallback(async (silent = false) => {
        if (!paymentState.chargeId || paymentState.status === 'success') return;

        if (!silent) setIsCheckingStatus(true);
        try {
            const res = await checkChargeStatus(paymentState.chargeId);
            if (res.success && res.data && res.data.status === 'successful') {

                // 1. Confirm Tournament Upgrade if applicable
                if (planType === 'tournament' && selectedTournament) {
                    await confirmPayment(selectedTournament, paymentState.chargeId, 'promptpay');
                } else if (planType === 'monthly' || planType === 'yearly') {
                    // Update profile for subscription plans
                    await updateProfilePaymentStatus({
                        payment_status: 'paid',
                        payment_id: paymentState.chargeId,
                        payment_method: 'promptpay',
                        plan: planType
                    });
                }

                // 2. Record History
                await recordPayment({
                    amount: getPrice(),
                    status: 'success',
                    payment_method: 'promptpay',
                    charge_id: paymentState.chargeId,
                    plan_type: planType,
                    tournament_id: planType === 'tournament' ? selectedTournament : undefined
                });

                setPaymentState(prev => ({ ...prev, status: 'success' }));
                toast({ title: t("payment_success"), description: t("payment_success_desc") });

                setTimeout(() => {
                    onSuccess();
                }, 2000);

            } else if (res.success && !silent) {
                toast({ title: t("payment_pending"), description: t("payment_pending_desc") });
            }
        } finally {
            if (!silent) setIsCheckingStatus(false);
        }
    }, [paymentState.chargeId, paymentState.status, planType, selectedTournament, t, tCommon, getPrice, onSuccess]);

    // Timer Effect
    useEffect(() => {
        if (!paymentState.qrCode || paymentState.status === 'success') return;
        if (timeLeft <= 0) return;
        const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [paymentState.qrCode, paymentState.status, timeLeft]);

    // Polling Effect - Use Ref to prevent interval clearing on re-renders
    const checkStatusRef = useRef(checkStatus);
    useEffect(() => {
        checkStatusRef.current = checkStatus;
    }, [checkStatus]);

    useEffect(() => {
        if (!paymentState.chargeId || paymentState.status !== 'pending') return;

        const timer = setInterval(() => {
            // Use the ref to always call the latest function without resetting the timer
            if (checkStatusRef.current) checkStatusRef.current(true);
        }, 3000);

        return () => clearInterval(timer);
    }, [paymentState.chargeId, paymentState.status]);

    const hasAutoGeneratedRef = useRef(false);
    // const isGeneratingRef = useRef(false); // Declared above now

    // Reset auto-gen guard when plan changes
    useEffect(() => {
        hasAutoGeneratedRef.current = false;
    }, [product.id]);

    // Auto-Generate QR for non-tournament plans (Safe Version)
    useEffect(() => {
        if (
            planType !== 'tournament' &&
            !paymentState.qrCode &&
            !isGeneratingQR &&
            !hasAutoGeneratedRef.current
        ) {
            hasAutoGeneratedRef.current = true; // Lock immediately
            handleGenerateQR();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planType]);

    // ... (rest of code)

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

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
                            product.name === 'Starter' ? t('free.title') :
                                product.name === 'Per Tournament' ? t('tournament.title') :
                                    product.name === 'Monthly Pro' ? t('monthly.title') :
                                        product.name === 'Yearly Pro' ? t('yearly.title') :
                                            product.name
                        }
                    </span>
                    <div className="flex items-baseline gap-2">
                        {product.discounted_price ? (
                            <>
                                <span className="text-xs text-muted-foreground line-through">
                                    ฿{product.price}
                                </span>
                                <span className="text-sm font-bold text-primary">฿{product.discounted_price}</span>
                            </>
                        ) : (
                            <span className="text-sm font-bold text-primary">฿{product.price}</span>
                        )}
                    </div>
                </div>
            </div>

            {planType === 'tournament' && !paymentState.qrCode && (
                <div className="mb-6 max-w-sm">
                    <label className="text-sm font-medium mb-1.5 block">{t("select_tournament_label")}</label>
                    <div className="flex gap-2">
                        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("select_tournament_placeholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                {eligibleTournaments.length > 0 ? (
                                    eligibleTournaments.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="none" disabled>{t("no_tournaments")}</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleGenerateQR} disabled={!selectedTournament || isGeneratingQR}>
                            {isGeneratingQR ? <Loader2 className="w-4 h-4 animate-spin" /> : t("generate_btn")}
                        </Button>
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
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-none flex items-center justify-center mx-auto">
                                    <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="text-xl font-bold text-green-600 dark:text-green-400">{t("payment_success")}</h3>
                                <p className="text-muted-foreground">{t("payment_success_desc")}</p>
                            </div>
                        ) : timeLeft <= 0 ? (
                            <div className="text-center space-y-4">
                                <Clock className="w-12 h-12 text-muted-foreground mx-auto" />
                                <div>
                                    <h3 className="font-semibold text-lg">{t("qr_expired")}</h3>
                                    <Button onClick={handleGenerateQR} disabled={isGeneratingQR} className="mt-2">
                                        <RefreshCw className="w-4 h-4 mr-2" /> {t("regenerate_btn")}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="bg-white p-4 rounded-none shadow-sm border border-border/50 relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={paymentState.qrCode} alt="PromptPay QR" className="w-64 h-64 object-contain mix-blend-multiply" />
                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-background border shadow-sm px-3 py-1 rounded-none flex items-center gap-2 text-xs font-mono font-medium">
                                        <Clock className="w-3 h-3 text-orange-500" />
                                        <span className={timeLeft < 60 ? "text-red-500" : ""}>{formatTime(timeLeft)}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-2 text-primary font-medium animate-pulse text-sm">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>{t("waiting_payment")}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center animate-pulse">
                                        {t("checking_status")}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
