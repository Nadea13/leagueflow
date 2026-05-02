import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { FileText } from "lucide-react";
import { MyRegistrationsList } from "@/components/registrations/my-registrations-list";

export default async function MyRegistrationsPage() {
    const supabase = await createClient();
    const t = await getTranslations("Registration");
    const tCommon = await getTranslations("Common");
    const tNav = await getTranslations("Nav");
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
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center border border-border bg-muted/5 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-muted group-hover:bg-primary/40 transition-colors" />
                        <div className="p-8 bg-background border border-border rotate-12 transition-transform group-hover:rotate-0 shadow-xl mb-6 relative z-10">
                            <FileText className="h-12 w-12 text-muted-foreground opacity-30 -rotate-12 group-hover:rotate-0 transition-transform" />
                        </div>
                        <h3 className="text-2xl font-black tracking-tight relative z-10">
                            {t("no_registrations_yet") || "No Applications Found"}
                        </h3>
                        <p className="text-[11px] font-bold text-muted-foreground/60 mt-2 opacity-60 flex items-center gap-2 relative z-10 mx-auto">
                            <span className="w-4 h-[1px] bg-muted-foreground/30" />
                            {tCommon("browse_tournaments_desc") || "Start your competitive journey today"}
                            <span className="w-4 h-[1px] bg-muted-foreground/30" />
                        </p>
                    </div>
                ) : (
                    <MyRegistrationsList registrations={registrations as any} />
                )}
            </div>
        </div>
    );
}
