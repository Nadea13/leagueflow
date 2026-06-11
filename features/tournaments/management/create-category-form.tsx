"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { createTournamentCategory } from "@/actions/tournaments/general";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Trophy, DollarSign } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface CreateCategoryFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tournamentId: string;
    ageCategories: { id: number; category_name: string }[];
    onSuccess: (id: string) => void;
}

export function CreateCategoryForm({
    open,
    onOpenChange,
    tournamentId,
    ageCategories,
    onSuccess
}: CreateCategoryFormProps) {
    const locale = useLocale();
    const { toast } = useToast();
    const [ageCategoryId, setAgeCategoryId] = useState<string>("");
    const [genderType, setGenderType] = useState<string>("open");
    const [maxTeams, setMaxTeams] = useState<string>("8");
    const [registrationFee, setRegistrationFee] = useState<string>("0");
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        if (ageCategories && ageCategories.length > 0 && !ageCategoryId) {
            setAgeCategoryId(ageCategories[0].id.toString());
        }
    }, [ageCategories, ageCategoryId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ageCategoryId) {
            toast({
                title: "Error",
                description: "Please select an age category.",
                variant: "destructive"
            });
            return;
        }
        if (!maxTeams || parseInt(maxTeams) <= 0) {
            toast({
                title: "Error",
                description: "Please enter a valid team limit.",
                variant: "destructive"
            });
            return;
        }

        setIsPending(true);
        try {
            const res = await createTournamentCategory(
                tournamentId,
                parseInt(ageCategoryId),
                genderType,
                parseInt(maxTeams),
                parseFloat(registrationFee) || 0
            );
            if (res.success) {
                toast({
                    title: locale === 'th' ? "สร้างสำเร็จ" : "Created Successfully",
                    description: locale === 'th' ? "สร้างประเภทการแข่งขันเรียบร้อยแล้ว" : "New category has been created."
                });

                const supabase = createClient();
                const { data } = await supabase
                    .from("tournament_categories")
                    .select("id")
                    .eq("tournament_id", tournamentId)
                    .eq("age_category_id", parseInt(ageCategoryId))
                    .eq("gender_type", genderType)
                    .is("deleted_at", null)
                    .single();

                if (data) {
                    onSuccess(data.id);
                } else {
                    onSuccess("");
                }
            } else {
                toast({
                    title: "Error",
                    description: res.error || "Failed to create category",
                    variant: "destructive"
                });
            }
        } catch (err) {
            const error = err as Error;
            toast({
                title: "Error",
                description: error.message || "An unexpected error occurred",
                variant: "destructive"
            });
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-hidden flex flex-col bg-background p-0 rounded-xl shadow-2xl">
                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                    <div className="p-2 md:p-4 border-b">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tighter text-foreground leading-none flex items-center gap-2">
                                {locale === 'th' ? "สร้างประเภทการแข่งขันใหม่" : "Create New Category"}
                            </DialogTitle>
                        </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-4 no-scrollbar">
                        <div className="space-y-1">
                            <Label>
                                {locale === 'th' ? "รุ่นอายุ" : "Age Category"}
                            </Label>
                            <Select value={ageCategoryId} onValueChange={setAgeCategoryId}>
                                <SelectTrigger className="w-full h-10">
                                    <SelectValue placeholder={locale === 'th' ? "เลือกรุ่นอายุ" : "Select Age Category"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {ageCategories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id.toString()}>
                                            {cat.category_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold tracking-widest text-muted-foreground">
                                {locale === 'th' ? "ประเภทเพศ" : "Gender Group"}
                            </Label>
                            <Select value={genderType} onValueChange={setGenderType}>
                                <SelectTrigger className="w-full h-10">
                                    <SelectValue placeholder={locale === 'th' ? "เลือกประเภทเพศ" : "Select Gender Group"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">{locale === 'th' ? "รุ่นทั่วไป (ไม่จำกัดเพศ)" : "Open (All Genders)"}</SelectItem>
                                    <SelectItem value="male">{locale === 'th' ? "ชาย" : "Male"}</SelectItem>
                                    <SelectItem value="female">{locale === 'th' ? "หญิง" : "Female"}</SelectItem>
                                    <SelectItem value="mixed">{locale === 'th' ? "คู่ผสม / ผสม" : "Mixed"}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold tracking-widest text-muted-foreground flex items-center gap-1">
                                <Trophy className="h-3 w-3" /> {locale === 'th' ? "จำนวนทีมสูงสุด" : "Team Limit"}
                            </Label>
                            <Input
                                type="text"
                                value={maxTeams}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, "");
                                    setMaxTeams(val);
                                }}
                                placeholder="e.g. 8"
                                className="w-full h-10 bg-background"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold tracking-widest text-muted-foreground flex items-center gap-1">
                                <DollarSign className="h-3 w-3" /> {locale === 'th' ? "ค่าสมัคร (บาท)" : "Registration Fee (THB)"}
                            </Label>
                            <Input
                                type="text"
                                value={registrationFee}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9.]/g, "");
                                    if ((val.match(/\./g) || []).length <= 1) {
                                        setRegistrationFee(val);
                                    }
                                }}
                                placeholder="0.00"
                                className="w-full h-10 bg-background"
                            />
                        </div>
                    </div>

                    <DialogFooter className="border-t p-2 md:p-4">
                        <Button type="submit" disabled={isPending} className="w-full font-bold">
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    {locale === 'th' ? "กำลังสร้าง..." : "Creating..."}
                                </>
                            ) : (
                                locale === 'th' ? "สร้างรุ่นการแข่งขัน" : "Create Category"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
