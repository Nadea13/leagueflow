'use server';

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";
import { ActionResponse } from "@/types";
import { headers } from "next/headers";

export async function createStripeCheckoutSession({
    planId,
    planName,
    amount,
    tournamentId
}: {
    planId: string;
    planName: string;
    amount: number;
    tournamentId?: string | null;
}): Promise<ActionResponse<{ sessionId: string; url: string | null }>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const headersList = await headers();
        const origin = headersList.get("origin") || headersList.get("referer") || "http://localhost:3000";

        // Check if Stripe key is configured
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes("dummy")) {
            // Simulated Stripe session mode for local development without actual Stripe keys
            const dummySessionId = `cs_test_${Math.random().toString(36).substring(2, 12)}`;
            const redirectUrl = `${origin}/dashboard/settings?tab=billing&session_id=${dummySessionId}&success=true`;
            return {
                success: true,
                data: {
                    sessionId: dummySessionId,
                    url: redirectUrl
                }
            };
        }

        const isYearly = planId.includes('yearly') || planId.includes('annual') || planId === 'pro_yearly' || planId === 'cup_yearly';
        const isMonthly = planId === 'pro' || planId === 'event' || planId === 'cup' || planId === 'manager_pro' || planId === 'monthly';

        // Clean plan title
        const cleanPlanName = planName.replace(/^สมัครใช้\s*/i, '').replace(/^(สมัคร|Subscribe)\s*/i, '').trim();
        let displayTitle = `สมัครใช้ LeagueFlow ${cleanPlanName}`;
        if (isYearly) {
            displayTitle = `สมัครใช้ LeagueFlow ${cleanPlanName.replace(/yearly/i, '').trim()} (Annual)`;
        } else if (isMonthly) {
            displayTitle = `สมัครใช้ LeagueFlow ${cleanPlanName.replace(/monthly/i, '').trim()} (Monthly)`;
        }

        let baseDesc = "ระบบบริหารจัดการการแข่งขันฟุตบอลแบบมืออาชีพ สร้างทัวร์นาเมนต์ได้ไม่จำกัด ตารางแข่งขันและสถิติ Real-time";
        if (planId === "pro" || planId === "event") {
            baseDesc = "ระบบบริหารจัดการการแข่งขันแบบมืออาชีพ ตารางคะแนน Real-time สถิตินักกีฬา และระบบลงทะเบียนทีมครบวงจร";
        } else if (planId === "pro_yearly") {
            baseDesc = "แพ็กเกจรายปีคุ้มสุด ระบบบริหารจัดการการแข่งขันครบวงจร ไม่จำกัดทัวร์นาเมนต์ พร้อมระบบซัพพอร์ตพิเศษ";
        } else if (planId === "cup") {
            baseDesc = "แพ็กเกจสำหรับการแข่งขันแบบถ้วยฟุตบอล บอลถ้วย ตารางสายการแข่งขัน น็อคเอ้าท์ อัตโนมัติ";
        } else if (planId === "cup_yearly") {
            baseDesc = "แพ็กเกจรายปีสำหรับบริหารจัดการบอลถ้วย น็อคเอ้าท์และแบ่งกลุ่ม ไม่จำกัดรายการแข่งขัน";
        } else if (planId === "manager_pro") {
            baseDesc = "สำหรับผู้จัดการทีม จัดการรายชื่อนักกีฬา สถิติส่วนตัว ชำระเงินค่าสมัครแข่งครบในที่เดียว";
        }

        // Full base price vs discount calculation
        let originalPrice = amount;
        let discounts: any[] | undefined = undefined;

        // Pro Monthly Promo: Original 290 THB, Promo 145 THB (-50%)
        if ((planId === "pro" || planId === "event") && isMonthly && amount === 145) {
            originalPrice = 290;
            try {
                const couponId = "PROMO50_LAUNCH";
                try {
                    await stripe.coupons.retrieve(couponId);
                } catch {
                    await stripe.coupons.create({
                        id: couponId,
                        name: "โปรโมชั่นเปิดตัว (-50%)",
                        percent_off: 50,
                        duration: "once", // First billing cycle 50% off
                    });
                }
                discounts = [{ coupon: couponId }];
            } catch (err) {
                console.error("Error setting up Stripe coupon:", err);
            }
        }

        const priceDataObj: any = {
            currency: 'thb',
            product_data: {
                name: displayTitle,
                description: baseDesc,
            },
            unit_amount: Math.round(originalPrice * 100), // Original amount in satang
            recurring: {
                interval: isYearly ? 'year' : 'month',
            },
        };

        // Find or create Stripe Customer
        let customerId: string | undefined;
        if (user.email) {
            const existingCustomers = await stripe.customers.list({
                email: user.email,
                limit: 1,
            });
            if (existingCustomers.data.length > 0) {
                customerId = existingCustomers.data[0].id;
            } else {
                const newCustomer = await stripe.customers.create({
                    email: user.email,
                    metadata: {
                        userId: user.id,
                    },
                });
                customerId = newCustomer.id;
            }
        }

        const checkoutOptions: any = {
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: priceDataObj,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            discounts: discounts,
            customer: customerId,
            customer_email: customerId ? undefined : (user.email || undefined),
            metadata: {
                userId: user.id,
                planId,
                planName: cleanPlanName,
                tournamentId: tournamentId || '',
            },
            success_url: `${origin}/dashboard/settings?tab=billing&session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${origin}/dashboard/settings?tab=billing&canceled=true`,
        };


        const session = await stripe.checkout.sessions.create(checkoutOptions);

        return {
            success: true,
            data: {
                sessionId: session.id,
                url: session.url
            }
        };
    } catch (error) {
        console.error("Error creating Stripe Checkout Session:", error);

        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to initiate Stripe Checkout"
        };
    }
}

export async function createStripeCustomerPortalSession(): Promise<ActionResponse<{ url: string }>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || !user.email) {
            return { success: false, error: "Authentication required" };
        }

        const headersList = await headers();
        const origin = headersList.get("origin") || headersList.get("referer") || "http://localhost:3000";

        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes("dummy")) {
            return {
                success: true,
                data: {
                    url: `${origin}/dashboard/settings?tab=billing`
                }
            };
        }

        // Find Stripe Customer by email or create
        const existingCustomers = await stripe.customers.list({
            email: user.email,
            limit: 1,
        });

        let customerId: string;
        if (existingCustomers.data.length > 0) {
            customerId = existingCustomers.data[0].id;
        } else {
            const newCustomer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    userId: user.id,
                },
            });
            customerId = newCustomer.id;
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/dashboard/settings?tab=billing`,
        });

        return {
            success: true,
            data: {
                url: portalSession.url
            }
        };
    } catch (error) {
        console.error("Error creating Stripe Billing Portal session:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to open Stripe customer portal"
        };
    }
}


export async function verifyStripeCheckoutSession(sessionId: string): Promise<ActionResponse<{ paid: boolean }>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        let isPaid = false;
        let planId = "pro";
        let amount = 0;
        let tournamentId: string | null = null;
        let transactionId = sessionId;

        if (sessionId.startsWith("cs_test_") && (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes("dummy"))) {
            // Simulated verification mode for local test sessions
            isPaid = true;
            planId = "pro";
            amount = 145;
        } else if (process.env.STRIPE_SECRET_KEY) {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            if (session.payment_status === "paid" || session.status === "complete") {
                isPaid = true;
                planId = session.metadata?.planId || "pro";
                amount = (session.amount_total || 0) / 100;
                tournamentId = session.metadata?.tournamentId || null;
                transactionId = (session.subscription as string) || (session.payment_intent as string) || session.id;
            }
        }


        if (!isPaid) {
            return { success: false, error: "Payment not completed" };
        }

        const adminSupabase = createAdminClient();

        // Check if payment transaction already exists
        const { data: existingPayment } = await adminSupabase
            .from("payments")
            .select("id")
            .eq("transaction_id", transactionId)
            .maybeSingle();

        if (existingPayment) {
            return { success: true, data: { paid: true } };
        }

        // 1. Record payment in DB
        const { data: paymentData, error: paymentError } = await adminSupabase
            .from("payments")
            .insert({
                user_id: user.id,
                tournament_id: tournamentId || null,
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

        if (paymentError) {
            console.error("Error saving Stripe payment record:", paymentError);
            return { success: false, error: paymentError.message };
        }

        // 2. Upgrade tournament if applicable
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
                .eq("user_id", user.id);
        }

        revalidatePath("/", "layout");
        revalidatePath("/dashboard/settings", "page");

        return { success: true, data: { paid: true } };
    } catch (error) {
        console.error("Error verifying Stripe session:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to verify Stripe payment"
        };
    }
}
