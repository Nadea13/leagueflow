"use client";

import { useState, useTransition, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, RefreshCw, Loader2, Ban } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { cn } from "@/lib/utils";
import { DeleteTournamentDialog } from "@/features/dialogs";
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
import { resetBracketFlow } from "@/actions/tournaments/fixtures";
import { cancelTournament } from "@/actions/tournaments/general";

interface DangerZoneProps {
    tournamentId: string;
    tournamentName: string;
    activeCategoryId?: string | null;
    tournamentStatus?: string;
    className?: string;
}

export function DangerZone({
    tournamentId,
    tournamentName,
    activeCategoryId,
    tournamentStatus,
    className
}: DangerZoneProps) {
    const t = useTranslations("Settings");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const isThai = locale === "th";
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [currentStatus, setCurrentStatus] = useState(tournamentStatus);
    const [resetFlowDialogOpen, setResetFlowDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

    useEffect(() => {
        setCurrentStatus(tournamentStatus);
    }, [tournamentStatus]);

    const handleCancelTournament = () => {
        setCancelDialogOpen(false);
        startTransition(async () => {
            const res = await cancelTournament(tournamentId);
            if (res.success) {
                setCurrentStatus("cancelled");
                toast({
                    title: tCommon("success"),
                    description: isThai ? "ยกเลิกการแข่งขันเรียบร้อยแล้ว" : "Tournament has been cancelled.",
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
                    description: isThai ? "รีเซ็ตสายการแข่งขันเรียบร้อยแล้ว" : "Bracket flow reset successfully",
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

    return (
        <div className={cn("space-y-4 overflow-hidden", className)}>
            {/* Section Header (matches /dashboard/settings?tab=danger) */}
            <div>
                <Header level={4} className="text-destructive">
                    {t("danger_zone") || (isThai ? "พื้นที่อันตราย" : "Danger Zone")}
                </Header>
                <p className="text-xs text-muted-foreground">
                    {isThai 
                        ? "การดำเนินการในส่วนนี้ไม่สามารถย้อนกลับได้ โปรดใช้ความระมัดระวัง" 
                        : "Actions here are permanent and cannot be undone. Please proceed with caution."}
                </p>
            </div>

            {/* Danger Actions List */}
            <div className="space-y-2">
                {/* 1. Cancel Tournament */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 gap-3">
                    <div className="flex items-start gap-4 sm:w-2/3">
                        <div className="size-9 rounded-sm bg-destructive/10 flex items-center justify-center shrink-0">
                            <Ban className="size-4 text-destructive" />
                        </div>
                        <div className="space-y-1">
                            <Header level={6} className="text-destructive">
                                {isThai ? "ยกเลิกการแข่งขัน" : "Cancel Tournament"}
                            </Header>
                            <p className="text-xs text-muted-foreground">
                                {isThai
                                    ? "เปลี่ยนสถานะการแข่งขันเป็นยกเลิก (Cancelled) และปิดรับสมัครโดยทันที"
                                    : "Change tournament status to Cancelled and close registration immediately"}
                            </p>
                        </div>
                    </div>
                    <div className="sm:w-2/3 flex justify-start sm:justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending || currentStatus === "cancelled"}
                            onClick={() => setCancelDialogOpen(true)}
                            className="border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all text-xs"
                        >
                            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                            {currentStatus === "cancelled"
                                ? (isThai ? "ยกเลิกการแข่งขันแล้ว" : "Already Cancelled")
                                : (isThai ? "ยกเลิกการแข่งขัน" : "Cancel Tournament")}
                        </Button>
                    </div>
                </div>

                {/* 2. Reset Bracket Flow */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 gap-3">
                    <div className="flex items-start gap-4 sm:w-2/3">
                        <div className="size-9 rounded-sm bg-destructive/10 flex items-center justify-center shrink-0">
                            <RefreshCw className="size-4 text-destructive" />
                        </div>
                        <div className="space-y-1">
                            <Header level={6} className="text-destructive">
                                {t("reset_flow_title")}
                            </Header>
                            <p className="text-xs text-muted-foreground">
                                {t("reset_flow_desc")}
                            </p>
                        </div>
                    </div>
                    <div className="sm:w-2/3 flex justify-start sm:justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => setResetFlowDialogOpen(true)}
                            className="border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all text-xs"
                        >
                            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                            {t("reset_flow_btn")}
                        </Button>
                    </div>
                </div>

                {/* 3. Delete Tournament */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 gap-3">
                    <div className="flex items-start gap-4 sm:w-2/3">
                        <div className="size-9 rounded-sm bg-destructive/10 flex items-center justify-center shrink-0">
                            <AlertTriangle className="size-4 text-destructive" />
                        </div>
                        <div className="space-y-1">
                            <Header level={6} className="text-destructive">
                                {t("delete_tournament")}
                            </Header>
                            <p className="text-xs text-muted-foreground">
                                {t("delete_desc")}
                            </p>
                        </div>
                    </div>
                    <div className="sm:w-2/3 flex justify-start sm:justify-end">
                        <DeleteTournamentDialog
                            tournamentId={tournamentId}
                            tournamentName={tournamentName}
                        />
                    </div>
                </div>
            </div>

            {/* Cancel Tournament Confirmation Dialog */}
            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogContent className="sm:max-w-[760px] h-auto sm:h-auto max-h-[88vh] overflow-hidden flex flex-col bg-card border rounded-none sm:rounded-sm shadow-2xl p-0">
                    <AlertDialogHeader className="p-4 sm:px-6 sm:py-4 border-b shrink-0 bg-card">
                        <AlertDialogTitle asChild>
                            <Header level={4} className="text-destructive">
                                {isThai ? "ยกเลิกการแข่งขัน" : "Cancel Tournament"}
                            </Header>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground mt-0.5">
                            {isThai
                                ? `คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการแข่งขัน "${tournamentName}"? เมื่อยืนยัน สถานะทัวร์นาเมนต์จะถูกเปลี่ยนเป็นยกเลิก (Cancelled) และระบบจะปิดรับสมัครโดยทันที`
                                : `Are you sure you want to cancel "${tournamentName}"? The tournament status will be changed to Cancelled and registration will be closed immediately.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="p-3 sm:px-6 sm:py-3.5 border-t bg-card shrink-0 flex flex-row items-center justify-end gap-2">
                        <AlertDialogCancel
                            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-0")}
                            disabled={isPending}
                        >
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelTournament}
                            className={cn(buttonVariants({ size: "sm", variant: "destructive" }))}
                            disabled={isPending}
                        >
                            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                            {isThai ? "ยืนยันยกเลิกการแข่งขัน" : "Confirm Cancel"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reset Flow Confirmation Dialog */}
            <AlertDialog open={resetFlowDialogOpen} onOpenChange={setResetFlowDialogOpen}>
                <AlertDialogContent className="sm:max-w-[760px] h-auto sm:h-auto max-h-[88vh] overflow-hidden flex flex-col bg-card border rounded-none sm:rounded-sm shadow-2xl p-0">
                    <AlertDialogHeader className="p-4 sm:px-6 sm:py-4 border-b shrink-0 bg-card">
                        <AlertDialogTitle asChild>
                            <Header level={4} className="text-destructive">
                                {t("reset_flow_title")}
                            </Header>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground mt-0.5">
                            {t("reset_flow_confirm")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="p-3 sm:px-6 sm:py-3.5 border-t bg-card shrink-0 flex flex-row items-center justify-end gap-2">
                        <AlertDialogCancel
                            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-0")}
                            disabled={isPending}
                        >
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleResetFlow}
                            className={cn(buttonVariants({ size: "sm", variant: "destructive" }))}
                            disabled={isPending}
                        >
                            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                            {t("confirm_reset")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
