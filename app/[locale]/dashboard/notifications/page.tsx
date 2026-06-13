"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Bell, Check, X, Clock, ShieldCheck, Mail, Phone } from "lucide-react";
import { 
    getAllUserInvites, 
    acceptInvite, 
    rejectInvite, 
    getUserRegistrations, 
    getUserTeamManagementRequests,
    getIncomingTeamManagementRequests,
    approveTeamManagementRequest,
    rejectTeamManagementRequest
} from "@/actions/tournaments/staff";
import { EmptyState } from "@/components/shared/empty-state";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

import { useRouter } from "next/navigation";

type NotificationItem =
    | {
        type: 'invite';
        id: string;
        tournament_id: string;
        tournament_name?: string;
        role: string;
        status: 'pending' | 'accepted' | 'rejected';
        created_at: string;
    }
    | {
        type: 'registration';
        id: string;
        team_id: string;
        team_name: string;
        tournament_name: string;
        registration_status: 'pending' | 'approved' | 'rejected';
        payment_status: 'pending' | 'paid' | 'waived' | 'failed';
        created_at: string;
    }
    | {
        type: 'team_request';
        id: string;
        team_name: string;
        status: 'pending' | 'approved' | 'rejected';
        created_at: string;
    }
    | {
        type: 'incoming_team_request';
        id: string;
        team_id: string;
        team_name: string;
        requester_name: string;
        requester_email: string;
        contact_phone: string;
        message: string | null;
        status: 'pending' | 'approved' | 'rejected';
        created_at: string;
    };

export default function NotificationsPage() {
    const router = useRouter();
    const t = useTranslations("Collaborators");
    const tCommon = useTranslations("Common");
    const tReg = useTranslations("Registration");
    const locale = useLocale();
    const { toast } = useToast();

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [actionState, setActionState] = useState<Record<string, 'accepted' | 'rejected' | 'error' | null>>({});

    const loadData = async () => {
        const [invitesRes, regsRes, mgmtReqsRes, incomingReqsRes] = await Promise.all([
            getAllUserInvites(),
            getUserRegistrations(),
            getUserTeamManagementRequests(),
            getIncomingTeamManagementRequests()
        ]);

        const combined: NotificationItem[] = [];

        if (invitesRes.success && invitesRes.data) {
            combined.push(...invitesRes.data.map(item => ({
                ...item,
                type: 'invite' as const
            })));
        }

        if (regsRes.success && regsRes.data) {
            combined.push(...regsRes.data.map(item => ({
                ...item,
                type: 'registration' as const
            })));
        }

        if (mgmtReqsRes.success && mgmtReqsRes.data) {
            combined.push(...mgmtReqsRes.data.map(item => ({
                ...item,
                type: 'team_request' as const
            })));
        }

        if (incomingReqsRes.success && incomingReqsRes.data) {
            combined.push(...incomingReqsRes.data.map(item => ({
                ...item,
                type: 'incoming_team_request' as const
            })));
        }

        // Sort by created_at DESC
        combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setNotifications(combined);
        setIsLoading(false);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData();
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    const handleAccept = async (tournamentId: string, inviteId: string) => {
        startTransition(async () => {
            const res = await acceptInvite(tournamentId);
            if (res.success) {
                setActionState(prev => ({ ...prev, [inviteId]: 'accepted' }));
                toast({
                    title: "Accepted Invitation",
                    description: "You are now a collaborator on this tournament.",
                });
            } else {
                setActionState(prev => ({ ...prev, [inviteId]: 'error' }));
                toast({
                    title: "Error",
                    description: res.error || "Failed to accept the invitation.",
                    variant: "destructive",
                });
            }
        });
    };

    const handleReject = async (tournamentId: string, inviteId: string) => {
        startTransition(async () => {
            const res = await rejectInvite(tournamentId);
            if (res.success) {
                setActionState(prev => ({ ...prev, [inviteId]: 'rejected' }));
                toast({
                    title: "Declined Invitation",
                    description: "You have declined the invitation.",
                });
            } else {
                setActionState(prev => ({ ...prev, [inviteId]: 'error' }));
                toast({
                    title: "Error",
                    description: res.error || "Failed to decline the invitation.",
                    variant: "destructive",
                });
            }
        });
    };

    const handleApproveTeamRequest = async (requestId: string) => {
        startTransition(async () => {
            const res = await approveTeamManagementRequest(requestId);
            if (res.success) {
                setActionState(prev => ({ ...prev, [requestId]: 'accepted' }));
                toast({
                    title: isTh ? "อนุมัติคำขอสำเร็จ" : "Request Approved",
                    description: isTh ? "ผู้ใช้ได้รับสิทธิ์จัดการทีมเรียบร้อยแล้ว" : "The user now has rights to manage the team.",
                });
                // Reload list to get fresh status from db
                loadData();
            } else {
                setActionState(prev => ({ ...prev, [requestId]: 'error' }));
                toast({
                    title: "Error",
                    description: res.error || "Failed to approve the request.",
                    variant: "destructive",
                });
            }
        });
    };

    const handleRejectTeamRequest = async (requestId: string) => {
        startTransition(async () => {
            const res = await rejectTeamManagementRequest(requestId);
            if (res.success) {
                setActionState(prev => ({ ...prev, [requestId]: 'rejected' }));
                toast({
                    title: isTh ? "ปฏิเสธคำขอสำเร็จ" : "Request Rejected",
                    description: isTh ? "ปฏิเสธคำขอจัดการทีมเรียบร้อยแล้ว" : "The team management request has been rejected.",
                });
                // Reload list to get fresh status from db
                loadData();
            } else {
                setActionState(prev => ({ ...prev, [requestId]: 'error' }));
                toast({
                    title: "Error",
                    description: res.error || "Failed to reject the request.",
                    variant: "destructive",
                });
            }
        });
    };

    const getStatusText = (status: string) => {
        if (status === 'approved') return tCommon("approved") || "Approved";
        if (status === 'rejected') return tCommon("rejected") || "Rejected";
        return tCommon("pending") || "Pending";
    };

    const isTh = locale === "th";

    return (
        <div className="flex flex-col gap-2 md:gap-4 max-w-4xl mx-auto">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                        Notifications
                    </h1>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : notifications.length === 0 ? (
                <EmptyState
                    title={t("no_pending_invites") || "No new notifications"}
                    description={t("pending_invites_desc") || "You're all caught up!"}
                    icon={Bell}
                    action={<div />}
                />
            ) : (
                <div className="space-y-2 md:space-y-4">
                    {notifications.map((item) => {
                        if (item.type === 'invite') {
                            const currentStatus = actionState[item.id] || item.status;

                            return (
                                <Card
                                    key={item.id}
                                    className="bg-card transition-all overflow-hidden border rounded-sm group/item"
                                >
                                    <CardContent className="p-2 md:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 border rounded-full group-hover/item:border-primary/30 transition-all shrink-0 p-1 bg-muted/30 flex items-center justify-center">
                                                <div className={`w-full h-full rounded-full flex items-center justify-center ${currentStatus === 'accepted' ? 'bg-primary/10 text-primary' :
                                                        currentStatus === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                                                    }`}>
                                                    <Bell className="h-4 w-4" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium leading-relaxed">
                                                    You have been invited to join <span className="font-black text-foreground">{item.tournament_name || "Unknown Tournament"}</span> as <span className="font-black text-foreground">{item.role?.replace('_', ' ')}</span>
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-muted-foreground/50 font-bold tracking-widest block">
                                                        Tournament Invitation
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground/30 font-bold">•</span>
                                                    <span className="text-[10px] text-muted-foreground/50 font-medium">
                                                        {new Date(item.created_at).toLocaleString(isTh ? 'th-TH' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 md:gap-2">
                                            {currentStatus === 'accepted' ? (
                                                <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 font-bold px-2 py-0.5 rounded text-[10px]">
                                                    <span>Accepted</span>
                                                </Badge>
                                            ) : currentStatus === 'rejected' ? (
                                                <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10 border-destructive/20 font-bold px-2 py-0.5 rounded text-[10px]">
                                                    <span>Declined</span>
                                                </Badge>
                                            ) : currentStatus === 'error' ? (
                                                <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10 border-destructive/20 font-bold px-2 py-0.5 rounded text-[10px]">
                                                    <span>Error occurred</span>
                                                </Badge>
                                            ) : (
                                                <div className="flex items-center gap-1 md:gap-2">
                                                    <Button
                                                        variant="destructive"
                                                        onClick={() => handleReject(item.tournament_id, item.id)}
                                                        disabled={isPending}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleAccept(item.tournament_id, item.id)}
                                                        disabled={isPending}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                        Accept
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        } else if (item.type === 'registration') {
                            // Registration Notification
                            const regStatus = item.registration_status;
                            return (
                                <Card
                                    key={item.id}
                                    className="bg-card transition-all overflow-hidden border rounded-sm group/item cursor-pointer"
                                    onClick={() => router.push(`/${locale}/dashboard/tournament-teams/${item.id}`)}
                                >
                                    <CardContent className="p-2 md:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 border rounded-full group-hover/item:border-primary/30 transition-all shrink-0 p-1 flex items-center justify-center">
                                                <div className={`w-full h-full rounded-full flex items-center justify-center ${regStatus === 'approved' ? 'bg-primary/10 text-primary' :
                                                        regStatus === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                                                    }`}>
                                                    {regStatus === 'approved' ? (
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    ) : regStatus === 'rejected' ? (
                                                        <XCircle className="h-4 w-4" />
                                                    ) : (
                                                        <Clock className="h-4 w-4" />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                {isTh ? (
                                                    <p className="text-sm font-medium leading-relaxed">
                                                        การสมัครของทีม <span className="font-black text-foreground">{item.team_name}</span> ในรายการ <span className="font-black text-foreground">{item.tournament_name}</span> ได้รับการ <span className="font-black text-foreground">{getStatusText(regStatus)}</span>
                                                    </p>
                                                ) : (
                                                    <p className="text-sm font-medium leading-relaxed">
                                                        Registration for team <span className="font-black text-foreground">{item.team_name}</span> in <span className="font-black text-foreground">{item.tournament_name}</span> is <span className="font-black text-foreground">{getStatusText(regStatus)}</span>
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-1 md:gap-2">
                                                    <span className="text-[10px] text-muted-foreground/50 font-bold tracking-widest block">
                                                        {tReg("nav_team_registration") || "Team Registration"}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground/30 font-bold">•</span>
                                                    <span className="text-[10px] text-muted-foreground/50 font-medium">
                                                        {new Date(item.created_at).toLocaleString(isTh ? 'th-TH' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 md:gap-2">
                                            {regStatus === 'approved' ? (
                                                <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 font-bold px-2 py-0.5 rounded text-[10px]">
                                                    {getStatusText(regStatus)}
                                                </Badge>
                                            ) : regStatus === 'rejected' ? (
                                                <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10 border-destructive/20 font-bold px-2 py-0.5 rounded text-[10px]">
                                                    {getStatusText(regStatus)}
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-warning/10 text-warning hover:bg-warning/10 border-warning/20 font-bold px-2 py-0.5 rounded text-[10px]">
                                                    {getStatusText(regStatus)}
                                                </Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        } else if (item.type === 'team_request') {
                            // Team Management Request Notification (Own Claims)
                            const reqStatus = item.status;
                            return (
                                <Card
                                    key={item.id}
                                    className="bg-card transition-all overflow-hidden border rounded-sm group/item"
                                >
                                    <CardContent className="p-2 md:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 border rounded-full group-hover/item:border-primary/30 transition-all shrink-0 p-1 bg-muted/30 flex items-center justify-center">
                                                <div className={`w-full h-full rounded-full flex items-center justify-center ${reqStatus === 'approved' ? 'bg-primary/10 text-primary' :
                                                        reqStatus === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-500'
                                                    }`}>
                                                    <ShieldCheck className="h-4 w-4" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                {isTh ? (
                                                    <p className="text-sm font-medium leading-relaxed">
                                                        คำขอสิทธิ์การจัดการทีม <span className="font-black text-foreground">{item.team_name}</span> {reqStatus === 'approved' ? 'ได้รับการอนุมัติแล้ว' : reqStatus === 'rejected' ? 'ถูกปฏิเสธ' : 'กำลังรอการอนุมัติ'}
                                                    </p>
                                                ) : (
                                                    <p className="text-sm font-medium leading-relaxed">
                                                        Team management request for <span className="font-black text-foreground">{item.team_name}</span> is <span className="font-black text-foreground">{getStatusText(reqStatus)}</span>
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-1 md:gap-2">
                                                    <span className="text-[10px] text-muted-foreground/50 font-bold tracking-widest block">
                                                        {isTh ? 'ขอสิทธิ์การจัดการทีม (ส่งคำขอ)' : 'Team Management Request (Sent)'}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground/30 font-bold">•</span>
                                                    <span className="text-[10px] text-muted-foreground/50 font-medium">
                                                        {new Date(item.created_at).toLocaleString(isTh ? 'th-TH' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 md:gap-2">
                                            {reqStatus === 'approved' ? (
                                                <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 font-bold px-2 py-0.5 rounded text-[10px]">
                                                    {getStatusText(reqStatus)}
                                                </Badge>
                                            ) : reqStatus === 'rejected' ? (
                                                <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10 border-destructive/20 font-bold px-2 py-0.5 rounded text-[10px]">
                                                    {getStatusText(reqStatus)}
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border-amber-500/20 font-bold px-2 py-0.5 rounded text-[10px]">
                                                    {getStatusText(reqStatus)}
                                                </Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        } else {
                            // Incoming Team Management Request Notification (For Organizer/Collaborator)
                            const currentStatus = actionState[item.id] || item.status;
                            return (
                                <Card
                                    key={item.id}
                                    className="bg-card transition-all overflow-hidden border rounded-sm group/item"
                                >
                                    <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 border rounded-full group-hover/item:border-primary/30 transition-all shrink-0 p-1 bg-muted/30 flex items-center justify-center">
                                                <div className={`w-full h-full rounded-full flex items-center justify-center ${currentStatus === 'approved' || currentStatus === 'accepted' ? 'bg-primary/10 text-primary' :
                                                        currentStatus === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                                                    }`}>
                                                    <ShieldCheck className="h-4 w-4" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                {isTh ? (
                                                    <p className="text-sm font-medium leading-relaxed">
                                                        <span className="font-black text-foreground">{item.requester_name}</span> ขอสิทธิ์การจัดการทีม <span className="font-black text-foreground">{item.team_name}</span>
                                                    </p>
                                                ) : (
                                                    <p className="text-sm font-medium leading-relaxed">
                                                        <span className="font-black text-foreground">{item.requester_name}</span> is requesting management rights for team <span className="font-black text-foreground">{item.team_name}</span>
                                                    </p>
                                                )}
                                                
                                                <div className="flex flex-col gap-1 text-[12px] text-muted-foreground mt-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <Mail className="h-3 w-3 shrink-0" />
                                                        <span>{item.requester_email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone className="h-3 w-3 shrink-0" />
                                                        <span>{item.contact_phone}</span>
                                                    </div>
                                                    {item.message && (
                                                        <div className="bg-muted/50 p-2 rounded-sm italic border-l-2 border-primary/20 text-xs mt-1">
                                                            &ldquo;{item.message}&rdquo;
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 md:gap-2 pt-1">
                                                    <span className="text-[10px] text-muted-foreground/50 font-bold tracking-widest block">
                                                        {isTh ? 'คำขอสิทธิ์การจัดการทีม (รออนุมัติ)' : 'Incoming Team Management Request'}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground/30 font-bold">•</span>
                                                    <span className="text-[10px] text-muted-foreground/50 font-medium">
                                                        {new Date(item.created_at).toLocaleString(isTh ? 'th-TH' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 md:gap-2 shrink-0">
                                            {currentStatus === 'approved' || currentStatus === 'accepted' ? (
                                                <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 font-bold px-2 py-0.5 rounded text-[10px]">
                                                    {isTh ? "อนุมัติแล้ว" : "Approved"}
                                                </Badge>
                                            ) : currentStatus === 'rejected' ? (
                                                <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10 border-destructive/20 font-bold px-2 py-0.5 rounded text-[10px]">
                                                    {isTh ? "ปฏิเสธแล้ว" : "Rejected"}
                                                </Badge>
                                            ) : currentStatus === 'error' ? (
                                                <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10 border-destructive/20 font-bold px-2 py-0.5 rounded text-[10px]">
                                                    <span>Error occurred</span>
                                                </Badge>
                                            ) : (
                                                <div className="flex items-center gap-1 md:gap-2">
                                                    <Button
                                                        variant="destructive"
                                                        onClick={() => handleRejectTeamRequest(item.id)}
                                                        disabled={isPending}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleApproveTeamRequest(item.id)}
                                                        disabled={isPending}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                        {isTh ? "อนุมัติ" : "Approve"}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        }
                    })}
                </div>
            )}
        </div>
    );
}

