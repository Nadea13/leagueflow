import { Link } from "@/i18n/routing";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Tournament } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface PublicTournamentCardProps {
    tournament: Tournament & { 
        tournament_teams?: { count: number }[];
        sports?: { id: string; sport_name: string };
        sport_name?: string;
    };
    href?: string;
}

const THAI_SPORT_NAMES: Record<string, string> = {
    football: "ฟุตบอล",
    basketball: "บาสเกตบอล",
    volleyball: "วอลเลย์บอล",
    futsal: "ฟุตซอล",
    badminton: "แบดมินตัน",
    cricket: "คริกเก็ต",
    takraw: "เซปักตะกร้อ",
};

export function PublicTournamentCard({ tournament, href }: PublicTournamentCardProps) {
    const locale = useLocale();
    const tDashboard = useTranslations("Dashboard");
    const tSettings = useTranslations("Settings");

    const currentTeams = tournament.tournament_teams?.[0]?.count || 0;
    const isFull = tournament.max_teams ? currentTeams >= tournament.max_teams : false;
    const isPastDeadline = tournament.document_deadline ? new Date(tournament.document_deadline) < new Date() : false;
    const isNotOpenYet = tournament.is_registration_open === false;
    const isClosed = isFull || isPastDeadline || isNotOpenYet;

    const cardHref = href || `/tournaments/${tournament.id}`;

    const rawSportName = tournament.sports?.sport_name || tournament.sport_name || "";
    const sportDisplayName = locale === "th" && rawSportName
        ? (THAI_SPORT_NAMES[rawSportName.toLowerCase()] || rawSportName)
        : rawSportName;

    return (
        <Link href={cardHref} className="block group">
            <Card className="flex flex-col h-full bg-card border rounded-sm transition-all hover:border-primary/50 overflow-hidden relative cursor-pointer">
                <CardContent className="flex justify-between py-2 md:py-4 relative z-10">
                    <div className="flex items-center gap-1 md:gap-2 overflow-hidden">
                        <Avatar className="h-12 w-12 border rounded-full group-hover:border-primary/30 transition-all shrink-0 p-1 bg-muted/30">
                            <AvatarImage src={tournament.logo_img ?? undefined} alt={tournament.name ?? ""} className="object-contain rounded-full" />
                            <AvatarFallback className="bg-primary/5 text-primary font-black rounded-full">
                                {tournament.name ? tournament.name.substring(0, 2).toUpperCase() : ""}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-lg font-black leading-none tracking-tight group-hover:text-primary transition-colors truncate">
                                    {tournament.name}
                                </CardTitle>
                                {isClosed && (
                                    <Badge
                                        variant="outline"
                                        className={`w-fit text-[9px] ${isNotOpenYet
                                            ? "text-warning border-warning/50 bg-warning/10"
                                            : "text-destructive border-destructive/50 bg-destructive/10"
                                            }`}
                                    >
                                        {isNotOpenYet
                                            ? "ยังไม่เปิดรับสมัคร"
                                            : isFull
                                            ? (tSettings("full") || "เต็มแล้ว")
                                            : (tSettings("closed") || "ปิดรับสมัคร")}
                                    </Badge>
                                )}
                            </div>
                            {sportDisplayName && (
                                <p className="text-xs font-semibold text-muted-foreground truncate">
                                    {sportDisplayName}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="flex gap-2">
                            <div className="h-8 w-8 bg-muted border border-border flex items-center justify-center rounded-sm text-primary">
                                <Calendar className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-muted-foreground/60 tracking-wider">
                                    {tDashboard("schedule")}
                                </p>
                                <p className="text-xs font-bold truncate">
                                    {tournament.start_date && tournament.end_date ? (
                                        tournament.start_date === tournament.end_date
                                            ? new Date(tournament.start_date).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                                            : `${new Date(tournament.start_date).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric', year: '2-digit' })} - ${new Date(tournament.end_date).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric', year: '2-digit' })}`
                                    ) : tournament.start_date ? (
                                        new Date(tournament.start_date).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                                    ) : (
                                        tDashboard("not_specified")
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
