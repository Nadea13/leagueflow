"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({ 
    children, 
    disabled, 
    className,
    variant = "default"
}: { 
    children: React.ReactNode; 
    disabled?: boolean;
    className?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}) {
    const { pending } = useFormStatus();

    return (
        <Button 
            type="submit" 
            disabled={pending || disabled} 
            className={className}
            variant={variant}
        >
            {pending ? "..." : children}
        </Button>
    );
}