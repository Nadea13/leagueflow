"use client";

import Link from "next/link";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// Render the default Next.js 404 page when a route
// is requested that doesn't match the middleware and
// therefore doesn't have a locale associated with it.

export default function NotFound() {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 bg-background text-foreground">
            <h1 className="text-6xl font-bold mb-4 text-primary">404</h1>
            <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
              Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
            </p>
            <Link
              href="/"
              className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-none hover:bg-primary/90 transition-colors shadow-sm"
            >
              Go back home
            </Link>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
