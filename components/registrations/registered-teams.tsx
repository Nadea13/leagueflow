"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Registration } from "@/types";

interface RegisteredTeamsProps {
    userRegistrations: Registration[];
}

export function RegisteredTeams({ userRegistrations }: RegisteredTeamsProps) {
    const t = useTranslations("Registration");

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PAID': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'REJECTED': return <XCircle className="h-4 w-4 text-red-500" />;
            default: return <Clock className="h-4 w-4 text-yellow-500" />;
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'default' as const;
            case 'REJECTED': return 'destructive' as const;
            default: return 'outline' as const;
        }
    };

    return (
        <div className="bg-card border space-y-2 md:space-y-3 p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
                <CheckCircle className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-black tracking-tighter text-foreground">
                    {t("registered_teams")}
                </h2>
            </div>
            <div className="grid gap-3">
                {userRegistrations.map((reg) => (
                    <Card key={reg.id} className="border p-4 md:p-6 transition-all hover:border-primary relative overflow-hidden group rounded-none">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <h3 className="text-md font-black tracking-tight group-hover:text-primary">{reg.team_name}</h3>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={getStatusVariant(reg.payment_status)} className="rounded-none font-black text-[10px] tracking-widest">
                                            {reg.payment_status}
                                        </Badge>
                                        {getStatusIcon(reg.payment_status)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 md:gap-3 text-[10px] font-bold text-muted-foreground/60 tracking-wider">
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="h-3 w-3" />
                                        {reg.created_at ? format(new Date(reg.created_at), "PPP p") : "Unknown Date"}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {reg.tournament_team_id && (
                                    <Button variant="default" size="sm" asChild className="rounded-none font-black tracking-widest text-[10px] h-9 bg-primary text-primary-foreground hover:bg-primary/90">
                                        <Link href={`/manager/my-registrations/${reg.tournament_team_id}`}>
                                            <Users className="h-4 w-4 mr-2" />
                                            {t("edit_roster")}
                                        </Link>
                                    </Button>
                                )}
                                {reg.slip_url && (
                                    <Button variant="outline" size="sm" asChild className="rounded-none font-black tracking-widest text-[10px] h-9 border-2">
                                        <a href={reg.slip_url} target="_blank" rel="noopener noreferrer">
                                            {t("view_slip")}
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
