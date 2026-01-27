import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { getTranslations } from "next-intl/server";

export default async function ProfilePage() {
    const t = await getTranslations("Profile");
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        // redirect("/login");
    }

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                <p className="text-muted-foreground">{t("subtitle")}</p>
            </div>
            <ProfileForm user={user} />
        </div>
    );
}
