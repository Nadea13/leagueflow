'use client'

import { useState } from "react"
import { generateFixtures } from "@/app/[locale]/dashboard/tournaments/[id]/actions"
import { Button } from "@/components/ui/button"
import { Wand2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export function FixtureGenerator({ tournamentId, hasFixtures, className }: { tournamentId: string, hasFixtures: boolean, className?: string }) {
  const t = useTranslations("Fixtures")
  const [isLoading, setIsLoading] = useState(false)

  const handleGenerate = async () => {
    const confirm = window.confirm(t("confirm_generate"))
    if (!confirm) return

    setIsLoading(true)
    try {
      const result = await generateFixtures(tournamentId)
      if (!result.success && result.error) {
        alert(result.error)
      }
    } catch (e) {
      alert("An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }

  if (hasFixtures) {
    return <Button disabled variant="outline" className={cn("w-full bg-primary/10 text-primary border-primary/20", className)}>{t("generated")}</Button>
  }

  return (
    <Button onClick={handleGenerate} disabled={isLoading} className={cn("w-full", className)}>
      <Wand2 className="mr-2 h-4 w-4" />
      {isLoading ? t("generating") : t("generate_fixtures")}
    </Button>
  )
}