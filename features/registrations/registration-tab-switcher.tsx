"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tab, TabOption } from "@/components/ui/tab";
import { FileText, ClipboardList } from "lucide-react";
import { useLocale } from "next-intl";

interface RegistrationTabSwitcherProps {
    tournamentId: string;
    activeTab: "registration" | "documents";
    tournamentCategoryId?: string;
    initialTeamId?: string;
    documentCount?: number;
    basePath?: string;
    className?: string;
}

export function RegistrationTabSwitcher({
    tournamentId,
    activeTab,
    tournamentCategoryId,
    initialTeamId,
    documentCount,
    basePath = "/registrations",
    className,
}: RegistrationTabSwitcherProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const locale = useLocale();
    const isThai = locale === "th";
    const [_isPending, startTransition] = useTransition();

    const options: TabOption<"registration" | "documents">[] = [
        {
            value: "registration",
            label: isThai ? "ลงทะเบียน" : "Registration",
            icon: ClipboardList,
        },
        {
            value: "documents",
            label: isThai ? "ส่งเอกสาร" : "Documents",
            icon: FileText,
            badge: documentCount && documentCount > 0 ? documentCount : undefined,
        },
    ];

    const handleTabChange = (value: "registration" | "documents") => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", value);
        if (tournamentCategoryId) {
            params.set("category", tournamentCategoryId);
        }
        if (initialTeamId) {
            params.set("team", initialTeamId);
        }

        const path = `${basePath}/${tournamentId}?${params.toString()}`;
        startTransition(() => {
            router.push(path);
        });
    };

    return (
        <Tab<"registration" | "documents">
            options={options}
            value={activeTab}
            onChange={handleTabChange}
            className={className}
        />
    );
}
