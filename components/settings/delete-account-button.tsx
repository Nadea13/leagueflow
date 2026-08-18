"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

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
                    {t("delete_account")}
                </Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false} className="sm:max-w-[640px] max-h-[100vh] sm:max-h-[90vh] overflow-hidden flex flex-col bg-card p-0 shadow-2xl">
                <div className="flex flex-col h-full max-h-[100vh] sm:max-h-[90vh] overflow-hidden">
                    <DialogHeader className="relative pr-10">
                        <DialogTitle>
                            {t("delete_confirm_title")}
                        </DialogTitle>
                        <DialogDescription>
                            {t("delete_confirm_desc")}
                        </DialogDescription>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="absolute right-2 top-2"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-3 md:space-y-4">
                        <p className="text-xs font-bold text-foreground">
                            {t("type_to_confirm", { text: email })}
                        </p>
                        <div className="py-1">
                            <Input 
                                id="confirm-delete" 
                                value={confirmText} 
                                onChange={(e) => setConfirmText(e.target.value)} 
                                placeholder={email}
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <DialogFooter className="border-t p-2 md:p-4 mt-auto">
                        <Button 
                            variant="destructive"
                            onClick={handleDelete} 
                            disabled={isPending || confirmText !== email}
                            className="w-full"
                        >
                            {t("delete_button")}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
