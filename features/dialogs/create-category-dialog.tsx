"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { createTournamentCategory, getOrCreateAgeCategory } from "@/actions/tournaments/general";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowDownCircle, PlusCircle, Globe, Mars, Venus, UsersRound, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

import { useBracketStore } from "@/lib/stores/bracket-store";

interface CreateCategoryFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tournamentId: string;
    ageCategories: { id: number; category_name: string }[];
    onSuccess: (id: string) => void;
    sport?: string;
}

export function CreateCategoryForm({
    open,
    onOpenChange,
    tournamentId,
    onSuccess,
    sport: initialSport
}: CreateCategoryFormProps) {
    const locale = useLocale();
    const isThai = locale === "th";
    const { toast } = useToast();
    const storeSport = useBracketStore((state) => state.sport);

    // Age Category Type & Input States
    const [ageType, setAgeType] = useState<"under" | "over" | "open">("under");
    const [ageValue, setAgeValue] = useState<string>("");

    const [genderType, setGenderType] = useState<string>("male");
    const [maxTeams, setMaxTeams] = useState<string>("8");
    const [registrationFee, setRegistrationFee] = useState<string>("0");
    const [maxSets, setMaxSets] = useState<string>("3");
    const [sport, setSport] = useState<string>(initialSport || storeSport || "football");
    const [isPending, setIsPending] = useState(false);
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

    useEffect(() => {
        if (initialSport || storeSport) {
            setSport((initialSport || storeSport || "").toLowerCase());
            return;
        }
        if (!tournamentId) return;
        const supabase = createClient();
        async function fetchSport() {
            const { data } = await supabase
                .from("tournaments")
                .select("name, sport, sports(sport_name)")
                .eq("id", tournamentId)
                .maybeSingle();

            const rawSport = (data as unknown as { sport?: string; sports?: { sport_name?: string } })?.sport ||
                (data as unknown as { sports?: { sport_name?: string } })?.sports?.sport_name ||
                (data?.name?.toLowerCase().includes("volleyball") || data?.name?.includes("วอลเลย์บอล") ? "volleyball" : null);

            if (rawSport) {
                setSport(rawSport.toLowerCase());
            }
        }
        fetchSport();
    }, [tournamentId, initialSport, storeSport]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let formattedCategoryName = "Open";
        let minAge = 0;
        let maxAge = 99;

        if (ageType === "under") {
            if (!ageValue.trim()) {
                toast({
                    title: isThai ? "ข้อมูลไม่ครบถ้วน" : "Required Fields Missing",
                    description: isThai ? "กรุณากรอกตัวเลขอายุสำหรับรุ่น Under" : "Please enter an age number for Under.",
                    variant: "destructive"
                });
                return;
            }
            const parsedAge = parseInt(ageValue, 10);
            formattedCategoryName = `U${parsedAge}`;
            minAge = 0;
            maxAge = parsedAge;
        } else if (ageType === "over") {
            if (!ageValue.trim()) {
                toast({
                    title: isThai ? "ข้อมูลไม่ครบถ้วน" : "Required Fields Missing",
                    description: isThai ? "กรุณากรอกตัวเลขอายุสำหรับรุ่น Over" : "Please enter an age number for Over.",
                    variant: "destructive"
                });
                return;
            }
            const parsedAge = parseInt(ageValue, 10);
            formattedCategoryName = `${parsedAge}+`;
            minAge = parsedAge;
            maxAge = 99;
        } else { // open
            formattedCategoryName = "Open";
            minAge = 0;
            maxAge = 99;
        }

        if (!maxTeams || parseInt(maxTeams) <= 0) {
            toast({
                title: isThai ? "ข้อมูลไม่ถูกต้อง" : "Invalid Input",
                description: isThai ? "กรุณาระบุจำนวนทีมสูงสุดที่ถูกต้อง" : "Please enter a valid team limit.",
                variant: "destructive"
            });
            return;
        }

        setIsPending(true);
        try {
            // Get or create Age Category ID
            const ageCatRes = await getOrCreateAgeCategory(formattedCategoryName, minAge, maxAge);
            if (!ageCatRes.success || !ageCatRes.id) {
                toast({
                    title: isThai ? "เกิดข้อผิดพลาด" : "Error",
                    description: ageCatRes.error || (isThai ? "เกิดข้อผิดพลาดในการสร้างรุ่นอายุ" : "Failed to process age category"),
                    variant: "destructive"
                });
                setIsPending(false);
                return;
            }

            const targetAgeCategoryId = ageCatRes.id;

            // Client-side Subscription & Limit Check
            const { getUserSubscriptionPlan } = await import("@/actions/common/user");
            const activePlan = await getUserSubscriptionPlan();
            const isUnlimitedPlan = activePlan === "yearly" || activePlan === "pro_yearly" || activePlan === "cup_yearly" || activePlan === "customs";
            const isCupPlan = activePlan === "cup";
            const isEventPlan = activePlan === "event" || activePlan === "monthly" || activePlan === "pro" || activePlan === "manager_pro";

            if (!isUnlimitedPlan) {
                const supabase = createClient();
                const { count: categoryCount, error: categoryCountError } = await supabase
                    .from("tournament_categories")
                    .select("id", { count: "exact", head: true })
                    .eq("tournament_id", tournamentId)
                    .is("deleted_at", null);

                if (categoryCountError) {
                    console.error("Error counting categories:", categoryCountError);
                }

                const maxAllowedCategories = isCupPlan ? Infinity : isEventPlan ? 3 : 1;

                if (categoryCount && categoryCount >= maxAllowedCategories) {
                    toast({
                        title: isThai ? "เกิดข้อผิดพลาด" : "Error",
                        description: isThai
                            ? isCupPlan
                                ? "แพ็คเกจ Cup สามารถสร้างรุ่นการแข่งขันได้สูงสุด 5 รุ่นต่อทัวร์นาเมนต์เท่านั้น"
                                : isEventPlan
                                    ? "แพ็คเกจ Event สามารถสร้างรุ่นการแข่งขันได้สูงสุด 3 รุ่นต่อทัวร์นาเมนต์เท่านั้น"
                                    : "ผู้ใช้ทั่วไปสามารถสร้างรุ่นการแข่งขันได้สูงสุด 1 รุ่นเท่านั้น กรุณาอัพเกรดแพ็คเกจ"
                            : isCupPlan
                                ? "Cup plan allows up to 5 categories per tournament."
                                : isEventPlan
                                    ? "Event plan allows up to 3 categories per tournament."
                                    : "Free plan users can create only 1 tournament category. Please upgrade your plan.",
                        variant: "destructive"
                    });
                    setIsPending(false);
                    return;
                }

                const maxAllowedTeams = isCupPlan ? 128 : isEventPlan ? 32 : 12;
                if (parseInt(maxTeams) > maxAllowedTeams) {
                    toast({
                        title: isThai ? "เกิดข้อผิดพลาด" : "Error",
                        description: isThai
                            ? isCupPlan
                                ? "แพ็คเกจ Cup สามารถจำกัดจำนวนทีมได้สูงสุด 128 ทีมต่อรุ่นเท่านั้น"
                                : isEventPlan
                                    ? "แพ็คเกจ Event สามารถจำกัดจำนวนทีมได้สูงสุด 32 ทีมต่อรุ่นเท่านั้น"
                                    : "ผู้ใช้ทั่วไปสามารถจำกัดจำนวนทีมได้สูงสุด 12 ทีมต่อรุ่นเท่านั้น กรุณาอัพเกรดแพ็คเกจ"
                            : isCupPlan
                                ? "Cup plan allows a maximum of 128 teams per category."
                                : isEventPlan
                                    ? "Event plan allows a maximum of 32 teams per category."
                                    : "Free plan users can set a maximum limit of 12 teams per category. Please upgrade your plan.",
                        variant: "destructive"
                    });
                    setIsPending(false);
                    return;
                }
            }
            const rulesConfig = (sport === 'volleyball' || sport.includes('volleyball') || sport.includes('วอลเลย์บอล'))
                ? { max_sets: parseInt(maxSets) || 3 }
                : null;

            const res = await createTournamentCategory(
                tournamentId,
                targetAgeCategoryId,
                genderType,
                parseInt(maxTeams),
                parseFloat(registrationFee) || 0,
                rulesConfig
            );
            if (res.success) {
                toast({
                    title: isThai ? "สร้างสำเร็จ" : "Created Successfully",
                    description: isThai ? "สร้างประเภทการแข่งขันเรียบร้อยแล้ว" : "New category has been created."
                });

                const supabase = createClient();
                const { data } = await supabase
                    .from("tournament_categories")
                    .select("id")
                    .eq("tournament_id", tournamentId)
                    .eq("age_category_id", targetAgeCategoryId)
                    .eq("gender_type", genderType)
                    .is("deleted_at", null)
                    .single();

                if (data) {
                    onSuccess(data.id);
                } else {
                    onSuccess("");
                }
                onOpenChange(false);
            } else {
                toast({
                    title: isThai ? "เกิดข้อผิดพลาด" : "Error",
                    description: res.error || (isThai ? "ไม่สามารถสร้างประเภทการแข่งขันได้" : "Failed to create category"),
                    variant: "destructive"
                });
            }
        } catch (err) {
            const error = err as Error;
            toast({
                title: isThai ? "เกิดข้อผิดพลาด" : "Error",
                description: error.message || (isThai ? "เกิดข้อผิดพลาดที่ไม่คาดคิด" : "An unexpected error occurred"),
                variant: "destructive"
            });
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle>
                            {isThai ? "สร้างประเภทการแข่งขันใหม่" : "Create New Category"}
                        </DialogTitle>
                    </DialogHeader>

                    <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                        {/* Age Category Type & Input */}
                        <div className="space-y-1">
                            <Label className="text-xs font-bold">
                                {isThai ? "รุ่นอายุ" : "Age Category"} <span className="text-destructive">*</span>
                            </Label>
                            <div className="grid grid-cols-3 border bg-card rounded-sm divide-x overflow-hidden">
                                {[
                                    { id: "under", label: "Under (U)", icon: <ArrowDownCircle className="h-4 w-4" /> },
                                    { id: "over", label: "Over (+)", icon: <PlusCircle className="h-4 w-4" /> },
                                    { id: "open", label: "Open (ทั่วไป)", icon: <Globe className="h-4 w-4" /> },
                                ].map((typeItem) => {
                                    const isSelected = ageType === typeItem.id;
                                    return (
                                        <button
                                            key={typeItem.id}
                                            type="button"
                                            disabled={isPending}
                                            onClick={() => {
                                                setAgeType(typeItem.id as "under" | "over" | "open");
                                                if (typeItem.id === "open") setAgeValue("");
                                            }}
                                            className={cn(
                                                "group flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer gap-1.5",
                                                isSelected
                                                    ? "bg-primary/10 text-primary font-bold"
                                                    : "hover:bg-muted/30 text-muted-foreground hover:text-primary"
                                            )}
                                        >
                                            <div className={cn(
                                                "p-1.5 rounded-full transition-colors",
                                                isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                            )}>
                                                {typeItem.icon}
                                            </div>
                                            <span className="text-xs font-bold truncate w-full transition-colors">
                                                {typeItem.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {ageType !== "open" && (
                                <div className="space-y-1 pt-1">
                                    <Label className="text-xs font-bold">
                                        {isThai ? "อายุ" : "Age"} <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        type="text"
                                        size="sm"
                                        value={ageValue}
                                        disabled={isPending}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, "");
                                            setAgeValue(val);
                                        }}
                                        placeholder={
                                            ageType === "under"
                                                ? (isThai ? "เช่น 13 (สำหรับ U13)" : "e.g. 13 (for U13)")
                                                : (isThai ? "เช่น 35 (สำหรับ 35+)" : "e.g. 35 (for 35+)")
                                        }
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">
                                {isThai ? "ประเภทเพศ" : "Gender Group"} <span className="text-destructive">*</span>
                            </Label>
                            <div className="grid grid-cols-3 border bg-card rounded-sm divide-x overflow-hidden">
                                {[
                                    { id: "male", label: isThai ? "ชาย" : "Male", icon: <Mars className="h-4 w-4" /> },
                                    { id: "female", label: isThai ? "หญิง" : "Female", icon: <Venus className="h-4 w-4" /> },
                                    { id: "mixed", label: isThai ? "คู่ผสม / ผสม" : "Mixed", icon: <UsersRound className="h-4 w-4" /> },
                                ].map((genderItem) => {
                                    const isSelected = genderType === genderItem.id;
                                    return (
                                        <button
                                            key={genderItem.id}
                                            type="button"
                                            disabled={isPending}
                                            onClick={() => setGenderType(genderItem.id)}
                                            className={cn(
                                                "group flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer gap-1.5",
                                                isSelected
                                                    ? "bg-primary/10 text-primary font-bold"
                                                    : "hover:bg-muted/30 text-muted-foreground hover:text-primary"
                                            )}
                                        >
                                            <div className={cn(
                                                "p-1.5 rounded-full transition-colors",
                                                isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                            )}>
                                                {genderItem.icon}
                                            </div>
                                            <span className="text-xs font-bold truncate w-full transition-colors">
                                                {genderItem.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold">
                                    {isThai ? "จำนวนทีมสูงสุด" : "Team Limit"} <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    type="text"
                                    size="sm"
                                    value={maxTeams}
                                    disabled={isPending}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, "");
                                        setMaxTeams(val);
                                    }}
                                    placeholder={isThai ? "เช่น 8, 16, 32" : "e.g. 8, 16, 32"}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-bold">
                                    {isThai ? "ค่าสมัคร (บาท)" : "Registration Fee (THB)"}
                                </Label>
                                <Input
                                    type="text"
                                    size="sm"
                                    value={registrationFee}
                                    disabled={isPending}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9.]/g, "");
                                        if ((val.match(/\./g) || []).length <= 1) {
                                            setRegistrationFee(val);
                                        }
                                    }}
                                    placeholder={isThai ? "เช่น 500 (หรือ 0 สำหรับฟรี)" : "e.g. 500 (or 0 for free)"}
                                />
                            </div>
                        </div>

                        {(sport === "volleyball" || sport.includes("volleyball") || sport.includes("วอลเลย์บอล")) && (
                            <div className="space-y-1">
                                <Label className="text-xs font-bold">
                                    {isThai ? "จำนวนเซ็ตการแข่งขัน" : "Match Sets"}
                                </Label>
                                <div className="grid grid-cols-2 border bg-card rounded-sm divide-x overflow-hidden">
                                    {[
                                        { id: "3", label: isThai ? "ชนะ 2 ใน 3 เซ็ต (Best of 3)" : "Best of 3 Sets", icon: <Layers className="h-4 w-4" /> },
                                        { id: "5", label: isThai ? "ชนะ 3 ใน 5 เซ็ต (Best of 5)" : "Best of 5 Sets", icon: <Layers className="h-4 w-4" /> },
                                    ].map((setItem) => {
                                        const isSelected = maxSets === setItem.id;
                                        return (
                                            <button
                                                key={setItem.id}
                                                type="button"
                                                disabled={isPending}
                                                onClick={() => setMaxSets(setItem.id)}
                                                className={cn(
                                                    "group flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer gap-1.5",
                                                    isSelected
                                                        ? "bg-primary/10 text-primary font-bold"
                                                        : "hover:bg-muted/30 text-muted-foreground hover:text-primary"
                                                )}
                                            >
                                                <div className={cn(
                                                    "p-1.5 rounded-full transition-colors",
                                                    isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                )}>
                                                    {setItem.icon}
                                                </div>
                                                <span className="text-xs font-bold truncate w-full transition-colors">
                                                    {setItem.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => onOpenChange(false)}
                        >
                            {isThai ? "ยกเลิก" : "Cancel"}
                        </Button>
                        <Button size="sm" type="submit" disabled={isPending}>
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {isThai ? "กำลังสร้าง..." : "Creating..."}
                                </>
                            ) : (
                                isThai ? "สร้างรุ่นการแข่งขัน" : "Create Category"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

