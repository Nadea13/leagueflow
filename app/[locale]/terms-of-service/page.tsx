export default function TermsOfServicePage() {
    return (
        <div className="container max-w-4xl py-8 space-y-8">
            <h1 className="text-3xl font-bold">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
                <p>By accessing or using LeagueFlow, you agree to be bound by these Terms of Service.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">2. Description of Service</h2>
                <p>LeagueFlow provides tournament management tools for organizers. We reserve the right to modify or discontinue the service at any time.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">3. User Accounts</h2>
                <p>You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">4. Content</h2>
                <p>User-generated content (tournament names, team names) must not be illegal, obscene, or threatening.</p>
            </section>
        </div>
    );
}
