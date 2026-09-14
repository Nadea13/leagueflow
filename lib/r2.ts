import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || "league-flow-local";
const publicUrl = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

// Initialize S3 Client for Cloudflare R2
export const r2Client = new S3Client({
    region: "auto",
    endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
    credentials: {
        accessKeyId: accessKeyId || "",
        secretAccessKey: secretAccessKey || "",
    },
});

export interface UploadResult {
    success: boolean;
    url?: string;
    key?: string;
    error?: string;
}

/**
 * Uploads a file (Buffer, Uint8Array, or File) to Cloudflare R2 Storage.
 * @param file File | Blob | Buffer | Uint8Array
 * @param path e.g. "tournaments/logo-123.png" or "teams/team-1/logo.png"
 * @param contentType optional mime type, e.g. "image/png"
 */
export async function uploadToR2(
    file: File | Blob | Buffer | Uint8Array,
    path: string,
    contentType?: string
): Promise<UploadResult> {
    try {
        if (!accountId || !accessKeyId || !secretAccessKey) {
            console.warn("[R2] Cloudflare R2 credentials not fully configured. File path:", path);
            return {
                success: false,
                error: "Cloudflare R2 credentials are not configured",
            };
        }

        let bodyBuffer: Buffer | Uint8Array;
        let mimeType = contentType;

        if (typeof File !== "undefined" && file instanceof File) {
            const arrayBuffer = await file.arrayBuffer();
            bodyBuffer = Buffer.from(arrayBuffer);
            if (!mimeType) mimeType = file.type || "application/octet-stream";
        } else if (typeof Blob !== "undefined" && file instanceof Blob) {
            const arrayBuffer = await file.arrayBuffer();
            bodyBuffer = Buffer.from(arrayBuffer);
            if (!mimeType) mimeType = file.type || "application/octet-stream";
        } else if (Buffer.isBuffer(file)) {
            bodyBuffer = file;
        } else if (file instanceof Uint8Array) {
            bodyBuffer = Buffer.from(file.buffer, file.byteOffset, file.byteLength);
        } else if (file instanceof Blob) {
            const arrayBuffer = await file.arrayBuffer();
            bodyBuffer = Buffer.from(arrayBuffer);
            if (!mimeType) mimeType = file.type || "application/octet-stream";
        } else {
            bodyBuffer = Buffer.from(file as unknown as string);
        }


        const cleanKey = path.replace(/^\/+/, "");

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: cleanKey,
            Body: bodyBuffer,
            ContentType: mimeType || "application/octet-stream",
        });

        await r2Client.send(command);

        // Construct public URL
        const fileUrl = publicUrl
            ? `${publicUrl}/${cleanKey}`
            : `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${cleanKey}`;

        return {
            success: true,
            url: fileUrl,
            key: cleanKey,
        };
    } catch (error) {
        console.error("[R2 Upload Error]:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to upload file to R2",
        };
    }
}

/**
 * Extracts the storage key from an R2 public URL.
 */
export function getR2KeyFromUrl(url: string): string | null {
    try {
        if (!url) return null;
        const decodedUrl = decodeURIComponent(url);

        if (publicUrl && decodedUrl.startsWith(publicUrl)) {
            return decodedUrl.slice(publicUrl.length).replace(/^\/+/, "");
        }

        // Check if URL has R2 hostname
        const urlObj = new URL(decodedUrl);
        return urlObj.pathname.replace(/^\/+/, "");
    } catch (error) {
        console.error("[getR2KeyFromUrl] Error parsing URL:", error);
        return null;
    }
}

/**
 * Deletes a file from Cloudflare R2 Storage by URL or Key.
 */
export async function deleteFromR2(urlOrKey: string | null | undefined): Promise<boolean> {
    if (!urlOrKey) return true;

    try {
        if (!accountId || !accessKeyId || !secretAccessKey) {
            console.warn("[R2] Credentials missing for delete operation:", urlOrKey);
            return false;
        }

        let key = urlOrKey;
        if (urlOrKey.startsWith("http://") || urlOrKey.startsWith("https://")) {
            const extracted = getR2KeyFromUrl(urlOrKey);
            if (extracted) key = extracted;
        }

        key = key.replace(/^\/+/, "");

        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        await r2Client.send(command);
        console.log(`[R2] Successfully deleted object: ${key}`);
        return true;
    } catch (error) {
        console.error(`[R2 Delete Error] Key: ${urlOrKey}`, error);
        return false;
    }
}
