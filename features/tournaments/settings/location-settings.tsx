"use client";

import { useActionState, useState, useEffect } from "react";
import { updateTournament } from "@/actions/tournaments/general";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2 } from "lucide-react";
import { ActionResponse, Tournament } from "@/types/index";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("./map-picker"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-80 rounded-sm bg-muted/20 animate-pulse flex items-center justify-center border border-foreground/10">
            <span className="text-xs text-muted-foreground">Loading interactive map...</span>
        </div>
    )
});

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

interface LocationSettingsProps {
    tournament: Tournament;
}

export function LocationSettings({ tournament }: LocationSettingsProps) {
    const tCommon = useTranslations("Common");
    const t = useTranslations("Venue");
    const { toast } = useToast();

    const updateTournamentWithId = updateTournament.bind(null, tournament.id);
    const [state, formAction, isPending] = useActionState(updateTournamentWithId, initialState);

    const [locationName, setLocationName] = useState(tournament.location_name || "");
    const [googleMapUrl, setGoogleMapUrl] = useState(tournament.google_map_url || "");

    useEffect(() => {
        if (state.success) {
            toast({
                title: tCommon("success"),
                description: t("updated_success") || "Venue updated successfully",
            });
        } else if (state.error) {
            toast({
                title: tCommon("error"),
                description: state.error,
                variant: "destructive",
            });
        }
    }, [state, tCommon, t, toast]);

    return (
        <div className="space-y-2 md:space-y-4">
            <form action={formAction} className="space-y-2 md:space-y-4">
                <input type="hidden" name="form_type" value="venue" />

                <div className="space-y-1">
                    <Label htmlFor="location_name">{t("venue_name")} <span className="text-destructive">*</span></Label>
                    <Input
                        type="text"
                        id="location_name"
                        name="location_name"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder={t("name_placeholder") || "e.g. Main Stadium"}
                        className="bg-transparent text-foreground focus-visible:ring-0"
                    />
                </div>

                <div className="space-y-1">
                    <Label>Location</Label>
                    <MapPicker
                        value={googleMapUrl}
                        onChange={(url) => setGoogleMapUrl(url)}
                    />
                </div>

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={isPending}
                        className="md:w-fit w-full"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            {tCommon("save")}
                        </span>
                    </Button>
                </div>
            </form>
        </div>
    );
}
