import { Link } from "@/i18n/routing";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 bg-background text-foreground">
            <h1 className="text-6xl font-bold mb-4 text-primary">404</h1>
            <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
                Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
            </p>
            <Link
                href="/"
                className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors shadow-sm"
            >
                Go back home
            </Link>
        </div>
    );
}
