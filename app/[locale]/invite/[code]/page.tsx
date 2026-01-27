import { getInviteDetails, joinTournament } from "@/app/[locale]/actions/invites";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { createClient } from "@/utils/supabase/server";
import { CheckCircle2, Ticket, UserPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const t = await getTranslations("Common");
    const supabase = await createClient();

    // 1. Fetch Invite Details
    const { data: invite, error } = await getInviteDetails(code);

    if (error || !invite) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                            <Ticket className="h-6 w-6 text-red-600" />
                        </div>
                        <CardTitle className="text-xl text-red-600">Invalid Invite</CardTitle>
                        <CardDescription>
                            This invite link is invalid or has expired.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="justify-center">
                        <Link href="/">
                            <Button variant="outline">Go Home</Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // 2. Check Authentication
    const { data: { user } } = await supabase.auth.getUser();

    // 3. Handle Join Action
    async function handleJoin() {
        "use server";
        if (!user) {
            redirect(`/login?next=/invite/${code}`);
        }

        const res = await joinTournament(code);
        if (res.success) {
            redirect(`/dashboard/tournaments/${res.data?.tournamentId || invite.tournament_id}`);
        } else {
            // Handle error (simple redirect for now, could be better)
            redirect(`/dashboard?error=${encodeURIComponent(res.error || "Failed to join")}`);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md border-t-4 border-t-primary shadow-lg">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <UserPlus className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">You've been invited!</CardTitle>
                    <CardDescription className="text-base mt-2">
                        To help manage the tournament:
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <div className="p-4 bg-muted rounded-lg border">
                        <h3 className="font-bold text-xl text-foreground">
                            {/* @ts-ignore - Supabase types join glitch */}
                            {invite.tournament?.name || "Tournament"}
                        </h3>
                        <p className="text-sm text-muted-foreground capitalize mt-1">
                            {/* @ts-ignore */}
                            Format: {invite.tournament?.format || "Unknown"}
                        </p>
                    </div>

                    {!user && (
                        <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded border border-amber-200 dark:border-amber-800">
                            You need to log in to join this tournament.
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <form action={handleJoin} className="w-full">
                        <Button className="w-full" size="lg">
                            {user ? "Join Tournament" : "Log in to Join"}
                        </Button>
                    </form>
                    <Link href="/" className="text-sm text-muted-foreground hover:underline">
                        No thanks, take me home
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
