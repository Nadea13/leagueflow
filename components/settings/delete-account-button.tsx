"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/ui/header";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteAccount } from "@/actions/common/user";

interface DeleteAccountButtonProps {
    email: string;
    trigger?: React.ReactNode;
    disabled?: boolean;
}

export function DeleteAccountButton({
    email,
    trigger,
    disabled = false,
}: DeleteAccountButtonProps) {
    const t = useTranslations("DashboardSettings");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const isThai = locale === "th";
    const { toast } = useToast();
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
                toast({
                    title: tCommon("error"),
                    description: isThai
                        ? "เกิดข้อผิดพลาดในการลบบัญชี โปรดลองใหม่อีกครั้ง"
                        : "Failed to delete account. Please try again.",
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {trigger !== undefined ? (
                trigger ? (
                    <DialogTrigger asChild>{trigger}</DialogTrigger>
                ) : null
            ) : (
                <DialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={disabled}>
                        {t("delete_account")}
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[760px] h-auto sm:h-auto max-h-[88vh] p-0 flex flex-col overflow-hidden">
                <DialogHeader className="p-4 sm:px-6 sm:py-4 border-b shrink-0 bg-card">
                    <DialogTitle asChild>
                        <Header level={4} className="text-destructive">
                            {t("delete_account")}
                        </Header>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                        {t("delete_account_desc")}
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (confirmText === email && !isPending) {
                            handleDelete();
                        }
                    }}
                    className="flex flex-col"
                >
                    <div
                        ref={scrollContainerRef}
                        className="p-4 space-y-2 overflow-y-auto max-h-[60vh]"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 gap-3">
                            <div className="flex items-start gap-3 sm:gap-4 sm:w-1/2">
                                <div className="size-9 rounded-sm bg-destructive/10 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="size-4 text-destructive" />
                                </div>
                                <div className="space-y-1">
                                    <Header level={6}>
                                        {t("type_to_confirm", { text: email }) ||
                                            (isThai
                                                ? `โปรดพิมพ์ "${email}" เพื่อยืนยัน:`
                                                : `Please type "${email}" to confirm:`)}
                                    </Header>
                                    <p className="text-xs text-muted-foreground">
                                        {t("delete_confirm_desc")}
                                    </p>
                                </div>
                            </div>
                            <div className="sm:w-1/2 w-full">
                                <Input
                                    id="confirm-delete"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder={email}
                                    autoComplete="off"
                                    size="sm"
                                    variant="destructive"
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-3 sm:px-6 sm:py-3.5 border-t bg-card shrink-0 flex flex-row items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsOpen(false)}
                            disabled={isPending}
                        >
                            {tCommon("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            size="sm"
                            disabled={confirmText !== email || isPending}
                        >
                            {isPending && (
                                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                            )}
                            {t("delete_button")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Convenient alias for dialog naming consistency
export { DeleteAccountButton as DeleteAccountDialog };
