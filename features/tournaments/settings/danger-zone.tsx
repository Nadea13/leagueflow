"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/ui/header";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteTournament } from "@/actions/tournaments/general";
import { resetFixtures, resetBracketFlow } from "@/actions/tournaments/fixtures";

interface DangerZoneProps {
    tournamentId: string;
    tournamentName: string;
    activeCategoryId?: string | null;
}

export function DangerZone({ tournamentId, tournamentName, activeCategoryId }: DangerZoneProps) {
    const t = useTranslations("Settings");
    const tCommon = useTranslations("Common");
    const tTournament = useTranslations("Tournament");
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [resetFlowDialogOpen, setResetFlowDialogOpen] = useState(false);

    const deleteScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (deleteDialogOpen) {
            setDeleteConfirmText("");
            if (deleteScrollRef.current) {
                deleteScrollRef.current.scrollTop = 0;
            }
        }
    }, [deleteDialogOpen]);

    const handleReset = () => {
        setResetDialogOpen(false);
        startTransition(async () => {
            const res = await resetFixtures(tournamentId);
            if (res.success) {
                toast({
                    title: tCommon("success"),
                    description: t("reset_success_desc") || "Fixtures reset successfully",
                });
                router.refresh();
            } else {
                toast({
                    title: tCommon("error"),
                    description: res.error,
                    variant: "destructive",
                });
            }
        });
    };

    const handleResetFlow = () => {
        setResetFlowDialogOpen(false);
        startTransition(async () => {
            const res = await resetBracketFlow(tournamentId, activeCategoryId);
            if (res.success) {
                toast({
                    title: tCommon("success"),
                    description: "Bracket flow reset successfully",
                });
                router.refresh();
            } else {
                toast({
                    title: tCommon("error"),
                    description: res.error,
                    variant: "destructive",
                });
            }
        });
    };

    const handleDelete = () => {
        startTransition(async () => {
            const res = await deleteTournament(tournamentId);
            if (res.success) {
                toast({
                    title: tCommon("success"),
                    description: t("delete_success_desc") || "Tournament deleted successfully",
                });
                router.push("/dashboard/tournaments");
            } else {
                toast({
                    title: tCommon("error"),
                    description: res.error,
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <div className="space-y-1 md:space-y-2">
            <div className="border bg-card rounded-sm divide-y">
                {/* Delete Tournament */}
                <div className="relative overflow-hidden transition-colors p-2 md:p-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4">
                        <div className="space-y-1">
                            <Header level={4} className="text-destructive">{t("delete_tournament")}</Header>
                            <p className="text-xs text-muted-foreground font-medium">{t("delete_desc")}</p>
                        </div>
                        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                >
                                    {t("delete_tournament")}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[90vh] flex flex-col p-0 gap-0">
                                <DialogHeader className="p-4 border-b shrink-0">
                                    <DialogTitle>{t("delete_tournament")}</DialogTitle>
                                </DialogHeader>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (deleteConfirmText === tournamentName && !isPending) {
                                            handleDelete();
                                        }
                                    }}
                                    className="flex flex-col flex-1 min-h-0"
                                >
                                    <div ref={deleteScrollRef} className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
                                        <div className="space-y-2">
                                            <DialogDescription className="text-sm">{t("delete_desc")}</DialogDescription>
                                            <DialogDescription className="text-sm font-semibold text-foreground">
                                                {t("type_to_confirm", { text: tournamentName })}
                                            </DialogDescription>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Input
                                                value={deleteConfirmText}
                                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                                placeholder={tTournament("delete_confirm_placeholder", { text: tournamentName })}
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter className="border-t p-4 shrink-0 flex items-center justify-end gap-2 bg-muted/20">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setDeleteDialogOpen(false)}
                                            disabled={isPending}
                                        >
                                            {tCommon("cancel")}
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="destructive"
                                            disabled={deleteConfirmText !== tournamentName || isPending}
                                        >
                                            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                            {t("confirm_delete")}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Reset Bracket Flow */}
                <div className="relative overflow-hidden transition-colors p-2 md:p-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4">
                        <div className="space-y-1">
                            <Header level={4} className="text-destructive">{t("reset_flow_title")}</Header>
                            <p className="text-xs text-muted-foreground font-medium">{t("reset_flow_desc")}</p>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={isPending}
                            onClick={() => setResetFlowDialogOpen(true)}
                        >
                            {t("reset_flow_btn")}
                        </Button>
                    </div>
                </div>
            </div>

            <AlertDialog open={resetFlowDialogOpen} onOpenChange={setResetFlowDialogOpen}>
                <AlertDialogContent className="sm:h-auto sm:max-w-md max-h-screen sm:max-h-[90vh] overflow-hidden flex flex-col bg-card border rounded-none sm:rounded-sm shadow-2xl p-0">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="p-2 md:p-4 border-b">
                            {t("reset_flow_title")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="p-2 md:p-4">
                            {t("reset_flow_confirm")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="p-2 md:p-4 border-t grid grid-cols-2 gap-1 md:gap-2">
                        <AlertDialogCancel className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-0")}>
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleResetFlow}
                            className={cn(buttonVariants({ size: "sm", variant: "destructive" }))}
                        >
                            {t("confirm_reset")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <AlertDialogContent className="bg-card border-primary/20 shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-primary" />
                            {t("reset_fixtures")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                            {t("reset_confirm_desc")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReset}
                            className={cn(buttonVariants({ size: "sm" }))}
                        >
                            {t("reset_confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
