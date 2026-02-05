export default function RefundPolicyPage() {
    return (
        <div className="container max-w-4xl py-8 space-y-8">
            <h1 className="text-3xl font-bold">Refund Policy</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">1. Subscription Cancellations</h2>
                <p>You may cancel your Monthly or Yearly subscription at any time. Your access will continue until the end of the current billing period.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">2. Refund Eligibility</h2>
                <p>We generally do not offer refunds for partial subscription periods. However, exceptions may be made in cases of technical failure or billing errors.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">3. Per-Tournament Purchases (Lifetime)</h2>
                <p>Purchases for Lifetime Tournament Access (590 THB) are non-refundable once the tournament has started or matches have been generated.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">4. Contact Us</h2>
                <p>If you believe you were charged in error, please contact our support team immediately.</p>
            </section>
        </div>
    );
}
