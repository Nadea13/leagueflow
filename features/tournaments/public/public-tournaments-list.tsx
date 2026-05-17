"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Search, Trophy } from "lucide-react";
import { Tournament } from "@/types";
import { PublicTournamentCard } from "./public-tournament-card";
import { getPublicTournaments } from "@/actions/public/public-tournaments";
import { EmptyState } from "@/components/shared/empty-state";

import { useSearchParams } from "next/navigation";

export function PublicTournaments({ onlyActive = false }: { onlyActive?: boolean }) {
    const t = useTranslations("PublicTournaments");
    const searchParams = useSearchParams();
    const search = searchParams.get("search") || "";
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTournaments = async () => {
            setIsLoading(true);
            try {
                const data = await getPublicTournaments(search);
                setTournaments(data as unknown as Tournament[] || []);
            } catch (_error) {
                console.error("Failed to fetch tournaments:", _error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTournaments();
    }, [search]);

    const activeTournaments = tournaments.filter(t => t.status === "active");
    const completedTournaments = tournaments.filter(t => t.status === "completed");

    return (
        <div className="space-y-4 md:space-y-6">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-6 bg-muted/5 border border-dashed relative overflow-hidden group">
                    <div className="relative">
                        <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
                        <div className="absolute inset-x-0 bottom-0 h-4 bg-primary/20 blur-xl animate-pulse" />
                    </div>
                    <p className="text-primary font-black tracking-[0.3em] text-xs animate-pulse relative z-10">{t("searching")}</p>
                </div>
            ) : tournaments.length === 0 ? (
                <EmptyState
                    icon={search ? Search : Trophy}
                    title={search ? t("no_results_title") : t("no_results_empty")}
                    description={search ? t("no_results_query", { query: search }) : undefined}
                    className="bg-card"
                />
            ) : (
                <div className="space-y-20">
                    {activeTournaments.length > 0 && (
                        <div className="space-y-8">
                            {!onlyActive && (
                                <div className="flex items-center gap-6 mb-12">
                                    <div className="h-4 w-4 bg-primary shadow-[0_0_15px_rgba(0,196,154,0.4)]" />
                                    <h2 className="text-4xl font-black tracking-tighter text-foreground">{t("active_tournaments")}</h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                {activeTournaments.map((tournament) => (
                                    <PublicTournamentCard key={tournament.id} tournament={tournament} />
                                ))}
                            </div>
                        </div>
                    )}

                    {!onlyActive && completedTournaments.length > 0 && (
                        <div className="space-y-4 md:space-y-6">
                            <div className="flex items-center gap-4 md:gap-6">
                                <h2 className="text-3xl font-black tracking-tighter text-muted-foreground/40">{t("completed_tournaments")}</h2>
                                <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                                {completedTournaments.map((tournament) => (
                                    <PublicTournamentCard key={tournament.id} tournament={tournament} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
