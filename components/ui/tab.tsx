"use client";

import * as React from "react";
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
  fullWidth?: boolean;
  orientation?: "horizontal" | "vertical";
}

export function Tab<T extends string>({
  options,
  value,
  onChange,
  className,
  itemClassName,
  activeClassName,
  showIcons = true,
  fullWidth = false,
  orientation = "horizontal",
}: TabProps<T>) {
  return (
    <div
      className={cn(
        "flex p-1 bg-card gap-1 border border-border h-auto",
        orientation === "vertical" ? "flex-col" : "flex-row",
        className
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-black transition-all border-none",
              fullWidth ? "flex-1" : "flex-none",
              "text-muted-foreground hover:text-primary",
              isActive ? cn(
                "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,196,154,0.3)] hover:text-primary-foreground hover:bg-primary",
                activeClassName
              ) : "",
              itemClassName
            )}
          >
            {showIcons && Icon && <Icon className="h-3.5 w-3.5" />}
            <span>{option.label}</span>
            {option.badge !== undefined && (
              <span className={cn(
                "ml-1 opacity-50 font-bold",
                isActive ? "text-primary-foreground/60" : "text-muted-foreground/40"
              )}>
                ({option.badge})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
