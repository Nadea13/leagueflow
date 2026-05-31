"use client";

import { useActionState, useState } from "react";
import { Trophy, Settings, Users, ArrowRight } from "lucide-react";
import { createTournamentCategory } from "@/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionResponse } from "@/types/index";

interface CategorySetupProps {
    tournamentId: string;
    ageCategories: { id: number; category_name: string }[];
    tournamentName: string;
}

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

export function CategorySetup({ tournamentId, ageCategories, tournamentName }: CategorySetupProps) {
    const [ageCategoryId, setAgeCategoryId] = useState<string>(
        ageCategories && ageCategories.length > 0 ? ageCategories[0].id.toString() : ""
    );
    const [genderType, setGenderType] = useState<string>("open");
    const [maxTeams, setMaxTeams] = useState<string>("8");
    const [state, formAction, isPending] = useActionState(
        async (_prevState: ActionResponse, _formData: FormData) => {
            if (!ageCategoryId) {
                return { success: false, error: "Please select an age category" };
            }
            return createTournamentCategory(
                tournamentId,
                parseInt(ageCategoryId),
                genderType,
                parseInt(maxTeams)
            );
        },
        initialState
    );

    return (
        <div className="flex items-center justify-center min-h-[70vh] px-4 py-12">
            <Card className="w-full max-w-lg border border-slate-200 dark:border-foreground/10 bg-background/50 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-primary/5 hover:border-primary/20">
                <CardHeader className="space-y-2 p-6 md:p-8 border-b border-slate-100 dark:border-foreground/5 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2 animate-pulse">
                        <Trophy className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl md:text-3xl font-black tracking-tighter text-foreground leading-none">
                        Setup Tournament Category
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm font-semibold tracking-tight">
                        Configure the rules and category for <span className="text-primary font-bold">{tournamentName}</span> to start building your bracket and adding teams.
                    </CardDescription>
                </CardHeader>

                <form action={formAction}>
                    <CardContent className="p-6 md:p-8 space-y-6">
                        {/* Age Category Selector */}
                        <div className="space-y-2">
                            <Label className="text-xs font-black tracking-widest text-muted-foreground/80 flex items-center gap-1.5">
                                <Settings className="h-3.5 w-3.5" /> Age Category
                            </Label>
                            <Select name="age_category_id" value={ageCategoryId} onValueChange={setAgeCategoryId}>
                                <SelectTrigger className="w-full border-slate-200 dark:border-foreground/10 h-11 bg-background hover:bg-slate-50 dark:hover:bg-foreground/5 transition-all duration-200 rounded-lg">
                                    <SelectValue placeholder="Select age category" />
                                </SelectTrigger>
                                <SelectContent className="border-border">
                                    {ageCategories.map((cat) => (
                                        <SelectItem
                                            key={cat.id}
                                            value={cat.id.toString()}
                                            className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tight py-2.5 cursor-pointer"
                                        >
                                            {cat.category_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Gender Type Selector */}
                        <div className="space-y-2">
                            <Label className="text-xs font-black tracking-widest text-muted-foreground/80 flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5" /> Gender Group
                            </Label>
                            <Select name="gender_type" value={genderType} onValueChange={setGenderType}>
                                <SelectTrigger className="w-full border-slate-200 dark:border-foreground/10 h-11 bg-background hover:bg-slate-50 dark:hover:bg-foreground/5 transition-all duration-200 rounded-lg">
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent className="border-border">
                                    <SelectItem value="open" className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tight py-2.5 cursor-pointer">
                                        Open (All Genders)
                                    </SelectItem>
                                    <SelectItem value="male" className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tight py-2.5 cursor-pointer">
                                        Male
                                    </SelectItem>
                                    <SelectItem value="female" className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tight py-2.5 cursor-pointer">
                                        Female
                                    </SelectItem>
                                    <SelectItem value="mixed" className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tight py-2.5 cursor-pointer">
                                        Mixed
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Max Teams Selector */}
                        <div className="space-y-2">
                            <Label className="text-xs font-black tracking-widest text-muted-foreground/80 flex items-center gap-1.5">
                                <Trophy className="h-3.5 w-3.5" /> Team Limit
                            </Label>
                            <Select name="max_teams" value={maxTeams} onValueChange={setMaxTeams}>
                                <SelectTrigger className="w-full border-slate-200 dark:border-foreground/10 h-11 bg-background hover:bg-slate-50 dark:hover:bg-foreground/5 transition-all duration-200 rounded-lg">
                                    <SelectValue placeholder="Select maximum teams" />
                                </SelectTrigger>
                                <SelectContent className="border-border">
                                    <SelectItem value="4" className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tight py-2.5 cursor-pointer">
                                        4 Teams
                                    </SelectItem>
                                    <SelectItem value="8" className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tight py-2.5 cursor-pointer">
                                        8 Teams
                                    </SelectItem>
                                    <SelectItem value="16" className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tight py-2.5 cursor-pointer">
                                        16 Teams
                                    </SelectItem>
                                    <SelectItem value="32" className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tight py-2.5 cursor-pointer">
                                        32 Teams
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {state.error && (
                            <div className="text-xs font-bold text-red-500 bg-red-500/10 p-4 border-l-4 border-red-500 rounded-r-lg transition-all duration-200">
                                {state.error}
                            </div>
                        )}

                        <div className="pt-2">
                            <SubmitButton className="w-full h-11 rounded-lg font-black tracking-wide bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.01] flex items-center justify-center gap-2 group">
                                {isPending ? "Creating Category..." : "Initialize Category"}
                                {!isPending && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                            </SubmitButton>
                        </div>
                    </CardContent>
                </form>
            </Card>
        </div>
    );
}
