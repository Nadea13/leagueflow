"use client";

import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Product } from "@/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface PricingCardsProps {
    products: Product[];
    currentPlan?: string | null;
    activePlan?: string;
    onSelectPlan?: (planId: string) => void;
    isLoading?: boolean;
    landingPageMode?: boolean;
}

export function PricingCards({
    products,
    currentPlan,
    activePlan,
    onSelectPlan,
    isLoading = false,
    landingPageMode = false
}: PricingCardsProps) {
    const t = useTranslations('Pricing');

    const getTranslatedValue = (key: string, value: string | undefined | null) => {
        if (!value) return "-";

        // Name Mapping
        if (key === 'name') {
            if (value === 'Starter') return t('free.title');
            if (value === 'Per Tournament') return t('tournament.title');
            if (value === 'Monthly Pro') return t('monthly.title');
            if (value === 'Yearly Pro') return t('yearly.title');
        }

        // Format Mapping
        if (key === 'format') {
            if (value.includes('League') && value.includes('Knockout')) return t('comparison.val_league_ko');
            if (value.includes('Group') || value === 'All') return t('comparison.val_all_group');
        }

        // Stats Mapping
        if (key === 'stats') {
            if (value === 'Basic' || value.includes('Basic')) return t('comparison.val_basic');
            if (value.includes('Pro') || value === 'Advanced') return t('comparison.val_pro_stats');
        }

        // Support Mapping
        if (key === 'support') {
            if (value === 'Standard') return t('comparison.val_standard');
            if (value.includes('Priority')) return t('comparison.val_priority');
            if (value.includes('VIP')) return t('yearly.features.support');
        }

        // Duration Mapping
        if (key === 'duration') {
            const unit = value?.replace("1 ", "");
            if (unit === 'month') return t('monthly.unit').replace('/', '').trim();
            if (unit === 'year') return t('yearly.unit').replace('/', '').trim();
            if (unit === 'tournament') return t('tournament.unit').replace('/', '').trim();
            return unit;
        }

        return value;
    };

    if (!products || products.length === 0) {
        return <div className="text-center p-8 text-muted-foreground">{t('no_plans')}</div>;
    }

    // Sort products by price
    const sortedProducts = [...products].sort((a, b) => a.price - b.price);

    return (
        <div className="overflow-x-auto rounded-none border bg-background shadow-sm pt-6">
            <table className="w-full text-sm min-w-[600px] table-fixed border-separate border-spacing-0">
                <thead>
                    <tr className="bg-muted/50">
                        <th className="p-6 text-left font-semibold w-[200px] md:w-1/4 text-lg border-b">{t('features')}</th>
                        {sortedProducts.map(product => {
                            const isRecommended = product.recommended;
                            return (
                                <th key={product.id} className={cn(
                                    "p-6 text-center relative border-b",
                                    isRecommended && "border-2 border-primary/20 bg-primary/5 rounded-t-lg border-b-0"
                                )}>
                                    {isRecommended && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-[10px] uppercase font-bold px-2 py-0.5 rounded-none shadow-sm whitespace-nowrap z-10">
                                            {t('recommended')}
                                        </div>
                                    )}
                                    <div className="text-lg font-bold mb-1">{getTranslatedValue('name', product.name)}</div>
                                    <div className="text-muted-foreground font-normal">
                                        {product.discounted_price ? (
                                            <div className="flex flex-col items-center">
                                                <span className="line-through text-xs opacity-70">
                                                    {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(product.price)}
                                                </span>
                                                <span className="text-primary font-bold text-xl">
                                                    {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(product.discounted_price)}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xl font-bold">
                                                {product.price === 0 ? t('free_label') : new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(product.price)}
                                            </span>
                                        )}
                                        {product.duration && product.price > 0 && <span className="text-xs ml-1">/{getTranslatedValue('duration', product.duration)}</span>}
                                    </div>
                                </th>
                            )
                        })}
                    </tr>
                </thead>
                <tbody>
                    {/* Teams Limit */}
                    <tr className="hover:bg-muted/50 transition-colors">
                        <td className="p-4 font-medium pl-6">{t('teams_limit')}</td>
                        {sortedProducts.map(product => (
                            <td key={`teams-${product.id}`} className={cn(
                                "p-4 text-center text-muted-foreground",
                                product.recommended && "border-x-2 border-primary/20 bg-primary/5"
                            )}>
                                {product.teams_limit === 0 ? t('unlimited') : product.teams_limit}
                            </td>
                        ))}
                    </tr>
                    {/* Format Support */}
                    <tr className="hover:bg-muted/50 transition-colors">
                        <td className="p-4 font-medium pl-6">{t('format_support')}</td>
                        {sortedProducts.map(product => (
                            <td key={`format-${product.id}`} className={cn(
                                "p-4 text-center capitalize text-muted-foreground",
                                product.recommended && "border-x-2 border-primary/20 bg-primary/5"
                            )}>
                                {getTranslatedValue('format', product.format_support)}
                            </td>
                        ))}
                    </tr>
                    {/* Invite Enabled */}
                    <tr className="hover:bg-muted/50 transition-colors">
                        <td className="p-4 font-medium pl-6">{t('invite_via_link')}</td>
                        {sortedProducts.map(product => (
                            <td key={`invite-${product.id}`} className={cn(
                                "p-4 text-center",
                                product.recommended && "border-x-2 border-primary/20 bg-primary/5"
                            )}>
                                {product.invite_enabled ?
                                    <Check className="w-5 h-5 mx-auto text-green-500" /> :
                                    <X className="w-5 h-5 mx-auto text-muted-foreground/30" />
                                }
                            </td>
                        ))}
                    </tr>
                    {/* Register Enabled */}
                    <tr className="hover:bg-muted/50 transition-colors">
                        <td className="p-4 font-medium pl-6">{t('open_registration')}</td>
                        {sortedProducts.map(product => (
                            <td key={`register-${product.id}`} className={cn(
                                "p-4 text-center",
                                product.recommended && "border-x-2 border-primary/20 bg-primary/5"
                            )}>
                                {product.register_enabled ?
                                    <Check className="w-5 h-5 mx-auto text-green-500" /> :
                                    <X className="w-5 h-5 mx-auto text-muted-foreground/30" />
                                }
                            </td>
                        ))}
                    </tr>
                    {/* Stats Support */}
                    <tr className="hover:bg-muted/50 transition-colors">
                        <td className="p-4 font-medium pl-6">{t('statistics')}</td>
                        {sortedProducts.map(product => (
                            <td key={`stats-${product.id}`} className={cn(
                                "p-4 text-center capitalize text-muted-foreground",
                                product.recommended && "border-x-2 border-primary/20 bg-primary/5"
                            )}>
                                {getTranslatedValue('stats', product.stats_support)}
                            </td>
                        ))}
                    </tr>
                    {/* Support Level */}
                    <tr className="hover:bg-muted/50 transition-colors">
                        <td className="p-4 font-medium pl-6">{t('support')}</td>
                        {sortedProducts.map(product => (
                            <td key={`support-${product.id}`} className={cn(
                                "p-4 text-center capitalize text-muted-foreground",
                                product.recommended && "border-x-2 border-primary/20 bg-primary/5",
                            )}>
                                {getTranslatedValue('support', product.support_level)}
                            </td>
                        ))}
                    </tr>

                    {/* Action Buttons Row */}
                    <tr className="">
                        <td className="p-4 pl-6 border-t"></td>
                        {sortedProducts.map(product => {
                            const isSelected = currentPlan === product.id;
                            const isCurrentActive = activePlan === product.name.toLowerCase() ||
                                (activePlan === 'monthly' && product.duration === '1 month') ||
                                (activePlan === 'yearly' && product.duration === '1 year');

                            const isFreeProduct = product.price === 0;
                            const isMonthlyProduct = product.duration === '1 month' && product.price > 0;
                            const isYearlyProduct = product.duration === '1 year' && product.price > 0;

                            const isEffectivelyActive =
                                isCurrentActive ||
                                (activePlan === 'free' && isFreeProduct) ||
                                (activePlan === 'monthly' && isMonthlyProduct) ||
                                (activePlan === 'yearly' && isYearlyProduct);

                            return (
                                <td key={`action-${product.id}`} className={cn(
                                    "p-4 text-center pb-6 border-t",
                                    product.recommended && "border-2 border-t-0 border-primary/20 bg-primary/5 rounded-b-lg"
                                )}>
                                    {landingPageMode ? (
                                        <Button variant="outline" className="w-full" asChild>
                                            {/* Link needs to be handled by parent or just redirect */}
                                            <div onClick={() => window.location.href = '/dashboard'}>{t('get_started')}</div>
                                        </Button>
                                    ) : (
                                        <Button
                                            variant={isEffectivelyActive ? "outline" : (isSelected ? "default" : "secondary")}
                                            className={cn(
                                                "w-full",
                                                isSelected && !isEffectivelyActive && "ring-2 ring-primary ring-offset-2"
                                            )}
                                            disabled={isEffectivelyActive || isLoading}
                                            onClick={() => onSelectPlan && onSelectPlan(product.id)}
                                        >
                                            {isLoading && isSelected && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {isEffectivelyActive ? t('current_plan') : (isSelected ? t('selected') : t('choose_plan'))}
                                        </Button>
                                    )}
                                </td>
                            );
                        })}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
