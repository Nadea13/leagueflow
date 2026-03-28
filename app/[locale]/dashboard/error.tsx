"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Dashboard error:", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-none flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
                An unexpected error occurred. Please try again or contact support if the problem persists.
            </p>
            {error?.digest && (
                <p className="text-xs text-muted-foreground mb-4 font-mono">
                    Error ID: {error.digest}
                </p>
            )}
            <Button onClick={reset} variant="default">
                Try Again
            </Button>
        </div>
    );
}
