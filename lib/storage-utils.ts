/**
 * Utility functions for resolving and formatting storage URLs.
 * Works seamlessly on both client and server side.
 */

export function resolveStorageUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    const trimmed = url.trim();
    if (!trimmed) return null;

    // Handle Cloudflare R2 internal/private S3 endpoint
    // e.g. https://leagueflow.123456789.r2.cloudflarestorage.com/teams/abc/logo.png
    // e.g. https://123456789.r2.cloudflarestorage.com/leagueflow/teams/abc/logo.png
    if (trimmed.includes(".r2.cloudflarestorage.com/")) {
        const parts = trimmed.split(".r2.cloudflarestorage.com/");
        if (parts.length > 1) {
            let key = parts[1].replace(/^\/+/, "");
            // If the key starts with the bucket name e.g. "league-flow-local/teams/...", strip the bucket name
            const bucketName = process.env.R2_BUCKET_NAME || "league-flow-local";
            if (key.startsWith(`${bucketName}/`)) {
                key = key.slice(bucketName.length + 1);
            }
            return `/api/storage/${key}`;
        }
    }

    // Handle Cloudflare R2 public dev URL
    // e.g. https://pub-8080cc31b27e40c3ab82a87acbb6b477.r2.dev/teams/abc/logo.png
    if (trimmed.includes(".r2.dev/")) {
        const parts = trimmed.split(".r2.dev/");
        if (parts.length > 1) {
            const key = parts[1].replace(/^\/+/, "");
            return `/api/storage/${key}`;
        }
    }

    // If already routed to our storage proxy
    if (trimmed.startsWith("/api/storage/")) {
        return trimmed;
    }

    // Handle legacy storage public URL if needed
    // e.g. /storage/v1/object/public/logos/team.png
    if (trimmed.includes("/storage/v1/object/public/")) {
        const parts = trimmed.split("/storage/v1/object/public/");
        if (parts.length > 1) {
            const key = parts[1].replace(/^\/+/, "");
            return `/api/storage/${key}`;
        }
    }

    // If it's a relative storage path without http/https (e.g. "teams/...", "players/...", "tournaments/...", "logos/...", "avatars/...", "slips/...")
    if (
        !trimmed.startsWith("http://") &&
        !trimmed.startsWith("https://") &&
        !trimmed.startsWith("data:") &&
        !trimmed.startsWith("blob:") &&
        !trimmed.startsWith("/")
    ) {
        return `/api/storage/${trimmed}`;
    }

    return trimmed;
}
