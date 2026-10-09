import { NextRequest, NextResponse } from "next/server";
import { getUnifiedInboxData, getTournamentTeamRoster } from "@/actions/tournaments/staff";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const rosterTeamId = searchParams.get("rosterTeamId");

        const [inboxRes, rosterRes] = await Promise.all([
            getUnifiedInboxData(),
            rosterTeamId ? getTournamentTeamRoster(rosterTeamId) : Promise.resolve(null)
        ]);

        return NextResponse.json({
            success: true,
            inbox: inboxRes.success ? inboxRes.data : null,
            roster: rosterRes && rosterRes.success ? rosterRes.data : null
        });
    } catch (e: any) {
        return NextResponse.json(
            { success: false, error: e?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
