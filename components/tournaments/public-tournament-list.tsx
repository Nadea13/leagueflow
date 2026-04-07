"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PublicTournamentCard } from "./public-tournament-card";
import { getPublicTournaments } from "@/actions/public/public-tournaments";

export function PublicTournamentList({ onlyActive = false, isManager = false }: { onlyActive?: boolean, isManager?: boolean }) {
    const t = useTranslations("Home");
    const [search, setSearch] = useState("");
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTournaments = async () => {
            setIsLoading(true);
            try {
                const data = await getPublicTournaments(search);
                setTournaments(data || []);
            } catch (error) {
                console.error("Failed to fetch tournaments:", error);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(fetchTournaments, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const activeTournaments = tournaments.filter(t => t.status === "active");
    const completedTournaments = tournaments.filter(t => t.status === "completed");

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="relative max-w-2xl ml-0 group">
                <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-focus-within:text-secondary group-focus-within:scale-110 transition-all duration-300" />
                    <Input
                        placeholder={t("search_placeholder")}
                        className="pl-14 h-16 text-lg bg-muted/5 border-border/40 rounded-none group-focus-within:border-secondary group-focus-within:bg-muted/10 transition-all duration-500 font-black uppercase italic tracking-tight placeholder:text-muted-foreground/20"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-secondary group-focus-within:w-full transition-all duration-700" />
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-6 bg-muted/5 border border-dashed border-border/40 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <Loader2 className="h-12 w-12 animate-spin text-secondary relative z-10" />
                        <div className="absolute inset-x-0 bottom-0 h-4 bg-secondary/20 blur-xl animate-pulse" />
                    </div>
                    <p className="text-secondary font-black italic uppercase tracking-[0.3em] text-xs animate-pulse relative z-10">{t("searching")}</p>
                </div>
            ) : tournaments.length === 0 ? (
                <div className="text-center py-24 border border-dashed border-border/40 bg-muted/5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-muted/10" />
                    <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                    <p className="text-4xl font-black italic uppercase tracking-tighter text-muted-foreground/10 mb-2">{t("no_results")}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{t("try_adjusting_filters") || "Try adjusting your search query"}</p>
                </div>
            ) : (
                <div className="space-y-20">
                    {activeTournaments.length > 0 && (
                        <div className="space-y-8">
                            {!onlyActive && (
                                <div className="flex items-center gap-6 mb-12">
                                    <div className="h-4 w-4 bg-secondary shadow-[0_0_15px_rgba(0,196,154,0.4)]" />
                                    <h2 className="text-4xl font-black italic uppercase tracking-tighter text-foreground">{t("active_tournaments")}</h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-secondary/40 to-transparent" />
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                {activeTournaments.map((tournament) => (
                                    <PublicTournamentCard key={tournament.id} tournament={tournament} isManager={isManager} />
                                ))}
                            </div>
                        </div>
                    )}

                    {!onlyActive && completedTournaments.length > 0 && (
                        <div className="space-y-4 md:space-y-6">
                            <div className="flex items-center gap-4 md:gap-6">
                                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-muted-foreground/40">{t("completed_tournaments")}</h2>
                                <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                                {completedTournaments.map((tournament) => (
                                    <PublicTournamentCard key={tournament.id} tournament={tournament} isManager={isManager} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
