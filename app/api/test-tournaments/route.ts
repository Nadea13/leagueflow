// This route has been disabled for security.
// Remove this file before production deployment.
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json(
        { error: "This endpoint is disabled" },
        { status: 403 }
    );
}
