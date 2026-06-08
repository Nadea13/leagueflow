"use client";

import { memo, useEffect, useState } from "react";
import { NodeProps } from "@xyflow/react";
import { ClipboardEdit, Circle, CheckCircle2, DollarSign, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Tournament } from "@/types";

export const RegistrationNode = memo(({ data, selected }: NodeProps) => {
    const { tournamentId } = data as { tournamentId: string };
    const [tournament, setTournament] = useState<Partial<Tournament> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tournamentId) return;

        const supabase = createClient();

        async function fetchTournament() {
            try {
                const { data, error } = await supabase
                    .from("tournaments")
                    .select("is_registration_open, registration_fee, bank_name, bank_account_name, bank_account_number")
                    .eq("id", tournamentId)
                    .single();

                if (error) {
                    console.error("Error fetching tournament for RegistrationNode:", error);
                } else if (data) {
                    setTournament(data);
                }
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchTournament();

        // Subscribe to changes in the tournaments table
        const channel = supabase
            .channel(`tournament-registration-${tournamentId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "tournaments",
                    filter: `id=eq.${tournamentId}`,
                },
                (payload) => {
                    const newRecord = payload.new as Partial<Tournament>;
                    setTournament({
                        is_registration_open: newRecord.is_registration_open,
                        registration_fee: newRecord.registration_fee,
                        bank_name: newRecord.bank_name,
                        bank_account_name: newRecord.bank_account_name,
                        bank_account_number: newRecord.bank_account_number,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tournamentId]);

    const formatFee = (fee: number | null | undefined) => {
        if (fee === undefined || fee === null || fee === 0) return "Free";
        return `${Number(fee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB`;
    };

    return (
        <div className={cn(
            "relative w-[280px] border bg-card text-card-foreground transition-all rounded-sm",
            selected
                ? "border-violet-500 ring-2 ring-violet-500/30"
                : "border-border hover:border-violet-500/50"
        )}>
            {/* Header */}
            <div className="flex items-center p-2 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-violet-500 rounded flex items-center justify-center">
                        <ClipboardEdit className="h-4 w-4 text-background" />
                    </div>
                    <span className="text-xs font-black tracking-wide text-violet-500">
                        Registration Settings
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3 text-xs bg-background/30">
                {loading ? (
                    <div className="flex items-center justify-center py-4">
                        <span className="text-[10px] text-muted-foreground animate-pulse">Loading registration details...</span>
                    </div>
                ) : tournament ? (
                    <div className="space-y-2.5">
                        {/* Status Row */}
                        <div className="flex items-center justify-between border-b border-border/10 pb-2">
                            <span className="text-muted-foreground font-semibold">Status:</span>
                            {tournament.is_registration_open ? (
                                <div className="flex items-center gap-1.5 text-emerald-500 font-bold">
                                    <CheckCircle2 className="h-3.5 w-3.5 fill-emerald-500/10" />
                                    <span>Open</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-muted-foreground font-bold">
                                    <Circle className="h-3.5 w-3.5 fill-muted-foreground/10" />
                                    <span>Closed</span>
                                </div>
                            )}
                        </div>

                        {/* Fee Row */}
                        <div className="flex items-center justify-between border-b border-border/10 pb-2">
                            <span className="text-muted-foreground font-semibold flex items-center gap-1">
                                <DollarSign className="h-3.5 w-3.5 text-muted-foreground/60" />
                                Fee:
                            </span>
                            <span className="font-bold text-foreground">
                                {formatFee(tournament.registration_fee)}
                            </span>
                        </div>

                        {/* Payment Details */}
                        {tournament.is_registration_open && (
                            <div className="space-y-1.5 pt-1">
                                <span className="text-muted-foreground font-semibold flex items-center gap-1 text-[10px] tracking-wider uppercase">
                                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground/60" />
                                    Payment Info
                                </span>
                                <div className="bg-muted/30 p-2 rounded-sm space-y-1 border border-border/5">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-muted-foreground">PromptPay:</span>
                                        <span className="font-bold text-foreground">{tournament.bank_account_number || "-"}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-muted-foreground">Bank:</span>
                                        <span className="font-bold text-foreground">{tournament.bank_name || "PromptPay"}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-muted-foreground">Account:</span>
                                        <span className="font-bold text-foreground truncate max-w-[140px]" title={tournament.bank_account_name || undefined}>
                                            {tournament.bank_account_name || "-"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-2 text-destructive font-bold text-[10px]">
                        Failed to load registration details.
                    </div>
                )}
            </div>
        </div>
    );
});

RegistrationNode.displayName = "RegistrationNode";
