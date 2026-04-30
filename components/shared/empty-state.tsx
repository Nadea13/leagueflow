import { Trophy, Users, LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    title?: string;
    description?: string;
    icon?: LucideIcon;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ 
    title, 
    description, 
    icon: IconProp, 
    action, 
    className,
}: EmptyStateProps) {
    const t = useTranslations("Common");
    const tTeam = useTranslations("Team");

    // We can still use the icon logic if we want a default icon
    const DefaultIcon = Trophy;
    const Icon = IconProp || DefaultIcon;
    
    const displayTitle = title || t("no_tournaments");
    const displayDescription = description || t("no_tournaments_desc");

    return (
        <div className={cn(
            "flex min-h-[400px] flex-col items-center justify-center rounded-none border border-border bg-muted/5 p-8 text-center animate-in fade-in-50 relative overflow-hidden group",
            className
        )}>
            <div className="p-8 bg-background border border-border rotate-12 transition-transform group-hover:rotate-0 mb-6 relative z-10">
                <Icon className="h-12 w-12 text-muted-foreground opacity-30 -rotate-12 group-hover:rotate-0 transition-transform" />
            </div>

            <h3 className="text-2xl font-black tracking-tight mb-2 relative z-10">
                {displayTitle}
            </h3>
            <p className="text-[11px] font-bold text-muted-foreground/60 max-w-sm mb-8 flex items-center gap-2 relative z-10">
                <span className="w-4 h-[1px] bg-muted-foreground/30" />
                {displayDescription}
                <span className="w-4 h-[1px] bg-muted-foreground/30" />
            </p>
            {action && (
                <div className="relative z-10">
                    {action}
                </div>
            )}
        </div>
    );
}
