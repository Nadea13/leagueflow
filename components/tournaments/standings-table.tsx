import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useTranslations } from "next-intl";

import { Standing } from "@/types/index";
import { List } from "lucide-react";

export function StandingsTable({ standings }: { standings: Standing[] }) {
    const t = useTranslations("Standings");

    // Standings are already sorted by the SQL View query in page.tsx:
    // .order("pts", { ascending: false })
    // .order("gd", { ascending: false })
    // .order("gf", { ascending: false });

    return (
        <div className="w-full rounded-none overflow-hidden">
            <Table className="min-w-[500px] text-xs md:text-sm">
                <TableHeader className="bg-muted/10 border-none">
                    <TableRow className="h-8 md:h-10 border-none hover:bg-transparent">
                        <TableHead className="w-8 min-w-[2rem] max-w-[2rem] md:w-12 md:min-w-[3rem] md:max-w-[3rem] px-1 md:px-4 text-center sticky left-0 z-20 bg-card supports-[backdrop-filter]:bg-card/90 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("pos")}</TableHead>
                        <TableHead className="px-1 md:px-4 sticky left-8 md:left-12 z-20 bg-card supports-[backdrop-filter]:bg-card/90 text-[10px] font-black uppercase tracking-wider text-muted-foreground shadow-[1px_0_0_0_rgba(255,255,255,0.05)] md:shadow-[1px_0_0_0_rgba(255,255,255,0.05)]">{t("team")}</TableHead>
                        <TableHead className="text-center px-1 md:px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("played")}</TableHead>
                        <TableHead className="text-center px-1 md:px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("won")}</TableHead>
                        <TableHead className="text-center px-1 md:px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("drawn")}</TableHead>
                        <TableHead className="text-center px-1 md:px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("lost")}</TableHead>
                        <TableHead className="text-center px-1 md:px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("gf")}</TableHead>
                        <TableHead className="text-center px-1 md:px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("ga")}</TableHead>
                        <TableHead className="text-center px-1 md:px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("gd")}</TableHead>
                        <TableHead className="text-center px-1 md:px-4 sticky right-0 z-20 bg-card supports-[backdrop-filter]:bg-card/90 text-[10px] font-black uppercase tracking-wider text-foreground shadow-[-1px_0_0_0_rgba(255,255,255,0.05)] md:shadow-[-1px_0_0_0_rgba(255,255,255,0.05)]">{t("pts")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {standings.map((team, index) => (
                        <TableRow key={team.team_id} className="h-8 md:h-10 border-none hover:bg-white/5 transition-colors group">
                            <TableCell className="w-8 min-w-[2rem] max-w-[2rem] md:w-12 md:min-w-[3rem] md:max-w-[3rem] font-bold text-center px-1 md:px-4 sticky left-0 z-10 bg-card group-hover:bg-[#1f1f1f] transition-colors text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="px-1 md:px-4 sticky left-8 md:left-12 z-10 bg-card group-hover:bg-[#1f1f1f] transition-colors shadow-[1px_0_0_0_rgba(255,255,255,0.05)] md:shadow-[1px_0_0_0_rgba(255,255,255,0.05)]">
                                <div className="flex items-center gap-2 md:gap-3">
                                    {team.team?.logo_url ? (
                                        <div className="w-5 h-5 md:w-7 md:h-7 bg-muted/20 border border-border/20 p-0.5 rounded-none shrink-0">
                                            <img src={team.team.logo_url} alt={team.team.name} className="w-full h-full object-contain" />
                                        </div>
                                    ) : (
                                        <div className="w-5 h-5 md:w-7 md:h-7 bg-muted/20 border border-border/20 flex items-center justify-center shrink-0">
                                            <span className="text-[10px] md:text-xs font-black uppercase text-muted-foreground">
                                                {team.team?.name.charAt(0)}
                                            </span>
                                        </div>
                                    )}
                                    <span className="truncate max-w-[100px] md:max-w-none font-bold tracking-tight text-foreground" title={team.team?.name}>{team.team?.name}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-center px-1 md:px-4 font-medium text-muted-foreground">{team.played}</TableCell>
                            <TableCell className="text-center px-1 md:px-4 font-medium text-muted-foreground">{team.won}</TableCell>
                            <TableCell className="text-center px-1 md:px-4 font-medium text-muted-foreground">{team.drawn}</TableCell>
                            <TableCell className="text-center px-1 md:px-4 font-medium text-muted-foreground">{team.lost}</TableCell>
                            <TableCell className="text-center px-1 md:px-4 font-medium text-muted-foreground">{team.gf}</TableCell>
                            <TableCell className="text-center px-1 md:px-4 font-medium text-muted-foreground">{team.ga}</TableCell>
                            <TableCell className={`text-center font-bold px-1 md:px-4 ${team.gd > 0 ? "text-primary" : (team.gd < 0 ? "text-destructive" : "text-muted-foreground")}`}>
                                {team.gd > 0 ? `+${team.gd}` : team.gd}
                            </TableCell>
                            <TableCell className="text-center font-black text-sm md:text-lg px-1 md:px-4 sticky right-0 z-10 bg-card group-hover:bg-[#1f1f1f] transition-colors text-foreground shadow-[-1px_0_0_0_rgba(255,255,255,0.05)] md:shadow-[-1px_0_0_0_rgba(255,255,255,0.05)]">{team.pts}</TableCell>
                        </TableRow>
                    ))}
                    {standings.length === 0 && (
                        <TableRow className="border-none hover:bg-transparent">
                            <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="h-12 w-12 rounded-none bg-muted/10 border border-border/20 flex items-center justify-center mb-4">
                                        <List className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t("no_stats")}</h3>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

