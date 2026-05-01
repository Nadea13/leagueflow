"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";

export function TournamentSearchHeader() {
    const t = useTranslations("Home");
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    
    const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
    const debouncedSearch = useDebounce(searchValue, 300);

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set(name, value);
            } else {
                params.delete(name);
            }
            return params.toString();
        },
        [searchParams]
    );

    useEffect(() => {
        const currentSearch = searchParams.get("search") || "";
        if (currentSearch === debouncedSearch) return;

        const query = createQueryString("search", debouncedSearch);
        router.push(`${pathname}?${query}`, { scroll: false });
    }, [debouncedSearch, pathname, router, createQueryString, searchParams]);

    return (
        <div className="relative group w-full max-w-md">
            <div className="relative">
                <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/50 group-focus-within:text-primary transition-all duration-300" />
                <Input
                    placeholder={t("search_placeholder")}
                    className="pl-10 md:pl-12 bg-transparent text-foreground focus-visible:ring-0"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                />
            </div>
        </div>
    );
}
