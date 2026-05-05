import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { MyRegistrationsList } from "@/components/registrations/my-registrations-list";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default async function MyRegistrationsPage() {
    const supabase = await createClient();
    const tCommon = await getTranslations("Common");
    const tNav = await getTranslations("Navigation");
    const t = await getTranslations("Registration");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch registrations for the user
    const { data: registrations } = await supabase
        .from("registrations")
        .select("*, tournament:tournaments(name, document_deadline, format)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground leading-[0.8] mb-2">
                        {tNav("my_registrations")}
                    </h1>
                    <p className="text-muted-foreground/60 text-[10px] md:text-xs font-bold tracking-widest max-w-xl">
                        {t("my_registrations_desc") || "Track your team registration applications and their approval status."}
                    </p>
                </div>
            </div>

            <div className="space-y-4 md:space-y-6">
                {(!registrations || registrations.length === 0) ? (
                    <EmptyState
                        icon={FileText}
                        title={t("no_registrations_yet")}
                        description={tCommon("browse_tournaments_desc")}
                        className="bg-card"
                    />
                ) : (
                    <MyRegistrationsList registrations={registrations as any} />
                )}
            </div>
        </div>
    );
}
