"use client";

import { Match } from "@/types/index";
import { useState, useMemo } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface FixtureCalendarProps {
    matches: Match[];
}

export function FixtureCalendar({ matches }: FixtureCalendarProps) {


    // Find initial month from matches or use current
    const initialDate = useMemo(() => {
        const matchWithDate = matches.find(m => m.match_date);
        if (matchWithDate?.match_date) {
            return new Date(matchWithDate.match_date);
        }
        return new Date();
    }, [matches]);

    const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
    const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    const matchesByDate = useMemo(() => {
        const map: Record<string, Match[]> = {};
        matches.forEach(match => {
            if (match.match_date) {
                const dateKey = match.match_date.split('T')[0];
                if (!map[dateKey]) map[dateKey] = [];
                map[dateKey].push(match);
            }
        });
        return map;
    }, [matches]);

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

    const days = [];
    // Add empty cells for days before the first day
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
        days.push(d);
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold text-lg">{monthName}</h3>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((day, idx) => {
                    if (day === null) {
                        return <div key={`empty-${idx}`} className="min-h-[80px]" />;
                    }
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayMatches = matchesByDate[dateStr] || [];
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;

                    return (
                        <div
                            key={day}
                            className={cn(
                                "min-h-[80px] p-1 border rounded-none text-xs",
                                isToday && "border-primary bg-primary/5",
                                dayMatches.length > 0 && "bg-muted/30"
                            )}
                        >
                            <span className={cn(
                                "font-medium text-xs",
                                isToday && "text-primary font-bold"
                            )}>
                                {day}
                            </span>
                            <div className="mt-1 space-y-0.5">
                                {dayMatches.slice(0, 3).map(match => (
                                    <div
                                        key={match.id}
                                        className={cn(
                                            "px-1 py-0.5 text-[10px] truncate",
                                            match.status === 'live' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                            match.status === 'finished' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                            match.status === 'scheduled' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        )}
                                    >
                                        {match.home_team?.name?.slice(0, 3) || '?'} vs {match.away_team?.name?.slice(0, 3) || '?'}
                                        {match.status === 'finished' && ` ${match.home_score}-${match.away_score}`}
                                    </div>
                                ))}
                                {dayMatches.length > 3 && (
                                    <Badge variant="outline" className="text-[9px] h-4 w-full justify-center">
                                        +{dayMatches.length - 3} more
                                    </Badge>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Matches with no date */}
            {matches.filter(m => !m.match_date).length > 0 && (
                <div className="text-xs text-muted-foreground text-center py-2 border-t">
                    {matches.filter(m => !m.match_date).length} match(es) have no scheduled date
                </div>
            )}
        </div>
    );
}
