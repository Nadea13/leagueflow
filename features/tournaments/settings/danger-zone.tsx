"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Trash2, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
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
                <div className="border border-destructive/50 relative overflow-hidden transition-colors p-2 md:p-4 rounded-lg">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
                        <div className="space-y-1">
                            <h4 className="text-xs font-black tracking-widest text-destructive">{t("delete_tournament")}</h4>
                            <p className="text-[10px] font-bold text-muted-foreground tracking-wider">{t("delete_desc")}</p>
                        </div>
                        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                >
                                    <Trash2 className="h-5 w-5" />
                                    {t("delete_tournament")}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-card rounded-xl shadow-2xl p-0">
                                <DialogHeader className="border-b p-2 md:p-4">
                                    <DialogTitle className="text-2xl font-black tracking-tighter leading-none">
                                        {t("delete_tournament")}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="p-2 md:p-4">
                                    <p className="text-xs font-bold">
                                        {t("type_to_confirm", { name: tournamentName })}
                                    </p>
                                    <div className="py-1 md:py-2">
                                        <Input
                                            value={deleteConfirmText}
                                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                                            placeholder={tournamentName}
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
                                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        {t("confirm_delete")}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Reset Bracket Flow */}
                <div className="bg-card border border-destructive/50 relative overflow-hidden transition-colors p-2 md:p-4 rounded-lg">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
                        <div className="space-y-1">
                            <h4 className="text-xs font-black tracking-widest text-destructive">Reset Bracket Flow</h4>
                            <p className="text-[10px] font-bold text-muted-foreground tracking-wider">This will clear the entire bracket canvas layout and delete all scheduled matches.</p>
                        </div>
                        <Button
                            variant="destructive"
                            disabled={isPending}
                            onClick={() => setResetFlowDialogOpen(true)}
                        >
                            <RefreshCw className={isPending ? "h-5 w-5 animate-spin" : "h-5 w-5"} />
                            Reset Flow
                        </Button>
                    </div>
                </div>
            </div>

            <AlertDialog open={resetFlowDialogOpen} onOpenChange={setResetFlowDialogOpen}>
                <AlertDialogContent className="bg-card border rounded-xl shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl p-2 md:p-4 mb-0 border-b font-black tracking-tighter leading-none">
                            Reset Bracket Flow
                        </AlertDialogTitle>
                        <AlertDialogDescription className="p-2 md:p-4 text-sm font-medium text-muted-foreground/80">
                            Are you sure you want to reset the bracket flow? This will clear the entire canvas layout and delete all scheduled matches. This action cannot be undone.
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
                            Confirm Reset
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
