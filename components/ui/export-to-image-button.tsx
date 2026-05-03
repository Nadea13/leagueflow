"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast"; // Assuming usage of Shadcn toast

import { cn } from "@/lib/utils";

interface ExportToImageButtonProps {
    targetId: string;
    filename: string;
    label?: string;
    className?: string;
}

export function ExportToImageButton({ targetId, filename, label = "Export Image", className }: ExportToImageButtonProps) {
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
                backgroundColor: '#000000', // Ensure dark background for export if needed
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
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport} 
            disabled={isLoading}
            className={cn(className)}
        >
            <Download className="mr-0 md:mr-2 h-4 w-4" />
            <span className="hidden md:inline">{isLoading ? "Exporting..." : label}</span>
        </Button>
    );
}
