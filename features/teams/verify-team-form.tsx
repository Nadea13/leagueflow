"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, Send, HelpCircle, Loader2, Search } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTeamsByEmail, submitTeamManagementRequest } from "@/actions/manager/team";

export function VerifyTeamForm() {
    const tCommon = useTranslations("Common");
    const { toast } = useToast();
    
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [contactEmail, setContactEmail] = useState("");
    const [matchingTeams, setMatchingTeams] = useState<Array<{ id: string; name: string }>>([]);
    const [isSearchingTeams, setIsSearchingTeams] = useState(false);
    
    const [selectedTeamId, setSelectedTeamId] = useState<string>("");
    const [contactPhone, setContactPhone] = useState("");
    const [requestMessage, setRequestMessage] = useState("");

    const handleEmailChange = async (emailVal: string) => {
        setContactEmail(emailVal);
        setSelectedTeamId("");
        
        // Simple email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailVal.trim())) {
            setMatchingTeams([]);
            return;
        }

        setIsSearchingTeams(true);
        try {
            const res = await getTeamsByEmail(emailVal.trim());
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
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!contactEmail || !selectedTeamId || !contactPhone) {
            toast({
                title: "กรอกข้อมูลไม่ครบถ้วน",
                description: "กรุณากรอกข้อมูลในช่องที่จำเป็นให้ครบถ้วน",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await submitTeamManagementRequest(
                selectedTeamId,
                contactPhone,
                requestMessage || undefined
            );

            if (res.success) {
                setOpen(false);
                
                // Reset form
                setContactEmail("");
                setMatchingTeams([]);
                setSelectedTeamId("");
                setContactPhone("");
                setRequestMessage("");

                toast({
                    title: "ส่งคำขอสำเร็จ!",
                    description: "ระบบได้ส่งคำขอตรวจสอบสิทธิ์ไปยังผู้จัดการแข่งขันเรียบร้อยแล้ว กรุณารอการดำเนินการ",
                });
            } else {
                toast({
                    title: "เกิดข้อผิดพลาด",
                    description: res.error || "ไม่สามารถส่งคำขอได้ กรุณาลองใหม่อีกครั้ง",
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถส่งคำขอได้ กรุณาลองใหม่อีกครั้ง",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-primary/30 hover:bg-primary/5 text-primary gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span>ขอสิทธิ์การจัดการทีม</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-background border-border p-0 overflow-hidden shadow-2xl rounded-xl">
                <form onSubmit={handleSubmit}>
                    <div className="relative bg-background p-4 border-b">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tighter text-foreground flex items-center gap-2 leading-none">
                                ขอสิทธิ์การจัดการทีม
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1.5">
                                ค้นหาทีมด้วยอีเมลผู้ติดต่อเพื่อส่งคำขอรับสิทธิ์การดูแลทีมจากผู้จัดการแข่งขัน
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Input Email to search */}
                        <div className="space-y-1">
                            <Label htmlFor="contact_email" className="text-xs font-black tracking-widest text-primary flex items-center justify-between">
                                <span>อีเมลผู้ติดต่อของทีม (Email) <span className="text-red-500">*</span></span>
                                {isSearchingTeams && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="contact_email"
                                    type="email"
                                    value={contactEmail}
                                    onChange={(e) => handleEmailChange(e.target.value)}
                                    placeholder="กรอกอีเมลที่ใช้สมัครหรือลงทะเบียนทีม"
                                    className="bg-transparent text-foreground focus-visible:ring-0 text-xs pr-8"
                                    required
                                />
                                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/45" />
                            </div>
                        </div>

                        {/* Select Team Dropdown */}
                        <div className="space-y-1">
                            <Label htmlFor="team_select" className="text-xs font-black tracking-widest text-primary">
                                เลือกทีมที่ตรงกัน (Matching Teams) <span className="text-red-500">*</span>
                            </Label>
                            <Select 
                                value={selectedTeamId} 
                                onValueChange={setSelectedTeamId}
                                disabled={matchingTeams.length === 0}
                            >
                                <SelectTrigger className="bg-transparent w-full text-foreground focus-visible:ring-0">
                                    <SelectValue 
                                        placeholder={
                                            contactEmail === "" 
                                                ? "กรุณากรอกอีเมลของทีมก่อน..." 
                                                : isSearchingTeams 
                                                    ? "กำลังค้นหาทีม..." 
                                                    : matchingTeams.length === 0 
                                                        ? "ไม่พบทีมที่ตรงกับอีเมลนี้" 
                                                        : "เลือกทีมที่ต้องการขอสิทธิ์..."
                                        } 
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {matchingTeams.map((team) => (
                                        <SelectItem key={team.id} value={team.id} className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tighter">
                                            {team.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Contact Phone */}
                        <div className="space-y-1">
                            <Label htmlFor="contact_phone" className="text-xs font-black tracking-widest text-primary">
                                เบอร์โทรศัพท์สำหรับติดต่อกลับ <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="contact_phone"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                placeholder="08x-xxx-xxxx"
                                className="bg-transparent text-foreground focus-visible:ring-0 text-xs"
                                required
                            />
                        </div>

                        {/* Message to Organizer */}
                        <div className="space-y-1">
                            <Label htmlFor="message" className="text-xs font-black tracking-widest text-primary">
                                ข้อความแจ้งรายละเอียดเพิ่มเติม (Optional)
                            </Label>
                            <Textarea
                                id="message"
                                value={requestMessage}
                                onChange={(e) => setRequestMessage(e.target.value)}
                                placeholder="แจ้งรายละเอียดเพิ่มเติมเพื่อยืนยันตัวตน เช่น ชื่อผู้จัดการทีม หรือข้อมูลสโมสร"
                                className="bg-transparent w-full text-foreground focus-visible:ring-0 text-xs resize-none min-h-[80px]"
                            />
                        </div>

                        {/* Helper Tip */}
                        <div className="text-[10px] flex items-start gap-1.5 p-2.5 rounded bg-muted/20 border border-dashed text-muted-foreground">
                            <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <span>หากได้รับการอนุมัติแล้ว ทีมนี้จะปรากฏในเมนูการจัดการทีมของคุณโดยอัตโนมัติ</span>
                        </div>
                    </div>

                    <DialogFooter className="border-t p-4 flex gap-2 sm:justify-end">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting} className="text-xs">
                            {tCommon("cancel")}
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !selectedTeamId} className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-white">
                            {isSubmitting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Send className="h-3.5 w-3.5" />
                            )}
                            ส่งคำขอสิทธิ์
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
