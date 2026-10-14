"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ShieldCheck, HelpCircle, Loader2, Search, Check, Building2, AlertCircle } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useToast } from "@/hooks/use-toast";
import { searchTeamsForClaim, submitTeamManagementRequest } from "@/actions/manager/team";

interface VerifyTeamFormProps {
    iconOnlyMobile?: boolean;
}

interface MatchingTeam {
    id: string;
    name: string;
    contact_email?: string;
    logo_url?: string;
    sport?: string;
}

export function VerifyTeamForm({ iconOnlyMobile = false }: VerifyTeamFormProps) {
    const t = useTranslations("Team");
    const locale = useLocale();
    const isThai = locale === "th";
    const { toast } = useToast();

    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [matchingTeams, setMatchingTeams] = useState<MatchingTeam[]>([]);
    const [isSearchingTeams, setIsSearchingTeams] = useState(false);

    const [selectedTeam, setSelectedTeam] = useState<MatchingTeam | null>(null);
    const [contactPhone, setContactPhone] = useState("");
    const [requestMessage, setRequestMessage] = useState("");
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Reset scroll to top on dialog open
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = 0;
                }
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [open]);

    // Debounced search for teams
    useEffect(() => {
        if (!searchTerm || searchTerm.trim().length < 2) {
            setMatchingTeams([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingTeams(true);
            try {
                const res = await searchTeamsForClaim(searchTerm.trim());
                if (res.success && res.data) {
                    setMatchingTeams(res.data);
                } else {
                    setMatchingTeams([]);
                }
            } catch {
                setMatchingTeams([]);
            } finally {
                setIsSearchingTeams(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedTeam || !contactPhone.trim()) {
            toast({
                title: isThai ? "ข้อมูลไม่ครบถ้วน" : "Required Fields Missing",
                description: isThai ? "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" : "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await submitTeamManagementRequest(
                selectedTeam.id,
                contactPhone.trim(),
                requestMessage.trim() || undefined
            );

            if (res.success) {
                setOpen(false);

                // Reset form
                setSearchTerm("");
                setMatchingTeams([]);
                setSelectedTeam(null);
                setContactPhone("");
                setRequestMessage("");

                toast({
                    title: t("request_success_title") || (isThai ? "ส่งคำขอเรียบร้อยแล้ว" : "Request Submitted"),
                    description: t("request_success_desc") || (isThai ? "คำขอสิทธิ์การจัดการทีมของคุณถูกส่งไปยังผู้ดูแลแล้ว" : "Your management claim request has been sent."),
                });
            } else {
                toast({
                    title: isThai ? "เกิดข้อผิดพลาด" : "Error",
                    description: res.error || (isThai ? "ไม่สามารถส่งคำขอได้" : "Failed to submit request"),
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: isThai ? "เกิดข้อผิดพลาด" : "Error",
                description: isThai ? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" : "An error occurred. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className={iconOnlyMobile ? "h-8 w-8 sm:w-auto gap-1" : "gap-1"}>
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className={iconOnlyMobile ? "hidden sm:inline" : ""}>
                        {t("verify_title") || (isThai ? "ขอสิทธิการจัดการ" : "Claim Access")}
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>
                            {t("verify_title") || (isThai ? "ขอสิทธิการจัดการทีม" : "Request Team Management")}
                        </DialogTitle>
                        <DialogDescription>
                            {t("verify_desc") || (isThai ? "ค้นหาชื่อทีมหรืออีเมลเพื่อส่งคำขอรับสิทธิการดูแลทีมจากผู้ดูแลระบบหรือผู้จัด" : "Search team name or email to request management permissions.")}
                        </DialogDescription>
                    </DialogHeader>

                    <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col space-y-4">
                        {/* Search Team Input */}
                        <div className="space-y-1">
                            <Label>
                                {isThai ? "ค้นหาทีมที่ต้องการขอสิทธิ์" : "Search Team to Claim"} <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    size="sm"
                                    placeholder={isThai ? "พิมพ์ชื่อทีม หรือ อีเมลผู้ติดต่อ..." : "Type team name or contact email..."}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 pr-8 text-xs"
                                    disabled={isSubmitting}
                                />
                                {isSearchingTeams && (
                                    <Loader2 className="absolute right-3 top-2 h-4 w-4 text-muted-foreground animate-spin" />
                                )}
                            </div>
                        </div>

                        {/* Search Results / Selected Team State */}
                        {!selectedTeam && (
                            <div>
                                {!searchTerm.trim() && (
                                    <EmptyState
                                        icon={Search}
                                        title={isThai ? "ค้นหาทีม" : "Search Team"}
                                        description={isThai
                                            ? "พิมพ์ชื่อทีมหรืออีเมลผู้ติดต่อเพื่อค้นหาทีมที่ต้องการขอสิทธิ์"
                                            : "Type team name or email to find teams to claim management."}
                                        className="py-6 border border-dashed rounded-sm"
                                    />
                                )}

                                {searchTerm.trim().length >= 2 && matchingTeams.length === 0 && !isSearchingTeams && (
                                    <EmptyState
                                        icon={AlertCircle}
                                        title={isThai ? "ไม่พบทีม" : "No Teams Found"}
                                        description={isThai
                                            ? `ไม่พบทีมที่ตรงกับ "${searchTerm}"`
                                            : `No teams found matching "${searchTerm}"`}
                                        className="py-6 border border-dashed rounded-sm"
                                    />
                                )}

                                {matchingTeams.length > 0 && (
                                    <div className="border rounded-sm divide-y overflow-hidden max-h-52 overflow-y-auto">
                                        {matchingTeams.map((team) => (
                                            <div
                                                key={team.id}
                                                onClick={() => {
                                                    setSelectedTeam(team);
                                                    setSearchTerm(team.name);
                                                }}
                                                className="flex items-center justify-between p-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="h-8 w-8 rounded-full border flex items-center justify-center shrink-0 overflow-hidden bg-muted">
                                                        {team.logo_url ? (
                                                            <Image
                                                                src={team.logo_url}
                                                                alt={team.name}
                                                                width={32}
                                                                height={32}
                                                                className="h-full w-full object-contain"
                                                            />
                                                        ) : (
                                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold truncate text-foreground">{team.name}</p>
                                                        {team.contact_email && (
                                                            <p className="text-[10px] text-muted-foreground truncate">{team.contact_email}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {team.sport && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 capitalize">
                                                        {team.sport}
                                                    </Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Selected Team Card */}
                        {selectedTeam && (
                            <div className="flex items-center justify-between p-3 rounded-sm border border-primary/40 bg-primary/5">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-10 w-10 rounded-full border border-primary/30 flex items-center justify-center shrink-0 overflow-hidden bg-background">
                                        {selectedTeam.logo_url ? (
                                            <Image
                                                src={selectedTeam.logo_url}
                                                alt={selectedTeam.name}
                                                width={40}
                                                height={40}
                                                className="h-full w-full object-contain"
                                            />
                                        ) : (
                                            <Building2 className="h-4 w-4 text-primary" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-black text-foreground truncate">{selectedTeam.name}</span>
                                            <Check className="h-4 w-4 text-primary stroke-[3]" />
                                        </div>
                                        {selectedTeam.contact_email && (
                                            <p className="text-[10px] text-muted-foreground truncate">{selectedTeam.contact_email}</p>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    disabled={isSubmitting}
                                    onClick={() => {
                                        setSelectedTeam(null);
                                        setSearchTerm("");
                                    }}
                                >
                                    {isThai ? "เปลี่ยน" : "Change"}
                                </Button>
                            </div>
                        )}

                        {/* Contact Phone */}
                        <div className="space-y-1">
                            <Label>
                                {t("contact_phone")} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="contact_phone"
                                size="sm"
                                placeholder="08x-xxx-xxxx"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                        </div>

                        {/* Message to Owner/Organizer */}
                        <div className="space-y-1">
                            <Label>
                                {t("additional_details") || (isThai ? "รายละเอียดเพิ่มเติม" : "Additional Details")}
                            </Label>
                            <Textarea
                                id="message"
                                placeholder={isThai ? "ระบุเหตุผลหรือหลักฐานการเป็นผู้จัดการทีม (ถ้ามี)..." : "Explain why you are requesting management rights..."}
                                value={requestMessage}
                                onChange={(e) => setRequestMessage(e.target.value)}
                                disabled={isSubmitting}
                                className="resize-none min-h-[70px] text-xs"
                            />
                        </div>

                        {/* Helper Tip */}
                        <div className="text-[11px] flex items-start gap-2 text-muted-foreground bg-muted/40 p-2.5 rounded-sm border border-border/60">
                            <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>{t("helper_tip")}</span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setOpen(false)}
                            disabled={isSubmitting}
                        >
                            {isThai ? "ยกเลิก" : "Cancel"}
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isSubmitting || !selectedTeam || !contactPhone.trim()}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {isThai ? "กำลังส่งคำขอ..." : "Submitting..."}
                                </>
                            ) : (
                                t("submit_request") || (isThai ? "ส่งคำขอสิทธิ์" : "Submit Request")
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
