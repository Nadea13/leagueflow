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
import { Loader2, X } from "lucide-react";

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
            // Client-side Pro Check
            const { getUserSubscriptionPlan } = await import("@/actions/common/user");
            const activePlan = await getUserSubscriptionPlan();
            const isProUser = activePlan === "monthly" || activePlan === "yearly" || activePlan === "manager_pro" || activePlan === "pro" || activePlan === "pro_yearly" || activePlan === "customs";

            if (!isProUser) {
                const supabase = createClient();
                const { count: categoryCount, error: categoryCountError } = await supabase
                    .from("tournament_categories")
                    .select("id", { count: "exact", head: true })
                    .eq("tournament_id", tournamentId)
                    .is("deleted_at", null);

                if (categoryCountError) {
                    console.error("Error counting categories:", categoryCountError);
                }

                if (categoryCount && categoryCount >= 1) {
                    toast({
                        title: "Error",
                        description: locale === 'th'
                            ? "ผู้ใช้ทั่วไปสามารถสร้างรุ่นการแข่งขันได้สูงสุด 1 รุ่นเท่านั้น กรุณาอัพเกรดเป็นแพ็คเกจ Pro"
                            : "Starter plan users can create only 1 tournament category. Please upgrade to a Pro plan.",
                        variant: "destructive"
                    });
                    setIsPending(false);
                    return;
                }

                if (parseInt(maxTeams) > 12) {
                    toast({
                        title: "Error",
                        description: locale === 'th'
                            ? "ผู้ใช้ทั่วไปสามารถจำกัดจำนวนทีมได้สูงสุด 12 ทีมเท่านั้น กรุณาอัพเกรดเป็นแพ็คเกจ Pro"
                            : "Starter plan users can set a maximum limit of 12 teams. Please upgrade to a Pro plan.",
                        variant: "destructive"
                    });
                    setIsPending(false);
                    return;
                }
            }
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
            <DialogContent showCloseButton={false} className="sm:max-w-[640px] max-h-[90vh] overflow-hidden flex flex-col bg-card p-0 rounded-sm shadow-2xl">
                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                    <DialogHeader className="relative pr-10">
                        <DialogTitle>
                            {locale === 'th' ? "สร้างประเภทการแข่งขันใหม่" : "Create New Category"}
                        </DialogTitle>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="absolute right-2 top-2"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-1 md:space-y-2 no-scrollbar">
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
                            <Label>
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
                            <Label>
                                {locale === 'th' ? "จำนวนทีมสูงสุด" : "Team Limit"}
                            </Label>
                            <Input
                                type="text"
                                value={maxTeams}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, "");
                                    setMaxTeams(val);
                                }}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>
                                {locale === 'th' ? "ค่าสมัคร (บาท)" : "Registration Fee (THB)"}
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
                                placeholder="0.00 (Free)"
                            />
                        </div>
                    </div>

                    <DialogFooter className="border-t p-2 md:p-4">
                        <Button type="submit" disabled={isPending} className="w-full">
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
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
