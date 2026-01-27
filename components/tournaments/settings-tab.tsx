"use client";

import { useActionState } from "react";
import { updateTournament, resetFixtures, deleteTournament } from "@/app/[locale]/dashboard/tournaments/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useTransition } from "react";
import { ActionResponse, TournamentMember } from "@/types/index";
import { useTranslations } from "next-intl";
import { inviteMember, removeMember } from "@/app/[locale]/dashboard/tournaments/[id]/member-actions";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { createInviteLink } from "@/app/[locale]/actions/invites";
import { Copy, Link as LinkIcon, Check } from "lucide-react";

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

export function SettingsTab({ tournament, hasFixtures, members = [] }: { tournament: any; hasFixtures: boolean, members?: TournamentMember[] }) {
    const t = useTranslations("Settings");
    const tCommon = useTranslations("Common");
    const tDialog = useTranslations("Dialog");
    const updateTournamentWithId = updateTournament.bind(null, tournament.id);
    const [state, formAction] = useActionState(updateTournamentWithId, initialState);
    const [isPending, startTransition] = useTransition();

    const { toast } = useToast();
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteLink, setInviteLink] = useState("");
    const [hasCopied, setHasCopied] = useState(false);

    const handleGenerateLink = () => {
        startTransition(async () => {
            const res = await createInviteLink(tournament.id);
            if (res.success && res.data) {
                setInviteLink(res.data.url);
                navigator.clipboard.writeText(res.data.url);
                setHasCopied(true);
                toast({ title: "Link Copied!", description: "Invite link copied to clipboard." });
                setTimeout(() => setHasCopied(false), 2000);
            } else {
                toast({ title: "Error", description: res.error || "Failed to generate link", variant: "destructive" });
            }
        });
    };

    // Invite Handler
    const handleInvite = () => {
        if (!inviteEmail) return;
        startTransition(async () => {
            const res = await inviteMember(tournament.id, inviteEmail, 'editor');
            if (res.success) {
                setInviteEmail("");
                toast({ title: "Success", description: "Member invited successfully" });
            } else {
                toast({ title: "Error", description: res.error || "Failed to invite member", variant: "destructive" });
            }
        });
    };

    const handleRemove = (memberId: string) => {
        if (!confirm("Remove this member?")) return;
        startTransition(async () => {
            const res = await removeMember(memberId, tournament.id);
            if (res.success) {
                toast({ title: "Success", description: "Member removed" });
            } else {
                toast({ title: "Error", description: "Failed to remove member", variant: "destructive" });
            }
        });
    };

    const handleReset = () => {
        if (confirm(t("reset_desc") + "?")) {
            startTransition(async () => {
                await resetFixtures(tournament.id);
            });
        }
    };

    const handleDelete = () => {
        if (confirm(t("delete_desc") + "?")) {
            startTransition(async () => {
                await deleteTournament(tournament.id);
            });
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{t("general_info")}</CardTitle>
                    <CardDescription>{t("update_details")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        <div className="grid w-full max-w-sm gap-1.5">
                            <Label htmlFor="name">{tDialog("name")}</Label>
                            <Input type="text" id="name" name="name" defaultValue={tournament.name} placeholder={tDialog("name")} />
                        </div>
                        <div className="grid w-full max-w-sm gap-1.5">
                            <Label htmlFor="status">{t("status")}</Label>
                            <Select name="status" defaultValue={tournament.status || "draft"}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("select_status")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">{t("draft")}</SelectItem>
                                    <SelectItem value="active">{t("active")}</SelectItem>
                                    <SelectItem value="completed">{t("completed")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {state.error && <p className="text-sm text-red-500">{state.error}</p>}
                        <Button type="submit">{t("save_changes")}</Button>
                    </form>
                </CardContent>

            </Card>

            {/* Collaborators Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Collaborators</CardTitle>
                    <CardDescription>Invite others to help manage this tournament.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Invite Link Section */}
                    <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg border">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <LinkIcon className="w-4 h-4 text-primary" />
                                <h4 className="font-medium text-sm">Shareable Invite Link</h4>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleGenerateLink} disabled={isPending}>
                                {hasCopied ? (
                                    <>
                                        <Check className="w-3 h-3 mr-2" /> Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3 h-3 mr-2" /> Copy Link
                                    </>
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Anyone with this link can join as an Editor.
                        </p>
                        {inviteLink && (
                            <code className="text-xs bg-background p-2 rounded border block overflow-hidden text-ellipsis">
                                {inviteLink}
                            </code>
                        )}
                    </div>

                    <Separator />

                    {/* Invite Form */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter email to invite..."
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                        />
                        <Button onClick={handleInvite} disabled={isPending || !inviteEmail}>
                            <UserPlus className="w-4 h-4 mr-2" /> Invite
                        </Button>
                    </div>

                    {/* Members List */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Current Members</h4>
                        {members.length === 0 && <p className="text-sm text-muted-foreground italic">No collaborators yet.</p>}
                        {members.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg bg-card text-card-foreground shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">{member.email || "Unknown User"}</span>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="text-xs uppercase">{member.role}</Badge>
                                        <Badge variant={member.status === 'accepted' ? 'default' : 'secondary'} className="text-xs capitalize">
                                            {member.status}
                                        </Badge>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleRemove(member.id)} disabled={isPending}>
                                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-red-200 dark:border-red-900">
                <CardHeader>
                    <CardTitle className="text-red-500">{t("danger_zone")}</CardTitle>
                    <CardDescription>{t("delete_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {hasFixtures && (
                        <>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium">{t("reset_fixtures")}</h4>
                                    <p className="text-sm text-muted-foreground">{t("reset_desc")}</p>
                                </div>
                                <Button variant="destructive" onClick={handleReset} disabled={isPending}>
                                    {isPending ? tCommon("loading") : t("reset_fixtures")}
                                </Button>
                            </div>
                            <Separator />
                        </>
                    )}
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium">{t("delete_tournament")}</h4>
                            <p className="text-sm text-muted-foreground">{t("delete_desc")}</p>
                        </div>
                        <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                            {isPending ? tCommon("loading") : t("delete_tournament")}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
