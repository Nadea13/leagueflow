"use client";

import { useState, useEffect, useCallback } from "react";
import { Venue } from "@/types/index";
import { getVenues, addVenue, deleteVenue } from "@/actions/organizer/tournaments/venue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, MapPin, ExternalLink, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/shared/empty-state";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VenueManagerProps {
    tournamentId: string;
}

export function VenueManager({ tournamentId }: VenueManagerProps) {
    const tCommon = useTranslations("Common");
    const t = useTranslations("Venue");
    const { toast } = useToast();

    const [venues, setVenues] = useState<Venue[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [open, setOpen] = useState(false);
    const [venueToDelete, setVenueToDelete] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [googleMapsUrl, setGoogleMapsUrl] = useState("");
    const [capacity, setCapacity] = useState("");
    const [notes, setNotes] = useState("");

    const fetchVenues = useCallback(async () => {
        setIsLoading(true);
        const result = await getVenues(tournamentId);
        if (result.success && result.data) {
            setVenues(result.data);
        }
        setIsLoading(false);
    }, [tournamentId]);

    useEffect(() => {
        const timer = setTimeout(() => fetchVenues(), 0);
        return () => clearTimeout(timer);
    }, [fetchVenues]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSaving(true);
        const result = await addVenue(
            tournamentId,
            name,
            address || undefined,
            googleMapsUrl || undefined,
            capacity ? parseInt(capacity) : undefined,
            notes || undefined
        );

        if (result.success) {
            toast({ title: tCommon("success"), description: t("added_success") });
            setName("");
            setAddress("");
            setGoogleMapsUrl("");
            setCapacity("");
            setNotes("");
            setOpen(false);
            fetchVenues();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const confirmDeleteVenue = async () => {
        if (!venueToDelete) return;

        const result = await deleteVenue(venueToDelete, tournamentId);
        setVenueToDelete(null);
        if (result.success) {
            toast({ title: tCommon("success"), description: t("deleted_success") });
            fetchVenues();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    return (
        <div className="space-y-2 md:space-y-3">
            <div className="flex flex-col md:flex-row justify-between gap-2 md:gap-3">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        {t("title")}
                    </h3>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button
                            size="sm"
                        >
                            <span className="relative z-10 flex items-center gap-2 md:gap-3">
                                <Plus className="h-4 w-4" />
                                {t("add_venue")}
                            </span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] bg-card p-4 md:p-6 overflow-hidden space-y-4 md:space-y-6">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                <MapPin className="h-6 w-6 text-primary" />
                                {t("add_venue")}
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleAdd} className="space-y-4 md:space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black tracking-widest text-primary/70">{t("venue_name")}</Label>
                                    <Input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder={t("name_placeholder")}
                                        required
                                        className="bg-foreground/5 focus:border-primary/50 focus:ring-0 transition-all h-10"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black tracking-widest text-primary/70">{t("address")}</Label>
                                    <Input
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        placeholder={t("address_placeholder")}
                                        className="bg-foreground/5 focus:border-primary/50 focus:ring-0 transition-all h-10"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black tracking-widest text-primary/70">{t("google_maps_url")}</Label>
                                    <Input
                                        value={googleMapsUrl}
                                        onChange={e => setGoogleMapsUrl(e.target.value)}
                                        placeholder="https://maps.google.com/..."
                                        className="bg-foreground/5 focus:border-primary/50 focus:ring-0 transition-all h-10"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black tracking-widest text-primary/70">{t("capacity")}</Label>
                                    <Input
                                        value={capacity}
                                        onChange={e => setCapacity(e.target.value)}
                                        placeholder={t("capacity_placeholder")}
                                        type="number"
                                        className="bg-foreground/5 focus:border-primary/50 focus:ring-0 transition-all h-10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black tracking-widest text-primary/70">{t("notes")}</Label>
                                <Input
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder={t("notes_placeholder")}
                                    className="bg-foreground/5 focus:border-primary/50 focus:ring-0 transition-all h-12"
                                />
                            </div>
                            <div className="flex justify-end gap-2 md:gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setOpen(false)}
                                    className="h-10 font-black tracking-tighter px-4 md:px-6 hover:bg-foreground/5"
                                >
                                    {tCommon("cancel")}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSaving || !name.trim()}
                                    className="h-10 bg-primary text-primary-foreground hover:bg-primary/90 px-8 font-black tracking-tighter transition-all relative group overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-foreground/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                    <span className="relative z-10 flex items-center gap-2">
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        {t("save_venue")}
                                    </span>
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-card relative overflow-hidden transition-colors">
                <div className="relative z-0 space-y-4">
                    {/* Venue List */}
                    {isLoading ? (
                        null
                    ) : venues.length === 0 ? (
                        <EmptyState
                            icon={MapPin}
                            title={t("no_venues")}
                            description="Add tournament venues to schedule matches"
                            className="py-12"
                        />
                    ) : (
                        <div className="space-y-2 md:space-y-3">
                            {venues.map((venue) => (
                                <div
                                    key={venue.id}
                                    className="flex items-center justify-between p-2 md:p-3 bg-muted/20 border hover:bg-muted/30 transition-colors group/item"
                                >
                                    <div className="flex items-center gap-2 md:gap-4 flex-1">
                                        <div className="w-10 h-10 bg-muted/20 flex items-center justify-center group-hover/item:bg-primary/10 transition-colors">
                                            <MapPin className="h-5 w-5 text-primary/40 group-hover/item:text-primary transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black tracking-tight text-foreground truncate">{venue.name}</span>
                                                {venue.capacity && (
                                                     <Badge variant="outline" className="border-primary/20 bg-primary/5 text-[9px] font-black tracking-widest px-2 py-0 text-primary/70">
                                                        {venue.capacity.toLocaleString()} {t("capacity_header")}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/40 truncate max-w-[300px]">
                                                    {venue.address || "-"}
                                                </span>
                                                {venue.google_maps_url && (
                                                    <a
                                                        href={venue.google_maps_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary/60 hover:text-primary transition-colors"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 text-red-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                        onClick={() => setVenueToDelete(venue.id)}
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <AlertDialog open={!!venueToDelete} onOpenChange={(open) => !open && setVenueToDelete(null)}>
                    <AlertDialogContent className="bg-card border-border/10 max-w-md">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2">
                                <Trash2 className="h-5 w-5 text-destructive" />
                                {tCommon("delete")}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                                {t("delete_confirm")}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6">
                            <AlertDialogCancel className="border-border/10 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground transition-all h-10 text-[11px] font-black tracking-widest">
                                {tCommon("cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    confirmDeleteVenue();
                                }}
                                className="border border-destructive/20 bg-destructive/90 text-foreground hover:bg-destructive transition-all h-10 text-[11px] font-black tracking-widest"
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                {tCommon("delete")}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
