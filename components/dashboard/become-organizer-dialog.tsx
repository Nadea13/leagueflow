"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, CheckCircle2, Loader2, Rocket, Shield, Zap, AlertCircle } from "lucide-react";
import { registerAsOrganizer } from "@/actions/organizer/dashboard";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface BecomeOrganizerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function BecomeOrganizerDialog({ open, onOpenChange }: BecomeOrganizerDialogProps) {
    const t = useTranslations("Nav");
    const tDash = useTranslations("Dashboard");
    const locale = useLocale();
    const isThai = locale === 'th';
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async () => {
        setIsLoading(true);
        try {
            const result = await registerAsOrganizer();
            if (result.success) {
                // Update local storage
                localStorage.setItem('dashboard-mode', 'organizer');
                // Dispatch event for other components (Navbar/Sidebar)
                window.dispatchEvent(new StorageEvent('storage', { 
                    key: 'dashboard-mode', 
                    newValue: 'organizer' 
                }));
                
                toast({
                    title: isThai ? "ยินดีต้อนรับ ผู้จัดการแข่งขัน!" : "Welcome, Organizer!",
                    description: isThai ? "คุณสมัครเป็นผู้จัดการแข่งขันเรียบร้อยแล้ว" : "You have successfully registered as a tournament organizer.",
                });

                onOpenChange(false);
                
                // Navigate immediately to organizer dashboard
                router.push('/organizer/dashboard');
                
                // Refresh to update server-side role check if any
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
        } catch (error) {
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
                <div className="relative bg-secondary/10 p-4 md:p-6 border-b border-border/50">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 blur-3xl rounded-full -mr-16 -mt-16 animate-pulse" />
                    
                    <DialogHeader className="relative z-10">
                        <DialogTitle className="text-3xl font-black tracking-tighter text-foreground leading-none">
                            {tDash("become_organizer").split(' ')[0]} <span className="text-secondary">{tDash("become_organizer").split(' ').slice(1).join(' ')}</span>
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground font-medium pt-2 text-base leading-relaxed">
                            {tDash("become_organizer_desc")}
                        </DialogDescription>
                    </DialogHeader>
                </div>
                
                {/* Features List */}
                <div className="p-4 md:p-6 space-y-2 md:space-y-3">
                    <div className="grid gap-2 md:gap-3">
                        <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-muted/30 border border-border/50 transition-all hover:bg-muted/50 hover:border-secondary/30 group">
                            <div className="shrink-0 p-2.5 bg-secondary/10 border border-secondary/20 rounded-lg group-hover:scale-110 transition-transform">
                                <Rocket className="h-5 w-5 text-secondary" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-black tracking-widest text-foreground">
                                    {isThai ? "การสร้างทัวร์นาเมนต์" : "Tournament Creation"}
                                </p>
                                <p className="text-xs text-muted-foreground font-medium">
                                    {isThai ? "สร้างลีกและสายการแข่งระดับมืออาชีพได้อย่างง่ายดาย" : "Build professional leagues and brackets with ease."}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-muted/30 border border-border/50 transition-all hover:bg-muted/50 hover:border-secondary/30 group">
                            <div className="shrink-0 p-2.5 bg-secondary/10 border border-secondary/20 rounded-lg group-hover:scale-110 transition-transform">
                                <Shield className="h-5 w-5 text-secondary" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-black tracking-widest text-foreground">
                                    {isThai ? "การควบคุมการเงิน" : "Financial Controls"}
                                </p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                    {isThai ? "จัดการค่าสมัครและการชำระเงินที่ปลอดภัย" : "Manage registration fees and secure payments."}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-muted/30 border border-border/50 transition-all hover:bg-muted/50 hover:border-secondary/30 group">
                            <div className="shrink-0 p-2.5 bg-secondary/10 border border-secondary/20 rounded-lg group-hover:scale-110 transition-transform">
                                <Zap className="h-5 w-5 text-secondary" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-black tracking-widest text-foreground">
                                    {isThai ? "คอนโซลการแข่งขัน" : "Match Console"}
                                </p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                    {isThai ? "ตารางแข่งแบบเรียลไทม์และติดตามผลคะแนนสด" : "Real-time scheduling and live score tracking."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Explicit Confirmation Step */}
                    <div className="flex items-center gap-3 p-4 bg-secondary/5 border border-secondary/20 rounded-xl">
                        <AlertCircle className="h-5 w-5 text-secondary shrink-0" />
                        <p className="text-sm font-bold text-foreground">
                            {isThai ? "คุณพร้อมที่จะเป็นผู้จัดการแข่งขันแล้วหรือยัง?" : "Are you ready to become an organizer?"}
                        </p>
                    </div>

                    <DialogFooter className="pt-2 md:pt-3 flex flex-col sm:flex-row sm:justify-between gap-3">
                        <Button
                            className="flex-1 h-10 bg-secondary text-secondary-foreground hover:bg-secondary cursor-pointer"
                            onClick={handleRegister}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <span className="flex items-center gap-2 font-black tracking-widest text-sm">
                                    <Trophy className="h-5 w-5" />
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
