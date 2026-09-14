import { createAdminClient } from "./server";
import { deleteFromR2 } from "../r2";

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
 * Deletes a file from Storage (R2 or Supabase Storage) given its public URL and bucket name.
 */
export async function deleteFileFromUrl(url: string | null | undefined, bucket: string) {
    if (!url) return;

    // Check if it's an R2 URL
    const isR2 = url.includes("r2.dev") || url.includes("r2.cloudflarestorage.com") || (process.env.R2_PUBLIC_URL && url.includes(process.env.R2_PUBLIC_URL));
    if (isR2) {
        await deleteFromR2(url);
        return;
    }

    const path = getFilePathFromUrl(url, bucket);
    if (!path) {
        console.warn(`[deleteFileFromUrl] Could not extract path for bucket ${bucket} from URL: ${url}`);
        return;
    }

    try {
        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase.storage.from(bucket).remove([path]);

        if (error) {
            console.error(`[deleteFileFromUrl] Failed to delete file from ${bucket}:`, error);
        } else {
            console.log(`[deleteFileFromUrl] Successfully deleted file from ${bucket}: ${path}`);
        }
    } catch (err) {
        console.error(`[deleteFileFromUrl] Exception:`, err);
    }
}

