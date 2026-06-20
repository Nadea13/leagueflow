import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
            <DialogContent className="bg-card rounded-xl p-0 overflow-hidden max-w-md">
                <DialogHeader className="p-2 md:p-4 border-b">
                    <DialogTitle className="flex items-center gap-2 md:gap-3 text-2xl font-black tracking-tighter text-foreground">
                        {t("walkover")}
                    </DialogTitle>
                </DialogHeader>

                <div className="p-2 md:p-4 space-y-2 md:space-y-4 relative">
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => match.home_team_id && onConfirm(match.home_team_id)}
                        >
                            <span className="text-[10px] font-black tracking-widest text-center px-2">
                                {match.home_team?.name} <br />
                                <span className="text-primary group-hover:text-black/60">{t("wins")}</span>
                            </span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => match.away_team_id && onConfirm(match.away_team_id)}
                        >
                            <span className="text-[10px] font-black tracking-widest text-center px-2">
                                {match.away_team?.name} <br />
                                <span className="text-primary group-hover:text-black/60">{t("wins")}</span>
                            </span>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
