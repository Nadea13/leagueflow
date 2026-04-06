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
            <div className="w-full overflow-x-auto rounded-none">
                <Table className="min-w-[400px] border-separate border-spacing-0">
                    <TableHeader className="bg-muted/5">
                        <TableRow className="h-10 border-b border-border/10 hover:bg-muted/5 transition-colors">
                            <TableHead className="w-12 px-0 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/10">
                                {t("rank")}
                            </TableHead>
                            <TableHead className="px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/10">
                                {t("player")}
                            </TableHead>
                            <TableHead className="px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/10">
                                {t("team") || "Team"}
                            </TableHead>
                            <TableHead className="text-center px-4 text-[10px] font-black uppercase tracking-widest text-secondary border-b border-border/10">
                                {t("goals")}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedScorers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="py-20 bg-muted/2">
                                    <div className="flex flex-col items-center justify-center gap-4 text-center">
                                        <div className="h-16 w-16 rounded-none bg-muted/10 border border-border/10 flex items-center justify-center relative group">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-muted/20" />
                                            <Activity className="h-8 w-8 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-black uppercase italic tracking-widest text-muted-foreground/40">{t("no_goals")}</h3>
                                            <p className="text-[10px] font-bold uppercase text-muted-foreground/20">Awaiting match events</p>
                                        </div>
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
                                        className="h-12 border-b border-border/5 hover:bg-muted/5 transition-colors group/row"
                                    >
                                        <TableCell className="text-center px-0 border-b border-border/5">
                                            <span className={cn(
                                                "text-[10px] font-black italic tracking-tighter tabular-nums",
                                                isTop3 ? "text-secondary" : "text-muted-foreground/40"
                                            )}>
                                                {String(index + 1).padStart(2, '0')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-4 border-b border-border/5">
                                            <span className="text-sm font-black uppercase italic tracking-tighter text-foreground group-hover/row:text-primary transition-colors">
                                                {scorer.player_name}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-4 border-b border-border/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 bg-muted/10 border border-border/10 p-1 rounded-none flex items-center justify-center overflow-hidden shrink-0">
                                                    {team?.logo_url ? (
                                                        <img src={team.logo_url} alt="" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <span className="text-[8px] font-black text-muted-foreground/30 capitalize">
                                                            {team?.name.charAt(0)}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-black uppercase italic tracking-tighter text-muted-foreground/60 group-hover/row:text-muted-foreground transition-colors truncate max-w-[120px] md:max-w-none">
                                                    {team?.name}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center px-4 border-b border-border/5">
                                            <span className="text-base font-black text-secondary tabular-nums">
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
