"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { LucideIcon, ChevronRight } from "lucide-react";

export interface TabOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
}

interface TabProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  itemClassName?: string;
  activeClassName?: string;
  showIcons?: boolean;
  showLabels?: boolean;
  fullWidth?: boolean;
  orientation?: "horizontal" | "vertical";
  layoutId?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "sidebar";
}

export function Tab<T extends string>({
  options,
  value,
  onChange,
  className,
  itemClassName,
  activeClassName,
  showIcons = true,
  showLabels = true,
  fullWidth = false,
  orientation = "horizontal",
  layoutId,
  size = "sm",
  variant = "default",
}: TabProps<T>) {
  const autoLayoutId = React.useId();
  const activePillId = layoutId || `tabPill-${autoLayoutId}`;
  const isSidebar = variant === "sidebar";

  const sizeClasses = {
    sm: "h-8 px-3 gap-1.5 text-xs sm:text-sm",
    default: "h-9 px-4 gap-2 text-sm",
    lg: "h-10 px-5 gap-2 text-base",
  };

  const iconOnlySizeClasses = {
    sm: "h-8 w-8 p-0 aspect-square",
    default: "h-9 w-9 p-0 aspect-square",
    lg: "h-10 w-10 p-0 aspect-square",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-0 h-auto overflow-x-auto overflow-y-hidden max-w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-none py-0.5",
        orientation === "vertical" ? "flex-col items-stretch overflow-x-hidden py-0" : "flex-row",
        className
      )}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        const Icon = option.icon;
        const isIconOnly = Boolean(showIcons && Icon && (!showLabels || !option.label) && option.badge === undefined);
        const isDanger = option.value === 'danger' || option.value === 'delete';

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            title={option.label}
            className={cn(
              "relative flex items-center justify-center rounded-sm font-medium transition-all duration-300 cursor-pointer select-none tracking-tight whitespace-nowrap z-10 outline-none focus:outline-none focus-visible:outline-none group",
              isIconOnly ? iconOnlySizeClasses[size] : sizeClasses[size],
              fullWidth && !isIconOnly ? "flex-1" : "flex-none",
              isSidebar
                ? isActive
                  ? isDanger
                    ? cn("bg-destructive/10 text-destructive font-semibold", activeClassName)
                    : cn("bg-primary/10 text-primary font-semibold", activeClassName)
                  : isDanger
                  ? "text-destructive/80 hover:text-destructive"
                  : "text-muted-foreground hover:text-primary"
                : isActive
                ? cn("text-primary-foreground shadow-md shadow-primary/20", activeClassName)
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              itemClassName
            )}
          >
            {isActive && (
              <motion.div
                layoutId={activePillId}
                className={cn(
                  "absolute inset-0 rounded-sm -z-10 pointer-events-none",
                  isSidebar
                    ? isDanger ? "bg-destructive/10" : "bg-primary/10"
                    : "bg-primary shadow-md shadow-primary/20"
                )}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            {showIcons && Icon && (
              <Icon className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isSidebar
                  ? isActive
                    ? isDanger ? "text-destructive" : "text-primary"
                    : isDanger ? "text-destructive/80 group-hover:text-destructive" : "text-muted-foreground group-hover:text-primary"
                  : ""
              )} />
            )}
            {showLabels && <span className={cn(isSidebar && orientation === "vertical" ? "flex-1 text-left" : "")}>{option.label}</span>}
            {isSidebar && orientation === "vertical" && (
              <ChevronRight className={cn(
                "size-4 ml-auto transition-transform hidden sm:block",
                isActive
                  ? isDanger ? "text-destructive opacity-100 translate-x-0.5" : "text-primary opacity-100 translate-x-0.5"
                  : "opacity-0"
              )} />
            )}
            {option.badge !== undefined && (
              <span
                className={cn(
                  "ml-1 text-[10px] font-black px-1.5 py-0.2 rounded-xs transition-colors",
                  isSidebar
                    ? isActive
                      ? isDanger ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                    : isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
