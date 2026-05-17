"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { resetFixtures, deleteTournament } from "@/actions/organizer/tournaments/general";

interface DangerZoneProps {
    tournamentId: string;
    tournamentName: string;
    hasFixtures: boolean;
}

export function DangerZone({ tournamentId, tournamentName, hasFixtures }: DangerZoneProps) {
    const t = useTranslations("Settings");
    const tCommon = useTranslations("Common");
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

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

    const handleDelete = () => {
        startTransition(async () => {
            const res = await deleteTournament(tournamentId);
            if (res.success) {
                toast({
                    title: tCommon("success"),
                    description: t("delete_success_desc") || "Tournament deleted successfully",
                });
                router.push("/organizer/tournaments");
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
        <div className="space-y-2 md:space-y-3">
            <div className="flex items-center gap-2 md:gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <h3 className="text-xl font-black tracking-tighter text-destructive">
                    {t("danger_zone")}
                </h3>
            </div>

            <div className="grid gap-2 md:gap-3">
                {/* Delete Tournament */}
                <div className="border border-destructive/50 relative overflow-hidden transition-colors p-2 md:p-3">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
                        <div className="space-y-1">
                            <h4 className="text-lg font-black tracking-tight text-destructive">{t("delete_tournament")}</h4>
                            <p className="text-xs font-medium text-muted-foreground max-w-md">{t("delete_desc")}</p>
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
                            <DialogContent className="bg-card border-destructive/50 shadow-2xl max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-black tracking-tighter text-destructive">
                                        {t("delete_tournament")}
                                    </DialogTitle>
                                    <DialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                                        {t("delete_confirm_desc")}
                                        <div className="mt-4 p-2 md:p-3 bg-destructive/5 border border-destructive/10">
                                            <p className="text-xs font-bold text-destructive/80">
                                                {t("type_to_confirm", { name: tournamentName })}
                                            </p>
                                        </div>
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4 md:py-6">
                                    <Input
                                        value={deleteConfirmText}
                                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                                        placeholder={tournamentName}
                                        className="border-destructive/20 focus:border-destructive focus:ring-0 bg-transparent text-foreground h-12"
                                    />
                                </div>
                                <DialogFooter>
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setDeleteDialogOpen(false);
                                            setDeleteConfirmText("");
                                        }}
                                        className="h-12 border-foreground/10 font-black tracking-tighter px-4 md:px-6 hover:bg-foreground/5"
                                    >
                                        {tCommon("cancel")}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        disabled={deleteConfirmText !== tournamentName || isPending}
                                        onClick={handleDelete}
                                        className="h-12 bg-destructive hover:bg-red-600 font-black tracking-tighter px-8 transition-all disabled:opacity-50"
                                    >
                                        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                        {t("confirm_delete")}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Reset Fixtures */}
                <div className="bg-card border border-destructive/50 relative overflow-hidden transition-colors p-2 md:p-3">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
                        <div className="space-y-1">
                            <h4 className="text-lg font-black tracking-tight text-destructive">{t("reset_fixtures")}</h4>
                            <p className="text-xs font-medium text-muted-foreground max-w-md">{t("reset_desc")}</p>
                        </div>
                        <Button
                            variant="destructive"
                            disabled={!hasFixtures || isPending}
                            onClick={() => setResetDialogOpen(true)}
                        >
                            <RefreshCw className={isPending ? "h-5 w-5 animate-spin" : "h-5 w-5"} />
                            {t("reset_fixtures")}
                        </Button>
                    </div>
                </div>
            </div>

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
                        <AlertDialogCancel className="border-foreground/10 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground transition-all h-10 text-[11px] font-black tracking-widest uppercase">
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReset}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all h-10 text-[11px] font-black tracking-widest uppercase"
                        >
                            {t("reset_confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
