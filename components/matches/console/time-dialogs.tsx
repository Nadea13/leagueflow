import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timer } from "lucide-react";

interface AddTimeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (minutes: number) => void;
}

export function AddTimeDialog({ open, onOpenChange, onSave }: AddTimeDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Timer className="w-5 h-5" /> Add Added Time
                    </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-4 py-4">
                    {[1, 2, 3, 4, 5, 6].map(mins => (
                        <Button key={mins} variant="outline" className="h-16 text-xl font-bold" onClick={() => onSave(mins)}>
                            +{mins}
                        </Button>
                    ))}
                </div>
                <div className="flex gap-2 items-center pt-2 border-t">
                    <Label>Custom:</Label>
                    <Input
                        type="number"
                        placeholder="Min"
                        className="w-20"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const val = parseInt((e.target as HTMLInputElement).value);
                                if (val) onSave(val);
                            }
                        }}
                    />
                    <Button size="sm" onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        if (input.value) onSave(parseInt(input.value));
                    }}>Add</Button>
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
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Timer className="w-5 h-5" /> Set Match Time
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
                    className="grid gap-4 py-4"
                >
                    <div className="flex items-center justify-center gap-2">
                        <div className="flex flex-col items-center">
                            <Label className="mb-1.5 text-xs text-muted-foreground">Min</Label>
                            <Input
                                name="minutes" type="number" min="0"
                                className="text-center text-lg font-mono w-20"
                                defaultValue={Math.floor(currentTime / 60)}
                            />
                        </div>
                        <span className="text-2xl font-black pb-2">:</span>
                        <div className="flex flex-col items-center">
                            <Label className="mb-1.5 text-xs text-muted-foreground">Sec</Label>
                            <Input
                                name="seconds" type="number" min="0" max="59"
                                className="text-center text-lg font-mono w-20"
                                defaultValue={currentTime % 60}
                            />
                        </div>
                    </div>
                    <Button type="submit" size="lg" className="w-full mt-2">
                        Set Time
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
