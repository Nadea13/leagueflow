import { redirect } from "next/navigation";

export default async function ManagerRootPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    redirect(`/${locale}/manager/dashboard`);
}
