import { getUserProfile } from "./actions";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Dashboard",
    description: "Manage your tournaments, view stats, and track your leagues.",
};

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    // Parallel data fetching
    const [profile] = await Promise.all([
        getUserProfile()
    ]);

    if (profile?.is_organizer) {
        redirect(`/${locale}/organizer/dashboard`);
    } else {
        redirect(`/${locale}/manager/dashboard`);
    }

    return null; // Should redirect before reaching here
}
