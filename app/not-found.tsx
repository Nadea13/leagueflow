"use client";

import Link from "next/link";
import "./globals.css";

import { Button } from "@/components/ui/button";

// Render the default Next.js 404 page when a route
// is requested that doesn't match the middleware and
// therefore doesn't have a locale associated with it.

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <h1 className="text-9xl font-black tracking-tighter text-primary/20 absolute select-none">404</h1>
      <div className="relative z-10 space-y-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-foreground">Page Not Found</h2>
          <p className="text-muted-foreground font-medium max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <Button asChild variant="secondary" className="h-12 px-8 font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,196,154,0.2)]">
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    </div>
  );
}
