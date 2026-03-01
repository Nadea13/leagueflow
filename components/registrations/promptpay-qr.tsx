"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import generatePayload from "promptpay-qr";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface PromptPayQRProps {
    phoneNumber: string; // Or ID card number
    amount: number;
}

export function PromptPayQR({ phoneNumber, amount }: PromptPayQRProps) {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        async function generate() {
            try {
                setLoading(true);
                const payload = generatePayload(phoneNumber, { amount });
                const url = await QRCode.toDataURL(payload, {
                    margin: 1,
                    width: 300,
                    color: {
                        dark: "#000000",
                        light: "#ffffff",
                    },
                });
                setQrCodeUrl(url);
            } catch (err) {
                console.error("QR Generation Error:", err);
            } finally {
                setLoading(false);
            }
        }

        if (phoneNumber && amount) {
            generate();
        }
    }, [phoneNumber, amount]);

    const t = useTranslations("Billing");

    if (loading) {
        return <Skeleton className="w-[300px] h-[300px] rounded-none" />;
    }

    if (!qrCodeUrl) {
        return <div className="text-red-500">Failed to generate QR Code</div>;
    }

    return (
        <div className="flex flex-col items-center gap-4 bg-white p-6">
            <h3 className="text-lg font-semibold text-primary">{t("scan_to_pay")}</h3>

            <div className="relative w-[200px] h-[200px]">
                <img src={qrCodeUrl} alt="PromptPay QR Code" className="w-full h-full" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[80px] h-[80px] rounded-none p-1 shadow-sm flex items-center justify-center overflow-hidden">
                    <img
                        src="https://www.bot.or.th/content/dam/bot/icons/icon-thaiqr.png"
                        alt="Thai QR Payment"
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>

            <div className="text-center">
                <p className="text-sm text-gray-500">{t("amount")}</p>
                <p className="text-2xl font-bold text-primary">
                    {amount.toLocaleString("th-TH", {
                        style: "currency",
                        currency: "THB",
                    })}
                </p>
            </div>
            <p className="text-xs text-muted-foreground">{t("promptpay")}: {phoneNumber}</p>
        </div>
    );
}
