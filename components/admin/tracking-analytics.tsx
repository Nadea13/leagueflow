"use client";

import { useMemo } from "react";
import { AuditLog } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, TrendingUp, MousePointer2, Eye, Clock, Users } from "lucide-react";
import { formatDate } from "@/lib/date";

interface TrackingAnalyticsProps {
    logs: AuditLog[];
}

export function TrackingAnalytics({ logs }: TrackingAnalyticsProps) {
    // 1. Activity by Day (Last 7 Days)
    const dailyActivity = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const counts = new Map<string, number>();
        last7Days.forEach(day => counts.set(day, 0));

        logs.forEach(log => {
            const day = log.created_at.split('T')[0];
            if (counts.has(day)) {
                counts.set(day, (counts.get(day) || 0) + 1);
            }
        });

        const max = Math.max(...Array.from(counts.values()), 1);
        return Array.from(counts.entries()).map(([day, count]) => ({
            day: formatDate(day, 'MMM d'),
            count,
            percentage: (count / max) * 100
        }));
    }, [logs]);

    // 2. Top Features
    const topFeatures = useMemo(() => {
        const counts = new Map<string, number>();
        logs.filter(l => l.action === 'FEATURE_CLICK').forEach(log => {
            const name = (log.details as any)?.feature_name || 'Unknown';
            counts.set(name, (counts.get(name) || 0) + 1);
        });

        const sorted = Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        const max = Math.max(...sorted.map(s => s[1]), 1);
        return sorted.map(([name, count]) => ({
            name,
            count,
            percentage: (count / max) * 100
        }));
    }, [logs]);

    // 3. Top Pages
    const topPages = useMemo(() => {
        const counts = new Map<string, number>();
        logs.filter(l => l.action === 'PAGE_VIEW').forEach(log => {
            const path = (log.details as any)?.path || '/';
            counts.set(path, (counts.get(path) || 0) + 1);
        });

        const sorted = Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        const max = Math.max(...sorted.map(s => s[1]), 1);
        return sorted.map(([path, count]) => ({
            path,
            count,
            percentage: (count / max) * 100
        }));
    }, [logs]);

    // 4. Hourly Distribution
    const hourlyActivity = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const counts = new Array(24).fill(0);

        logs.forEach(log => {
            const hour = new Date(log.created_at).getHours();
            counts[hour]++;
        });

        const max = Math.max(...counts, 1);
        return hours.map(hour => ({
            hour: `${hour}:00`,
            count: counts[hour],
            percentage: (counts[hour] / max) * 100
        }));
    }, [logs]);

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Daily Activity Chart */}
            <Card className="col-span-2 border border-border bg-card shadow-sm overflow-hidden">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-bold uppercase tracking-wider">Activity Over Time (Last 7 Days)</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] flex items-end justify-between gap-2 mt-4">
                        {dailyActivity.map((item, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                <div className="relative w-full flex justify-center">
                                    <div 
                                        className="w-full max-w-[40px] bg-primary/20 rounded-t-sm transition-all duration-500 ease-out group-hover:bg-primary/40 relative overflow-hidden"
                                        style={{ height: `${Math.max(item.percentage, 5)}%` }}
                                    >
                                        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                                        {item.count > 0 && (
                                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                {item.count}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.day}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Top Features Chart */}
            <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <MousePointer2 className="h-4 w-4 text-emerald-500" />
                        <CardTitle className="text-sm font-bold uppercase tracking-wider">Most Used Features</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    {topFeatures.length > 0 ? topFeatures.map((item, i) => (
                        <div key={i} className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                                <span className="truncate max-w-[200px]">{item.name}</span>
                                <span>{item.count} clicks</span>
                            </div>
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-emerald-500 transition-all duration-700 ease-out" 
                                    style={{ width: `${item.percentage}%` }}
                                />
                            </div>
                        </div>
                    )) : (
                        <div className="h-32 flex items-center justify-center text-xs text-muted-foreground italic">No feature clicks yet</div>
                    )}
                </CardContent>
            </Card>

            {/* Top Pages Chart */}
            <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-blue-500" />
                        <CardTitle className="text-sm font-bold uppercase tracking-wider">Most Visited Pages</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    {topPages.length > 0 ? topPages.map((item, i) => (
                        <div key={i} className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                                <span className="truncate max-w-[200px]">{item.path}</span>
                                <span>{item.count} views</span>
                            </div>
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500 transition-all duration-700 ease-out" 
                                    style={{ width: `${item.percentage}%` }}
                                />
                            </div>
                        </div>
                    )) : (
                        <div className="h-32 flex items-center justify-center text-xs text-muted-foreground italic">No page views yet</div>
                    )}
                </CardContent>
            </Card>

            {/* Peak Hours Heatmap */}
            <Card className="col-span-2 border border-border bg-card shadow-sm">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <CardTitle className="text-sm font-bold uppercase tracking-wider">Daily Activity Peak Hours</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="grid grid-cols-12 md:grid-cols-24 gap-1 h-8">
                        {hourlyActivity.map((item, i) => (
                            <div 
                                key={i} 
                                className="h-full rounded-[2px] transition-all hover:scale-110 relative group"
                                style={{ 
                                    backgroundColor: `rgba(var(--primary-rgb, 59, 130, 246), ${Math.max(item.percentage / 100, 0.05)})`,
                                    border: item.percentage > 50 ? '1px solid rgba(var(--primary-rgb), 0.3)' : 'none'
                                }}
                            >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-[10px] rounded border shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap">
                                    {item.hour}: {item.count} events
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[8px] font-black uppercase text-muted-foreground tracking-tighter">
                        <span>12 AM</span>
                        <span>6 AM</span>
                        <span>12 PM</span>
                        <span>6 PM</span>
                        <span>11 PM</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
