import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "bg-background border-input rounded-sm placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-11 w-full min-w-0 border px-2 md:px-3 py-2 h-10 text-base transition-all duration-500 outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-medium",
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
