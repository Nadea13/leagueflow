import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Match } from "@/types";

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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-destructive flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> {t("walkover")}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                    <Button
                        type="button"
                        variant="outline"
                        className="h-24 flex flex-col gap-2 border-2 hover:border-primary"
                        onClick={() => match.home_team_id && onConfirm(match.home_team_id)}
                    >
                        <Trophy className="w-6 h-6 mb-1" />
                        <span className="font-bold">{match.home_team?.name} {t("wins")}</span>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-24 flex flex-col gap-2 border-2 hover:border-primary"
                        onClick={() => match.away_team_id && onConfirm(match.away_team_id)}
                    >
                        <Trophy className="w-6 h-6 mb-1" />
                        <span className="font-bold">{match.away_team?.name} {t("wins")}</span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
