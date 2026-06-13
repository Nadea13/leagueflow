"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

import { deleteAccount } from "@/actions/common/user";

export function DeleteAccountButton({ email }: { email: string }) {
    const t = useTranslations("DashboardSettings");
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
            <DialogContent className="bg-card rounded-xl shadow-2xl p-0">
                <DialogHeader className="border-b p-2 md:p-4">
                    <DialogTitle className="text-2xl font-black tracking-tighter leading-none">
                        {t("delete_confirm_title")}
                    </DialogTitle>
                </DialogHeader>
                <div className="p-2 md:p-4 space-y-3">
                    <DialogDescription className="text-xs font-bold text-muted-foreground">
                        {t("delete_confirm_desc")}
                    </DialogDescription>
                    <p className="text-xs font-bold mt-2">
                        {t("type_to_confirm", { text: email })}
                    </p>
                    <div className="py-1 md:py-2">
                        <Input 
                            id="confirm-delete" 
                            value={confirmText} 
                            onChange={(e) => setConfirmText(e.target.value)} 
                            autoComplete="off"
                            placeholder={email}
                        />
                    </div>
                </div>
                <DialogFooter className="p-2 md:p-4 border-t">
                    <Button 
                        variant="destructive"
                        onClick={handleDelete} 
                        disabled={isPending || confirmText !== email}
                        className="bg-destructive w-full"
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                        {t("delete_button")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
