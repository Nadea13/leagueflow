"use client";

import { useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Search, Trophy, Trash2, ExternalLink } from "lucide-react";
import { deleteTournamentAsAdmin } from "@/app/[locale]/admin/actions";
import { Link } from "@/i18n/routing";

import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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

interface AdminTournamentsTableProps {
    initialTournaments: any[];
}

export function AdminTournamentsTable({ initialTournaments }: AdminTournamentsTableProps) {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [tournaments, setTournaments] = useState(initialTournaments);

    const filteredTournaments = tournaments.filter(t =>
        (t.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (t.owner_email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string, name: string) => {
        const result = await deleteTournamentAsAdmin(id);
        if (result.success) {
            toast({
                description: `Deleted tournament: ${name}`,
            });
            setTournaments(tournaments.filter(t => t.id !== id));
        } else {
            toast({
                variant: "destructive",
                description: `Failed to delete tournament: ${result.error}`,
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'default'; // success/green ish typically or primary
            case 'completed': return 'secondary';
            default: return 'outline';
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative w-full md:w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search tournaments..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tournament</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTournaments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No tournaments found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTournaments.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{t.name}</span>
                                            <span className="text-xs text-muted-foreground capitalize">{t.format}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {t.owner_email}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusColor(t.status)} className="capitalize">
                                            {t.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {t.plan || 'Free'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {format(new Date(t.created_at), "d MMM yyyy", { locale: th })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/dashboard/tournaments/${t.id}`} target="_blank">
                                                <Button variant="ghost" size="icon" title="View">
                                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </Link>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" title="Delete">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Force Delete Tournament?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete <b>{t.name}</b> and all associated matches, teams, and data.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            onClick={() => handleDelete(t.id, t.name)}
                                                        >
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="text-xs text-muted-foreground text-center">
                Total {filteredTournaments.length} tournaments
            </div>
        </div>
    );
}
