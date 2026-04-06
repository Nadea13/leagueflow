/**
 * File upload security utilities
 */

const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface FileValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validates an uploaded file for security.
 * Checks MIME type and file size.
 */
export function validateUploadedFile(
    file: File,
    options?: {
        allowedTypes?: string[];
        maxSize?: number;
    }
): FileValidationResult {
    const allowedTypes = options?.allowedTypes || ALLOWED_IMAGE_TYPES;
    const maxSize = options?.maxSize || MAX_FILE_SIZE;

    if (!file || file.size === 0) {
        return { valid: false, error: "No file provided" };
    }

    if (file.size > maxSize) {
        const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
        return { valid: false, error: `File size must be less than ${maxMB}MB` };
    }

    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Unsupported file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}`
        };
    }

    // Validate file extension matches MIME type
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExtensions: Record<string, string[]> = {
        'image/jpeg': ['jpg', 'jpeg'],
        'image/png': ['png'],
        'image/webp': ['webp'],
        'image/gif': ['gif'],
        'image/svg+xml': ['svg'],
    };

    const expectedExts = validExtensions[file.type];
    if (expectedExts && ext && !expectedExts.includes(ext)) {
        return {
            valid: false,
            error: `File extension .${ext} does not match file type ${file.type}`
        };
    }

    return { valid: true };
}

/**
 * Generates a safe filename using timestamp and random string.
 * Prevents path traversal and special character injection.
 */
export function generateSafeFileName(originalName: string, prefix?: string): string {
    const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';
    // Only allow alphanumeric extensions
    const safeExt = ext.replace(/[^a-z0-9]/g, '');
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const safePrefix = prefix ? prefix.replace(/[^a-zA-Z0-9_-]/g, '') + '-' : '';
    return `${safePrefix}${timestamp}-${random}.${safeExt}`;
}
