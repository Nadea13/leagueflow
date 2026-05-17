"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuditLog } from "@/types";
import { formatDate } from "@/lib/date";
import { useLocale } from "next-intl";
import { Search, Filter, MousePointerClick, Eye, User as UserIcon, Activity, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TrackingDashboardProps {
    initialLogs: AuditLog[];
}

interface UserGroup {
    identifier: string;
    email: string;
    ipAddress: string;
    isAnonymous: boolean;
    logs: AuditLog[];
    views: number;
    clicks: number;
    lastActive: string;
}

export function TrackingDashboard({ initialLogs }: TrackingDashboardProps) {
    const locale = useLocale();
    const router = useRouter();
    const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
    const [isConnected, setIsConnected] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const itemsPerPage = 50;

    // Update local logs when initialLogs changes (e.g. from server refresh)
    useEffect(() => {
        setLogs(initialLogs);
    }, [initialLogs]);

    // Real-time subscription
    useEffect(() => {
        const supabase = createClient();
        
        const channel = supabase
            .channel('audit-logs-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'audit_logs',
                },
                async (payload) => {
                    console.log('Real-time event received:', payload);
                    
                    if (payload.eventType === 'INSERT') {
                        const newLog = payload.new as AuditLog;
                        
                        // Try to fetch user info for the new log
                        if (newLog.user_id) {
                            const { data: profile } = await supabase
                                .from('profiles')
                                .select('email')
                                .eq('id', newLog.user_id)
                                .single();
                            
                            if (profile) {
                                newLog.user = { email: profile.email };
                            }
                        }
                        
                        setLogs((prev) => [newLog, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedLog = payload.new as AuditLog;
                        setLogs((prev) => prev.map(log => log.id === updatedLog.id ? { ...log, ...updatedLog } : log));
                    } else if (payload.eventType === 'DELETE') {
                        const oldLog = payload.old as { id: string };
                        setLogs((prev) => prev.filter(log => log.id !== oldLog.id));
                    }
                    
                    router.refresh();
                }
            )
            .subscribe((status) => {
                setIsConnected(status === 'SUBSCRIBED');
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [router]);

    // Filter only tracking-related logs
    const trackingLogs = useMemo(() => logs.filter(log => 
        log.action === 'PAGE_VIEW' || 
        log.action === 'FEATURE_CLICK' || 
        log.action === 'NAV_ITEM' || 
        log.action === 'CHANGE_DASHBOARD_MODE' ||
        log.action.startsWith('CREATE_') ||
        log.action.startsWith('UPDATE_') ||
        log.action.startsWith('DELETE_')
    ), [logs]);

    const actionTypes = Array.from(new Set(trackingLogs.map(log => log.action)));

    // Group logs by user/visitor
    const groupedUsers = useMemo(() => {
        const groups = new Map<string, UserGroup>();

        trackingLogs.forEach(log => {
            const identifier = log.user_id || log.ip_address || 'unknown';
            
            if (!groups.has(identifier)) {
                groups.set(identifier, {
                    identifier,
                    email: log.user?.email || 'Anonymous Visitor',
                    ipAddress: log.ip_address || 'Unknown IP',
                    isAnonymous: !log.user_id,
                    logs: [],
                    views: 0,
                    clicks: 0,
                    lastActive: log.created_at
                });
            }

            const group = groups.get(identifier)!;
            group.logs.push(log);
            
            if (log.action === 'PAGE_VIEW') group.views++;
            else group.clicks++;

            // Update last active if this log is more recent
            if (new Date(log.created_at) > new Date(group.lastActive)) {
                group.lastActive = log.created_at;
            }
        });

        // Sort groups by last active
        return Array.from(groups.values()).sort((a, b) => 
            new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
        );
    }, [trackingLogs]);

    // Apply search filter to the users list
    const filteredGroups = useMemo(() => {
        return groupedUsers.filter(group => 
            group.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            group.ipAddress.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [groupedUsers, searchTerm]);

    // Active selected group
    const activeGroup = selectedUser ? groupedUsers.find(g => g.identifier === selectedUser) : null;

    // Filter logs for the active group
    const filteredLogs = useMemo(() => {
        if (!activeGroup) return [];
        return activeGroup.logs.filter(log => {
            return typeFilter === "all" || log.action === typeFilter;
        });
    }, [activeGroup, typeFilter]);

    const paginatedLogs = filteredLogs.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;

    // Global Stats
    const totalViews = trackingLogs.filter(l => l.action === 'PAGE_VIEW').length;
    const totalClicks = trackingLogs.length - totalViews;
    const activeUsers = groupedUsers.length;

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-[0.1em] ${
                    isConnected 
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                }`}>
                    <div className={`w-1 h-1 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                    {isConnected ? "Real-time Live" : "Connecting..."}
                </div>
            </div>

            <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                <Card className="border border-border bg-card py-2 md:py-6 shadow-none overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/60" />
                    <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-primary/5 rotate-12 transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                        <CardTitle className="text-[10px] tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                            Total Page Views
                        </CardTitle>
                        <Eye className="h-4 w-4 text-primary opacity-80 shrink-0" />
                    </CardHeader>
                    <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                        <div className="text-3xl md:text-5xl font-black tracking-tighter leading-none">
                            {totalViews}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card py-2 md:py-6 shadow-none overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/60" />
                    <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-primary/5 rotate-12 transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                        <CardTitle className="text-[10px] tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                            Total Interactions
                        </CardTitle>
                        <MousePointerClick className="h-4 w-4 text-primary opacity-80 shrink-0" />
                    </CardHeader>
                    <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                        <div className="text-3xl md:text-5xl font-black tracking-tighter leading-none">
                            {totalClicks}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card py-2 md:py-6 shadow-none overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-accent/60" />
                    <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-accent/5 rotate-12 transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                        <CardTitle className="text-[10px] tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                            Unique Visitors
                        </CardTitle>
                        <UserIcon className="h-4 w-4 text-accent opacity-80 shrink-0" />
                    </CardHeader>
                    <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                        <div className="text-3xl md:text-5xl font-black tracking-tighter leading-none">
                            {activeUsers}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 mt-8 items-start h-[800px]">
                {/* Left Side: Users List */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4 h-full">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search user email or IP..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="border border-border bg-card overflow-y-auto flex-1 p-2 space-y-2">
                        {filteredGroups.length === 0 ? (
                            <div className="text-center p-8 text-muted-foreground text-sm">
                                No users found.
                            </div>
                        ) : (
                            filteredGroups.map(group => (
                                <div 
                                    key={group.identifier}
                                    onClick={() => {
                                        setSelectedUser(group.identifier);
                                        setPage(1);
                                    }}
                                    className={cn(
                                        "flex flex-col p-3 border cursor-pointer transition-all hover:bg-muted/30 group relative overflow-hidden",
                                        selectedUser === group.identifier 
                                            ? "border-primary bg-muted/20" 
                                            : "border-border/50"
                                    )}
                                >
                                    {selectedUser === group.identifier && (
                                        <div className="absolute left-0 top-0 w-1 h-full bg-primary shadow-[0_0_10px_rgba(0,196,154,0.5)]" />
                                    )}
                                    <div className="flex items-center justify-between pl-2">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className={cn(
                                                "h-6 w-6 flex items-center justify-center border",
                                                group.isAnonymous ? "bg-muted border-border" : "bg-primary/10 border-primary/20"
                                            )}>
                                                {group.isAnonymous ? <Activity className="h-3 w-3 text-muted-foreground" /> : <UserIcon className="h-3 w-3 text-primary" />}
                                            </div>
                                            <span className="text-sm font-bold truncate max-w-[150px]">
                                                {group.email}
                                            </span>
                                        </div>
                                        <ChevronRight className={cn(
                                            "h-4 w-4 transition-transform",
                                            selectedUser === group.identifier ? "text-primary translate-x-1" : "text-muted-foreground/30 group-hover:text-foreground"
                                        )} />
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 pl-2">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-muted-foreground">Views</span>
                                            <span className="text-xs font-mono">{group.views}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-muted-foreground">Clicks</span>
                                            <span className="text-xs font-mono">{group.clicks}</span>
                                        </div>
                                        <div className="flex flex-col ml-auto text-right">
                                            <span className="text-[9px] font-bold text-muted-foreground">Last Active</span>
                                            <span className="text-xs text-muted-foreground">{formatDate(group.lastActive, "d MMM, HH:mm", locale)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Side: Detailed Event Table */}
                <div className="w-full lg:w-2/3 flex flex-col h-full border border-border bg-card relative overflow-hidden">
                    {/* Header inside right panel */}
                    <div className="p-4 border-b border-border bg-muted/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-black tracking-tight">
                                {activeGroup ? (activeGroup.isAnonymous ? "Anonymous Details" : "User Details") : "Select a User"}
                            </h3>
                            {activeGroup && (
                                <p className="text-xs text-muted-foreground font-mono mt-1">
                                    {activeGroup.email} • {activeGroup.ipAddress}
                                </p>
                            )}
                        </div>
                        
                        {activeGroup && (
                            <Select value={typeFilter} onValueChange={(val) => {
                                setTypeFilter(val);
                                setPage(1);
                            }}>
                                <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-3 w-3" />
                                        <SelectValue placeholder="Filter events" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Events</SelectItem>
                                    {actionTypes.map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto">
                        {!activeGroup ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 opacity-50">
                                <MousePointerClick className="h-16 w-16 mb-4 opacity-20" />
                                <p className="text-sm font-bold tracking-widest">Select a user to view their journey</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                                    <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="w-[140px] text-[10px] font-black tracking-[0.15em] text-muted-foreground">Time</TableHead>
                                        <TableHead className="w-[150px] text-[10px] font-black tracking-[0.15em] text-muted-foreground">Action</TableHead>
                                        <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                No events match the filter.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedLogs.map((log) => (
                                            <TableRow key={log.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors group">
                                                <TableCell className="font-medium text-xs text-muted-foreground whitespace-nowrap align-top pt-3">
                                                    {formatDate(log.created_at, "HH:mm:ss", locale)}
                                                    <div className="text-[9px] mt-1 opacity-50">{formatDate(log.created_at, "d MMM yyyy", locale)}</div>
                                                </TableCell>
                                                <TableCell className="align-top pt-3">
                                                    <Badge variant={log.action === 'PAGE_VIEW' ? 'outline' : 'default'} className="text-[9px] px-1.5 py-0.5 h-auto font-black">
                                                        {log.action}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="align-top pt-3 pb-3">
                                                    <code className="relative bg-muted/30 px-2 py-2 font-mono text-xs text-muted-foreground block max-w-full overflow-x-auto whitespace-pre-wrap border border-border/30 group-hover:bg-muted/50 transition-colors">
                                                        {log.details ? JSON.stringify(log.details, null, 2) : '{}'}
                                                    </code>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Pagination */}
                    {activeGroup && filteredLogs.length > 0 && (
                        <div className="p-3 border-t border-border bg-muted/10 flex items-center justify-between">
                            <div className="text-[9px] tracking-wider font-bold text-muted-foreground hidden sm:block">
                                {filteredLogs.length} Events Total
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[9px] font-black"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    Prev
                                </Button>
                                <span className="text-[9px] tracking-wider font-bold text-muted-foreground px-2">Page {page} / {totalPages}</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[9px] font-black"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
