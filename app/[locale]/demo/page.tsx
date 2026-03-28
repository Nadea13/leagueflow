import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function DemoRedirectPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const supabase = await createClient();

  // Find the most recent active tournament
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (tournament) {
    redirect(`/${locale}/${tournament.id}`);
  }

  // Fallback to home if no tournament found
  redirect(`/${locale}`);
}
