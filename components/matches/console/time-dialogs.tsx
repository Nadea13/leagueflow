import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timer } from "lucide-react";
import { useTranslations } from "next-intl";

interface AddTimeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (minutes: number) => void;
}

export function AddTimeDialog({ open, onOpenChange, onSave }: AddTimeDialogProps) {
    const t = useTranslations("Console");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-foreground/5 p-0 overflow-hidden max-w-md rounded-none">
                <DialogHeader className="p-4 md:p-6">
                    <DialogTitle className="flex items-center gap-2 md:gap-3 text-2xl font-black uppercase tracking-tighter text-foreground">
                        <div className="p-2 md:p-3 bg-secondary/10 border border-secondary/20">
                            <Timer className="h-6 w-6 text-secondary" />
                        </div>
                        {t("add_added_time")}
                    </DialogTitle>
                </DialogHeader>

                <div className="px-4 pb-4 md:px-6 md:pb-6 space-y-4 md:space-y-6 relative">
                    <div className="grid grid-cols-3 gap-3 relative z-10">
                        {[1, 2, 3, 4, 5, 6].map(mins => (
                            <Button 
                                key={mins} 
                                variant="outline" 
                                className="h-16 bg-foreground/5 border-foreground/5 hover:bg-secondary hover:text-black hover:border-secondary rounded-none text-2xl font-black transition-all group active:scale-95" 
                                onClick={() => onSave(mins)}
                            >
                                <span className="group-hover:scale-110 transition-transform">+{mins}</span>
                            </Button>
                        ))}
                    </div>

                    <div className="space-y-3 relative z-10 pt-4 border-t border-foreground/5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-secondary">{t("custom")}</Label>
                        <div className="flex gap-3">
                            <Input
                                type="number"
                                placeholder="0"
                                className="h-10 flex-1 bg-foreground/5 border-foreground/5 focus:border-secondary/50 focus:ring-secondary/20 rounded-none font-black text-xl text-foreground transition-all"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = parseInt((e.target as HTMLInputElement).value);
                                        if (val) onSave(val);
                                    }
                                }}
                            />
                            <Button 
                                className="h-10 px-6 rounded-none bg-secondary text-black hover:bg-secondary/80 text-[10px] font-black uppercase tracking-widest transition-all"
                                onClick={(e) => {
                                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                    if (input.value) onSave(parseInt(input.value));
                                }}
                            >
                                {t("add")}
                            </Button>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button 
                            variant="ghost" 
                            onClick={() => onOpenChange(false)}
                            className="w-full h-10 text-[10px] font-black uppercase tracking-widest text-foreground/40 hover:text-foreground hover:bg-foreground/5 rounded-none"
                        >
                            {t("cancel") || "CANCEL"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface SetTimeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentTime: number;
    onSave: (minutes: number, seconds: number) => void;
}

export function SetTimeDialog({ open, onOpenChange, currentTime, onSave }: SetTimeDialogProps) {
    const t = useTranslations("Console");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-foreground/5 p-0 overflow-hidden max-w-xs rounded-none">
                <DialogHeader className="p-4 md:p-6">
                    <DialogTitle className="flex items-center gap-2 md:gap-3 text-2xl font-black uppercase tracking-tighter text-foreground">
                        <div className="p-2 md:p-3 bg-secondary/10 border border-secondary/20">
                            <Timer className="h-6 w-6 text-secondary" />
                        </div>
                        {t("set_match_time")}
                    </DialogTitle>
                </DialogHeader>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const m = parseInt(formData.get("minutes") as string) || 0;
                        const s = parseInt(formData.get("seconds") as string) || 0;
                        onSave(m, s);
                    }}
                    className="px-4 pb-4 md:px-6 md:pb-6 space-y-4 md:space-y-6 relative"
                >
                    <div className="flex items-center justify-center gap-4 relative z-10">
                        <div className="space-y-2 flex-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-secondary text-center block w-full">{t("min")}</Label>
                            <Input
                                name="minutes" type="number" min="0"
                                className="h-16 text-center text-3xl font-black bg-foreground/5 border-foreground/5 focus:border-secondary/50 rounded-none text-foreground"
                                defaultValue={Math.floor(currentTime / 60)}
                            />
                        </div>
                        <span className="text-3xl font-black text-foreground/20 mt-6">:</span>
                        <div className="space-y-2 flex-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-secondary text-center block w-full">{t("sec")}</Label>
                            <Input
                                name="seconds" type="number" min="0" max="59"
                                className="h-16 text-center text-3xl font-black bg-foreground/5 border-foreground/5 focus:border-secondary/50 rounded-none text-foreground"
                                defaultValue={currentTime % 60}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 relative z-10">
                        <Button 
                            type="submit" 
                            className="h-10 bg-secondary text-black hover:bg-secondary/80 text-[10px] font-black uppercase tracking-widest rounded-none"
                        >
                            {t("set_time_btn")}
                        </Button>
                        <Button 
                            variant="ghost" 
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="h-10 text-[10px] font-black uppercase tracking-widest text-foreground/40 hover:text-foreground hover:bg-foreground/5 rounded-none"
                        >
                            {t("cancel") || "CANCEL"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
