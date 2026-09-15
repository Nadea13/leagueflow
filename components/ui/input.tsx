import * as React from "react"

import { cn } from "@/lib/utils"

interface InputProps extends Omit<React.ComponentProps<"input">, "size"> {
  size?: "default" | "sm"
}

function Input({ className, type, size = "default", ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(
        "rounded-sm placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground w-full min-w-0 border transition-all duration-500 outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 font-medium",
        size === "sm"
          ? "px-2 py-1 h-8 text-xs font-semibold"
          : "px-2 md:px-3 py-2 h-8 lg:h-10 text-base md:text-sm",
        "bg-[linear-gradient(var(--color-primary),var(--color-primary))] bg-[length:0%_2px] bg-no-repeat bg-[position:bottom_left] focus-visible:bg-[length:100%_2px]",
        "focus:border-border focus:ring-0 focus:bg-muted/5",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }

