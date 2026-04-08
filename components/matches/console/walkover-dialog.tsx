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
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/50 via-red-500 to-red-500/50" />
                
                <DialogHeader className="p-8 pb-4">
                    <DialogTitle className="flex items-center gap-4 text-2xl font-black uppercase tracking-tighter text-foreground">
                        <div className="p-2 bg-red-500/10 border border-red-500/20">
                            <AlertTriangle className="h-6 w-6 text-red-500" />
                        </div>
                        {t("walkover")}
                    </DialogTitle>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mt-2">SELECT WINNING TEAM FOR FORFEIT</p>
                </DialogHeader>

                <div className="px-8 py-6 relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 -rotate-12 translate-x-12 -translate-y-12 pointer-events-none" />

                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-32 bg-foreground/5 border-foreground/5 hover:bg-secondary hover:text-black hover:border-secondary rounded-none flex flex-col items-center justify-center gap-3 transition-all group"
                            onClick={() => match.home_team_id && onConfirm(match.home_team_id)}
                        >
                            <div className="p-3 bg-foreground/5 group-hover:bg-black/10 transition-colors">
                                <Trophy className="w-8 h-8 group-hover:scale-110 transition-transform" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-center px-2">
                                {match.home_team?.name} <br/>
                                <span className="text-secondary group-hover:text-black/60">{t("wins")}</span>
                            </span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-32 bg-foreground/5 border-foreground/5 hover:bg-secondary hover:text-black hover:border-secondary rounded-none flex flex-col items-center justify-center gap-3 transition-all group"
                            onClick={() => match.away_team_id && onConfirm(match.away_team_id)}
                        >
                            <div className="p-3 bg-foreground/5 group-hover:bg-black/10 transition-colors">
                                <Trophy className="w-8 h-8 group-hover:scale-110 transition-transform" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-center px-2">
                                {match.away_team?.name} <br/>
                                <span className="text-secondary group-hover:text-black/60">{t("wins")}</span>
                            </span>
                        </Button>
                    </div>
                </div>

                <div className="p-4 bg-foreground/5 border-t border-foreground/5">
                    <Button 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)}
                        className="w-full text-[10px] font-black uppercase tracking-widest text-foreground/40 hover:text-foreground hover:bg-foreground/5 rounded-none"
                    >
                        CANCEL
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
