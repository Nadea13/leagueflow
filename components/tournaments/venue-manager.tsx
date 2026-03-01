"use client";

import { useState, useEffect } from "react";
import { Venue } from "@/types/index";
import { getVenues, addVenue, deleteVenue } from "@/app/[locale]/dashboard/tournaments/[id]/venue-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, MapPin, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";

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
    const [showForm, setShowForm] = useState(false);

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
            setShowForm(false);
            fetchVenues();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleDelete = async (venueId: string) => {
        if (!confirm(t("delete_confirm"))) return;

        const result = await deleteVenue(venueId, tournamentId);
        if (result.success) {
            toast({ title: tCommon("success"), description: t("deleted_success") });
            fetchVenues();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6 border rounded-none p-6 bg-background shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold leading-none tracking-tight mb-2">
                        <MapPin className="inline h-4 w-4 mr-2" />
                        {t("title")}
                    </h3>
                    <p className="text-sm text-muted-foreground">{t("description")}</p>
                </div>
                <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("add_venue")}</span>
                </Button>
            </div>

            {/* Add Form */}
            {showForm && (
                <form onSubmit={handleAdd} className="p-4 bg-muted/30 rounded-none border space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>{t("venue_name")}</Label>
                            <Input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder={t("name_placeholder")}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>{t("address")}</Label>
                            <Input
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                placeholder={t("address_placeholder")}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>{t("google_maps_url")}</Label>
                            <Input
                                value={googleMapsUrl}
                                onChange={e => setGoogleMapsUrl(e.target.value)}
                                placeholder="https://maps.google.com/..."
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>{t("capacity")}</Label>
                            <Input
                                value={capacity}
                                onChange={e => setCapacity(e.target.value)}
                                placeholder={t("capacity_placeholder")}
                                type="number"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label>{t("notes")}</Label>
                        <Input
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder={t("notes_placeholder")}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                            {tCommon("cancel")}
                        </Button>
                        <Button type="submit" size="sm" disabled={isSaving || !name.trim()}>
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                            {t("save_venue")}
                        </Button>
                    </div>
                </form>
            )}

            {/* Venue List */}
            {isLoading ? (
                <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : venues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-none bg-muted/10">
                    <div className="h-12 w-12 rounded-none bg-muted/20 flex items-center justify-center mb-4">
                        <MapPin className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">{t("no_venues")}</h3>
                </div>
            ) : (
                <div className="border rounded-none">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("name_header")}</TableHead>
                                <TableHead>{t("address_header")}</TableHead>
                                <TableHead className="text-center">{t("capacity_header")}</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {venues.map((venue) => (
                                <TableRow key={venue.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                                            {venue.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <span className="truncate max-w-[200px]">{venue.address || "-"}</span>
                                            {venue.google_maps_url && (
                                                <a
                                                    href={venue.google_maps_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:text-primary/80"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">{venue.capacity || "-"}</TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive/90"
                                            onClick={() => handleDelete(venue.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
