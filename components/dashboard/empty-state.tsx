import { CreateTournamentDialog } from "@/components/tournaments/create-tournament-dialog";
import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";
import { Trophy, Users } from "lucide-react";
import { useTranslations } from "next-intl";

interface EmptyStateProps {
    isPro: boolean;
    type?: 'tournament' | 'team';
    tournaments?: { id: string; name: string }[];
}

export function EmptyState({ isPro, type = 'tournament', tournaments: _tournaments = [] }: EmptyStateProps) {
    const t = useTranslations("Common");
    const tTeam = useTranslations("Team");

    const isTeam = type === 'team';
    const Icon = isTeam ? Users : Trophy;
    
    // Using specific translations for the personal dashboard view
    const title = isTeam ? tTeam("no_teams_yet") : t("no_tournaments");
    const description = isTeam ? tTeam("my_teams_desc") : t("no_tournaments_desc");

    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-none border border-border bg-muted/5 p-8 text-center animate-in fade-in-50 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-muted group-hover:bg-secondary/40 transition-colors" />
            
            <div className="p-8 bg-background border border-border rotate-12 transition-transform group-hover:rotate-0 shadow-xl mb-6 relative z-10">
                <Icon className="h-12 w-12 text-muted-foreground opacity-30 -rotate-12 group-hover:rotate-0 transition-transform" />
            </div>

            <h3 className="text-2xl font-black uppercase italic tracking-tight mb-2 relative z-10">
                {title}
            </h3>
            <p className="text-[11px] uppercase font-bold text-muted-foreground/60 max-w-sm mb-8 flex items-center gap-2 relative z-10">
                <span className="w-4 h-[1px] bg-muted-foreground/30" />
                {description}
                <span className="w-4 h-[1px] bg-muted-foreground/30" />
            </p>
            <div className="relative z-10">
                {isTeam ? (
                    <CreateTeamDialog />
                ) : (
                    <CreateTournamentDialog isPro={isPro} />
                )}
            </div>
        </div>
    );
}
