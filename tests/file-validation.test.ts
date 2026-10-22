import { describe, it, expect } from 'vitest';
import { validateUploadedFile, generateSafeFileName } from '@/lib/file-validation';

describe('validateUploadedFile', () => {
    it('should reject when file is missing or has 0 bytes', () => {
        const emptyFile = new File([], 'test.png', { type: 'image/png' });
        const res = validateUploadedFile(emptyFile);
        expect(res.valid).toBe(false);
        expect(res.error).toBe('No file provided');
    });

    it('should accept valid PNG and JPEG images', () => {
        const pngFile = new File(['dummy-bytes'], 'avatar.png', { type: 'image/png' });
        const resPng = validateUploadedFile(pngFile);
        expect(resPng.valid).toBe(true);

        const jpgFile = new File(['dummy-bytes'], 'banner.jpg', { type: 'image/jpeg' });
        const resJpg = validateUploadedFile(jpgFile);
        expect(resJpg.valid).toBe(true);
    });

    it('should reject unallowed MIME types like executable or script files', () => {
        const exeFile = new File(['virus'], 'hack.exe', { type: 'application/x-msdownload' });
        const res = validateUploadedFile(exeFile);
        expect(res.valid).toBe(false);
        expect(res.error).toContain('Unsupported file type');
    });

    it('should reject files when extension does not match MIME type (spoofing attempt)', () => {
        const spoofedFile = new File(['script content'], 'evil.exe', { type: 'image/png' });
        const res = validateUploadedFile(spoofedFile);
        expect(res.valid).toBe(false);
        expect(res.error).toContain('File extension .exe does not match file type image/png');
    });

    it('should enforce maxSize option correctly', () => {
        const largeContent = new Uint8Array(10 * 1024 * 1024); // 10MB
        const largeFile = new File([largeContent], 'heavy.png', { type: 'image/png' });

        const res = validateUploadedFile(largeFile, { maxSize: 5 * 1024 * 1024 }); // 5MB limit
        expect(res.valid).toBe(false);
        expect(res.error).toContain('File size exceeds maximum limit');
    });

    it('should pass when file is within maxSize limit', () => {
        const smallContent = new Uint8Array(1 * 1024 * 1024); // 1MB
        const smallFile = new File([smallContent], 'light.png', { type: 'image/png' });

        const res = validateUploadedFile(smallFile, { maxSize: 5 * 1024 * 1024 });
        expect(res.valid).toBe(true);
    });
});

describe('generateSafeFileName', () => {
    it('should sanitize filename and strip path traversal attempts', () => {
        const malicious = '../../etc/passwd.png';
        const safeName = generateSafeFileName(malicious, 'slip');
        expect(safeName).toMatch(/^slip-\d+-[a-z0-9]+\.png$/);
        expect(safeName).not.toContain('..');
        expect(safeName).not.toContain('/');
    });

    it('should maintain prefix and safe alphanumeric extension', () => {
        const original = 'team_logo.webp';
        const safeName = generateSafeFileName(original, 'logo');
        expect(safeName).toMatch(/^logo-\d+-[a-z0-9]+\.webp$/);
    });
});
