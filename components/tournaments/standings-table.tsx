import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useTranslations } from "next-intl";
import Image from "next/image";

import { Standing } from "@/types/index";
import { List } from "lucide-react";

export function StandingsTable({ standings }: { standings: Standing[] }) {
    const t = useTranslations("Standings");

    // Standings are already sorted by the SQL View query in page.tsx:
    // .order("pts", { ascending: false })
    // .order("gd", { ascending: false })
    // .order("gf", { ascending: false });

    return (
        <div className="w-full overflow-x-auto rounded-none">
            <Table className="min-w-[600px] text-xs md:text-sm border-separate border-spacing-0">
                <TableHeader className="bg-muted/5">
                    <TableRow className="h-10 border-b border-border/10 hover:bg-muted/5 transition-colors">
                        <TableHead className="w-10 min-w-[2.5rem] px-0 text-center sticky left-0 z-20 bg-background/95 backdrop-blur-sm text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/10 whitespace-nowrap">
                            {t("pos")}
                        </TableHead>
                        <TableHead className="px-6 sticky left-10 z-20 bg-background/95 backdrop-blur-sm text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/10 border-r border-border/5 whitespace-nowrap">
                            {t("team")}
                        </TableHead>
                        <TableHead className="text-center px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 border-b border-border/10 whitespace-nowrap">{t("played")}</TableHead>
                        <TableHead className="text-center px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 border-b border-border/10 whitespace-nowrap">{t("won")}</TableHead>
                        <TableHead className="text-center px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 border-b border-border/10 whitespace-nowrap">{t("drawn")}</TableHead>
                        <TableHead className="text-center px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 border-b border-border/10 whitespace-nowrap">{t("lost")}</TableHead>
                        <TableHead className="text-center px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 border-b border-border/10 whitespace-nowrap">{t("gf")}</TableHead>
                        <TableHead className="text-center px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 border-b border-border/10 whitespace-nowrap">{t("ga")}</TableHead>
                        <TableHead className="text-center px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 border-b border-border/10 whitespace-nowrap">{t("gd")}</TableHead>
                        <TableHead className="text-center px-6 sticky right-0 z-20 bg-background/95 backdrop-blur-sm text-[10px] font-black uppercase tracking-widest text-secondary border-b border-border/10 border-l border-border/5 whitespace-nowrap">
                            {t("pts")}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {standings.map((team, index) => (
                        <TableRow key={team.team_id} className="h-12 border-b border-border/5 hover:bg-muted/5 transition-colors group">
                            <TableCell className="text-center px-0 sticky left-0 z-10 bg-background group-hover:bg-muted/10 transition-colors font-black tracking-tighter text-muted-foreground/40 text-sm tabular-nums border-b border-border/5">
                                {index + 1}
                            </TableCell>
                            <TableCell className="px-6 sticky left-10 z-10 bg-background group-hover:bg-muted/10 transition-colors border-b border-border/5 border-r border-border/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 bg-muted/10 border border-border/10 p-1 rounded-none shrink-0 relative overflow-hidden flex items-center justify-center">
                                        {team.team?.logo_url ? (
                                            <Image src={team.team.logo_url} alt={team.team.name} width={32} height={32} className="w-full h-full object-contain relative z-10" unoptimized />
                                        ) : (
                                            <span className="text-[10px] font-black uppercase text-muted-foreground/40">
                                                {team.team?.name.charAt(0)}
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-black uppercase tracking-tighter text-foreground text-sm truncate max-w-[120px] md:max-w-none group-hover:text-primary transition-colors" title={team.team?.name}>
                                        {team.team?.name}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="text-center px-4 font-bold text-muted-foreground/60 tabular-nums border-b border-border/5">{team.played}</TableCell>
                            <TableCell className="text-center px-4 font-bold text-muted-foreground/60 tabular-nums border-b border-border/5">{team.won}</TableCell>
                            <TableCell className="text-center px-4 font-bold text-muted-foreground/60 tabular-nums border-b border-border/5">{team.drawn}</TableCell>
                            <TableCell className="text-center px-4 font-bold text-muted-foreground/60 tabular-nums border-b border-border/5">{team.lost}</TableCell>
                            <TableCell className="text-center px-4 font-bold text-muted-foreground/30 tabular-nums border-b border-border/5">{team.gf}</TableCell>
                            <TableCell className="text-center px-4 font-bold text-muted-foreground/30 tabular-nums border-b border-border/5">{team.ga}</TableCell>
                            <TableCell className={`text-center px-4 font-black text-sm tabular-nums border-b border-border/5 ${team.gd > 0 ? "text-primary" : team.gd < 0 ? "text-destructive" : "text-muted-foreground/40"}`}>
                                {team.gd > 0 ? `+${team.gd}` : team.gd}
                            </TableCell>
                            <TableCell className="text-center px-6 sticky right-0 z-10 bg-background group-hover:bg-muted/10 transition-colors font-black text-lg text-foreground border-b border-border/5 border-l border-border/5 tabular-nums">
                                {team.pts}
                            </TableCell>
                        </TableRow>
                    ))}
                    {standings.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={10} className="text-center py-20 bg-muted/2">
                                <div className="flex flex-col items-center justify-center gap-4">
                                    <div className="h-16 w-16 rounded-none bg-muted/10 border border-border/10 flex items-center justify-center relative group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-muted/20" />
                                        <List className="h-8 w-8 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/40">{t("no_stats")}</h3>
                                        <p className="text-[10px] font-bold uppercase text-muted-foreground/20">Awaiting match results</p>
                                    </div>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

