import { redirect } from "next/navigation";

export default async function OrganizerRootPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    redirect(`/${locale}/organizer/dashboard`);
}
