import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

interface AddTimeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (minutes: number) => void;
}

export function AddTimeDialog({ open, onOpenChange, onSave }: AddTimeDialogProps) {
    const t = useTranslations("Console");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="bg-card rounded-sm overflow-hidden">
                <DialogHeader className="relative pr-10">
                    <DialogTitle>{t("add_added_time")}</DialogTitle>
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

                <div className="p-2 lg:p-4 space-y-1 lg:space-y-2 relative">
                    <div className="grid grid-cols-3 gap-1 lg:gap-2 relative z-10">
                        {[1, 2, 3, 4, 5, 6].map(mins => (
                            <Button
                                key={mins}
                                variant="outline"
                                onClick={() => onSave(mins)}
                            >
                                +{mins}
                            </Button>
                        ))}
                    </div>

                    <div className="space-y-1">
                        <Label>{t("custom")}</Label>
                        <div className="flex gap-1 lg:gap-2">
                            <Input
                                type="number"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = parseInt((e.target as HTMLInputElement).value);
                                        if (val) onSave(val);
                                    }
                                }}
                            />
                            <Button
                                onClick={(e) => {
                                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                    if (input.value) onSave(parseInt(input.value));
                                }}
                            >
                                {t("add")}
                            </Button>
                        </div>
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
            <DialogContent showCloseButton={false} className="bg-card rounded-sm overflow-hidden">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const m = parseInt(formData.get("minutes") as string) || 0;
                        const s = parseInt(formData.get("seconds") as string) || 0;
                        onSave(m, s);
                    }}
                >
                    <DialogHeader className="relative pr-10">
                        <DialogTitle>{t("set_match_time")}</DialogTitle>
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

                    <div className="p-2 lg:p-4 space-y-1 lg:space-y-2 relative">
                        <div className="flex items-center justify-center gap-4 relative z-10">
                            <div className="space-y-1 flex-1">
                                <Label>{t("min")}</Label>
                                <Input
                                    name="minutes" type="number" min="0"
                                    defaultValue={Math.floor(currentTime / 60)}
                                />
                            </div>
                            <span className="text-3xl font-black mt-5">:</span>
                            <div className="space-y-1 flex-1">
                                <Label>{t("sec")}</Label>
                                <Input
                                    name="seconds" type="number" min="0" max="59"
                                    defaultValue={currentTime % 60}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="border-t p-2 lg:p-4">
                        <Button
                            type="submit"
                            className="w-full"
                        >
                            {t("set_time_btn")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
