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
        <div className="w-full overflow-x-auto rounded-none border">
            <Table className="min-w-[500px] text-xs md:text-sm">
                <TableHeader>
                    <TableRow className="h-8 md:h-10">
                        <TableHead className="w-8 md:w-12 px-1 md:px-4 text-center">{t("pos")}</TableHead>
                        <TableHead className="px-1 md:px-4">{t("team")}</TableHead>
                        <TableHead className="text-center px-1 md:px-4">{t("played")}</TableHead>
                        <TableHead className="text-center px-1 md:px-4">{t("won")}</TableHead>
                        <TableHead className="text-center px-1 md:px-4">{t("drawn")}</TableHead>
                        <TableHead className="text-center px-1 md:px-4">{t("lost")}</TableHead>
                        <TableHead className="text-center px-1 md:px-4">{t("gf")}</TableHead>
                        <TableHead className="text-center px-1 md:px-4">{t("ga")}</TableHead>
                        <TableHead className="text-center px-1 md:px-4">{t("gd")}</TableHead>
                        <TableHead className="text-center font-bold px-1 md:px-4">{t("pts")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {standings.map((team, index) => (
                        <TableRow key={team.team_id} className="h-8 md:h-10">
                            <TableCell className="font-medium text-center px-1 md:px-4">{index + 1}</TableCell>
                            <TableCell className="px-1 md:px-4">
                                <div className="flex items-center gap-1 md:gap-2">
                                    {team.team?.logo_url ? (
                                        <img src={team.team.logo_url} alt={team.team.name} className="w-4 h-4 md:w-6 md:h-6 object-contain" />
                                    ) : (
                                        <div className="w-4 h-4 md:w-6 md:h-6 bg-muted rounded-none flex items-center justify-center text-[8px] md:text-[10px] font-bold text-muted-foreground">
                                            {team.team?.name.charAt(0)}
                                        </div>
                                    )}
                                    <span className="truncate max-w-[80px] md:max-w-none" title={team.team?.name}>{team.team?.name}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-center px-1 md:px-4">{team.played}</TableCell>
                            <TableCell className="text-center px-1 md:px-4">{team.won}</TableCell>
                            <TableCell className="text-center px-1 md:px-4">{team.drawn}</TableCell>
                            <TableCell className="text-center px-1 md:px-4">{team.lost}</TableCell>
                            <TableCell className="text-center px-1 md:px-4">{team.gf}</TableCell>
                            <TableCell className="text-center px-1 md:px-4">{team.ga}</TableCell>
                            <TableCell className={`text-center font-semibold px-1 md:px-4 ${team.gd > 0 ? "text-green-600" : (team.gd < 0 ? "text-red-500" : "")}`}>
                                {team.gd > 0 ? `+${team.gd}` : team.gd}
                            </TableCell>
                            <TableCell className="text-center font-bold text-sm md:text-lg px-1 md:px-4">{team.pts}</TableCell>
                        </TableRow>
                    ))}
                    {standings.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="h-12 w-12 rounded-none bg-muted/20 flex items-center justify-center mb-4">
                                        <List className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-sm font-medium text-muted-foreground">{t("no_stats")}</h3>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

