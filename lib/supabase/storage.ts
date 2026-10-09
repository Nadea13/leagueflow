import { deleteFromR2 } from "../r2";

export function getFilePathFromUrl(url: string, bucket: string): string | null {
    try {
        const decodedUrl = decodeURIComponent(url);
        const marker = `/${bucket}/`;
        const index = decodedUrl.indexOf(marker);
        if (index === -1) return null;
        return decodedUrl.slice(index + marker.length);
    } catch (error) {
        console.error("[getFilePathFromUrl] Error parsing URL:", error);
        return null;
    }
}

export async function deleteFileFromUrl(url: string | null | undefined, _bucket?: string) {
    if (!url) return;
    try {
        await deleteFromR2(url);
    } catch (err) {
        console.error(`[deleteFileFromUrl] Exception:`, err);
    }
}
