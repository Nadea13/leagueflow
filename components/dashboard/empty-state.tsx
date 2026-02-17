import { CreateTournamentDialog } from "@/components/tournaments/create-tournament-dialog";
import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

interface EmptyStateProps {
    isPro: boolean;
}

export function EmptyState({ isPro }: EmptyStateProps) {
    const t = useTranslations("Common");

    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border bg-card text-card-foreground shadow-sm p-8 text-center animate-in fade-in-50">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6 ring-8 ring-primary/5">
                <Trophy className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight mb-2">
                {t("no_tournaments")}
            </h3>
            <p className="text-muted-foreground max-w-sm mb-8">
                {t("no_tournaments_desc")}
            </p>
            <CreateTournamentDialog isPro={isPro} />
        </div>
    );
}
