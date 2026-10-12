import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leagueflow-v80x.onrender.com/api/v1';

export async function POST(req: Request) {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    let event;

    try {
        if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
            event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        } else {
            event = JSON.parse(body);
        }
    } catch (err) {
        console.error("Stripe Webhook Signature Verification Error:", err);
        return NextResponse.json({ error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown'}` }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId || "pro";
        const tournamentId = session.metadata?.tournamentId || null;
        const amount = (session.amount_total || 0) / 100;
        const transactionId = (session.subscription as string) || (session.payment_intent as string) || session.id;

        if (userId) {
            try {
                const res = await fetch(`${API_BASE_URL}/payments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        tournament_id: tournamentId || null,
                        amount,
                        plan_name: planId,
                        payment_status: "completed",
                        payment_method: "stripe",
                        transaction_id: transactionId,
                        raw_gateway_response: session,
                    }),
                });

                if (!res.ok) {
                    console.error("Stripe webhook: backend payment creation failed:", await res.text());
                }
            } catch (error) {
                console.error("Error processing Stripe webhook checkout.session.completed:", error);
            }
        }
    }

    return NextResponse.json({ received: true });
}
