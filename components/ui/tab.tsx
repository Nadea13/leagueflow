"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

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
}: TabProps<T>) {
  const autoLayoutId = React.useId();
  const activePillId = layoutId || `tabPill-${autoLayoutId}`;

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

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            title={option.label}
            className={cn(
              "relative flex items-center justify-center rounded-sm font-bold transition-all duration-300 cursor-pointer select-none tracking-tight whitespace-nowrap z-10 outline-none focus:outline-none focus-visible:outline-none",
              isIconOnly ? iconOnlySizeClasses[size] : sizeClasses[size],
              fullWidth && !isIconOnly ? "flex-1" : "flex-none",
              isActive
                ? cn("text-primary-foreground shadow-md shadow-primary/20", activeClassName)
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              itemClassName
            )}
          >
            {isActive && (
              <motion.div
                layoutId={activePillId}
                className="absolute inset-0 bg-primary rounded-sm -z-10 pointer-events-none"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            {showIcons && Icon && <Icon className="h-4 w-4 shrink-0" />}
            {showLabels && <span>{option.label}</span>}
            {option.badge !== undefined && (
              <span
                className={cn(
                  "ml-1 text-[10px] font-black px-1.5 py-0.2 rounded-xs transition-colors",
                  isActive
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
