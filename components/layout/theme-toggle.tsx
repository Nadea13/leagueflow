"use client"

import * as React from "react"
import { Moon, Sun, Check, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

import { Button, buttonVariants } from "@/components/ui/button"
import { type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import {
    ActionMenu,
    ActionMenuContent,
    ActionMenuItem,
    ActionMenuTrigger,
} from "@/components/ui/action-menu"

interface ThemeToggleProps {
    variant?: VariantProps<typeof buttonVariants>["variant"];
    size?: VariantProps<typeof buttonVariants>["size"];
    className?: string;
}

export function ThemeToggle({
    variant = "outline",
    size = "icon",
    className,
}: ThemeToggleProps = {}) {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <ActionMenu>
            <ActionMenuTrigger asChild>
                <Button variant={variant} size={size} className={cn("relative", variant === "outline" && "bg-background/50 backdrop-blur-sm", className)}>
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </ActionMenuTrigger>
            <ActionMenuContent align="end" className="min-w-[150px] rounded-sm">
                <ActionMenuItem onClick={() => setTheme("light")} className="flex items-center justify-between rounded">
                    <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        <span>Light</span>
                    </div>
                    {mounted && theme === "light" && <Check className="h-4 w-4" />}
                </ActionMenuItem>
                <ActionMenuItem onClick={() => setTheme("dark")} className="flex items-center justify-between rounded">
                    <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        <span>Dark</span>
                    </div>
                    {mounted && theme === "dark" && <Check className="h-4 w-4" />}
                </ActionMenuItem>
                <ActionMenuItem onClick={() => setTheme("system")} className="flex items-center justify-between rounded">
                    <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        <span>System</span>
                    </div>
                    {mounted && theme === "system" && <Check className="h-4 w-4" />}
                </ActionMenuItem>
            </ActionMenuContent>
        </ActionMenu>
    )
}
