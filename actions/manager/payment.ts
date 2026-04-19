"use server";

import { ActionResponse } from "@/types/index";

import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

// This file used to contain Omise integrations.
// Omise has been removed in favor of direct PromptPay QR and slip verification API.

export interface PromptPayChargeData {
    qr_image: string;
    charge_id: string;
    promptpay_id: string;
    account_name: string;
}

export async function createPromptPayCharge(amount: number, _metadata: Record<string, unknown>): Promise<ActionResponse<PromptPayChargeData>> {
    try {
        const promptPayId = process.env.NEXT_PUBLIC_PROMPTPAY_ID || "0800000000";
        const accountName = process.env.NEXT_PUBLIC_PROMPTPAY_NAME || "LeagueFlow";

        const payload = generatePayload(promptPayId, { amount: amount / 100 });

        const qrImage = await QRCode.toDataURL(payload, {
            margin: 1,
            width: 400,
        });

        const chargeId = `CHG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase();

        return {
            success: true,
            data: {
                qr_image: qrImage,
                charge_id: chargeId,
                promptpay_id: promptPayId,
                account_name: accountName
            }
        };
    } catch (error: unknown) {
        console.error("QR Generation Failed:", error);
        return {
            success: false,
            error: "Failed to generate PromptPay QR code",
            data: undefined
        };
    }
}
