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
                <Button variant="destructive" size="sm">
                    {t("delete_account")}
                </Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false} className="sm:max-w-[480px] overflow-hidden flex flex-col bg-card p-0 shadow-2xl rounded-sm">
                <div className="flex flex-col h-full overflow-hidden">
                    <DialogHeader className="border-b p-2 md:p-4 relative pr-10">
                        <DialogTitle className="text-base font-bold">
                            {t("delete_confirm_title")}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
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

                    <div className="p-2 md:p-4 space-y-2">
                        <p className="text-xs font-bold text-foreground">
                            {t("type_to_confirm", { text: email })}
                        </p>
                        <div>
                            <Input 
                                size="sm"
                                id="confirm-delete" 
                                value={confirmText} 
                                onChange={(e) => setConfirmText(e.target.value)} 
                                placeholder={email}
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <DialogFooter className="border-t p-2 md:p-4 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete} 
                            disabled={isPending || confirmText !== email}
                        >
                            {t("delete_button")}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
