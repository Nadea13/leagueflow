"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { Plus, Image as ImageIcon, Camera, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { addTeam } from "@/app/[locale]/dashboard/tournaments/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { ActionResponse } from "@/types/index";

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

export function AddTeamForm({ tournamentId, isLimitReached = false }: { tournamentId: string; isLimitReached?: boolean }) {
    const t = useTranslations("Team");
    const addTeamWithId = addTeam.bind(null, tournamentId);
    const [state, formAction] = useActionState(addTeamWithId, initialState);
    const formRef = useRef<HTMLFormElement>(null);
    const [preview, setPreview] = useState("");

    useEffect(() => {
        if (state.success) {
            formRef.current?.reset();
            setPreview("");
        }
    }, [state.success]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
        } else {
            setPreview("");
        }
    };

    return (
        <form
            ref={formRef}
            action={formAction}
            className="flex w-full flex-col md:flex-row items-end gap-2"
        >
            <div className="flex gap-4 items-center w-full">
                {/* Circular Logo Upload */}
                <label htmlFor="add-logo-upload" className={`cursor-pointer group relative shrink-0 ${isLimitReached ? 'pointer-events-none opacity-50' : ''}`}>
                    <div className="h-12 w-12 rounded-full border border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted/5 hover:bg-muted/10 transition-colors">
                        {preview ? (
                            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                        ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                            <Upload className="h-4 w-4 text-white" />
                        </div>
                    </div>
                    <Input
                        id="add-logo-upload"
                        type="file"
                        name="logo"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={isLimitReached}
                    />
                </label>

                <div className="grid w-full gap-1.5">
                    <Input
                        type="text"
                        name="name"
                        placeholder={isLimitReached ? "Limit reached (Max 8)" : t("team_name_placeholder")}
                        required
                        className="h-10"
                        disabled={isLimitReached}
                    />
                </div>

                <SubmitButton disabled={isLimitReached}>
                    <Plus className="h-4 w-4" />
                </SubmitButton>
            </div>
            {state.error && <p className="text-sm text-red-500 w-full md:w-auto">{state.error}</p>}
            {isLimitReached && (
                <p className="text-sm text-amber-600 w-full md:w-auto mt-2">
                    Team limit reached (Free Plan: 8). <a href="/dashboard/billing" className="underline font-medium">Upgrade to Pro</a> to add more.
                </p>
            )}
        </form>
    );
}
