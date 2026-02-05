"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteAccount } from "./actions";

export function DeleteAccountButton() {
    const t = useTranslations("DashboardSettings");
    const tCommon = useTranslations("Common");
    const [isOpen, setIsOpen] = useState(false);
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
                    <Trash2 className="mr-2 h-4 w-4" />
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
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                        {tCommon("cancel")}
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                        {isPending ? tCommon("loading") : t("delete_button")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
