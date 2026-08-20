import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

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
        console.error("Stripe Webhook Error:", err);
        return NextResponse.json({ error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown'}` }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId || "pro";
        const tournamentId = session.metadata?.tournamentId || null;
        const amount = (session.amount_total || 0) / 100;
        const transactionId = (session.payment_intent as string) || session.id;

        if (userId) {
            try {
                const adminSupabase = createAdminClient();
                
                // Check if payment already recorded
                const { data: existing } = await adminSupabase
                    .from("payments")
                    .select("id")
                    .eq("transaction_id", transactionId)
                    .maybeSingle();

                if (!existing) {
                    const { data: paymentData } = await adminSupabase
                        .from("payments")
                        .insert({
                            user_id: userId,
                            tournament_id: tournamentId,
                            amount,
                            payment_status: "success",
                            payment_method: "stripe",
                            plan_name: planId,
                            transaction_id: transactionId,
                            paid_at: new Date().toISOString(),
                            created_at: new Date().toISOString()
                        })
                        .select()
                        .single();

                    if (tournamentId && paymentData) {
                        await adminSupabase
                            .from("tournaments")
                            .update({
                                plan: "tournament",
                                payment_status: "paid",
                                payment_id: paymentData.id,
                                payment_method: "stripe",
                                updated_at: new Date().toISOString()
                            })
                            .eq("id", tournamentId)
                            .eq("user_id", userId);
                    }
                }
            } catch (error) {
                console.error("Error processing Stripe webhook checkout.session.completed:", error);
            }
        }
    }

    return NextResponse.json({ received: true });
}
