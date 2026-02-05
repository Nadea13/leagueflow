"use server";

import { ActionResponse } from "@/types/index";
import Omise from "omise";

const omise = Omise({
    publicKey: process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY!,
    secretKey: process.env.OMISE_SECRET_KEY!,
});

export async function createPromptPayCharge(
    amount: number,
    metadata: any
): Promise<ActionResponse> {
    try {
        // 1. Create a Source for PromptPay
        const source = await new Promise<any>((resolve, reject) => {
            omise.sources.create({
                amount: amount,
                currency: "thb",
                type: "promptpay",
            }, (err: any, resp: any) => {
                if (err) reject(err);
                else resolve(resp);
            });
        });

        // 2. Create a Charge using the Source
        const charge = await new Promise<any>((resolve, reject) => {
            omise.charges.create({
                amount: amount,
                currency: "thb",
                source: source.id,
                metadata: metadata,
                return_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing/complete`, // Redirect after payment (if applicable)
            }, (err: any, resp: any) => {
                if (err) reject(err);
                else resolve(resp);
            });
        });

        return {
            success: true,
            data: {
                charge_id: charge.id,
                qr_image: charge.source.scannable_code.image.download_uri,
                status: charge.status,
                authorize_uri: charge.authorize_uri
            }
        };

    } catch (error: any) {
        console.error("Omise Charge Error:", error);
        return {
            success: false,
            error: error?.message || "Failed to create payment charge"
        };
    }
}

export async function checkChargeStatus(
    chargeId: string
): Promise<ActionResponse> {
    try {
        const charge = await new Promise<any>((resolve, reject) => {
            omise.charges.retrieve(chargeId, (err: any, resp: any) => {
                if (err) reject(err);
                else resolve(resp);
            });
        });

        return {
            success: true,
            data: {
                status: charge.status
            }
        };

    } catch (error: any) {
        console.error("Omise Check Status Error:", error);
        return {
            success: false,
            error: error?.message || "Failed to check payment status"
        };
    }
}

export async function retrieveCharge(chargeId: string): Promise<any> {
    try {
        return await new Promise((resolve, reject) => {
            omise.charges.retrieve(chargeId, (err: any, resp: any) => {
                if (err) reject(err);
                else resolve(resp);
            });
        });
    } catch (error) {
        console.error("Omise Retrieve Charge Error:", error);
        return null; // Return null on failure instead of throwing to handle gracefully
    }
}
