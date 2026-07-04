"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, HelpCircle, Loader2, Search } from "lucide-react";
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

interface VerifyTeamFormProps {
    iconOnlyMobile?: boolean;
}

export function VerifyTeamForm({ iconOnlyMobile = false }: VerifyTeamFormProps) {
    const t = useTranslations("Team");
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
                title: t("form_incomplete"),
                description: t("fill_required_fields"),
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
                    title: t("request_success_title"),
                    description: t("request_success_desc"),
                });
            } else {
                toast({
                    title: t("error_title"),
                    description: res.error || t("error_desc"),
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: t("error_title"),
                description: t("error_desc"),
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className={iconOnlyMobile ? "h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4 sm:py-2 gap-2 border-primary/30 hover:bg-primary/5 text-primary" : "border-primary/30 hover:bg-primary/5 text-primary gap-2"}>
                    <ShieldCheck className="h-4 w-4" />
                    <span className={iconOnlyMobile ? "hidden sm:inline" : ""}>{t("verify_title")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-card border-border p-0 overflow-hidden shadow-2xl rounded-xl">
                <form onSubmit={handleSubmit}>
                    <div className="relative p-2 md:p-4 border-b">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tighter text-foreground flex items-center gap-2 leading-none">
                                {t("verify_title")}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1.5">
                                {t("verify_desc")}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-2 md:p-4 space-y-1 md:space-y-2">
                        {/* Input Email to search */}
                        <div className="space-y-1">
                            <Label>
                                <span>{t("contact_email")} <span className="text-red-500">*</span></span>
                                {isSearchingTeams && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="contact_email"
                                    type="email"
                                    value={contactEmail}
                                    onChange={(e) => handleEmailChange(e.target.value)}
                                    required
                                />
                                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/45" />
                            </div>
                        </div>

                        {/* Select Team Dropdown */}
                        <div className="space-y-1">
                            <Label>
                                {t("matching_teams")} <span className="text-red-500">*</span>
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
                                                ? t("fill_email_first")
                                                : isSearchingTeams
                                                    ? t("searching_teams")
                                                    : matchingTeams.length === 0
                                                        ? t("no_teams_matching_email")
                                                        : t("select_matching_team")
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
                            <Label>
                                {t("contact_phone")} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="contact_phone"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                required
                            />
                        </div>

                        {/* Message to Organizer */}
                        <div className="space-y-1">
                            <Label>
                                {t("additional_details")}
                            </Label>
                            <Textarea
                                id="message"
                                value={requestMessage}
                                onChange={(e) => setRequestMessage(e.target.value)}
                                className="resize-none min-h-[80px]"
                            />
                        </div>

                        {/* Helper Tip */}
                        <div className="text-[10px] flex items-start gap-1 md:gap-2 p-1 md:p-2 rounded-sm border border-dashed text-muted-foreground">
                            <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                            <span>{t("helper_tip")}</span>
                        </div>
                    </div>

                    <DialogFooter className="border-t p-4 flex gap-2">
                        <Button type="submit" disabled={isSubmitting || !selectedTeamId} className="w-full">
                            {t("submit_request")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
