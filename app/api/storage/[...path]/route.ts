import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2";
import { createAdminClient } from "@/lib/supabase/server";

const bucketName = process.env.R2_BUCKET_NAME || "league-flow-local";

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await context.params;
        if (!path || path.length === 0) {
            return new NextResponse("Not Found", { status: 404 });
        }

        const rawKey = path.join("/");
        const key = decodeURIComponent(rawKey).replace(/^\/+/, "");

        // 1. Try fetching from Cloudflare R2
        try {
            const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: key,
            });

            const response = await r2Client.send(command);

            if (response.Body) {
                const headers = new Headers();
                if (response.ContentType) {
                    headers.set("Content-Type", response.ContentType);
                }
                if (response.ContentLength) {
                    headers.set("Content-Length", response.ContentLength.toString());
                }
                if (response.ETag) {
                    headers.set("ETag", response.ETag);
                }
                headers.set("Cache-Control", "public, max-age=31536000, immutable");
                headers.set("Access-Control-Allow-Origin", "*");

                const stream = response.Body.transformToWebStream();
                return new NextResponse(stream, {
                    status: 200,
                    headers,
                });
            }
        } catch (r2Err: unknown) {
            // If R2 failed, attempt fallback strategies
            const err = r2Err as { name?: string; message?: string };
            if (err?.name !== "NoSuchKey") {
                console.warn(`[Storage Proxy] R2 get failed for key "${key}":`, err?.message || err);
            }
        }

        // 2. Fallback: Check Supabase Storage
        try {
            const adminSupabase = createAdminClient();
            
            // Deduce bucket and relative path
            // e.g. "teams/team1/logo.png" -> bucket "teams" or "avatars" or "logos", path "team1/logo.png"
            const segments = key.split("/");
            const firstSeg = segments[0];
            const remainingPath = segments.slice(1).join("/");

            const candidateBuckets = [
                firstSeg,
                "avatars",
                "logos",
                "players",
                "tournaments",
                "slips",
                "public"
            ];

            for (const bucket of Array.from(new Set(candidateBuckets))) {
                const searchPaths = remainingPath ? [remainingPath, key] : [key];
                for (const p of searchPaths) {
                    const { data: blob, error } = await adminSupabase.storage
                        .from(bucket)
                        .download(p);

                    if (blob && !error) {
                        const headers = new Headers();
                        headers.set("Content-Type", blob.type || "application/octet-stream");
                        headers.set("Cache-Control", "public, max-age=31536000, immutable");
                        headers.set("Access-Control-Allow-Origin", "*");
                        return new NextResponse(blob, {
                            status: 200,
                            headers,
                        });
                    }
                }
            }
        } catch (sbErr) {
            console.error("[Storage Proxy] Supabase fallback error:", sbErr);
        }

        return new NextResponse("Object Not Found", { status: 404 });
    } catch (error: unknown) {
        console.error("[Storage Proxy Error]:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
