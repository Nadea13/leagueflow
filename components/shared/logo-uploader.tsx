"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressAndConvertToAvif } from "@/lib/image-compression";

interface LogoUploaderProps {
    id: string;
    name?: string;
    initialUrl?: string | null;
    onFileChange?: (file: File | null) => void;
    onRemove?: () => void;
    disabled?: boolean;
    uploadLabel?: string;
    clickToUploadLabel?: string;
    previewLabel?: string;
    imageFit?: "contain" | "cover";
    maxWidth?: number;
    quality?: number;
}

export function LogoUploader({
    id,
    name,
    initialUrl = null,
    onFileChange,
    onRemove,
    disabled = false,
    uploadLabel = "Upload Logo",
    clickToUploadLabel = "Click to Upload",
    previewLabel = "Preview",
    imageFit = "contain",
    maxWidth = 512,
    quality = 0.8,
}: LogoUploaderProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl);
    const [isCompressing, setIsCompressing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setPreviewUrl(initialUrl);
    }, [initialUrl]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsCompressing(true);
            try {
                const compressed = await compressAndConvertToAvif(file, maxWidth, quality);
                const url = URL.createObjectURL(compressed);
                setPreviewUrl(url);
                onFileChange?.(compressed);
            } catch (error) {
                console.error("Image compression failed, using original file:", error);
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
                onFileChange?.(file);
            } finally {
                setIsCompressing(false);
            }
        }
    };

    const handleRemoveLogo = () => {
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        onFileChange?.(null);
        onRemove?.();
    };

    return (
        <div className="flex items-start gap-2 md:gap-4 p-2 md:p-4 border rounded-sm">
            <div className="relative group">
                <div className="h-20 w-20 flex items-center justify-center border-2 border-dashed overflow-hidden rounded-sm border-border">
                    {isCompressing ? (
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    ) : previewUrl ? (
                        <Image
                            src={previewUrl}
                            alt={previewLabel}
                            width={80}
                            height={80}
                            className={`h-full w-full p-1 rounded-sm ${
                                imageFit === "cover" ? "object-cover" : "object-contain"
                            }`}
                        />
                    ) : (
                        <Upload className="h-8 w-8 text-primary" />
                    )}
                </div>
            </div>

            <div className="flex-1">
                <div className="flex gap-2">
                    <Label
                        htmlFor={id}
                        className={`cursor-pointer flex-1 inline-flex items-center justify-center h-10 px-6 rounded-sm hover:bg-muted/30 border whitespace-nowrap text-[10px] font-black tracking-widest transition-all ${
                            disabled || isCompressing ? "pointer-events-none opacity-50" : ""
                        }`}
                    >
                        {previewUrl ? clickToUploadLabel : uploadLabel}
                    </Label>
                    {previewUrl && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0 border"
                            onClick={handleRemoveLogo}
                            disabled={disabled || isCompressing}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <Input
                    id={id}
                    name={name}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    disabled={disabled || isCompressing}
                />
                <p className="text-[10px] text-muted-foreground/50 mt-1">PNG, JPG</p>
            </div>
        </div>
    );
}
