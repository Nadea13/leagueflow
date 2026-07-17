import * as React from "react"
import { cn } from "@/lib/utils"

export interface HeaderProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6
}

function Header({
  className,
  level = 3,
  ...props
}: HeaderProps) {
  const Component = `h${level}` as const

  return (
    <Component
      data-slot="header"
      className={cn(
        "text-foreground font-black tracking-tight",
        level === 1 && "text-2xl md:text-3xl tracking-tighter",
        level === 2 && "text-xl md:text-2xl tracking-tight",
        level === 3 && "text-lg md:text-xl tracking-tight",
        level === 4 && "text-base tracking-tight",
        level === 5 && "text-sm",
        level === 6 && "text-xs tracking-widest uppercase",
        className
      )}
      {...props}
    />
  )
}

export { Header }
