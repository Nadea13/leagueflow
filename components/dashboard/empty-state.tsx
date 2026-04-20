import { CreateTournamentDialog } from "@/components/tournaments/create-tournament-dialog";
import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";
import { Trophy, Users, LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    title?: string;
    description?: string;
    icon?: LucideIcon;
    action?: React.ReactNode;
    className?: string;
    // Legacy support
    isPro?: boolean;
    type?: 'tournament' | 'team';
}

export function EmptyState({ 
    title, 
    description, 
    icon: IconProp, 
    action, 
    className,
    isPro, 
    type = 'tournament' 
}: EmptyStateProps) {
    const t = useTranslations("Common");
    const tTeam = useTranslations("Team");

    const isTeam = type === 'team';
    const DefaultIcon = isTeam ? Users : Trophy;
    const Icon = IconProp || DefaultIcon;
    
    const displayTitle = title || (isTeam ? tTeam("no_teams_yet") : t("no_tournaments"));
    const displayDescription = description || (isTeam ? tTeam("my_teams_desc") : t("no_tournaments_desc"));

    const defaultAction = isTeam ? (
        <CreateTeamDialog />
    ) : (
        <CreateTournamentDialog isPro={isPro ?? false} />
    );

    return (
        <div className={cn(
            "flex min-h-[400px] flex-col items-center justify-center rounded-none border border-border bg-muted/5 p-8 text-center animate-in fade-in-50 relative overflow-hidden group",
            className
        )}>
            <div className="p-8 bg-background border border-border rotate-12 transition-transform group-hover:rotate-0 shadow-xl mb-6 relative z-10">
                <Icon className="h-12 w-12 text-muted-foreground opacity-30 -rotate-12 group-hover:rotate-0 transition-transform" />
            </div>

            <h3 className="text-2xl font-black uppercase italic tracking-tight mb-2 relative z-10">
                {displayTitle}
            </h3>
            <p className="text-[11px] uppercase font-bold text-muted-foreground/60 max-w-sm mb-8 flex items-center gap-2 relative z-10">
                <span className="w-4 h-[1px] bg-muted-foreground/30" />
                {displayDescription}
                <span className="w-4 h-[1px] bg-muted-foreground/30" />
            </p>
            <div className="relative z-10">
                {action || defaultAction}
            </div>
        </div>
    );
}
