"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast"; // Assuming usage of Shadcn toast

interface ExportToImageButtonProps {
    targetId: string;
    filename: string;
    label?: string;
}

export function ExportToImageButton({ targetId, filename, label = "Export Image" }: ExportToImageButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleExport = async () => {
        const element = document.getElementById(targetId);
        if (!element) {
            console.error(`Element with id ${targetId} not found`);
            return;
        }

        setIsLoading(true);
        try {
            const dataUrl = await toPng(element, {
                cacheBust: true,
            });
            const link = document.createElement("a");
            link.download = `${filename}.png`;
            link.href = dataUrl;
            link.click();
            toast({
                title: "Image Exported",
                description: "The image has been downloaded successfully.",
            });
        } catch (err) {
            console.error("Failed to export image", err);
            toast({
                title: "Export Failed",
                description: "Could not generate image. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading}>
            <Download className="mr-2 h-4 w-4" />
            {isLoading ? "Exporting..." : label}
        </Button>
    );
}
