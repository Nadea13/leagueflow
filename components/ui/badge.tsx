import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center px-2 py-0.5 border rounded-full gap-1 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shrink-0",
    {
        variants: {
            variant: {
                default:
                    "bg-primary/10 text-primary border-primary/40",
                secondary:
                    "bg-muted text-muted-foreground border-border",
                destructive:
                    "bg-destructive/10 text-destructive border-destructive/40",
                warning:
                    "bg-warning/10 text-warning border-warning/40",
                success:
                    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
                outline:
                    "text-foreground border-border bg-muted/30",
            },
            size: {
                default: "px-2 py-0.5 text-xs font-bold",
                sm: "px-1.5 py-0 text-xs font-bold",
                lg: "px-2.5 py-1 text-xs font-bold",
            }
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, size, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
