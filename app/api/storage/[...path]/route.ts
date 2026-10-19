import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2";

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

        // Fetch from Cloudflare R2
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
            const err = r2Err as { name?: string; message?: string };
            if (err?.name !== "NoSuchKey") {
                console.warn(`[Storage Proxy] R2 get failed for key "${key}":`, err?.message || err);
            }
        }

        return new NextResponse("Object Not Found", { status: 404 });
    } catch (error: unknown) {
        console.error("[Storage Proxy Error]:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
