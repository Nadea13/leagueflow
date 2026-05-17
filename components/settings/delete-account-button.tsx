"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { deleteAccount } from "@/actions/common/user";
import { LucideIcon } from "lucide-react";

export function DeleteAccountButton({ email }: { email: string }) {
    const t = useTranslations("DashboardSettings");
    const tCommon = useTranslations("Common");
    const [isOpen, setIsOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        startTransition(async () => {
            try {
                await deleteAccount();
                // Redirect happens on server
            } catch (error) {
                console.error("Failed to delete account:", error);
                alert("Failed to delete account. Please try again or contact support.");
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive">
                    <Trash2 className="h-4 w-4" />
                    {t("delete_account")}
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/10 shadow-2xl max-w-md p-6">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-destructive" />
                        {t("delete_confirm_title")}
                    </DialogTitle>
                    <DialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                        {t("delete_confirm_desc")}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <Label htmlFor="confirm-delete" className="text-[11px] font-bold tracking-widest text-muted-foreground/60">
                        {t("type_to_confirm", { text: email })}
                    </Label>
                    <Input 
                        id="confirm-delete" 
                        value={confirmText} 
                        onChange={(e) => setConfirmText(e.target.value)} 
                        autoComplete="off"
                        className="bg-muted/30 dark:bg-foreground/5 border-border/10 h-10 focus-visible:ring-0 focus-visible:border-destructive transition-all font-bold text-foreground"
                    />
                </div>
                <DialogFooter className="flex flex-row justify-end gap-3">
                    <Button 
                        variant="ghost"
                        onClick={() => { setIsOpen(false); setConfirmText(""); }} 
                        disabled={isPending}
                        className="border-border/10 bg-muted/30 dark:bg-foreground/5 hover:bg-muted dark:hover:bg-foreground/10 hover:text-foreground transition-all h-10 text-[11px] font-black tracking-widest px-6"
                    >
                        {tCommon("cancel")}
                    </Button>
                    <Button 
                        variant="destructive"
                        onClick={handleDelete} 
                        disabled={isPending || confirmText !== email}
                        className="border border-destructive/20 bg-destructive/90 text-foreground hover:bg-destructive hover:shadow-[0_0_15_rgba(220,38,38,0.3)] transition-all h-10 text-[11px] font-black tracking-widest px-6"
                    >
                        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Trash2 className="h-3.5 w-3.5 mr-2" />}
                        {t("delete_button")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
