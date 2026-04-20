import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Activity, CheckCircle, LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface StatItem {
    label: string;
    value: number | string;
    icon: LucideIcon;
    color?: string;
    description?: string;
}

interface StatsCardsProps {
    items: StatItem[];
}

export function StatsCards({ items }: StatsCardsProps) {
    const displayItems = items;

    return (
        <div className="grid gap-3 grid-cols-3 md:gap-6 md:grid-cols-3">
            {displayItems.map((item, index) => {
                // Safely handle dynamic colors
                const colorClass = item.color === 'primary' ? 'text-primary' : 
                                 item.color === 'orange-500' ? 'text-orange-500' : 'text-secondary';
                
                const bgClass = item.color === 'primary' ? 'bg-primary/5' : 
                              item.color === 'orange-500' ? 'bg-orange-500/5' : 'bg-secondary/5';
                
                const borderClass = item.color === 'primary' ? 'hover:border-primary/50' : 
                                  item.color === 'orange-500' ? 'hover:border-orange-500/50' : 'hover:border-secondary/50';

                const accentClass = item.color === 'primary' ? 'bg-primary/40' : 
                                  item.color === 'orange-500' ? 'bg-orange-500/40' : 'bg-secondary/40';

                return (
                    <Card key={index} className={cn(
                        "border border-border bg-card py-2 md:py-6 shadow-none overflow-hidden relative group transition-all",
                        borderClass
                    )}>
                        <div className={cn("absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 rotate-12 transition-transform group-hover:scale-110", bgClass)} />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                            <CardTitle className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                                {item.label}
                            </CardTitle>
                            <item.icon className={cn("h-4 w-4 opacity-80 shrink-0 hidden sm:block", colorClass)} />
                        </CardHeader>
                        <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                            <div className="text-2xl md:text-5xl font-black tracking-tighter italic leading-none">
                                {item.value}
                            </div>
                            {item.description && (
                                <p className="hidden md:flex text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                                    <span className={cn("w-2 h-[1px]", accentClass)} />
                                    {item.description}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

