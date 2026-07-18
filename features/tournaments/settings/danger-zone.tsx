"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/ui/header";
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
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [resetFlowDialogOpen, setResetFlowDialogOpen] = useState(false);

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
            <div className="grid gap-1 md:gap-2">
                {/* Delete Tournament */}
                <div className="border relative overflow-hidden transition-colors p-2 md:p-4 rounded-sm">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4">
                        <div className="space-y-1">
                            <Header level={4} className="text-destructive">{t("delete_tournament")}</Header>
                            <p className="text-xs text-muted-foreground font-medium">{t("delete_desc")}</p>
                        </div>
                        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                >
                                    {t("delete_tournament")}
                                </Button>
                            </DialogTrigger>
                            <DialogContent showCloseButton={false} className="bg-card rounded-sm shadow-2xl p-0">
                                <DialogHeader className="border-b p-2 md:p-4 relative pr-10">
                                    <DialogTitle>{t("delete_tournament")}</DialogTitle>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className="absolute right-2 top-2"
                                        onClick={() => setDeleteDialogOpen(false)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </DialogHeader>
                                <div className="p-2 md:p-4">
                                    <DialogDescription className="mb-1">{t("delete_desc")}</DialogDescription>
                                    <DialogDescription className="font-bold">
                                        {t("type_to_confirm", { text: tournamentName })}
                                    </DialogDescription>
                                    <div className="py-1 md:py-2">
                                        <Input
                                            value={deleteConfirmText}
                                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter className="p-2 md:p-4 border-t">
                                    <Button
                                        variant="destructive"
                                        disabled={deleteConfirmText !== tournamentName || isPending}
                                        onClick={handleDelete}
                                        className="bg-destructive w-full"
                                    >
                                        {t("confirm_delete")}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Reset Bracket Flow */}
                <div className="border relative overflow-hidden transition-colors p-2 md:p-4 rounded-sm">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4">
                        <div className="space-y-1">
                            <Header level={4} className="text-destructive">{t("reset_flow_title")}</Header>
                            <p className="text-xs text-muted-foreground font-medium">{t("reset_flow_desc")}</p>
                        </div>
                        <Button
                            variant="destructive"
                            disabled={isPending}
                            onClick={() => setResetFlowDialogOpen(true)}
                        >
                            {t("reset_flow_btn")}
                        </Button>
                    </div>
                </div>
            </div>

            <AlertDialog open={resetFlowDialogOpen} onOpenChange={setResetFlowDialogOpen}>
                <AlertDialogContent className="bg-card border rounded-sm shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="p-2 md:p-4 border-b">
                            {t("reset_flow_title")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="p-2 md:p-4">
                            {t("reset_flow_confirm")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="p-2 md:p-4 border-t grid grid-cols-2 gap-1 md:gap-2">
                        <AlertDialogCancel>
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleResetFlow}
                            className="bg-destructive"
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
                            <RefreshCw className="h-5 w-5 text-primary" />
                            {t("reset_fixtures")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                            {t("reset_confirm_desc")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="border-foreground/10 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground transition-all h-10 text-[11px] font-black tracking-widest">
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReset}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all h-10 text-[11px] font-black tracking-widest"
                        >
                            {t("reset_confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
