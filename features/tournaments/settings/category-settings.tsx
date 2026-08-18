"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { updateTournamentCategory, deleteTournamentCategory } from "@/actions/tournaments/general";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trophy, ArrowDownCircle, PlusCircle, Globe, Mars, Venus, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { TournamentCategory } from "@/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { useBracketStore } from "@/lib/stores/bracket-store";

interface CategorySettingsProps {
    tournamentId: string;
    sport?: string;
}

export function CategorySettings({ tournamentId, sport: initialSport }: CategorySettingsProps) {
    const locale = useLocale();
    const isThai = locale === "th";
    const { toast } = useToast();
    const storeSport = useBracketStore((state) => state.sport);

    const [categories, setCategories] = useState<TournamentCategory[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [sport, setSport] = useState<string>(initialSport || storeSport || "football");
    const [isLoading, setIsLoading] = useState(true);

    // Form states
    const [ageType, setAgeType] = useState<"under" | "over" | "open">("under");
    const [ageValue, setAgeValue] = useState<string>("");
    const [genderType, setGenderType] = useState<string>("male");
    const [maxTeams, setMaxTeams] = useState<string>("8");
    const [registrationFee, setRegistrationFee] = useState<string>("0");
    const [maxSets, setMaxSets] = useState<string>("3");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const supabase = createClient();

            // Fetch tournament details
            const { data: tournamentData } = await supabase
                .from("tournaments")
                .select("name, sport, sports(sport_name)")
                .eq("id", tournamentId)
                .maybeSingle();

            const rawSport = (tournamentData as unknown as { sport?: string; sports?: { sport_name?: string } })?.sport || 
                             (tournamentData as unknown as { sports?: { sport_name?: string } })?.sports?.sport_name ||
                             (tournamentData?.name?.toLowerCase().includes("volleyball") || tournamentData?.name?.includes("วอลเลย์บอล") ? "volleyball" : null);

            if (rawSport) {
                setSport(rawSport.toLowerCase());
            }

            // Fetch tournament categories
            const { data: catData } = await supabase
                .from("tournament_categories")
                .select(`
                    *,
                    age_categories(category_name)
                `)
                .eq("tournament_id", tournamentId)
                .is("deleted_at", null)
                .order("created_at", { ascending: true });

            if (catData) {
                setCategories(catData);
                if (catData.length > 0) {
                    // Preselect first if none selected, or keep selected if still exists
                    setSelectedCategoryId((current) => {
                        const exists = catData.some(c => c.id.toString() === current);
                        return exists ? current : catData[0].id.toString();
                    });
                } else {
                    setSelectedCategoryId(null);
                }
            }
        } catch (error) {
            console.error("Error loading categories settings:", error);
        } finally {
            setIsLoading(false);
        }
    }, [tournamentId]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    useEffect(() => {
        if (selectedCategoryId) {
            const cat = categories.find(c => c.id.toString() === selectedCategoryId.toString());
            if (cat) {
                const name = cat.age_categories?.category_name || "";
                if (name.startsWith("U")) {
                    setAgeType("under");
                    setAgeValue(name.substring(1));
                } else if (name.endsWith("+")) {
                    setAgeType("over");
                    setAgeValue(name.replace("+", ""));
                } else {
                    setAgeType("open");
                    setAgeValue("");
                }
                setGenderType(cat.gender_type);
                setMaxTeams(cat.max_teams.toString());
                setRegistrationFee(Number(cat.registration_fee ?? 0).toFixed(2));
                const currentMaxSets = cat.rules_config?.max_sets ? String(cat.rules_config.max_sets) : "3";
                setMaxSets(currentMaxSets);
            }
        }
    }, [selectedCategoryId, categories]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategoryId) return;

        let formattedCategoryName = "Open";
        let minAge = 0;
        let maxAge = 99;

        if (ageType === "under") {
            if (!ageValue.trim()) {
                toast({
                    title: "Error",
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
                    title: "Error",
                    description: isThai ? "กรุณากรอกตัวเลขอายุสำหรับรุ่น Over" : "Please enter an age number for Over.",
                    variant: "destructive"
                });
                return;
            }
            const parsedAge = parseInt(ageValue, 10);
            formattedCategoryName = `${parsedAge}+`;
            minAge = parsedAge;
            maxAge = 99;
        } else {
            formattedCategoryName = "Open";
            minAge = 0;
            maxAge = 99;
        }

        if (!maxTeams || parseInt(maxTeams) <= 0) {
            toast({
                title: "Error",
                description: isThai ? "กรุณาระบุจำนวนทีมสูงสุดที่ถูกต้อง" : "Please enter a valid team limit.",
                variant: "destructive"
            });
            return;
        }

        setIsSaving(true);
        try {
            const { getOrCreateAgeCategory } = await import("@/actions/tournaments/general");
            const ageCatRes = await getOrCreateAgeCategory(formattedCategoryName, minAge, maxAge);
            if (!ageCatRes.success || !ageCatRes.id) {
                toast({
                    title: "Error",
                    description: ageCatRes.error || (isThai ? "เกิดข้อผิดพลาดในการสร้างรุ่นอายุ" : "Failed to process age category"),
                    variant: "destructive"
                });
                setIsSaving(false);
                return;
            }

            const targetAgeCategoryId = ageCatRes.id;
            const cat = categories.find(c => c.id.toString() === selectedCategoryId.toString());
            const currentRulesConfig = cat?.rules_config || {};
            const rulesConfig = sport === 'volleyball' 
                ? { ...currentRulesConfig, max_sets: parseInt(maxSets) || 3 }
                : currentRulesConfig;

            const res = await updateTournamentCategory(
                tournamentId,
                selectedCategoryId,
                targetAgeCategoryId,
                genderType,
                parseInt(maxTeams),
                parseFloat(registrationFee) || 0,
                rulesConfig
            );

            if (res.success) {
                toast({
                    title: isThai ? "บันทึกสำเร็จ" : "Saved Successfully",
                    description: isThai ? "อัปเดตข้อมูลรุ่นการแข่งขันเรียบร้อยแล้ว" : "Tournament category has been updated."
                });
                await loadData();
            } else {
                toast({
                    title: "Error",
                    description: res.error || "Failed to update category",
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
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedCategoryId) return;

        setIsDeleting(true);
        try {
            const res = await deleteTournamentCategory(tournamentId, selectedCategoryId);
            if (res.success) {
                toast({
                    title: isThai ? "ลบสำเร็จ" : "Deleted Successfully",
                    description: isThai ? "ลบรุ่นการแข่งขันเรียบร้อยแล้ว" : "Tournament category has been deleted."
                });
                setSelectedCategoryId(null);
                await loadData();
            } else {
                toast({
                    title: "Error",
                    description: res.error || "Failed to delete category",
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
            setIsDeleting(false);
            setShowDeleteDialog(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (categories.length === 0) {
        return (
            <Card className="border border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" />
                        {isThai ? "รุ่นการแข่งขัน" : "Tournament Categories"}
                    </CardTitle>
                    <CardDescription>
                        {isThai
                            ? "ยังไม่มีการสร้างรุ่นการแข่งขันในทัวร์นาเมนต์นี้"
                            : "No categories have been created for this tournament yet."}
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const selectedCategory = categories.find(c => c.id === selectedCategoryId);

    return (
        <div className="space-y-1 md:space-y-2">
            {/* Dropdown to select category */}
            <div className="space-y-1">
                <Label>
                    {isThai ? "เลือกประเภทการแข่งขัน" : "Select Category"}
                </Label>
                <Select value={selectedCategoryId || ""} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={isThai ? "เลือกประเภทการแข่งขัน" : "Select Category"} />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map((cat) => {
                            const ageName = cat.age_categories?.category_name || "Unknown";
                            const genderLabel = cat.gender_type === "open"
                                ? (isThai ? "ทั่วไป" : "Open")
                                : cat.gender_type === "male"
                                    ? (isThai ? "ชาย" : "Male")
                                    : cat.gender_type === "female"
                                        ? (isThai ? "หญิง" : "Female")
                                        : (isThai ? "คู่ผสม" : "Mixed");
                            return (
                                <SelectItem key={cat.id} value={cat.id.toString()} className="font-semibold py-2.5">
                                    {ageName} • {genderLabel} • {cat.max_teams} {isThai ? "ทีม" : "Teams"}
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            {/* Form details */}
            <div>
                {selectedCategory ? (
                    <div className="space-y-1 md:space-y-2">
                        <div>
                            <form onSubmit={handleSave} className="space-y-1 md:space-y-2">
                                <div className="space-y-2 md:space-y-3">
                                    {/* Age Category Type & Input */}
                                    <div className="space-y-1">
                                        <Label>
                                            {isThai ? "รุ่นอายุ" : "Age Category"}
                                        </Label>
                                        <div className="grid grid-cols-3 gap-1.5 md:gap-2">
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
                                                        onClick={() => {
                                                            setAgeType(typeItem.id as "under" | "over" | "open");
                                                            if (typeItem.id === "open") setAgeValue("");
                                                        }}
                                                        className={cn(
                                                            "group flex flex-col items-center justify-center p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                                            isSelected
                                                                ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                                                                : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
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
                                                <Label>
                                                    {isThai ? "อายุ" : "Age"}
                                                </Label>
                                                <Input
                                                    type="text"
                                                    value={ageValue}
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

                                    {/* Gender Group */}
                                    <div className="space-y-1">
                                        <Label>
                                            {isThai ? "ประเภทเพศ" : "Gender Group"}
                                        </Label>
                                        <div className="grid grid-cols-3 gap-1.5 md:gap-2">
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
                                                        onClick={() => setGenderType(genderItem.id)}
                                                        className={cn(
                                                            "group flex flex-col items-center justify-center p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                                            isSelected
                                                                ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                                                                : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
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

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2">
                                        <div className="space-y-1">
                                            <Label>{isThai ? "จำนวนทีมสูงสุด" : "Team Limit"}</Label>
                                            <Input
                                                type="text"
                                                value={maxTeams}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^0-9]/g, "");
                                                    setMaxTeams(val);
                                                }}
                                                placeholder={isThai ? "เช่น 8, 16, 32" : "e.g. 8, 16, 32"}
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label>{isThai ? "ค่าสมัคร (บาท)" : "Registration Fee (THB)"}</Label>
                                            <Input
                                                type="text"
                                                value={registrationFee}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^0-9.]/g, "");
                                                    if ((val.match(/\./g) || []).length <= 1) {
                                                        setRegistrationFee(val);
                                                    }
                                                }}
                                                placeholder={isThai ? "เช่น 500 (หรือ 0 สำหรับฟรี)" : "e.g. 500 (or 0 for free)"}
                                            />
                                        </div>

                                        {(sport === "volleyball" || sport.includes("volleyball") || sport.includes("วอลเลย์บอล")) && (
                                            <div className="space-y-1 md:col-span-2">
                                                <Label>{isThai ? "จำนวนเซ็ตการแข่งขัน" : "Match Sets"}</Label>
                                                <Select value={maxSets} onValueChange={setMaxSets}>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder={isThai ? "เลือกจำนวนเซ็ต" : "Select Sets"} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="3">{isThai ? "ชนะ 2 ใน 3 เซ็ต (Best of 3)" : "Best of 3 Sets"}</SelectItem>
                                                        <SelectItem value="5">{isThai ? "ชนะ 3 ใน 5 เซ็ต (Best of 5)" : "Best of 5 Sets"}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                disabled={isDeleting || isSaving}
                                            >
                                                {isThai ? "ลบรุ่นการแข่งขัน" : "Delete Category"}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="sm:h-auto sm:max-w-md max-h-screen sm:max-h-[90vh] overflow-hidden flex flex-col bg-card border rounded-none sm:rounded-sm shadow-2xl p-0">
                                            <AlertDialogHeader className="p-2 lg:p-4 border-b shrink-0">
                                                <AlertDialogTitle>
                                                    {isThai ? "ยืนยันการลบรุ่นการแข่งขัน" : "Confirm Category Deletion"}
                                                </AlertDialogTitle>
                                            </AlertDialogHeader>
                                                <AlertDialogDescription className="p-2 lg:p-4 flex-1 overflow-y-auto">
                                                    {isThai
                                                        ? "คุณแน่ใจหรือไม่ว่าต้องการลบรุ่นการแข่งขันนี้? ข้อมูลในรุ่นการแข่งขันนี้จะถูกลบทั้งหมด"
                                                        : "Are you sure you want to delete this category? All matches and data for this category will be removed."}
                                                </AlertDialogDescription>
                                            <AlertDialogFooter className="grid grid-cols-2 p-2 lg:p-4 border-t gap-1 lg:gap-2">
                                                <AlertDialogCancel disabled={isDeleting}>
                                                    {isThai ? "ยกเลิก" : "Cancel"}
                                                </AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleDelete();
                                                    }}
                                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                                    disabled={isDeleting}
                                                >
                                                    {isDeleting ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            {isThai ? "กำลังลบ..." : "Deleting..."}
                                                        </>
                                                    ) : (
                                                        isThai ? "ลบ" : "Delete"
                                                    )}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>

                                    <Button
                                        type="submit"
                                        disabled={isSaving || isDeleting}
                                    >
                                        {isThai ? "บันทึกการเปลี่ยนแปลง" : "Save Changes"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
