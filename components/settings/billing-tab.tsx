"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Payment, Tournament, Plan } from "@/types";
import { getPlans } from "@/actions/common/plans";
import { getUserPayments, getUserTournaments, createPaymentRecord, createPaymentRecordWithSlip } from "@/actions/common/payments";
import { getUserSubscriptionDetails } from "@/actions/common/user";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PromptPayQR } from "@/features/registrations/promptpay-qr";
import { Loader2, X, Upload, CreditCard } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/header";
import Image from "next/image";
import { Tab } from "@/components/ui/tab";
import { Skeleton } from "@/components/ui/skeleton";

const getPlanPrice = (plan: Plan) => {
    const isFreeOrPro = plan.id === "starter" || plan.id === "pro";
    return isFreeOrPro ? 0 : (plan.discounted_price || plan.price);
};

export function BillingTab() {
    const t = useTranslations("Billing");
    const tReg = useTranslations("Registration");
    const router = useRouter();

    const [activePlan, setActivePlan] = useState<string>("free");
    const [expiryDate, setExpiryDate] = useState<string | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    // Filter plans based on billing cycle (lifetime/customs show in both)
    const filteredPlans = plans.filter((plan) => {
        if (billingCycle === 'monthly') {
            return plan.duration === 'lifetime' || plan.duration === 'monthly';
        } else {
            return plan.duration === 'lifetime' || plan.duration === 'yearly';
        }
    });

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
            // Load user subscription details
            const subDetails = await getUserSubscriptionDetails();
            setActivePlan(subDetails.plan);
            setExpiryDate(subDetails.expiresAt);

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

        const price = getPlanPrice(selectedPlan);
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
        if (planId === "pro") return t("plan_pro") || "Event";
        if (planId === "pro_yearly" || planId === "yearly") return t("plan_pro_yearly");
        if (planId === "cup") return t("plan_cup") || "Cup";
        if (planId === "cup_yearly") return t("plan_cup_yearly") || "Cup Yearly";
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
            <div className="bg-card border rounded-sm p-2 md:p-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Header level={4}>{t("title")}</Header>
                        <p className="text-xs text-muted-foreground font-medium">{t("description")}</p>
                        {expiryDate && (
                            <p className="text-[10px] text-muted-foreground mt-1 font-bold">
                                {t("expiryDate")}: {new Date(expiryDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        )}
                    </div>
                    <Badge variant="outline">
                        {t("active_prefix")}{getPlanName(activePlan)}
                    </Badge>
                </div>
            </div>

            {/* Plans List */}
            <div className="space-y-2 md:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <Header level={4}>{t("plansTitle")}</Header>
                    <Tab
                        options={[
                            { value: "monthly", label: t("monthly_label") || "รายเดือน" },
                            { value: "yearly", label: t("yearly_label") || "รายปี" }
                        ]}
                        value={billingCycle}
                        onChange={(val) => setBillingCycle(val)}
                        showIcons={false}
                        fullWidth={true}
                        className="w-full sm:w-auto bg-card"
                    />
                </div>

                {loadingData && plans.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4 items-stretch animate-pulse">
                        {[...Array(4)].map((_, idx) => (
                            <div key={idx} className="bg-card border rounded-sm p-2 md:p-4 flex flex-col justify-between space-y-4">
                                <div className="space-y-3">
                                    <Skeleton className="h-6 w-1/2 rounded-sm" />
                                    <Skeleton className="h-8 w-1/3 rounded-sm" />
                                    <Skeleton className="h-3.5 w-3/4 rounded-sm" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-3 w-full rounded-sm" />
                                    <Skeleton className="h-3 w-5/6 rounded-sm" />
                                    <Skeleton className="h-3 w-4/5 rounded-sm" />
                                </div>
                                <Skeleton className="h-9 w-full rounded-sm mt-4" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4 items-stretch">
                        {filteredPlans.map((plan) => {
                            const isCurrent = activePlan === plan.id || (plan.id === 'starter' && activePlan === 'free') || (plan.id === 'pro' && activePlan === 'monthly') || (plan.id === 'pro_yearly' && activePlan === 'yearly');
                            const isCustoms = plan.id === 'customs';
                            const isPro = plan.id === 'pro';
                            const isProYearly = plan.id === 'pro_yearly';
                            const isManagerPro = plan.id === 'manager_pro';
                            const isCup = plan.id === 'cup';
                            const isCupYearly = plan.id === 'cup_yearly';
                            const isRecommended = isPro || isManagerPro;

                            return (
                                <div
                                    key={plan.id}
                                    className={`bg-card border rounded-sm p-2 md:p-4 flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative ${isCurrent
                                        ? "border-2 border-primary shadow-lg"
                                        : isRecommended
                                            ? "shadow-sm hover:border-primary"
                                            : "border shadow-sm hover:border-primary/45"
                                        }`}
                                >
                                    {isRecommended && (
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded tracking-wider">
                                            {t("recommended")}
                                        </div>
                                    )}
                                    <div>
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-md font-black">{getPlanName(plan.id)}</h3>
                                            {isCurrent && (
                                                <Badge variant="outline" className="text-[10px]">
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
                                                        : isCup
                                                            ? t("cupDesc")
                                                            : isCupYearly
                                                                ? t("cupYearlyDesc")
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
                                            ) : isCup ? (
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl font-black">฿1,790</span>
                                                    <span className="text-muted-foreground text-xs">{t("perMonth")}</span>
                                                </div>
                                            ) : isCupYearly ? (
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl font-black">฿17,900</span>
                                                    <span className="text-muted-foreground text-xs">{t("perYear")}</span>
                                                </div>
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
                                                variant={isCurrent ? "outline" : ((isRecommended || isProYearly || isCup || isCupYearly) ? "default" : "outline")}
                                                className={`w-full text-xs font-bold h-9 ${isCurrent
                                                    ? "border-primary text-primary hover:bg-primary/10"
                                                    : (isRecommended || isProYearly || isCup || isCupYearly) && !isCurrent
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
                                                            : plan.id === "cup"
                                                                ? t("subscribeCup") || "สมัคร Cup"
                                                                : plan.id === "cup_yearly"
                                                                    ? t("subscribeCupYearly") || "สมัคร Cup รายปี"
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
                <Header level={4}>{t("historyTitle")}</Header>
                {loadingData && payments.length === 0 ? (
                    <div className="border rounded-sm bg-card overflow-hidden">
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
                                {[...Array(3)].map((_, idx) => (
                                    <TableRow key={idx} className="text-xs">
                                        <TableCell><Skeleton className="h-4 w-20 rounded-sm" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24 rounded-sm" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-12 rounded-sm" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16 rounded-sm" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-14 rounded-sm" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-16 rounded-sm ml-auto" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : payments.length === 0 ? (
                    <EmptyState
                        icon={CreditCard}
                        title={t("no_history")}
                        description={t("no_history_desc")}
                        className="min-h-[250px] border bg-card rounded-sm"
                    />
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
                <DialogContent className="max-w-2xl bg-card border rounded-xl p-0">
                    <DialogHeader className="p-2 md:p-4 border-b">
                        <DialogTitle className="text-2xl font-black tracking-tighter text-foreground leading-none">{t("payment_details_title")}</DialogTitle>
                        <DialogDescription className="text-muted-foreground text-xs">
                            {t("complete_payment_desc", { planName: selectedPlan?.name || "" })}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPlan && (
                        <div className="space-y-2 md:space-y-4 p-2 md:p-4">
                            {/* If Per Tournament Plan, choose which tournament */}
                            {selectedPlan.name === "Single Tournament" && (
                                <div className="space-y-1">
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
                            {getPlanPrice(selectedPlan) === 0 ? (
                                <div className="border rounded-lg p-2 md:p-4 space-y-1 md:space-y-2 w-full">
                                    <div className="space-y-1 md:space-y-2 text-sm">
                                        <div className="flex justify-between items-center">
                                            <Label>{t("plan")}</Label>
                                            <span className="text-sm">{selectedPlan.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <Label>{t("amount_col")}</Label>
                                            <div className="flex items-center gap-2">
                                                {selectedPlan.price > 0 && (
                                                    <span className="line-through text-muted-foreground/60 text-xs font-normal">฿{selectedPlan.price.toLocaleString()}</span>
                                                )}
                                                <span className="text-sm">฿0.00</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <Label>{t("method")}</Label>
                                            <span className="text-sm">{t("getStartedFree") || "Free"}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* PromptPay Payment QR & Slip Uploader Side-by-Side */
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                                    <div className="col-span-2 border rounded-lg p-2 md:p-4 space-y-1 md:space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Label>{t("plan")}</Label>
                                            <span className="text-sm">{selectedPlan.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <Label>{t("amount")}</Label>
                                            <span className="text-sm">฿{getPlanPrice(selectedPlan)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <Label>{t("method")}</Label>
                                            <span className="text-sm">{t("promptpay")}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 md:gap-4">
                                        <div className="border rounded-lg overflow-hidden">
                                            <div className="flex justify-center bg-[#113566] p-2">
                                                <svg width="761" height="227" viewBox="0 0 761 227" className="h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M595.456 145.496V161.836H624.416V174.086H595.476V188.956H627.806V201.776H581.266V132.766H626.246V145.506H595.466L595.456 145.496Z" fill="#FFFEFE" />
                                                    <path d="M429.286 201.756H428.476C424.076 201.756 419.676 201.746 415.276 201.766C414.656 201.766 414.366 201.606 414.146 200.966C412.506 196.196 410.816 191.446 409.166 186.686C408.976 186.136 408.726 185.936 408.146 185.936C400.126 185.956 392.116 185.956 384.096 185.936C383.476 185.936 383.236 186.136 383.026 186.726C381.346 191.446 379.616 196.156 377.906 200.876C377.806 201.146 377.706 201.406 377.586 201.716H363.666C364.396 199.806 365.116 197.946 365.836 196.086C373.906 175.236 381.986 154.376 390.036 133.516C390.286 132.876 390.586 132.676 391.246 132.686C394.786 132.726 398.326 132.716 401.866 132.686C402.396 132.686 402.656 132.826 402.866 133.366C411.576 155.916 420.316 178.466 429.036 201.016C429.116 201.226 429.176 201.446 429.276 201.756H429.286ZM396.196 150.316C396.136 150.316 396.086 150.296 396.026 150.296C393.166 158.276 390.306 166.266 387.436 174.296H404.686C401.846 166.266 399.016 158.286 396.196 150.316Z" fill="#FFFEFE" />
                                                    <path d="M318.536 132.766C318.736 132.746 318.916 132.716 319.086 132.716C328.366 132.736 337.646 132.636 346.926 132.816C352.666 132.926 357.966 134.646 362.436 138.456C365.926 141.426 367.876 145.247 368.556 149.727C369.186 153.887 369.016 158.006 367.556 161.986C365.576 167.396 361.596 170.826 356.386 172.956C352.976 174.346 349.396 174.936 345.726 174.966C341.306 175.006 336.876 174.986 332.446 174.986C332.216 174.986 331.996 174.986 331.686 174.986V201.786H318.536V132.776V132.766ZM331.676 162.917C331.846 162.937 331.946 162.956 332.046 162.956C336.416 162.956 340.796 163.006 345.166 162.906C346.636 162.876 348.136 162.576 349.556 162.176C352.256 161.426 354.216 159.806 354.896 156.946C355.366 154.966 355.376 152.996 354.896 151.016C354.386 148.916 353.146 147.416 351.196 146.486C349.606 145.716 347.916 145.256 346.166 145.216C341.466 145.126 336.766 145.126 332.066 145.096C331.946 145.096 331.826 145.146 331.686 145.176V162.906L331.676 162.917Z" fill="#FFFEFE" />
                                                    <path d="M459.276 201.776H446.096C446.096 201.446 446.096 201.136 446.096 200.836C446.096 191.706 446.096 182.576 446.076 173.456C446.076 172.966 445.916 172.416 445.666 172.006C437.786 159.226 429.886 146.456 421.996 133.686C421.826 133.406 421.656 133.126 421.436 132.746C421.796 132.726 422.036 132.706 422.276 132.706C426.756 132.706 431.226 132.716 435.706 132.686C436.296 132.686 436.596 132.886 436.896 133.396C442.016 142.076 447.156 150.736 452.296 159.406C452.436 159.646 452.586 159.886 452.786 160.216C452.996 159.886 453.176 159.616 453.336 159.336C458.506 150.716 463.676 142.107 468.816 133.477C469.166 132.887 469.546 132.686 470.206 132.696C474.506 132.726 478.806 132.716 483.106 132.716H484.076C483.846 133.116 483.686 133.397 483.516 133.667C475.596 146.427 467.676 159.176 459.776 171.946C459.486 172.416 459.306 173.047 459.296 173.607C459.266 182.687 459.276 191.756 459.276 200.836V201.796V201.776Z" fill="#FFFEFE" />
                                                    <path d="M760.886 145.516H739.566V201.776H726.386V145.566H705.136V132.766H760.896V145.516H760.886Z" fill="#FFFEFE" />
                                                    <path d="M553.776 132.766V132.686H546.646L528.936 181.406L510.206 132.766H506.126H492.976V148.096V201.776H506.126V153.126L522.316 196.446H534.496L550.726 155.756V201.776H563.876V148.096V132.766H553.776Z" fill="#FFFEFE" />
                                                    <path d="M684.026 132.766V181.977L653.906 132.766H641.836V201.776H653.906V155.076L684.026 201.776H696.096V132.766H684.026Z" fill="#FFFEFE" />
                                                    <path d="M739.886 74.6565C746.866 85.6465 753.826 96.5965 760.886 107.696H759.866C754.726 107.696 749.596 107.687 744.456 107.716C743.816 107.716 743.476 107.516 743.136 106.956C737.226 97.0465 731.286 87.1465 725.386 77.2365C725.016 76.6165 724.616 76.3965 723.926 76.4065C721.286 76.4465 718.646 76.4265 715.916 76.4265V107.636H700.656V27.8265C700.906 27.8065 701.106 27.7665 701.306 27.7665C712.046 27.7865 722.786 27.6965 733.526 27.8765C739.666 27.9865 745.466 29.6165 750.536 33.4265C755.526 37.1765 758.036 42.3465 758.616 48.5865C759.046 53.1965 758.666 57.7165 756.726 61.9665C754.106 67.7265 749.586 71.2665 743.906 73.3765C742.626 73.8565 741.296 74.1965 739.866 74.6465L739.886 74.6565ZM715.926 62.2165C716.296 62.2365 716.556 62.2565 716.816 62.2565C721.486 62.2565 726.146 62.2765 730.816 62.2465C732.106 62.2465 733.396 62.1265 734.676 61.9465C740.246 61.1365 743.196 57.5165 742.936 51.8265C742.776 48.1865 741.396 45.2765 737.946 43.9065C736.406 43.2965 734.726 42.8265 733.096 42.7765C727.526 42.6065 721.946 42.6465 716.366 42.6065C716.226 42.6065 716.096 42.6665 715.926 42.7065V62.2265V62.2165Z" fill="#FFFEFE" />
                                                    <path d="M455.606 107.666H440.406V75.0965H407.476V107.636H392.236V27.8465H407.426V60.1065H440.366V27.8365H455.616V107.666H455.606Z" fill="#FFFEFE" />
                                                    <path d="M543.456 107.696C539.156 107.696 534.996 107.696 530.826 107.696C529.566 107.696 528.296 107.656 527.036 107.716C526.406 107.746 526.126 107.526 525.906 106.906C523.996 101.386 522.026 95.8965 520.126 90.3765C519.866 89.6265 519.526 89.3965 518.756 89.3965C509.506 89.4265 500.266 89.4265 491.016 89.3965C490.326 89.3965 490.006 89.5665 489.746 90.2765C487.796 95.7465 485.796 101.196 483.806 106.646C483.686 106.986 483.546 107.316 483.416 107.666H467.296C467.426 107.286 467.526 106.946 467.656 106.626C477.746 80.6365 487.836 54.6465 497.906 28.6565C498.156 28.0065 498.446 27.7365 499.176 27.7465C503.316 27.7865 507.456 27.7865 511.596 27.7465C512.256 27.7465 512.556 27.9465 512.806 28.5865C522.906 54.6665 533.036 80.7365 543.156 106.806C543.256 107.056 543.326 107.306 543.456 107.686V107.696ZM494.876 75.8865H514.886C511.576 66.5665 508.296 57.3265 504.936 47.8565C501.526 57.3565 498.216 66.5765 494.876 75.8865Z" fill="#FFFEFE" />
                                                    <path d="M341.506 42.6065H318.536V27.8365H379.866V42.5465H356.816V107.636H341.516V42.6065H341.506Z" fill="#FFFEFE" />
                                                    <path d="M552.806 27.8165H567.946V107.636H552.806V27.8165Z" fill="#FFFEFE" />
                                                    <path d="M688.016 106.476L676.146 94.6765C677.616 92.9065 678.926 90.9665 680.066 88.8465C683.376 82.6665 685.036 75.6665 685.036 67.8365C685.036 60.0065 683.466 53.2065 680.316 47.1165C677.166 41.0265 672.596 36.2765 666.606 32.8765C660.606 29.4765 653.876 27.7665 646.406 27.7665C635.006 27.7665 625.696 31.3865 618.486 38.6365C611.276 45.8865 607.666 55.9165 607.666 68.7265C607.666 75.4965 609.206 81.9265 612.306 87.9965C615.396 94.0665 619.936 98.8565 625.936 102.366C631.936 105.876 638.736 107.626 646.356 107.626C653.386 107.626 659.926 106.036 665.996 102.866C666.186 102.766 666.356 102.656 666.536 102.556L679.246 115.196L688.016 106.476ZM646.356 95.1865C640.966 95.1865 636.366 94.0265 632.296 91.6465C628.376 89.3465 625.496 86.3165 623.486 82.3765C621.276 78.0365 620.196 73.5665 620.196 68.7265C620.196 59.2365 622.546 52.2665 627.396 47.3965C632.266 42.4965 638.306 40.2165 646.416 40.2165C651.716 40.2165 656.296 41.3465 660.406 43.6865C664.286 45.8865 667.156 48.8665 669.186 52.8065C671.426 57.1465 672.516 62.0665 672.516 67.8365C672.516 73.6065 671.376 78.5965 669.026 82.9865C668.486 83.9965 667.886 84.9365 667.246 85.8165L655.136 73.7765L646.366 82.4965L657.156 93.2265C653.766 94.5365 650.216 95.1865 646.366 95.1865H646.356Z" fill="#FFFEFE" />
                                                    <path d="M58.9459 0.28646C62.4859 0.10646 66.0359 -0.153523 69.5759 0.116477C101.166 0.146477 132.766 0.116457 164.356 0.126457C178.556 0.196457 193.256 3.25647 205.006 11.6065C214.906 18.5265 221.906 29.0665 225.566 40.4865C227.826 47.4665 229.056 54.7865 229.256 62.1165C229.226 93.3965 229.266 124.686 229.236 155.966C252.056 177.976 274.926 199.946 297.756 221.946C298.516 222.696 299.546 223.666 299.246 224.846C298.696 225.906 297.316 226.006 296.266 226.126C220.706 226.106 145.146 226.126 69.5959 226.126C56.3259 226.196 42.7159 224.226 30.8159 218.056C23.8959 214.486 17.7159 209.436 12.9759 203.256C5.03589 192.966 1.0559 180.056 0.185902 167.206C-0.124098 164.046 0.0358959 160.866 0.0858959 157.696C0.0858959 122.676 0.0858959 87.6565 0.0858959 52.6365C0.345896 41.8965 3.4159 30.9765 10.0859 22.4165C16.7459 13.7065 26.5559 7.91646 36.8459 4.53646C43.9959 2.17646 51.4559 0.87646 58.9459 0.28646ZM45.6559 29.3365C40.6459 30.9665 36.0359 34.1265 33.1659 38.5965C30.2259 43.1565 28.8559 48.6765 29.0259 54.0765C29.0259 69.3165 29.0259 84.5565 29.0259 99.7965C42.3259 99.7965 55.6259 99.8065 68.9359 99.7965V77.9665C68.8959 74.3665 70.4959 70.6865 73.4659 68.5765C76.4559 66.4165 80.2759 65.8465 83.8959 65.9365C89.9559 65.9365 96.0159 65.9365 102.076 65.9365C102.106 53.2065 102.066 40.4765 102.096 27.7465C88.3259 27.7065 74.5559 27.7465 60.7959 27.7265C55.7159 27.2365 50.5159 27.7565 45.6559 29.3365ZM128.986 27.7165C128.926 40.4565 128.966 53.1965 128.966 65.9365C135.386 65.9465 141.816 65.9365 148.236 65.9365C151.666 65.9565 155.276 66.7165 158.006 68.9065C160.716 71.0465 162.146 74.5465 162.106 77.9565C162.106 85.2365 162.036 92.5165 162.066 99.7965C175.386 99.8165 188.706 99.7965 202.016 99.7965V53.3465C202.106 49.6565 201.516 45.9365 200.216 42.4765C198.416 37.5865 194.706 33.4765 190.086 31.0965C184.026 27.9465 176.976 27.1365 170.246 27.7265C156.496 27.7165 142.746 27.7565 128.996 27.7065L128.986 27.7165ZM29.0359 126.326C29.0259 142.416 29.0359 158.496 29.0359 174.586C29.1459 178.406 29.8959 182.276 31.7359 185.666C33.9259 189.816 37.6659 193.016 41.8959 194.976C47.9859 197.826 54.8459 198.696 61.5059 198.396C75.0359 198.406 88.5659 198.396 102.086 198.396C102.086 185.666 102.096 172.926 102.086 160.196C95.6559 160.196 89.2359 160.196 82.8159 160.196C79.3859 160.186 75.7759 159.416 73.0459 157.226C70.3359 155.076 68.9159 151.576 68.9559 148.156V126.326C55.6559 126.326 42.3559 126.326 29.0459 126.326H29.0359ZM162.016 127.896C161.976 134.766 162.006 141.636 162.006 148.496C162.116 151.426 161.366 154.516 159.336 156.716C157.066 159.106 153.676 160.146 150.446 160.106C143.026 160.076 135.606 160.146 128.186 160.066C128.016 161.726 128.146 163.386 128.106 165.056C128.096 175.986 128.136 186.906 128.086 197.836C131.236 197.956 134.396 197.856 137.546 197.886C169.096 197.866 200.646 197.926 232.196 197.856C218.636 184.236 204.986 170.716 191.416 157.106C181.576 147.416 171.946 137.496 162.026 127.896H162.016Z" fill="white" />
                                                    <path d="M162.016 127.896C171.946 137.496 181.566 147.417 191.406 157.107C204.976 170.717 218.626 184.237 232.186 197.857C200.636 197.927 169.086 197.866 137.536 197.886C134.376 197.856 131.226 197.956 128.076 197.836C128.126 186.906 128.076 175.986 128.096 165.056C128.136 163.386 128.006 161.716 128.176 160.066C135.596 160.146 143.016 160.067 150.436 160.107C153.666 160.147 157.066 159.106 159.326 156.716C161.356 154.516 162.106 151.426 161.996 148.496C161.996 141.626 161.966 134.756 162.006 127.896H162.016Z" fill="#54A69A" />
                                                </svg>
                                            </div>
                                            <div className="space-y-2 md:space-y-4 flex flex-col items-center justify-center p-2 md:p-4">
                                                <Image
                                                    src="/prompt-pay.png"
                                                    alt="PromptPay Logo"
                                                    width={120}
                                                    height={40}
                                                    className="h-10 w-auto object-contain"
                                                />
                                                <div className="flex flex-col items-center justify-center">
                                                    <PromptPayQR
                                                        phoneNumber={process.env.NEXT_PUBLIC_PROMPTPAY_ID || ""}
                                                        amount={getPlanPrice(selectedPlan)}
                                                    />
                                                </div>
                                                <div className="space-y-2 md:space-y-4 text-sm relative overflow-hidden">
                                                    <div className="flex justify-center items-center gap-1">
                                                        <Label>{tReg("account_name_label")}:</Label>
                                                        <span className="font-black text-foreground">{process.env.NEXT_PUBLIC_PROMPTPAY_NAME || ""}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center items-center w-full min-h-[140px] md:h-[398px] max-h-[398px]">
                                        {!slipPreviewUrl ? (
                                            <div className="py-12 border-2 border-dashed rounded-lg hover:border-primary/40 transition-colors text-center cursor-pointer relative w-full flex-1 flex items-center justify-center h-full">
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            setSlipFile(file);
                                                            setSlipPreviewUrl(URL.createObjectURL(file));
                                                        }
                                                    }}
                                                />
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="p-3 bg-primary/5 text-primary rounded-sm transition-transform shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                                                        <Upload className="w-6 h-6" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-xs tracking-wide text-foreground">
                                                            {t("click_to_upload") || "Click to upload"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative overflow-hidden border p-2 md:p-4 rounded-lg w-full h-full flex">
                                                <div className="relative aspect-[3/4] w-full max-h-[420px] overflow-hidden flex">
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
                                                            setSlipFile(null);
                                                            setSlipPreviewUrl(null);
                                                        }}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="border-t p-2 md:p-4">
                        <Button
                            variant="default"
                            className="w-full"
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
