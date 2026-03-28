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
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import { formatDate } from "@/lib/date";

export function TopScorersTable({ goals, teams }: { goals: Goal[]; teams: Team[] }) {
    const t = useTranslations("TopScorers");
    const locale = useLocale();

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
        <div className="w-full">
            <div id="top-scorers-canvas" className="w-full overflow-hidden border border-border/20 bg-card/30 backdrop-blur-sm">
                <Table className="min-w-[400px]">
                    <TableHeader>
                        <TableRow className="h-10 border-b border-border/20 bg-muted/5 hover:bg-muted/5">
                            <TableHead className="w-12 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("rank")}</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("player")}</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("team") || "Team"}</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-secondary">{t("goals")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedScorers.length === 0 ? (
                            <TableRow className="hover:bg-transparent border-none">
                                <TableCell colSpan={4} className="py-20">
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <div className="h-12 w-12 rounded-none bg-muted/10 border border-border/10 flex items-center justify-center mb-4">
                                            <Activity className="h-6 w-6 text-muted-foreground/40" />
                                        </div>
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("no_goals")}</h3>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedScorers.slice(0, 10).map((scorer, index) => {
                                const team = getTeam(scorer.team_id);
                                const isTop3 = index < 3;
                                return (
                                    <TableRow 
                                        key={`${scorer.team_id}-${scorer.player_name}`} 
                                        className="h-12 border-b border-border/10 last:border-0 hover:bg-white/[0.02] transition-colors group/row"
                                    >
                                        <TableCell className="text-center px-4">
                                            <span className={cn(
                                                "text-[10px] font-black italic tracking-tighter",
                                                isTop3 ? "text-secondary" : "text-muted-foreground/40"
                                            )}>
                                                {String(index + 1).padStart(2, '0')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-4">
                                            <span className="text-xs font-black uppercase italic tracking-tighter text-foreground group-hover/row:text-secondary transition-colors">
                                                {scorer.player_name}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-5 h-5 bg-muted/10 border border-border/10 p-0.5 rounded-none flex items-center justify-center overflow-hidden shrink-0">
                                                    {team?.logo_url ? (
                                                        <img src={team.logo_url} alt="" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <span className="text-[8px] font-black text-muted-foreground/30 capitalize">
                                                            {team?.name.charAt(0)}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-black uppercase italic tracking-tighter text-muted-foreground/60 group-hover/row:text-muted-foreground transition-colors truncate max-w-[120px]">
                                                    {team?.name}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center px-4">
                                            <span className={cn(
                                                "text-sm font-black italic tracking-tighter tabular-nums",
                                                isTop3 ? "text-secondary" : "text-foreground"
                                            )}>
                                                {scorer.goals}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
            {sortedScorers.length > 0 && (
                <div className="py-2 flex justify-end">
                    <p className="text-[8px] font-black uppercase italic tracking-widest text-muted-foreground/30">
                        {t("showing_top_10") || "Showing TOP 10 Goal Scorers"}
                    </p>
                </div>
            )}
        </div>
    );
}
