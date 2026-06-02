"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { Trophy, Clock, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface Registration {
    id: string;
    team_name: string;
    logo_url: string | null;
    payment_status: string;
    created_at: string;
    tournament_id: string;
    tournament_team_id: string | null;
    slip_url: string | null;
    tournament: {
        name: string;
        format?: string;
        document_deadline?: string;
    } | null;
}

interface MyRegistrationsListProps {
    registrations: Registration[];
}

export function MyRegistrationsList({ registrations }: MyRegistrationsListProps) {
    const tCommon = useTranslations("Common");
    const locale = useLocale();

    const isApproved = (status: string) => status === 'APPROVED' || status === 'PAID';
    const isRejected = (status: string) => status === 'REJECTED';

    const getStatusVariant = (status: string) => {
        if (isApproved(status)) return 'default';
        if (isRejected(status)) return 'destructive';
        return 'default';
    };

    const getDisplayStatus = (status: string) => {
        if (isApproved(status)) return tCommon("approved") || "APPROVED";
        if (isRejected(status)) return tCommon("rejected") || "REJECTED";
        if (status === 'PENDING') return tCommon("pending") || "PENDING";
        return status;
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(locale, {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch (_e) {
            return dateStr;
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {registrations.map((reg) => (
                <Link key={reg.id} href={`/manager/my-registrations/${reg.id}`} className="block h-full group">
                    <Card className="flex flex-col h-full bg-card py-4 md:py-6 border transition-all hover:border-primary/50 overflow-hidden relative">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rotate-12 transition-transform group-hover:scale-110" />
                        <Trophy className="absolute right-4 md:right-6 z-20 h-4 w-4 text-primary" />

                        <CardHeader className="relative z-10 pb-2">
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <Badge variant={getStatusVariant(reg.payment_status)} className="font-black text-[9px] tracking-widest px-2 py-0.5 border-0 ring-1 ring-inset ring-foreground/10">
                                        {getDisplayStatus(reg.payment_status)}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 border flex items-center justify-center p-1 transition-all shrink-0 group-hover:border-primary/30">
                                        {reg.logo_url ? (
                                            <div className="relative w-full h-full">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <Image
                                                    src={reg.logo_url}
                                                    alt={reg.team_name}
                                                    width={48}
                                                    height={48}
                                                    className="object-contain"
                                                />
                                            </div>
                                        ) : (
                                            <Users className="w-6 h-6 text-muted-foreground/30 group-hover:text-primary/50" />
                                        )}
                                    </div>
                                    <CardTitle className="text-xl font-black leading-tight tracking-tighter group-hover:text-primary transition-colors truncate">
                                        {reg.team_name}
                                    </CardTitle>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="flex-1 relative z-10 px-6">
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-1 gap-2 md:gap-3 border-t group-hover:border-primary/40 pt-4">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-muted-foreground/40 tracking-[0.2em] mb-1">{tCommon("tournament")}</span>
                                        <span className="text-sm font-bold tracking-tight text-primary leading-tight line-clamp-2">
                                            {reg.tournament?.name || "Tournament Details Unavailable"}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-muted-foreground/40 tracking-[0.2em] mb-1">{tCommon("date")}</span>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3.5 w-3.5 text-primary/40 shrink-0" />
                                                <span className="text-[11px] font-black tabular-nums tracking-tight">
                                                    {formatDate(reg.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-muted-foreground/40 tracking-[0.2em] mb-1">{tCommon("format")}</span>
                                            <div className="flex items-center gap-2">
                                                <Trophy className="h-3.5 w-3.5 text-primary/40 shrink-0" />
                                                <span className="text-[11px] font-black tracking-tight">
                                                    {reg.tournament?.format || "N/A"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
