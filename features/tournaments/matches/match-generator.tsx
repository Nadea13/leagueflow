'use client'

import { useState } from "react"
import { generateFixtures } from "@/actions/organizer/tournaments/general"
import { Button } from "@/components/ui/button"
import { Settings2, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export function MatchGenerator({ 
  tournamentId, 
  hasFixtures, 
  format,
  className 
}: { 
  tournamentId: string, 
  hasFixtures: boolean, 
  format?: string,
  className?: string 
}) {
  const t = useTranslations("Fixtures")
  const tCommon = useTranslations("Common")
  const [isLoading, setIsLoading] = useState(false)

  const getButtonText = () => {
    if (isLoading) return tCommon("loading");
    if (!hasFixtures) return t("generate_fixtures");
    return t("reset_fixtures") || "Reset Bracket";
  };

  const handleGenerate = async () => {
    // No action performed as requested
  }

  return (
    <Button 
      onClick={handleGenerate} 
      variant="ghost"
      className={cn(
        "w-full h-12 border border-foreground/5 font-black tracking-tighter transition-all duration-300 group overflow-hidden relative",
        hasFixtures ? "bg-foreground/5 hover:bg-foreground/10 text-muted-foreground/60 hover:text-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/10",
        className
      )}
    >
      {!hasFixtures && <div className="absolute inset-0 bg-foreground/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />}
      <Settings2 className={cn("mr-2 h-4 w-4 relative z-10")} />
      <span className="relative z-10 hidden md:inline">{getButtonText()}</span>
    </Button>
  )
}
