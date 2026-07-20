import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Match } from "@/types";
import { X } from "lucide-react";

interface WalkoverDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    match: Match;
    onConfirm: (winnerId: string) => void;
}

export function WalkoverDialog({ open, onOpenChange, match, onConfirm }: WalkoverDialogProps) {
    const t = useTranslations("Console");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="bg-card rounded-sm overflow-hidden max-w-md">
                <DialogHeader className="relative pr-10">
                    <DialogTitle>{t("walkover")}</DialogTitle>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-2 top-2"
                        onClick={() => onOpenChange(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </DialogHeader>

                <div className="p-2 md:p-4 relative">
                    <div className="grid grid-cols-2 gap-1 lg:gap-2 relative z-10">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => match.home_team_id && onConfirm(match.home_team_id)}
                        >
                            <span className="text-xs">
                                {match.home_team?.name} <br />
                                <span className="text-primary">{t("wins")}</span>
                            </span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => match.away_team_id && onConfirm(match.away_team_id)}
                        >
                            <span className="text-xs">
                                {match.away_team?.name} <br />
                                <span className="text-primary">{t("wins")}</span>
                            </span>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
