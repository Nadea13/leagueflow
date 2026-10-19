import { redirect } from "next/navigation";
import { ApiClient } from "@/lib/api-client";

export default async function DemoRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  try {
    const list = await ApiClient.fetch<any[]>("/tournaments?limit=1");
    const tournaments = Array.isArray(list) ? list : (list as any)?.tournaments || [];
    if (tournaments.length > 0 && tournaments[0]?.id) {
      redirect(`/${locale}/tournaments/${tournaments[0].id}`);
    }
  } catch {
    // Fallback to home if no tournament found
  }

  redirect(`/${locale}`);
}
