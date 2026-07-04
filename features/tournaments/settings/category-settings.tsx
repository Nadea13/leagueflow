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
import { Loader2, Trophy, Trash2, Save } from "lucide-react";
import { TournamentCategory } from "@/types";

interface CategorySettingsProps {
    tournamentId: string;
}

export function CategorySettings({ tournamentId }: CategorySettingsProps) {
    const locale = useLocale();
    const isThai = locale === "th";
    const { toast } = useToast();

    const [categories, setCategories] = useState<TournamentCategory[]>([]);
    const [ageCategories, setAgeCategories] = useState<{ id: number; category_name: string }[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Form states
    const [ageCategoryId, setAgeCategoryId] = useState<string>("");
    const [genderType, setGenderType] = useState<string>("open");
    const [maxTeams, setMaxTeams] = useState<string>("8");
    const [registrationFee, setRegistrationFee] = useState<string>("0");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const supabase = createClient();

            // Fetch age categories
            const { data: ageData } = await supabase
                .from("age_categories")
                .select("id, category_name")
                .order("category_name", { ascending: true });

            if (ageData) {
                setAgeCategories(ageData);
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

    // Update form fields when selected category changes
    useEffect(() => {
        if (selectedCategoryId) {
            const cat = categories.find(c => c.id === selectedCategoryId);
            if (cat) {
                setAgeCategoryId(cat.age_category_id.toString());
                setGenderType(cat.gender_type);
                setMaxTeams(cat.max_teams.toString());
                setRegistrationFee(Number(cat.registration_fee ?? 0).toFixed(2));
            }
        }
    }, [selectedCategoryId, categories]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategoryId) return;

        if (!ageCategoryId) {
            toast({
                title: "Error",
                description: isThai ? "กรุณาเลือกรุ่นอายุ" : "Please select an age category.",
                variant: "destructive"
            });
            return;
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
            const res = await updateTournamentCategory(
                tournamentId,
                selectedCategoryId,
                parseInt(ageCategoryId),
                genderType,
                parseInt(maxTeams),
                parseFloat(registrationFee) || 0
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
        const confirmMsg = isThai
            ? "คุณแน่ใจหรือไม่ว่าต้องการลบรุ่นการแข่งขันนี้? ข้อมูลในรุ่นการแข่งขันนี้จะถูกลบทั้งหมด"
            : "Are you sure you want to delete this category? All matches and data for this category will be removed.";

        if (!window.confirm(confirmMsg)) return;

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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2">
                                    <div className="space-y-1">
                                        <Label>
                                            {isThai ? "รุ่นอายุ" : "Age Category"}
                                        </Label>
                                        <Select value={ageCategoryId} onValueChange={setAgeCategoryId}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder={isThai ? "เลือกรุ่นอายุ" : "Select Age Category"} />
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
                                            {isThai ? "ประเภทเพศ" : "Gender Group"}
                                        </Label>
                                        <Select value={genderType} onValueChange={setGenderType}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder={isThai ? "เลือกประเภทเพศ" : "Select Gender Group"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="open">{isThai ? "รุ่นทั่วไป (ไม่จำกัดเพศ)" : "Open (All Genders)"}</SelectItem>
                                                <SelectItem value="male">{isThai ? "ชาย" : "Male"}</SelectItem>
                                                <SelectItem value="female">{isThai ? "หญิง" : "Female"}</SelectItem>
                                                <SelectItem value="mixed">{isThai ? "คู่ผสม / ผสม" : "Mixed"}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <Label>{isThai ? "จำนวนทีมสูงสุด" : "Team Limit"}</Label>
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
                                            placeholder="0.00 (Free)"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        disabled={isDeleting || isSaving}
                                        onClick={handleDelete}
                                        className="font-bold flex items-center gap-2"
                                    >
                                        {isDeleting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                        {isThai ? "ลบรุ่นการแข่งขัน" : "Delete Category"}
                                    </Button>

                                    <Button
                                        type="submit"
                                        disabled={isSaving || isDeleting}
                                        className="font-bold flex items-center gap-2"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4" />
                                        )}
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
