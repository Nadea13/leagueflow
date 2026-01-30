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

export function StandingsTable({ standings }: { standings: Standing[] }) {
    const t = useTranslations("Standings");

    // Standings are already sorted by the SQL View query in page.tsx:
    // .order("pts", { ascending: false })
    // .order("gd", { ascending: false })
    // .order("gf", { ascending: false });

    return (
        <div className="w-full overflow-x-auto rounded-md border">
            <Table className="min-w-[500px]">
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">{t("pos")}</TableHead>
                        <TableHead>{t("team")}</TableHead>
                        <TableHead className="text-center">{t("played")}</TableHead>
                        <TableHead className="text-center">{t("won")}</TableHead>
                        <TableHead className="text-center">{t("drawn")}</TableHead>
                        <TableHead className="text-center">{t("lost")}</TableHead>
                        <TableHead className="text-center">{t("gf")}</TableHead>
                        <TableHead className="text-center">{t("ga")}</TableHead>
                        <TableHead className="text-center">{t("gd")}</TableHead>
                        <TableHead className="text-center font-bold">{t("pts")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {standings.map((team, index) => (
                        <TableRow key={team.team_id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {team.team?.logo_url ? (
                                        <img src={team.team.logo_url} alt={team.team.name} className="w-6 h-6 object-contain" />
                                    ) : (
                                        <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                            {team.team?.name.charAt(0)}
                                        </div>
                                    )}
                                    {team.team?.name}
                                </div>
                            </TableCell>
                            <TableCell className="text-center">{team.played}</TableCell>
                            <TableCell className="text-center">{team.won}</TableCell>
                            <TableCell className="text-center">{team.drawn}</TableCell>
                            <TableCell className="text-center">{team.lost}</TableCell>
                            <TableCell className="text-center">{team.gf}</TableCell>
                            <TableCell className="text-center">{team.ga}</TableCell>
                            <TableCell className={`text-center font-semibold ${team.gd > 0 ? "text-green-600" : (team.gd < 0 ? "text-red-500" : "")}`}>
                                {team.gd > 0 ? `+${team.gd}` : team.gd}
                            </TableCell>
                            <TableCell className="text-center font-bold text-lg">{team.pts}</TableCell>
                        </TableRow>
                    ))}
                    {standings.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={10} className="text-center py-4 text-muted-foreground">
                                {t("no_stats")}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

