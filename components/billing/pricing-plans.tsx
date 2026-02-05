"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function PricingPlans() {
    const t = useTranslations("Pricing");

    const plans = [
        {
            id: "free",
            name: t("free.title"),
            description: t("free.desc"),
            price: t("free.price"),
            features: [
                t("free.features.teams"),
                t("free.features.format"),
                t("free.features.scoring"),
                t("free.features.public_page"),
            ],
            buttonText: t("free.cta"),
            isPopular: false,
        },
        {
            id: "tournament",
            name: t("tournament.title"),
            description: t("tournament.desc"),
            price: t("tournament.price"),
            unit: t("tournament.unit"),
            features: [
                t("tournament.features.teams"),
                t("tournament.features.group_stage"),
                t("tournament.features.stats"),
                t("tournament.features.staff"),
                t("tournament.features.lifetime"),
            ],
            buttonText: t("tournament.cta"),
            isPopular: true,
            highlight: t("tournament.highlight"),
        },
        {
            id: "monthly",
            name: t("monthly.title"),
            description: t("monthly.desc"),
            price: t("monthly.price"),
            unit: t("monthly.unit"),
            features: [
                t("monthly.features.unlimited"),
                t("monthly.features.pro_features"),
                t("monthly.features.support"),
            ],
            buttonText: t("monthly.cta"),
            isPopular: false,
            highlight: t("monthly.highlight"),
        },
    ];

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
                <Card
                    key={plan.id}
                    className={`flex flex-col relative ${plan.isPopular
                        ? "border-primary shadow-lg scale-105 z-10"
                        : "border-border"
                        }`}
                >
                    {plan.isPopular && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1">
                            {t("most_popular")}
                        </Badge>
                    )}
                    <CardHeader>
                        {plan.highlight && (
                            <div className="mb-2">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${plan.isPopular ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"}`}>
                                    {plan.highlight}
                                </span>
                            </div>
                        )}
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-3xl font-bold">{plan.price}</span>
                            {plan.unit && <span className="text-sm font-normal text-muted-foreground">{plan.unit}</span>}
                        </div>
                        <ul className="space-y-3">
                            {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2 text-sm">
                                    <div className={`h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0 ${plan.isPopular ? "bg-primary text-primary-foreground" : "text-primary"}`}>
                                        <Check className={`h-3 w-3 ${plan.isPopular ? "text-primary-foreground" : "text-primary"}`} />
                                    </div>
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button
                            className="w-full"
                            variant={plan.isPopular ? "default" : "outline"}
                            asChild
                        >
                            <Link href="/dashboard/billing">{plan.buttonText}</Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
