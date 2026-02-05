import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Goal, Team } from "@/types/index";
import { useTranslations } from "next-intl";

import { ExportToImageButton } from "@/components/ui/export-to-image-button";

export function TopScorersTable({ goals, teams }: { goals: Goal[]; teams: Team[] }) {
    const t = useTranslations("TopScorers");

    // Aggregate goals by (team_id, player_name)
    const scorerStats: Record<string, { player_name: string; team_id: string; goals: number }> = {};

    goals.forEach(goal => {
        const key = `${goal.team_id}-${goal.player_name.trim().toLowerCase()}`;
        if (!scorerStats[key]) {
            scorerStats[key] = {
                player_name: goal.player_name,
                team_id: goal.team_id,
                goals: 0
            };
        }
        scorerStats[key].goals += 1;
    });

    const sortedScorers = Object.values(scorerStats).sort((a, b) => b.goals - a.goals);

    const getTeam = (teamId: string) => teams.find(t => t.id === teamId);

    return (
        <div className="w-full rounded-md border space-y-4 p-4">
            <div className="flex justify-between items-center border-b pb-4">
                <h3 className="font-semibold">{t("top_scorers") || "Top Scorers"}</h3>
                <ExportToImageButton targetId="top-scorers-canvas" filename="top_scorers" label={t("export") || "Export"} />
            </div>
            <div id="top-scorers-canvas" className="w-full overflow-x-auto rounded-md border">
                <Table className="min-w-[400px] text-xs md:text-sm">
                    <TableHeader>
                        <TableRow className="h-8 md:h-10">
                            <TableHead className="w-8 md:w-12 text-center px-1 md:px-4">{t("rank")}</TableHead>
                            <TableHead className="px-1 md:px-4">{t("player")}</TableHead>
                            <TableHead className="px-1 md:px-4">{t("team") || "Team"}</TableHead>
                            <TableHead className="text-center font-bold px-1 md:px-4">{t("goals")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedScorers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                    {t("no_goals")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedScorers.slice(0, 10).map((scorer, index) => {
                                const team = getTeam(scorer.team_id);
                                return (
                                    <TableRow key={`${scorer.team_id}-${scorer.player_name}`} className="h-8 md:h-10">
                                        <TableCell className="text-center font-medium px-1 md:px-4">{index + 1}</TableCell>
                                        <TableCell className="px-1 md:px-4">{scorer.player_name}</TableCell>
                                        <TableCell className="px-1 md:px-4">
                                            <div className="flex items-center gap-1 md:gap-2">
                                                {team?.logo_url ? (
                                                    <img src={team.logo_url} alt={team.name} className="w-4 h-4 md:w-5 md:h-5 object-contain" />
                                                ) : (
                                                    <div className="w-4 h-4 md:w-5 md:h-5 bg-muted rounded-full flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                                                        {team?.name.charAt(0)}
                                                    </div>
                                                )}
                                                <span className="text-muted-foreground truncate max-w-[80px] md:max-w-none text-xs md:text-sm">{team?.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-sm md:text-lg px-1 md:px-4">{scorer.goals}</TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
