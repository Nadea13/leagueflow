import { CreateTournamentDialog } from "@/components/tournaments/create-tournament-dialog";
import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";
import { Trophy, Users } from "lucide-react";
import { useTranslations } from "next-intl";

interface EmptyStateProps {
    isPro: boolean;
    type?: 'tournament' | 'team';
    tournaments?: { id: string; name: string }[];
}

export function EmptyState({ isPro, type = 'tournament', tournaments = [] }: EmptyStateProps) {
    const t = useTranslations("Common");
    const tTeam = useTranslations("Team");

    const isTeam = type === 'team';
    const Icon = isTeam ? Users : Trophy;
    
    // Using specific translations for the personal dashboard view
    const title = isTeam ? tTeam("no_teams_yet") : t("no_tournaments");
    const description = isTeam ? tTeam("my_teams_desc") : t("no_tournaments_desc");

    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-none border bg-card text-card-foreground shadow-sm p-8 text-center animate-in fade-in-50">
            <div className="flex h-20 w-20 items-center justify-center rounded-none bg-primary/10 mb-6 ring-8 ring-primary/5">
                <Icon className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight mb-2">
                {title}
            </h3>
            <p className="text-muted-foreground max-w-sm mb-8">
                {description}
            </p>
            {isTeam ? (
                <CreateTeamDialog />
            ) : (
                <CreateTournamentDialog isPro={isPro} />
            )}
        </div>
    );
}
