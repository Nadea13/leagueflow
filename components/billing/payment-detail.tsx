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

declare global {
    interface Window {
        Omise: any;
    }
}

export function PaymentDetails() {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

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
                title: "Error",
                description: "Payment system not ready. Please try again.",
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
                console.log("Omise Token Created:", response.id);
                toast({
                    title: "Card Added",
                    description: `Token created successfully: ${response.id}`,
                });
                // Here you would call your server action to save the customer/card
                // await saveCardAction(response.id);
            } else {
                // Error
                console.error("Omise Error:", response);
                toast({
                    title: "Payment Error",
                    description: response.message || "Failed to process card.",
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
                        <CardTitle>Payment Details</CardTitle>
                        <CardDescription>
                            Add a credit card to upgrade your plan.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Cardholder Name</Label>
                                <Input id="name" name="name" placeholder="John Doe" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="number">Card Number</Label>
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
                                    <Label htmlFor="expiry_month">Expires Month</Label>
                                    <Input
                                        id="expiry_month"
                                        name="expiry_month"
                                        placeholder="MM"
                                        maxLength={2}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="expiry_year">Expires Year</Label>
                                    <Input
                                        id="expiry_year"
                                        name="expiry_year"
                                        placeholder="YYYY"
                                        maxLength={4}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="security_code">CVC</Label>
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
                                        Processing...
                                    </>
                                ) : (
                                    "Add Card"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
