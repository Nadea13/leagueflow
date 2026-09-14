import { redirect } from "next/navigation";

interface DocumentionsPageProps {
    params: Promise<{ id: string; locale: string }>;
    searchParams?: Promise<{ team?: string; category?: string }>;
}

export default async function DocumentionsPage({ params, searchParams }: DocumentionsPageProps) {
    const { id, locale } = await params;
    const resolvedSearchParams = await searchParams;
    const teamParam = resolvedSearchParams?.team ? `&team=${resolvedSearchParams.team}` : "";
    const categoryParam = resolvedSearchParams?.category ? `&category=${resolvedSearchParams.category}` : "";
    
    redirect(`/${locale}/registrations/${id}?tab=documents${teamParam}${categoryParam}`);
}
