"use client";

import { useState, useEffect } from "react";
import { Venue } from "@/types/index";
import { getVenues, addVenue, deleteVenue } from "@/actions/organizer/tournaments/venue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, MapPin, ExternalLink, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";

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

    const fetchVenues = async () => {
        setIsLoading(true);
        const result = await getVenues(tournamentId);
        if (result.success && result.data) {
            setVenues(result.data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchVenues();
    }, [tournamentId]);

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
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                        <MapPin className="h-5 w-5 text-secondary" />
                        {t("title")}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">{t("description")}</p>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button
                            size="sm"
                            className="h-10 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 md:px-6 rounded-none font-black uppercase italic tracking-tighter transition-all relative group overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-foreground/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <span className="relative z-10 flex items-center gap-2 md:gap-3">
                                <Plus className="h-4 w-4" />
                                {t("add_venue")}
                            </span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] bg-[#0A0A0A] border-foreground/5 rounded-none p-0 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-secondary" />
                        <DialogHeader className="p-8 pb-4">
                            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-3">
                                <MapPin className="h-8 w-8 text-secondary" />
                                {t("add_venue")}
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleAdd} className="p-8 pt-4 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase italic tracking-widest text-secondary/70">{t("venue_name")}</Label>
                                    <Input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder={t("name_placeholder")}
                                        required
                                        className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase italic tracking-widest text-secondary/70">{t("address")}</Label>
                                    <Input
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        placeholder={t("address_placeholder")}
                                        className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase italic tracking-widest text-secondary/70">{t("google_maps_url")}</Label>
                                    <Input
                                        value={googleMapsUrl}
                                        onChange={e => setGoogleMapsUrl(e.target.value)}
                                        placeholder="https://maps.google.com/..."
                                        className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase italic tracking-widest text-secondary/70">{t("capacity")}</Label>
                                    <Input
                                        value={capacity}
                                        onChange={e => setCapacity(e.target.value)}
                                        placeholder={t("capacity_placeholder")}
                                        type="number"
                                        className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase italic tracking-widest text-secondary/70">{t("notes")}</Label>
                                <Input
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder={t("notes_placeholder")}
                                    className="bg-foreground/5 border-foreground/10 rounded-none focus:border-secondary/50 focus:ring-0 transition-all h-12"
                                />
                            </div>
                            <div className="flex justify-end gap-4 pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setOpen(false)}
                                    className="h-12 rounded-none border-foreground/10 font-black uppercase italic tracking-tighter px-8 hover:bg-foreground/5"
                                >
                                    {tCommon("cancel")}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSaving || !name.trim()}
                                    className="h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-10 rounded-none font-black uppercase italic tracking-tighter transition-all relative group overflow-hidden"
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

            <div className="bg-background border rounded-none relative overflow-hidden group hover:bg-muted/5 transition-colors shadow-sm">
                <div className="absolute top-0 left-0 z-0 w-1 h-full bg-muted group-hover:bg-secondary/40 transition-colors" />
                <div className="relative z-0 space-y-4 md:space-y-6">
                    {/* Venue List */}
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                        </div>
                    ) : venues.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center border border-foreground/5 bg-background/50">
                            <div className="h-16 w-16 bg-muted/20 flex items-center justify-center mb-6 relative group-hover:scale-110 transition-transform">
                                <div className="absolute inset-0 bg-secondary/10 scale-0 group-hover:scale-100 transition-transform" />
                                <MapPin className="h-8 w-8 text-secondary/40 relative z-10" />
                            </div>
                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-muted-foreground/40">{t("no_venues")}</h3>
                        </div>
                    ) : (
                        <div className="bg-background border border-foreground/5 overflow-hidden">
                            <Table className="border-separate border-spacing-0">
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-foreground/5 bg-muted/20">
                                        <TableHead className="text-[11px] font-black uppercase italic tracking-widest text-secondary/70 h-11 border-b border-foreground/5">{t("name_header")}</TableHead>
                                        <TableHead className="text-[11px] font-black uppercase italic tracking-widest text-secondary/70 h-11 border-b border-foreground/5">{t("address_header")}</TableHead>
                                        <TableHead className="text-[11px] font-black uppercase italic tracking-widest text-secondary/70 h-11 border-b border-foreground/5 text-right">{t("capacity_header")}</TableHead>
                                        <TableHead className="w-[80px] h-11 border-b border-foreground/5"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {venues.map((venue) => (
                                        <TableRow key={venue.id} className="hover:bg-muted/5 transition-colors border-foreground/5 group/row">
                                            <TableCell className="py-3 border-b border-foreground/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 flex items-center justify-center bg-muted/20 group-hover/row:bg-secondary/10 transition-colors">
                                                        <MapPin className="h-4 w-4 text-secondary/40 group-hover/row:text-secondary transition-colors" />
                                                    </div>
                                                    <span className="text-sm font-black uppercase italic tracking-tight text-foreground">{venue.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 border-b border-foreground/5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[13px] text-muted-foreground uppercase font-bold tracking-tight truncate max-w-[200px]">
                                                        {venue.address || "-"}
                                                    </span>
                                                    {venue.google_maps_url && (
                                                        <a
                                                            href={venue.google_maps_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-secondary/60 hover:text-secondary transition-colors"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 text-right border-b border-foreground/5">
                                                <span className="text-sm font-black italic text-foreground tracking-tighter">
                                                    {venue.capacity ? venue.capacity.toLocaleString() : "-"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-3 border-b border-foreground/5">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-10 w-10 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-none transition-all"
                                                    onClick={() => setVenueToDelete(venue.id)}
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                <AlertDialog open={!!venueToDelete} onOpenChange={(open) => !open && setVenueToDelete(null)}>
                    <AlertDialogContent className="bg-card border-border/10 rounded-none shadow-2xl max-w-md">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                                <Trash2 className="h-5 w-5 text-destructive" />
                                {tCommon("delete")}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                                {t("delete_confirm")}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6">
                            <AlertDialogCancel className="rounded-none border-border/10 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground transition-all h-10 text-[11px] font-black uppercase tracking-widest">
                                {tCommon("cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    confirmDeleteVenue();
                                }}
                                className="rounded-none border border-destructive/20 bg-destructive/90 text-foreground hover:bg-destructive hover:shadow-[0_0_15_rgba(220,38,38,0.3)] transition-all h-10 text-[11px] font-black uppercase tracking-widest"
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
