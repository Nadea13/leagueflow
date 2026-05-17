"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useTranslations } from "next-intl";

export function ShareButton({ tournamentId }: { tournamentId?: string }) {
    const tCommon = useTranslations("Common");
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        try {
            const url = tournamentId
                ? `${window.location.origin}/${tournamentId}`
                : window.location.href;

            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
            alert("Failed to copy link.");
        }
    };

    return (
        <Button
            variant="outline"
            onClick={handleShare}
        >
            {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            <span className="hidden sm:inline">
                {copied ? tCommon("copied") : tCommon("share")}
            </span>
        </Button>
    );
}
