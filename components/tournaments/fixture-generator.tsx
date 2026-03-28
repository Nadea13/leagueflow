'use client'

import { useState } from "react"
import { generateFixtures } from "@/app/[locale]/organizer/tournaments/[id]/actions"
import { Button } from "@/components/ui/button"
import { Wand2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export function FixtureGenerator({ 
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
  const [isLoading, setIsLoading] = useState(false)

  const isKnockout = format === 'knockout' || format === 'group_knockout';

  const getButtonText = () => {
    if (isLoading) return t("generating");
    if (!hasFixtures) return t("generate_fixtures");
    if (format === 'knockout') return "Refill Bracket";
    return "Regenerate";
  };

  const handleGenerate = async () => {
    let confirmMsg = t("confirm_generate");
    if (hasFixtures) {
      if (format === 'knockout') confirmMsg = "This will refill the bracket with actual teams. Continue?";
      else confirmMsg = "This will delete current scheduled fixtures and shuffle teams to generate a new schedule. Continue?";
    }
    const confirmPopup = window.confirm(confirmMsg)
    if (!confirmPopup) return

    setIsLoading(true)
    try {
      const result = await generateFixtures(tournamentId)
      if (!result.success && result.error) {
        alert(result.error)
      }
    } catch (e) {
      console.error(e)
      alert("An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleGenerate} 
      disabled={isLoading} 
      variant="ghost"
      className={cn(
        "w-full h-12 rounded-none border border-white/5 font-black uppercase italic tracking-tighter transition-all duration-300 group overflow-hidden relative",
        hasFixtures ? "bg-white/5 hover:bg-white/10 text-muted-foreground/60 hover:text-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg shadow-secondary/10",
        className
      )}
    >
      {!hasFixtures && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />}
      <Wand2 className={cn("mr-2 h-4 w-4 relative z-10", !hasFixtures && "animate-pulse")} />
      <span className="relative z-10">{getButtonText()}</span>
    </Button>
  )
}