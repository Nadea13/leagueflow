"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
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
import { createStripeCheckoutSession, createStripeCustomerPortalSession, verifyStripeCheckoutSession } from "@/actions/common/stripe";
import { Loader2, X, Upload, CreditCard, ShieldCheck, Check, ExternalLink } from "lucide-react";

import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/ui/header";
import Image from "next/image";
import { Tab } from "@/components/ui/tab";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";



const getPlanPrice = (plan: Plan) => {
    if (plan.id === "starter" || plan.id === "match") return 0;
    if (plan.id === "pro" || plan.id === "event") return 145;
    return (plan.discounted_price || plan.price);
};

export function BillingTab() {
    const t = useTranslations("Billing");
    const tReg = useTranslations("Registration");
    const locale = useLocale();
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

            // Load user tournaments
            const tournamentsRes = await getUserTournaments();
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
        const price = getPlanPrice(plan);

        if (price === 0) {
            startTransition(async () => {
                const res = await createPaymentRecord(plan.id, 0, "free");
                if (res.success) {
                    await loadData();
                    router.refresh();
                }
            });
            return;
        }

        const isTournamentPlan = plan.name === "Single Tournament";
        const tourId = isTournamentPlan && tournaments.length > 0 ? tournaments[0].id : null;

        // Direct 1-click redirect straight to Stripe Checkout
        startTransition(async () => {
            const res = await createStripeCheckoutSession({
                planId: plan.id,
                planName: plan.name.replace(/^สมัครใช้\s*/i, '').trim(),
                amount: price,
                tournamentId: tourId,
            });

            if (res.success && res.data?.url) {
                window.location.href = res.data.url;
            } else {
                alert("Stripe error: " + (res.error || "Failed to initiate Stripe payment"));
            }
        });

    };

    const searchParams = useSearchParams();

    useEffect(() => {
        const sessionId = searchParams.get("session_id");
        const success = searchParams.get("success");
        if (sessionId && success === "true") {
            startTransition(async () => {
                const res = await verifyStripeCheckoutSession(sessionId);
                if (res.success) {
                    await loadData();
                    router.replace("/dashboard/settings?tab=billing");
                }
            });
        }
    }, [searchParams]);


    // Helper to get plan displayName
    const getPlanName = (planId: string) => {
        if (planId === "match" || planId === "starter" || planId === "free") return t("plan_starter");
        if (planId === "event" || planId === "pro") return t("plan_pro") || "Event";
        if (planId === "pro_yearly" || planId === "yearly") return t("plan_pro_yearly");
        if (planId === "cup") return t("plan_cup") || "Cup";
        if (planId === "cup_yearly") return t("plan_cup_yearly") || "Cup Yearly";
        if (planId === "customs") return t("plan_customs") || "Customs";
        if (planId === "manager_pro") return t("manager_pro.title") || "Manager Pro";
        return t("plan_starter") || "Starter";
    };

    const getPlanFeatures = (planId: string): string[] => {
        try {
            const featureKey = planId === "match" ? "starter" : planId === "event" ? "pro" : planId;
            const rawFeatures = t.raw(`features.${featureKey}`);
            if (Array.isArray(rawFeatures)) return rawFeatures;
        } catch (error) {
            console.error(`Error loading features for ${planId}:`, error);
        }
        return [];
    };

    const handleOpenCustomerPortal = () => {
        startTransition(async () => {
            const res = await createStripeCustomerPortalSession();
            if (res.success && res.data?.url) {
                window.location.href = res.data.url;
            } else {
                alert(res.error || "Failed to open Stripe Billing Portal");
            }
        });
    };

    return (
        <div className="space-y-2 md:space-y-4">
            {/* Current Plan overview */}
            <div className="bg-card border rounded-sm p-2 md:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                        <Header level={4}>{t("title")}</Header>
                        <p className="text-xs text-muted-foreground font-medium">{t("description")}</p>
                        {expiryDate && (
                            <p className="text-[10px] text-muted-foreground mt-1 font-bold">
                                {t("expiryDate")}: {new Date(expiryDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">
                            {t("active_prefix")}{getPlanName(activePlan)}
                        </Badge>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenCustomerPortal}
                            disabled={isPending}
                            className="text-xs font-bold gap-1.5 h-8 border-primary/30 hover:bg-primary/10"
                        >
                            {isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <ExternalLink className="w-3.5 h-3.5 text-primary" />
                            )}
                            <span>{locale === 'th' ? "จัดการการชำระเงินและใบเสร็จ" : "Manage Billing & Invoices"}</span>
                        </Button>
                    </div>
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
                            const isCurrent = activePlan === plan.id || ((plan.id === 'starter' || plan.id === 'match') && activePlan === 'free') || ((plan.id === 'pro' || plan.id === 'event') && (activePlan === 'monthly' || activePlan === 'event' || activePlan === 'pro')) || (plan.id === 'pro_yearly' && activePlan === 'yearly');
                            const isCustoms = plan.id === 'customs';
                            const isPro = plan.id === 'pro' || plan.id === 'event';
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
                                                : (plan.id === "starter" || plan.id === "match")
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
                                                    <div className="flex items-baseline gap-1 flex-wrap">
                                                        <span className="text-2xl font-black line-through text-muted-foreground/60">฿290</span>
                                                        <span className="text-2xl font-black">฿145</span>
                                                        <span className="text-muted-foreground text-xs">{t("perMonth")}</span>
                                                        <Badge variant="default">
                                                            -50% โปรเปิดตัว
                                                        </Badge>
                                                    </div>
                                                </>
                                            ) : isProYearly ? (
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl font-black">฿2,900</span>
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
                                                    <span className="text-2xl font-black">฿1,490</span>
                                                    <span className="text-muted-foreground text-xs">{t("perMonth")}</span>
                                                </div>
                                            ) : isCupYearly ? (
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl font-black">฿14,900</span>
                                                    <span className="text-muted-foreground text-xs">{t("perYear")}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl font-black">฿0</span>
                                                    <span className="text-muted-foreground text-xs">{t("lifetime")}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1.5 pt-2 md:pt-4 border-t">
                                            {getPlanFeatures(plan.id).map((feature, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                                    <span className="leading-tight">{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-2 md:pt-4">
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
                                                    : (plan.id === "pro" || plan.id === "event")
                                                        ? t("subscribePro") || "สมัคร Event"
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
        </div>
    );
}

