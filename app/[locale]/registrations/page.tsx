import { createClient } from "@/lib/supabase/server";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicTournamentsListClient } from "../tournaments/public-tournaments-list-client";
import { getPublicTournaments } from "@/actions/public";
import { Tournament } from "@/types";

export default async function RegistrationsListPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch list of sports for filtering tab
    const { data: sports } = await supabase
        .from("sports")
        .select("id, sport_name")
        .order("sport_name", { ascending: true });

    // Fetch initial public tournaments on server
    const initialTournaments = (await getPublicTournaments()) as unknown as Tournament[];

    return (
        <div className="flex flex-col min-h-screen">
            <PublicNavbar user={user} />

            <main className="flex-1 pt-20 md:pt-24 container max-w-7xl mx-auto p-2 lg:px-0 space-y-4">
                <PublicTournamentsListClient 
                    sports={sports || []} 
                    initialTournaments={initialTournaments} 
                    showTabs={false}
                    onlyUpcoming={true}
                    title="การลงทะเบียน"
                    cardHrefPrefix="/registrations"
                />
            </main>

            <PublicFooter />
        </div>
    );
}
