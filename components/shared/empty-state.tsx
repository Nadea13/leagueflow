import { Trophy, LucideIcon } from "lucide-react";
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

    // We can still use the icon logic if we want a default icon
    const DefaultIcon = Trophy;
    const Icon = IconProp || DefaultIcon;
    
    const displayTitle = title || t("no_tournaments");
    const displayDescription = description || t("no_tournaments_desc");

    return (
        <div className={cn(
            "flex min-h-[400px] flex-col items-center justify-center text-center animate-in fade-in-50 relative overflow-hidden group",
            className
        )}>
            <div className="mb-4 relative z-10">
                <Icon className="h-6 w-6 text-primary " />
            </div>

            <h3 className="text-xl font-black tracking-tight relative z-10">
                {displayTitle}
            </h3>
            <p className="text-xs font-bold text-muted-foreground/60 max-w-sm flex items-center gap-2 relative z-10">
                {displayDescription}
            </p>
            {action && (
                <div className="relative z-10">
                    {action}
                </div>
            )}
        </div>
    );
}
