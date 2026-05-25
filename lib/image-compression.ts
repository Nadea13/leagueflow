/**
 * Compresses an image file and converts it to AVIF format (with WEBP and JPEG fallbacks).
 * Scales the image down to a reasonable max width for profiles/avatars.
 */
export async function compressAndConvertToAvif(file: File, maxWidth = 300, quality = 0.85): Promise<File> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                // Scale down if it exceeds maxWidth
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Canvas context is not available"));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);

                // Attempt to export to AVIF first, then WEBP, then JPEG
                const formats = ["image/avif", "image/webp", "image/jpeg"];
                
                const tryExport = (index: number) => {
                    if (index >= formats.length) {
                        reject(new Error("No supported formats found for compression"));
                        return;
                    }

                    const format = formats[index];
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const ext = format.split("/")[1];
                                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + `.${ext}`, {
                                    type: format,
                                    lastModified: Date.now(),
                                });
                                resolve(compressedFile);
                            } else {
                                tryExport(index + 1);
                            }
                        },
                        format,
                        quality
                    );
                };

                tryExport(0);
            };
            img.onerror = () => reject(new Error("Failed to load image into element"));
            img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Failed to read image file"));
        reader.readAsDataURL(file);
    });
}
