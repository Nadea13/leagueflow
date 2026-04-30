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
            <DialogContent className="bg-card border-foreground/5 p-0 overflow-hidden max-w-md rounded-none">
                <DialogHeader className="p-4 md:p-6">
                    <DialogTitle className="flex items-center gap-2 md:gap-3 text-2xl font-black tracking-tighter text-foreground">
                        <div className="p-2 md:p-3 bg-red-500/10 border border-red-500/20">
                            <AlertTriangle className="h-6 w-6 text-red-500" />
                        </div>
                        {t("walkover")}
                    </DialogTitle>
                </DialogHeader>

                <div className="px-4 pb-4 md:px-6 md:pb-6 space-y-4 md:space-y-6 relative">
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-32 bg-foreground/5 border-foreground/5 hover:bg-primary hover:text-black hover:border-primary rounded-none flex flex-col items-center justify-center gap-3 transition-all group"
                            onClick={() => match.home_team_id && onConfirm(match.home_team_id)}
                        >
                            <div className="p-3 bg-foreground/5 group-hover:bg-black/10 transition-colors">
                                <Trophy className="w-8 h-8 group-hover:scale-110 transition-transform" />
                            </div>
                            <span className="text-[10px] font-black tracking-widest text-center px-2">
                                {match.home_team?.name} <br/>
                                <span className="text-primary group-hover:text-black/60">{t("wins")}</span>
                            </span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-32 bg-foreground/5 border-foreground/5 hover:bg-primary hover:text-black hover:border-primary rounded-none flex flex-col items-center justify-center gap-3 transition-all group"
                            onClick={() => match.away_team_id && onConfirm(match.away_team_id)}
                        >
                            <div className="p-3 bg-foreground/5 group-hover:bg-black/10 transition-colors">
                                <Trophy className="w-8 h-8 group-hover:scale-110 transition-transform" />
                            </div>
                            <span className="text-[10px] font-black tracking-widest text-center px-2">
                                {match.away_team?.name} <br/>
                                <span className="text-primary group-hover:text-black/60">{t("wins")}</span>
                            </span>
                        </Button>
                    </div>

                    <div className="pt-2 md:pt-3">
                        <Button 
                            variant="ghost" 
                            onClick={() => onOpenChange(false)}
                            className="w-full h-10 text-[10px] font-black tracking-widest text-foreground/40 hover:text-foreground hover:bg-foreground/5 rounded-none"
                        >
                            {t("cancel") || "CANCEL"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
