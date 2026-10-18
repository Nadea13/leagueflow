"use client";

import { useState, useEffect } from "react";
import { resolveStorageUrl } from "@/lib/storage-utils";

// In-memory cache for extracted colors by URL
const colorCache = new Map<string, string>();

/**
 * Extracts the dominant/overall color of an image URL.
 * Uses an offscreen HTML Canvas with saturation-weighted color analysis.
 * - For colorful logos: extracts the vivid dominant brand color.
 * - For monochrome/black & white logos: generates an elegant silver-white glow ("225, 230, 240").
 * Returns an RGB triplet string, e.g. "59, 130, 246" or "225, 230, 240".
 */
export function extractDominantColor(rawUrl: string): Promise<string | null> {
    if (!rawUrl) return Promise.resolve(null);

    const imageUrl = resolveStorageUrl(rawUrl) || rawUrl;

    if (colorCache.has(rawUrl)) {
        return Promise.resolve(colorCache.get(rawUrl) || null);
    }
    if (colorCache.has(imageUrl)) {
        return Promise.resolve(colorCache.get(imageUrl) || null);
    }

    return new Promise((resolve) => {
        if (typeof window === "undefined") {
            resolve(null);
            return;
        }

        const img = new Image();

        // Only set crossOrigin if loading from a different origin to avoid CORS cache collisions on same-origin endpoints
        const isSameOrigin =
            imageUrl.startsWith("/") ||
            imageUrl.startsWith("data:") ||
            imageUrl.startsWith("blob:") ||
            (typeof window !== "undefined" && imageUrl.startsWith(window.location.origin));

        if (!isSameOrigin) {
            img.crossOrigin = "anonymous";
        }

        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                if (!ctx) {
                    resolve(null);
                    return;
                }

                // Downscale to 32x32 for high performance
                const size = 32;
                canvas.width = size;
                canvas.height = size;
                ctx.drawImage(img, 0, 0, size, size);

                const imgData = ctx.getImageData(0, 0, size, size).data;
                let validPixelCount = 0;
                let maxSaturation = 0;

                // Pass 1: detect overall saturation profile
                for (let i = 0; i < imgData.length; i += 4) {
                    const a = imgData[i + 3];
                    if (a < 32) continue; // Skip transparent
                    validPixelCount++;

                    const r = imgData[i];
                    const g = imgData[i + 1];
                    const b = imgData[i + 2];

                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);
                    const delta = max - min;
                    const saturation = max === 0 ? 0 : delta / max;

                    if (saturation > maxSaturation) {
                        maxSaturation = saturation;
                    }
                }

                if (validPixelCount === 0) {
                    resolve(null);
                    return;
                }

                // Pass 2: If the logo is monochrome / black & white (e.g. maxSaturation < 0.12)
                // Return an elegant, luminous silver-white hue ("225, 230, 240")
                if (maxSaturation < 0.12) {
                    const monochromeGlow = "225, 230, 240";
                    colorCache.set(rawUrl, monochromeGlow);
                    colorCache.set(imageUrl, monochromeGlow);
                    resolve(monochromeGlow);
                    return;
                }

                // Pass 3: Saturated / colorful logo - compute weighted dominant color
                let totalWeight = 0;
                let rSum = 0;
                let gSum = 0;
                let bSum = 0;

                for (let i = 0; i < imgData.length; i += 4) {
                    const a = imgData[i + 3];
                    if (a < 32) continue;

                    const r = imgData[i];
                    const g = imgData[i + 1];
                    const b = imgData[i + 2];

                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);
                    const delta = max - min;
                    const saturation = max === 0 ? 0 : delta / max;

                    // Deprioritize near-white and near-black pixels so colorful features dominate
                    const isNearWhite = r > 245 && g > 245 && b > 245;
                    const isNearBlack = r < 20 && g < 20 && b < 20;

                    let weight = 1 + saturation * 5;
                    if (isNearWhite || isNearBlack) {
                        weight *= 0.05;
                    }

                    rSum += r * weight;
                    gSum += g * weight;
                    bSum += b * weight;
                    totalWeight += weight;
                }

                if (totalWeight > 0) {
                    const finalR = Math.round(rSum / totalWeight);
                    const finalG = Math.round(gSum / totalWeight);
                    const finalB = Math.round(bSum / totalWeight);
                    const rgbString = `${finalR}, ${finalG}, ${finalB}`;
                    colorCache.set(rawUrl, rgbString);
                    colorCache.set(imageUrl, rgbString);
                    resolve(rgbString);
                } else {
                    resolve("225, 230, 240");
                }
            } catch {
                // If canvas security error or any error occurs, fall back to silver-white instead of green
                resolve("225, 230, 240");
            }
        };

        img.onerror = () => {
            resolve(null);
        };

        img.src = imageUrl;
    });
}

/**
 * React hook to retrieve the dominant color of an image URL.
 * Returns an RGB triplet string e.g. "59, 130, 246" or null.
 */
export function useImageColor(imageUrl?: string | null): string | null {
    const [color, setColor] = useState<string | null>(() => {
        if (!imageUrl) return null;
        return colorCache.get(imageUrl) || null;
    });

    useEffect(() => {
        if (!imageUrl) {
            setColor(null);
            return;
        }

        if (colorCache.has(imageUrl)) {
            setColor(colorCache.get(imageUrl) || null);
            return;
        }

        let isMounted = true;
        extractDominantColor(imageUrl).then((extracted) => {
            if (isMounted && extracted) {
                setColor(extracted);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [imageUrl]);

    return color;
}
