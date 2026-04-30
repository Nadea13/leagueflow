"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { registerAsOrganizer } from "@/actions/organizer/dashboard";
import { toast } from "sonner";
import { Trophy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { BecomeOrganizerDialog } from "@/components/dashboard/become-organizer-dialog";

export function BecomeOrganizerButton() {
    const t = useTranslations("Dashboard");
    const [showDialog, setShowDialog] = useState(false);

    return (
        <>
            <div className="flex flex-col gap-4 p-6 border-2 border-dashed border-primary/30 bg-primary/5 rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Trophy className="h-24 w-24 text-primary rotate-12" />
                </div>
                <div className="relative z-10">
                    <h3 className="text-xl font-black tracking-tight text-primary">
                        {t("become_organizer")}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                        {t("become_organizer_desc")}
                    </p>
                    <Button 
                        onClick={() => setShowDialog(true)} 
                        className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-black"
                    >
                        <Trophy className="mr-2 h-4 w-4" />
                        {t("become_organizer_btn")}
                    </Button>
                </div>
            </div>

            <BecomeOrganizerDialog 
                open={showDialog} 
                onOpenChange={setShowDialog} 
            />
        </>
    );
}
