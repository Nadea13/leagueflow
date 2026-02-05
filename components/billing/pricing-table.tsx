"use client";

import { useTranslations } from "next-intl";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Check, Minus, Infinity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PricingTableProps {
    tournaments?: { id: string; name: string; status: string; }[] | null;
    onSelectPlan?: (plan: 'free' | 'tournament' | 'monthly' | 'yearly') => void;
    currentPlan?: string | null; // This is the clicked/selected plan
    activePlan?: string; // This is the user's actual subscription
}

export function PricingTable({ tournaments, onSelectPlan, currentPlan, activePlan }: PricingTableProps) {
    const t = useTranslations("Pricing");
    const plans = ["free", "tournament", "monthly", "yearly"] as const;

    const features = [
        { key: "teams", label: t("comparison.feature_teams") },
        { key: "format", label: t("comparison.feature_format") },
        { key: "scoring", label: t("comparison.feature_scoring") },
        { key: "staff", label: t("comparison.feature_staff") },
        { key: "public_page", label: t("comparison.feature_public") },
        { key: "support", label: t("comparison.feature_support") },
    ];

    const getFeatureValue = (plan: string, feature: string) => {
        if (plan === "free") {
            if (feature === "teams") return t("comparison.val_8_teams");
            if (feature === "format") return t("comparison.val_league_ko");
            if (feature === "scoring") return t("comparison.val_basic");
            if (feature === "staff") return <Minus className="h-4 w-4 text-muted-foreground/30 mx-auto" />;
            if (feature === "public_page") return <Check className="h-4 w-4 text-primary mx-auto" />;
            if (feature === "support") return t("comparison.val_standard");
        }

        if (plan === "tournament") {
            if (feature === "teams") return <Infinity className="h-4 w-4 text-primary mx-auto" />;
            if (feature === "format") return t("comparison.val_all_group");
            if (feature === "scoring") return t("comparison.val_pro_stats");
            if (feature === "staff") return <Check className="h-4 w-4 text-primary mx-auto" />;
            if (feature === "public_page") return <Check className="h-4 w-4 text-primary mx-auto" />;
            if (feature === "support") return t("comparison.val_priority");
        }

        if (plan === "monthly" || plan === "yearly") {
            if (feature === "teams") return <Infinity className="h-4 w-4 text-primary mx-auto" />;
            if (feature === "format") return t("comparison.val_all_group");
            if (feature === "scoring") return t("comparison.val_pro_stats");
            if (feature === "staff") return <Check className="h-4 w-4 text-primary mx-auto" />;
            if (feature === "public_page") return <Check className="h-4 w-4 text-primary mx-auto" />;
            if (feature === "support") return t("comparison.val_priority");
        }

        return "-";
    };

    return (
        <div className="rounded-xl border overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[200px] h-auto py-6 align-bottom">
                            <span className="text-lg font-bold">{t("comparison.title")}</span>
                        </TableHead>
                        {plans.map((plan) => (
                            <TableHead key={plan} className={`h-auto py-6 text-center align-bottom ${plan === 'tournament' || plan === 'yearly' ? 'bg-primary/5' : ''}`}>
                                <div className="flex flex-col items-center gap-2">
                                    {plan === "tournament" && <Badge variant="default" className="text-[10px] mb-1">{t("comparison.badge_best_league")}</Badge>}
                                    {plan === "yearly" && <Badge variant="default" className="text-[10px] mb-1">{t("comparison.badge_best_value")}</Badge>}
                                    <span className="font-bold text-lg">{t(`${plan}.title`)}</span>
                                    <div className="mt-1 flex flex-col items-center">
                                        {(plan === 'tournament' || plan === 'monthly' || plan === 'yearly') && (
                                            <span className="text-sm text-muted-foreground line-through font-normal">
                                                {t(`${plan}.original_price`)}
                                            </span>
                                        )}
                                        <div className="flex items-baseline">
                                            <span className="text-xl font-bold">{t(`${plan}.price`)}</span>
                                            <span className="text-xs text-muted-foreground font-normal ml-1">
                                                {t(`${plan}.unit`)?.replace('/ ', '/')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {features.map((feature, i) => (
                        <TableRow key={feature.key} className={i % 2 === 0 ? "bg-muted/5" : ""}>
                            <TableCell className="font-medium p-4">{feature.label}</TableCell>
                            {plans.map((plan) => (
                                <TableCell key={`${plan}-${feature.key}`} className={`text-center p-4 ${plan === 'tournament' || plan === 'yearly' ? 'bg-primary/5 font-medium' : ''}`}>
                                    {getFeatureValue(plan, feature.key)}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                    <TableRow>
                        <TableCell className="p-4"></TableCell>
                        {plans.map((plan) => (
                            <TableCell key={`${plan}-cta`} className={`text-center p-4 ${plan === 'tournament' || plan === 'yearly' ? 'bg-primary/5' : ''}`}>
                                {plan === "free" ? (
                                    activePlan === 'free' || !activePlan ? (
                                        <span className="text-muted-foreground font-bold text-sm">
                                            {t("comparison.btn_current")}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground font-medium text-sm">
                                            Free
                                        </span>
                                    )
                                ) : (
                                    activePlan === plan ? (
                                        <span className="text-primary font-bold text-sm">
                                            {t("comparison.btn_current")}
                                        </span>
                                    ) : (
                                        <Button
                                            variant={activePlan === plan ? "ghost" : (plan === "yearly" ? "default" : "outline")}
                                            className={`w-full max-w-[140px] ${currentPlan === plan ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                            onClick={() => onSelectPlan?.(plan)}
                                            disabled={activePlan === plan}
                                        >
                                            {currentPlan === plan ? "Selected" : t("comparison.btn_choose")}
                                        </Button>
                                    )
                                )}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
}
