import { createAdminClient } from "./server";

/**
 * Extracts the relative file path from a Supabase Storage public URL.
 * Standard Format: .../storage/v1/object/public/[bucket]/[path/to/file.ext]
 */
export function getFilePathFromUrl(url: string, bucket: string): string | null {
    try {
        const decodedUrl = decodeURIComponent(url);
        const marker = `/storage/v1/object/public/${bucket}/`;
        const index = decodedUrl.indexOf(marker);
        
        if (index === -1) return null;
        
        return decodedUrl.slice(index + marker.length);
    } catch (error) {
        console.error("[getFilePathFromUrl] Error parsing URL:", error);
        return null;
    }
}

/**
 * Deletes a file from Supabase Storage given its public URL and bucket name.
 */
export async function deleteFileFromUrl(url: string | null | undefined, bucket: string) {
    if (!url) return;

    const path = getFilePathFromUrl(url, bucket);
    if (!path) {
        console.warn(`[deleteFileFromUrl] Could not extract path for bucket ${bucket} from URL: ${url}`);
        return;
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.storage.from(bucket).remove([path]);

    if (error) {
        console.error(`[deleteFileFromUrl] Failed to delete file from ${bucket}:`, error);
    } else {
        console.log(`[deleteFileFromUrl] Successfully deleted file from ${bucket}: ${path}`);
    }
}
