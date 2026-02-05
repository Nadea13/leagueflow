import { getTranslations } from "next-intl/server";

export default async function PrivacyPolicyPage() {
    return (
        <div className="container max-w-4xl py-8 space-y-8">
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">1. Introduction</h2>
                <p>Welcome to LeagueFlow. We respect your privacy and are committed to protecting your personal data.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">2. Data We Collect</h2>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Identity Data (Name, username)</li>
                    <li>Contact Data (Email address)</li>
                    <li>Technical Data (IP address, browser type, cookies)</li>
                    <li>Usage Data (How you use our website)</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">3. How We Use Your Data</h2>
                <p>We use your data to provide our services, manage tournaments, process payments, and improve user experience.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">4. Cookies</h2>
                <p>We use cookies to distinguish you from other users. You can control cookie preferences in our settings.</p>
            </section>
        </div>
    );
}
