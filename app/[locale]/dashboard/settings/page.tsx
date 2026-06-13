import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage({
    searchParams
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    const { tab } = await searchParams;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

    return <SettingsView user={user} profile={profile || undefined} activeTab={tab || "profile"} />;
}
