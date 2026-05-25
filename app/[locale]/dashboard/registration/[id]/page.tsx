import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RegistrationForm } from "@/components/registrations/registration-form";
import { getMyTeams } from "@/actions/manager/team";
import { Team } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign } from "lucide-react";

interface DashboardRegistrationPageProps {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ category?: string | string[] }>;
}

export default async function DashboardRegistrationPage({ params, searchParams }: DashboardRegistrationPageProps) {
    const { id } = await params;
    const categoryParam = (await searchParams)?.category;
    const tournamentCategoryId = typeof categoryParam === "string" ? categoryParam : undefined;
    const supabase = await createClient();

    const { data: tournament, error } = await supabase
        .from("tournaments")
        .select("id, name, status, is_registration_open, registration_fee, bank_account_number, bank_name, bank_account_name, start_date, end_date")
        .eq("id", id)
        .is("deleted_at", null)
        .single();

    if (error || !tournament) {
        notFound();
    }

    const teamsResult = await getMyTeams();
    const myTeams = (teamsResult.success ? (teamsResult.data as Team[]) : []) || [];

    return (
        <div className="space-y-4 md:space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-2xl font-black tracking-tight">{tournament.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2 md:gap-3 text-sm">
                    <Badge variant="outline" className="capitalize">{tournament.status}</Badge>
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(tournament.start_date).toLocaleDateString("th-TH")} - {new Date(tournament.end_date).toLocaleDateString("th-TH")}</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold ml-auto">
                        <DollarSign className="h-4 w-4" />
                        <span>{Number(tournament.registration_fee || 0) === 0 ? "Free" : `${Number(tournament.registration_fee).toLocaleString()} ?`}</span>
                    </div>
                </CardContent>
            </Card>

            <RegistrationForm tournament={tournament} tournamentCategoryId={tournamentCategoryId} initialTeams={myTeams} />
        </div>
    );
}
