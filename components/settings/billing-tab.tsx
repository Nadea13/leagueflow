"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Payment, Tournament, Plan } from "@/types";
import { getPlans } from "@/actions/common/plans";
import { getUserPayments, getUserTournaments, createPaymentRecord, createPaymentRecordWithSlip } from "@/actions/common/payments";
import { getUserSubscriptionPlan } from "@/actions/common/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PromptPayQR } from "@/features/registrations/promptpay-qr";
import { Loader2, CloudUpload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export function BillingTab() {
    const t = useTranslations("Billing");
    const router = useRouter();

    const [activePlan, setActivePlan] = useState<string>("free");
    const [plans, setPlans] = useState<Plan[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);

    // Slip upload state
    const [slipFile, setSlipFile] = useState<File | null>(null);
    const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(null);

    // Selection state
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    const [isPending, startTransition] = useTransition();
    const [loadingData, setLoadingData] = useState(true);

    const loadData = async () => {
        setLoadingData(true);
        try {
            // Load user subscription plan
            const plan = await getUserSubscriptionPlan();
            setActivePlan(plan);

            // Load plans
            const plansRes = await getPlans();
            if (plansRes.success && plansRes.data) setPlans(plansRes.data);

            // Load user payments and tournaments
            const [paymentsRes, tournamentsRes] = await Promise.all([
                getUserPayments(),
                getUserTournaments(),
            ]);

            if (paymentsRes.success && paymentsRes.data) setPayments(paymentsRes.data);
            if (tournamentsRes.success && tournamentsRes.data) setTournaments(tournamentsRes.data);
        } catch (error) {
            console.error("Error loading billing data:", error);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSelectPlan = (plan: Plan) => {
        setSelectedPlan(plan);
        setIsCheckoutOpen(true);
        setSlipFile(null);
        setSlipPreviewUrl(null);
        // Default tournament if exists
        if (tournaments.length > 0) {
            setSelectedTournamentId(tournaments[0].id);
        } else {
            setSelectedTournamentId("");
        }
    };

    const handleConfirmPayment = () => {
        if (!selectedPlan) return;

        const isFreeOrPro = selectedPlan.id === "starter" || selectedPlan.id === "pro";
        const price = isFreeOrPro ? 0 : (selectedPlan.discounted_price || selectedPlan.price);
        const isTournamentPlan = selectedPlan.name === "Single Tournament";
        const tourId = isTournamentPlan ? selectedTournamentId : null;

        if (price > 0 && !slipFile) {
            alert(t("slip_required") || "Please upload your payment slip.");
            return;
        }

        startTransition(async () => {
            let res;
            if (price > 0) {
                const formData = new FormData();
                formData.append("planId", selectedPlan.id);
                formData.append("amount", String(price));
                formData.append("paymentMethod", "promptpay");
                if (tourId) {
                    formData.append("tournamentId", tourId);
                }
                if (slipFile) {
                    formData.append("slipFile", slipFile);
                }
                res = await createPaymentRecordWithSlip(formData);
            } else {
                res = await createPaymentRecord(
                    selectedPlan.id,
                    price,
                    "promptpay",
                    tourId
                );
            }

            if (res.success) {
                setIsCheckoutOpen(false);
                setSelectedPlan(null);
                setSlipFile(null);
                setSlipPreviewUrl(null);
                // Reload data
                await loadData();
                router.refresh();
            } else {
                alert("Payment processing failed: " + res.error);
            }
        });
    };

    // Helper to get plan displayName
    const getPlanName = (planId: string) => {
        if (planId === "starter" || planId === "free") return t("plan_starter");
        if (planId === "pro") return t("plan_pro") || "Pro";
        if (planId === "pro_yearly" || planId === "yearly") return t("plan_pro_yearly");
        if (planId === "customs") return t("plan_customs") || "Customs";
        if (planId === "manager_pro") return t("manager_pro.title") || "Manager Pro";
        return t("plan_starter") || "Starter";
    };

    const getPlanFeatures = (planId: string): string[] => {
        try {
            const rawFeatures = t.raw(`features.${planId}`);
            if (Array.isArray(rawFeatures)) return rawFeatures;
        } catch (error) {
            console.error(`Error loading features for ${planId}:`, error);
        }
        return [];
    };

    return (
        <div className="space-y-2 md:space-y-4">
            {/* Current Plan overview */}
            <Card className="bg-card border rounded-lg">
                <CardContent className="p-2 md:p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight">{t("title")}</CardTitle>
                            <CardDescription className="text-xs">{t("description")}</CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1 font-bold">
                            {t("active_prefix")}{getPlanName(activePlan)}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Plans List */}
            <div className="space-y-2 md:space-y-4">
                <Label>{t("plansTitle")}</Label>

                {loadingData && plans.length === 0 ? (
                    <div className="flex items-center justify-center min-h-[200px]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 items-stretch">
                        {plans.map((plan) => {
                            const isCurrent = activePlan === plan.id || (plan.id === 'starter' && activePlan === 'free') || (plan.id === 'pro_yearly' && activePlan === 'yearly');
                            const isCustoms = plan.id === 'customs';
                            const isPro = plan.id === 'pro';
                            const isProYearly = plan.id === 'pro_yearly';
                            const isManagerPro = plan.id === 'manager_pro';
                            const isRecommended = isPro || isManagerPro;

                            return (
                                <div
                                    key={plan.id}
                                    className={`bg-card border rounded-lg p-2 md:p-4 flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative ${isCurrent
                                            ? "border-2 border-primary shadow-lg"
                                            : isRecommended
                                                ? "shadow-sm hover:border-primary"
                                                : "border shadow-sm hover:border-primary/45"
                                        }`}
                                >
                                    {isRecommended && (
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wider">
                                            {t("recommended")}
                                        </div>
                                    )}
                                    <div>
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-md font-black">{plan.name}</h3>
                                            {isCurrent && (
                                                <Badge className="text-[10px] font-bold bg-primary/25 text-primary border-none">
                                                    {t("active_badge")}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground text-[10px]">
                                            {isPro
                                                ? t("proDesc")
                                                : plan.id === "starter"
                                                    ? t("starterDesc")
                                                    : isProYearly
                                                        ? t("proYearlyDesc")
                                                        : isManagerPro
                                                            ? t("managerProDesc")
                                                            : t("customsDesc")
                                            }
                                        </p>

                                        <div className="flex flex-col min-h-[48px] justify-center">
                                            {isPro ? (
                                                <>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-2xl font-black line-through text-muted-foreground/60">฿790</span>
                                                        <span className="text-2xl font-black">฿0</span>
                                                        <span className="text-muted-foreground text-xs">{t("perMonth")}</span>
                                                    </div>
                                                </>
                                            ) : isProYearly ? (
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl font-black">฿7,900</span>
                                                    <span className="text-muted-foreground text-xs">{t("perYear")}</span>
                                                </div>
                                            ) : isManagerPro ? (
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl font-black">฿{plan.price.toLocaleString()}</span>
                                                    <span className="text-muted-foreground text-xs">{t("perMonth")}</span>
                                                </div>
                                            ) : isCustoms ? (
                                                <span className="text-xl font-black py-1">{t("contactSales")}</span>
                                            ) : (
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl font-black">฿0</span>
                                                    <span className="text-muted-foreground text-xs">{t("lifetime")}</span>
                                                </div>
                                            )}
                                        </div>

                                        <ul className="space-y-1 text-[11px] text-foreground/90 mb-6">
                                            {getPlanFeatures(plan.id).map((desc, idx) => (
                                                <li key={idx} className="flex items-start gap-1.5">
                                                    <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                                                    <span>{desc}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="mt-auto">
                                        {isCustoms ? (
                                            <Button
                                                variant="outline"
                                                className="w-full text-xs font-bold h-9"
                                                asChild
                                            >
                                                <a href="https://www.facebook.com/profile.php?id=61583928452496" target="_blank" rel="noopener noreferrer">
                                                    {t("contactTeam")}
                                                </a>
                                            </Button>
                                        ) : (
                                            <Button
                                                variant={isCurrent ? "outline" : ((isRecommended || isProYearly) ? "default" : "outline")}
                                                className={`w-full text-xs font-bold h-9 ${isCurrent
                                                        ? "border-primary text-primary hover:bg-primary/10"
                                                        : (isRecommended || isProYearly) && !isCurrent
                                                            ? "bg-primary text-primary-foreground hover:bg-primary/95"
                                                            : ""
                                                    }`}
                                                disabled={isCurrent || plan.price === 0}
                                                onClick={() => handleSelectPlan(plan)}
                                            >
                                                {isCurrent
                                                    ? t("currentPlan")
                                                    : plan.id === "pro"
                                                        ? t("subscribePro")
                                                        : plan.id === "pro_yearly"
                                                            ? t("subscribeProYearly")
                                                            : plan.id === "manager_pro"
                                                                ? t("manager_pro.title") || "Subscribe Manager Pro"
                                                                : t("getStartedFree")
                                                }
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Billing History */}
            <div className="space-y-2 md:space-y-4">
                <Label>{t("historyTitle")}</Label>
                {payments.length === 0 ? (
                    <div className="text-center p-6 border border-dashed rounded-lg text-muted-foreground text-xs">
                        {t("no_history")}
                    </div>
                ) : (
                    <div className="border rounded-md bg-card overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs font-black">{t("transactionId")}</TableHead>
                                    <TableHead className="text-xs font-black">{t("plan")}</TableHead>
                                    <TableHead className="text-xs font-black">{t("amount_col")}</TableHead>
                                    <TableHead className="text-xs font-black">{t("method")}</TableHead>
                                    <TableHead className="text-xs font-black">{t("status")}</TableHead>
                                    <TableHead className="text-xs font-black text-right">{t("expires_at")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map((pmt) => (
                                    <TableRow key={pmt.id} className="text-xs">
                                        <TableCell className="font-mono text-[10px] text-muted-foreground max-w-[120px] truncate">
                                            {pmt.provider_id || pmt.id}
                                        </TableCell>
                                        <TableCell className="font-bold text-foreground">
                                            {getPlanName(pmt.plan || "")}
                                        </TableCell>
                                        <TableCell className="font-bold">
                                            ฿{pmt.amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="capitalize text-muted-foreground">
                                            {pmt.payment_method}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] font-bold capitalize">
                                                {pmt.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground text-[10px]">
                                            {pmt.subscription_expires_at
                                                ? new Date(pmt.subscription_expires_at).toLocaleDateString()
                                                : (t("lifetime") ? t("lifetime").replace("/", "").trim() : "Lifetime")
                                            }
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Checkout Dialog */}
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="max-w-2xl bg-card border rounded-lg p-6">
                    <DialogHeader>
                        <DialogTitle className="text-md font-black tracking-tight">{t("payment_details_title")}</DialogTitle>
                        <DialogDescription className="text-xs">
                            {t("complete_payment_desc", { planName: selectedPlan?.name || "" })}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPlan && (
                        <div className="space-y-4 py-2">
                            {/* If Per Tournament Plan, choose which tournament */}
                            {selectedPlan.name === "Single Tournament" && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">{t("select_tournament_label")}</Label>
                                    <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
                                        <SelectTrigger className="w-full text-xs">
                                            <SelectValue placeholder={t("select_tournament_placeholder")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tournaments.length > 0 ? (
                                                tournaments.map(tItem => (
                                                    <SelectItem key={tItem.id} value={tItem.id} className="text-xs">
                                                        {tItem.name}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="none" disabled className="text-xs">
                                                    {t("no_tournaments")}
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Conditionally show PromptPay QR or free subscription confirmation */}
                            {(selectedPlan.id === "starter" || selectedPlan.id === "pro") ? (
                                <div className="text-center py-4 px-2 border border-dashed rounded-lg bg-muted/10">
                                    <p className="text-xs font-semibold text-foreground">
                                        {t("confirm_subscribe_free")}
                                    </p>
                                </div>
                            ) : (
                                /* PromptPay Payment QR & Slip Uploader Side-by-Side */
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="border border-border rounded-lg p-4 bg-muted/20">
                                        <div className="flex flex-col items-center justify-center py-2">
                                            <PromptPayQR
                                                phoneNumber="0812345678"
                                                amount={selectedPlan.discounted_price || selectedPlan.price}
                                            />
                                            <p className="text-[10px] text-muted-foreground mt-3 text-center">
                                                {t("promptpay_scan_hint")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="border border-border rounded-lg p-4 bg-muted/20 flex flex-col justify-between">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-bold text-foreground">
                                                {t("upload_slip") || "Upload Slip"}
                                            </Label>
                                            <p className="text-[10px] text-muted-foreground">
                                                {t("slip_hint") || "Please upload your bank transfer slip image."}
                                            </p>
                                        </div>
                                        <div className="mt-3 flex-1 flex flex-col justify-center items-center min-h-[140px]">
                                            {slipPreviewUrl ? (
                                                <div className="relative border rounded p-1 bg-card w-full max-h-36 flex justify-center items-center overflow-hidden">
                                                    <Image
                                                        src={slipPreviewUrl}
                                                        alt="Slip preview"
                                                        className="object-contain h-auto max-h-32"
                                                        width={300}
                                                        height={128}
                                                        unoptimized
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="destructive"
                                                        className="absolute top-1 right-1 h-5 w-5 rounded-full"
                                                        onClick={() => {
                                                            setSlipFile(null);
                                                            setSlipPreviewUrl(null);
                                                        }}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <label className="border border-dashed border-border rounded-md p-4 w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-colors">
                                                    <CloudUpload className="h-6 w-6 text-muted-foreground mb-1 animate-pulse" />
                                                    <span className="text-[10px] text-muted-foreground font-medium">Click to upload</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                setSlipFile(file);
                                                                setSlipPreviewUrl(URL.createObjectURL(file));
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="mt-4 flex flex-row gap-2 sm:justify-end">
                        <DialogClose asChild>
                            <Button variant="outline" size="sm" className="text-xs flex-1 sm:flex-none">
                                {t("close")}
                            </Button>
                        </DialogClose>
                        <Button
                            variant="default"
                            size="sm"
                            className="text-xs flex-1 sm:flex-none"
                            onClick={handleConfirmPayment}
                            disabled={isPending || (selectedPlan?.name === "Single Tournament" && !selectedTournamentId)}
                        >
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("confirmPayment")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
