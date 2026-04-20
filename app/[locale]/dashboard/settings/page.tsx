import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SettingsRedirect({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/${locale}/login`);
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("is_organizer")
        .eq("id", user.id)
        .single();

    if (profile?.is_organizer) {
        redirect(`/${locale}/organizer/settings`);
    } else {
        redirect(`/${locale}/manager/settings`);
    }

    return null;
}