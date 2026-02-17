"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

declare global {
    interface Window {
        Omise: any;
    }
}

export function PaymentDetails() {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const t = useTranslations("Billing");

    // This would ideally come from your environment variables
    const OMISE_PUBLIC_KEY = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY;

    const handleScriptLoad = () => {
        if (window.Omise && OMISE_PUBLIC_KEY) {
            window.Omise.setPublicKey(OMISE_PUBLIC_KEY);
        }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        if (!window.Omise) {
            toast({
                title: t("error_payment_system"),
                description: t("error_payment_system"),
                variant: "destructive",
            });
            setLoading(false);
            return;
        }

        const form = e.currentTarget;
        const cardObject = {
            name: (form.elements.namedItem("name") as HTMLInputElement).value,
            number: (form.elements.namedItem("number") as HTMLInputElement).value,
            expiration_month: (form.elements.namedItem("expiry_month") as HTMLInputElement).value,
            expiration_year: (form.elements.namedItem("expiry_year") as HTMLInputElement).value,
            security_code: (form.elements.namedItem("security_code") as HTMLInputElement).value,
        };

        window.Omise.createToken("card", cardObject, (statusCode: number, response: any) => {
            if (statusCode === 200) {
                // Success: response.id is the token
                // console.log("Omise Token Created:", response.id);
                toast({
                    title: t("card_added"),
                    description: `Token created successfully: ${response.id}`,
                });
                // Here you would call your server action to save the customer/card
                // await saveCardAction(response.id);
            } else {
                // Error
                console.error("Omise Error:", response);
                toast({
                    title: t("error_card_failed"),
                    description: response.message || t("error_card_failed"),
                    variant: "destructive",
                });
            }
            setLoading(false);
        });
    };

    return (
        <>
            <Script
                src="https://cdn.omise.co/omise.js"
                onLoad={handleScriptLoad}
            />
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t("payment_details_title")}</CardTitle>
                        <CardDescription>
                            {t("add_card_desc")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">{t("cardholder_name")}</Label>
                                <Input id="name" name="name" placeholder="John Doe" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="number">{t("card_number")}</Label>
                                <div className="relative">
                                    <CreditCard className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="number"
                                        name="number"
                                        placeholder="0000 0000 0000 0000"
                                        className="pl-9"
                                        required
                                        maxLength={16}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="expiry_month">{t("expires_month")}</Label>
                                    <Input
                                        id="expiry_month"
                                        name="expiry_month"
                                        placeholder="MM"
                                        maxLength={2}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="expiry_year">{t("expires_year")}</Label>
                                    <Input
                                        id="expiry_year"
                                        name="expiry_year"
                                        placeholder="YYYY"
                                        maxLength={4}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="security_code">{t("cvc")}</Label>
                                    <Input
                                        id="security_code"
                                        name="security_code"
                                        placeholder="123"
                                        maxLength={3}
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t("processing")}
                                    </>
                                ) : (
                                    t("add_card_btn")
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
