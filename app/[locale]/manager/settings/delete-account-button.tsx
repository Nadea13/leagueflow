"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { deleteAccount } from "./actions";

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
                // Could show toast here if we had toast imported
                alert("Failed to delete account. Please try again or contact support.");
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                    {t("delete_account")}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("delete_confirm_title")}</DialogTitle>
                    <DialogDescription>
                        {t("delete_confirm_desc")}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="confirm-delete">
                        {t("type_to_confirm", { text: email })}
                    </Label>
                    <Input 
                        id="confirm-delete" 
                        value={confirmText} 
                        onChange={(e) => setConfirmText(e.target.value)} 
                        autoComplete="off"
                        className="border-destructive/50 focus-visible:ring-destructive"
                    />
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => { setIsOpen(false); setConfirmText(""); }} disabled={isPending}>
                        {tCommon("cancel")}
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isPending || confirmText !== email}>
                        {isPending ? tCommon("loading") : t("delete_button")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
