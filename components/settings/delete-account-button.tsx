"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

import { deleteAccount } from "@/actions/common/user";

export function DeleteAccountButton({ email }: { email: string }) {
    const t = useTranslations("DashboardSettings");
    const tCommon = useTranslations("Common");
    const [isOpen, setIsOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [isPending, startTransition] = useTransition();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setConfirmText("");
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = 0;
            }
        }
    }, [isOpen]);

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
            <DialogContent className="max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b shrink-0">
                    <DialogTitle>{t("delete_confirm_title")}</DialogTitle>
                </DialogHeader>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (confirmText === email && !isPending) {
                            handleDelete();
                        }
                    }}
                    className="flex flex-col flex-1 min-h-0"
                >
                    <div ref={scrollContainerRef} className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
                        <div className="space-y-2">
                            <DialogDescription className="text-sm">
                                {t("delete_confirm_desc")}
                            </DialogDescription>
                            <DialogDescription className="text-sm font-semibold text-foreground">
                                {t("type_to_confirm", { text: email })}
                            </DialogDescription>
                        </div>
                        <div className="space-y-1.5">
                            <Input
                                id="confirm-delete"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder={email}
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <DialogFooter className="border-t p-4 shrink-0 flex items-center justify-end gap-2 bg-muted/20">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                            disabled={isPending}
                        >
                            {tCommon("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={isPending || confirmText !== email}
                        >
                            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t("delete_button")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
