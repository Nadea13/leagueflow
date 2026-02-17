import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function NotFound() {
    const t = useTranslations("NotFound");

    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 bg-background text-foreground">
            <h1 className="text-6xl font-bold mb-4 text-primary">{t("title")}</h1>
            <h2 className="text-2xl font-semibold mb-6">{t("heading")}</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
                {t("desc")}
            </p>
            <Link
                href="/"
                className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors shadow-sm"
            >
                {t("button")}
            </Link>
        </div>
    );
}
