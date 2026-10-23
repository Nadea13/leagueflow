"use client";

import React from "react";
import Image from "next/image";
import { cn, getPlayerInitials } from "@/lib/utils";
import { resolveStorageUrl } from "@/lib/storage-utils";

export interface PlayerAvatarProps {
    player?: {
        name?: string | null;
        photo_url?: string | null;
        profile_img?: string | null;
        number?: number | string | null;
        shirt_number?: number | string | null;
        first_name?: string | null;
        last_name?: string | null;
        master_player?: { profile_img?: string | null; photo_url?: string | null } | null;
        global_player?: { profile_img?: string | null; photo_url?: string | null } | null;
    } | null;
    photoUrl?: string | null;
    name?: string | null;
    number?: number | string | null;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    className?: string;
    showNumberBadge?: boolean;
    priority?: boolean;
}

export function PlayerAvatar({
    player,
    photoUrl: propPhotoUrl,
    name: propName,
    number: propNumber,
    size = "lg",
    className,
    showNumberBadge = true,
    priority = false,
}: PlayerAvatarProps) {
    const rawPhoto =
        propPhotoUrl ??
        player?.photo_url ??
        player?.profile_img ??
        player?.master_player?.profile_img ??
        player?.master_player?.photo_url ??
        player?.global_player?.photo_url ??
        player?.global_player?.profile_img ??
        null;

    const resolvedPhoto = resolveStorageUrl(rawPhoto);
    const resolvedName = propName ?? player?.name ?? "";
    const initials = getPlayerInitials(resolvedName);

    const rawNumber = propNumber ?? player?.number ?? player?.shirt_number;
    const hasNumber =
        rawNumber !== null &&
        rawNumber !== undefined &&
        String(rawNumber).trim() !== "" &&
        String(rawNumber).trim() !== "-";

    if (size === "xs") {
        return (
            <div className={cn("relative size-6 shrink-0", className)}>
                {resolvedPhoto ? (
                    <>
                        <div className="size-6 rounded-full flex items-center justify-center overflow-hidden border border-border bg-card">
                            <Image
                                src={resolvedPhoto}
                                alt={resolvedName || "Player"}
                                width={24}
                                height={24}
                                priority={priority}
                                className="h-full w-full object-cover rounded-full"
                            />
                        </div>
                        {hasNumber && showNumberBadge && (
                            <div className="absolute -bottom-0.5 -right-0.5 bg-primary px-0.5 text-black text-[8px] font-black min-w-3 h-3 rounded-full flex items-center justify-center border border-background shadow-xs">
                                {rawNumber}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="size-6 rounded-full flex items-center justify-center overflow-hidden border border-border bg-muted/20">
                        {hasNumber ? (
                            <span className="text-[10px] font-black text-primary select-none">{rawNumber}</span>
                        ) : (
                            <span className="text-[8px] font-black text-primary uppercase select-none">{initials}</span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (size === "sm") {
        return (
            <div className={cn("relative size-8 shrink-0", className)}>
                {resolvedPhoto ? (
                    <>
                        <div className="size-8 rounded-full flex items-center justify-center overflow-hidden border border-border bg-card">
                            <Image
                                src={resolvedPhoto}
                                alt={resolvedName || "Player"}
                                width={32}
                                height={32}
                                priority={priority}
                                className="h-full w-full object-cover rounded-full"
                            />
                        </div>
                        {hasNumber && showNumberBadge && (
                            <div className="absolute -bottom-0.5 -right-0.5 bg-primary px-1 text-black text-[9px] font-black min-w-3.5 h-3.5 rounded-full flex items-center justify-center border border-background shadow-xs">
                                {rawNumber}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="size-8 rounded-full flex items-center justify-center overflow-hidden border border-border bg-muted/20">
                        {hasNumber ? (
                            <span className="text-xs font-black text-primary select-none">{rawNumber}</span>
                        ) : (
                            <span className="text-[10px] font-black text-primary uppercase select-none">{initials}</span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (size === "md") {
        return (
            <div className={cn("relative size-10 shrink-0", className)}>
                {resolvedPhoto ? (
                    <>
                        <div className="size-10 rounded-full flex items-center justify-center overflow-hidden border border-border bg-card">
                            <Image
                                src={resolvedPhoto}
                                alt={resolvedName || "Player"}
                                width={40}
                                height={40}
                                priority={priority}
                                className="h-full w-full object-cover rounded-full"
                            />
                        </div>
                        {hasNumber && showNumberBadge && (
                            <div className="absolute -bottom-0.5 -right-0.5 bg-primary px-1 text-black text-[10px] font-black min-w-4 h-4 rounded-full flex items-center justify-center border border-background shadow-xs">
                                {rawNumber}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="size-10 rounded-full flex items-center justify-center overflow-hidden border border-border bg-card">
                        {hasNumber ? (
                            <span className="text-sm font-black text-primary select-none">{rawNumber}</span>
                        ) : (
                            <span className="text-xs font-black text-primary uppercase select-none">{initials}</span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (size === "lg") {
        return (
            <div className={cn("relative shrink-0", className)}>
                {resolvedPhoto ? (
                    <>
                        <div className="size-14 rounded-full flex items-center justify-center overflow-hidden border border-border bg-card">
                            <Image
                                src={resolvedPhoto}
                                alt={resolvedName || "Player"}
                                width={64}
                                height={64}
                                priority={priority}
                                className="h-full w-full object-cover rounded-full"
                            />
                        </div>
                        {hasNumber && showNumberBadge && (
                            <span className="absolute -bottom-1 -right-1 bg-primary text-black font-black text-xs min-w-5 h-5 px-1.5 rounded-full shadow border-2 border-card flex items-center justify-center">
                                {rawNumber}
                            </span>
                        )}
                    </>
                ) : (
                    <div className="size-14 rounded-full flex items-center justify-center overflow-hidden border border-border bg-card">
                        {hasNumber ? (
                            <span className="text-2xl font-black text-primary select-none">
                                {rawNumber}
                            </span>
                        ) : (
                            <span className="text-lg font-black text-primary uppercase select-none">
                                {initials}
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // size === "xl"
    return (
        <div className={cn("relative shrink-0", className)}>
            {resolvedPhoto ? (
                <>
                    <div className="size-16 rounded-full flex items-center justify-center overflow-hidden border border-border bg-card">
                        <Image
                            src={resolvedPhoto}
                            alt={resolvedName || "Player"}
                            width={80}
                            height={80}
                            priority={priority}
                            className="h-full w-full object-cover rounded-full"
                        />
                    </div>
                    {hasNumber && showNumberBadge && (
                        <span className="absolute -bottom-1 -right-1 bg-primary text-black font-black text-xs min-w-5 h-5 px-1.5 rounded-full shadow border-2 border-card flex items-center justify-center">
                            #{rawNumber}
                        </span>
                    )}
                </>
            ) : (
                <div className="size-16 rounded-full flex items-center justify-center overflow-hidden border border-border bg-card">
                    {hasNumber ? (
                        <span className="text-3xl font-black text-primary select-none">
                            {rawNumber}
                        </span>
                    ) : (
                        <span className="text-xl font-black text-primary uppercase select-none">
                            {initials}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
