"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { createTeam, getSports } from "@/actions/manager/team";
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
import { ActionResponse, Sport } from "@/types/index";
import { LogoUploader } from "@/components/shared/logo-uploader";
import { RadioBtn } from "@/components/ui/radio-btn";
import { useToast } from "@/hooks/use-toast";

interface CreateTeamFormProps {
    iconOnlyMobile?: boolean;
}

export function CreateTeamForm({ iconOnlyMobile = false }: CreateTeamFormProps) {
    const t = useTranslations("Team");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const isThai = locale === "th";
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [selectedSport, setSelectedSport] = useState<string>("");
    const [description, setDescription] = useState("");
    const [contactName, setContactName] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [sportsList, setSportsList] = useState<Sport[]>([]);
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

    // Load sports dynamically from database
    useEffect(() => {
        async function loadSports() {
            const res = await getSports();
            if (res.success && res.data && res.data.length > 0) {
                setSportsList(res.data);
                setSelectedSport((curr) => curr || String(res.data![0].id));
            }
        }
        if (open) {
            loadSports();
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !selectedSport || !contactName.trim() || !contactPhone.trim()) {
            toast({
                title: isThai ? "ข้อมูลไม่ครบถ้วน" : "Required Fields Missing",
                description: isThai ? "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" : "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        startTransition(async () => {
            const formData = new FormData();
            formData.append("name", name.trim());
            formData.append("sport_id", selectedSport);
            formData.append("description", description.trim());
            formData.append("contact_name", contactName.trim());
            formData.append("contact_phone", contactPhone.trim());
            if (contactEmail.trim()) {
                formData.append("contact_email", contactEmail.trim());
            }
            if (logoFile) {
                formData.append("logo", logoFile);
            }

            const initialState: ActionResponse = {
                success: false,
                error: undefined,
            };
            const res = await createTeam(initialState, formData);
            if (res.success) {
                toast({
                    title: isThai ? "สร้างทีมสำเร็จ" : "Team Created",
                    description: isThai ? "สร้างทีมของคุณเรียบร้อยแล้ว" : "Your team has been created successfully.",
                });
                setOpen(false);
                setName("");
                setSelectedSport("");
                setDescription("");
                setContactName("");
                setContactPhone("");
                setContactEmail("");
                setLogoFile(null);
                setPreviewUrl(null);
                router.refresh();
            } else {
                toast({
                    title: isThai ? "เกิดข้อผิดพลาด" : "Error",
                    description: res.error || (isThai ? "ไม่สามารถสร้างทีมได้" : "Failed to create team"),
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className={iconOnlyMobile ? "h-8 w-8 p-0 sm:w-auto gap-1.5" : "gap-1.5"}>
                    <Plus className="h-4 w-4" />
                    <span className={iconOnlyMobile ? "hidden sm:inline" : ""}>{t("add_team")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>
                            {t("add_team")}
                        </DialogTitle>
                        <DialogDescription>
                            {t("no_teams_desc")}
                        </DialogDescription>
                    </DialogHeader>

                    <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col space-y-4">
                        <div className="flex flex-col items-center justify-center space-y-1">
                            <LogoUploader
                                id="logo"
                                name="logo"
                                initialUrl={previewUrl}
                                onFileChange={(file) => {
                                    setLogoFile(file);
                                    if (file) {
                                        setPreviewUrl(URL.createObjectURL(file));
                                    } else {
                                        setPreviewUrl(null);
                                    }
                                }}
                                onRemove={() => {
                                    setLogoFile(null);
                                    setPreviewUrl(null);
                                }}
                                uploadLabel={t("upload_logo")}
                                clickToUploadLabel={t("click_to_upload")}
                                previewLabel={tCommon("preview")}
                                imageFit="cover"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>{t("team_name")} <span className="text-destructive">*</span></Label>
                            <Input
                                id="name"
                                name="name"
                                size="sm"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t("team_name_placeholder")}
                                disabled={isPending}
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>{tCommon("sport")} <span className="text-destructive">*</span></Label>
                            <RadioBtn
                                name="sport_id"
                                value={selectedSport}
                                onChange={setSelectedSport}
                                sports={sportsList}
                                disabled={isPending}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>{t("team_description")}</Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t("team_description_placeholder")}
                                disabled={isPending}
                                className="w-full text-xs focus-visible:ring-0 resize-none min-h-[60px]"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>{t("contact_name")} <span className="text-destructive">*</span></Label>
                                <Input
                                    id="contact_name"
                                    name="contact_name"
                                    size="sm"
                                    value={contactName}
                                    onChange={(e) => setContactName(e.target.value)}
                                    placeholder={t("contact_name_placeholder")}
                                    disabled={isPending}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t("contact_phone")} <span className="text-destructive">*</span></Label>
                                <Input
                                    id="contact_phone"
                                    name="contact_phone"
                                    size="sm"
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    placeholder={t("contact_phone_placeholder")}
                                    disabled={isPending}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>{t("contact_email") || "Email Address"}</Label>
                            <Input
                                id="contact_email"
                                name="contact_email"
                                type="email"
                                size="sm"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                placeholder={t("contact_email_placeholder") || "e.g. contact@example.com"}
                                disabled={isPending}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => setOpen(false)}
                        >
                            {isThai ? "ยกเลิก" : "Cancel"}
                        </Button>
                        <Button
                            size="sm"
                            type="submit"
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {isThai ? "กำลังสร้าง..." : "Creating..."}
                                </>
                            ) : (
                                tCommon("create_btn")
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

