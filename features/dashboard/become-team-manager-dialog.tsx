"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Loader2, Shield, Zap, AlertCircle } from "lucide-react";
import { registerAsTeamManager } from "@/actions/common/user";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface BecomeTeamManagerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function BecomeTeamManagerDialog({ open, onOpenChange }: BecomeTeamManagerDialogProps) {
    const locale = useLocale();
    const isThai = locale === 'th';
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async () => {
        setIsLoading(true);
        try {
            const result = await registerAsTeamManager();
            if (result.success) {
                toast({
                    title: isThai ? "ยินดีต้อนรับ ผู้จัดการทีม!" : "Welcome, Team Manager!",
                    description: isThai ? "คุณสมัครเป็นผู้จัดการทีมเรียบร้อยแล้ว" : "You have successfully registered as a team manager.",
                });

                onOpenChange(false);

                // Navigate immediately to teams page
                router.push('/dashboard/teams');

                // Refresh to update server-side role check
                setTimeout(() => {
                    router.refresh();
                }, 100);
            } else {
                toast({
                    title: "Registration Failed",
                    description: result.error,
                    variant: "destructive"
                });
            }
        } catch {
            toast({
                title: "Error",
                description: "Something went wrong. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none bg-background shadow-2xl rounded-2xl">
                {/* Header with Premium Feel */}
                <div className="relative bg-primary/10 p-4 md:p-6 border-b border-border/50">
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-black tracking-tighter text-foreground leading-none">
                            {isThai ? "สมัครเป็น " : "Become a "} <span className="text-primary">{isThai ? "ผู้จัดการทีม" : "Team Manager"}</span>
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground font-medium pt-2 text-base leading-relaxed">
                            {isThai 
                                ? "จัดการทีมสโมสรฟุตบอลของคุณ ลงทะเบียนนักเตะ และส่งรายชื่อเข้าแข่งขันลีกต่างๆ"
                                : "Manage your football club teams, register players, and submit lineups for various tournaments."}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Features List */}
                <div className="p-4 md:p-6 space-y-2 md:space-y-3">
                    <div className="grid gap-2 md:gap-3">
                        <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-muted/30 border border-border/50 transition-all hover:bg-muted/50 hover:border-primary/30 group">
                            <div className="shrink-0 p-2.5 bg-primary/10 border border-primary/20 rounded-lg group-hover:scale-110 transition-transform">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-black tracking-widest text-foreground">
                                    {isThai ? "จัดการทีมของคุณ" : "Manage Your Teams"}
                                </p>
                                <p className="text-xs text-muted-foreground font-medium">
                                    {isThai ? "สร้างทีมและตั้งค่าโปรไฟล์ข้อมูลสโมสร" : "Create teams and configure club profile information."}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-muted/30 border border-border/50 transition-all hover:bg-muted/50 hover:border-primary/30 group">
                            <div className="shrink-0 p-2.5 bg-primary/10 border border-primary/20 rounded-lg group-hover:scale-110 transition-transform">
                                <Shield className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-black tracking-widest text-foreground">
                                    {isThai ? "ลงทะเบียนนักเตะ" : "Register Players"}
                                </p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                    {isThai ? "เพิ่มรายชื่อและข้อมูลรูปภาพ/เอกสารนักเตะประจำทีม" : "Add player rosters and photo/document records for your team."}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-muted/30 border border-border/50 transition-all hover:bg-muted/50 hover:border-primary/30 group">
                            <div className="shrink-0 p-2.5 bg-primary/10 border border-primary/20 rounded-lg group-hover:scale-110 transition-transform">
                                <Zap className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-black tracking-widest text-foreground">
                                    {isThai ? "เข้าร่วมลีกการแข่งขัน" : "Join Tournament Leagues"}
                                </p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                    {isThai ? "ส่งใบสมัครและติดตามผลคะแนนสถิติของทีมคุณ" : "Submit registrations and track your team's match statistics."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Explicit Confirmation Step */}
                    <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                        <AlertCircle className="h-5 w-5 text-primary shrink-0" />
                        <p className="text-sm font-bold text-foreground">
                            {isThai ? "คุณพร้อมที่จะเป็นผู้จัดการทีมแล้วหรือยัง?" : "Are you ready to become a team manager?"}
                        </p>
                    </div>

                    <DialogFooter className="pt-2 md:pt-3 flex flex-col sm:flex-row sm:justify-between gap-3">
                        <Button
                            className="flex-1 h-10 bg-primary text-primary-foreground hover:bg-primary cursor-pointer"
                            onClick={handleRegister}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <span className="flex items-center gap-2 font-black tracking-widest text-sm">
                                    <Users className="h-5 w-5" />
                                    {isThai ? "ยืนยันการสมัคร" : "Confirm Registration"}
                                </span>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="h-5 sm:h-10 font-black tracking-widest text-sm hover:bg-transparent hover:text-foreground"
                        >
                            {isThai ? "ยกเลิก" : "Cancel"}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
