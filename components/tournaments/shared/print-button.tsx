"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function PrintButton() {
    const tCommon = useTranslations("Common");

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-2"
        >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">
                {tCommon("print") || "Print / PDF"}
            </span>
        </Button>
    );
}
