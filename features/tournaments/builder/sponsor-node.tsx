"use client";

import { memo, useEffect, useState } from "react";
import Image from "next/image";
import { NodeProps } from "@xyflow/react";
import { Heart, Globe, Loader2 } from "lucide-react";
import { getSponsors, Sponsor } from "@/actions/tournaments/sponsor";
import { cn } from "@/lib/utils";

export const SponsorNode = memo(({ data, selected }: NodeProps) => {
    const { tournamentId } = data as { tournamentId: string };
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchSponsorsList = async () => {
            const res = await getSponsors(tournamentId);
            if (isMounted) {
                if (res.success && res.data) {
                    setSponsors(res.data);
                }
                setIsLoading(false);
            }
        };

        fetchSponsorsList();

        const handleReload = () => {
            fetchSponsorsList();
        };

        window.addEventListener("reload-sponsors", handleReload);
        return () => {
            isMounted = false;
            window.removeEventListener("reload-sponsors", handleReload);
        };
    }, [tournamentId]);

    return (
        <div className={cn(
            "relative w-[300px] border bg-card text-card-foreground transition-all rounded-sm shadow-md",
            selected
                ? "border-red-500 ring-2 ring-red-500/30"
                : "border-border hover:border-red-500/50"
        )}>
            {/* Header */}
            <div className="flex items-center p-2 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
                        <Heart className="h-4 w-4 text-background fill-background" />
                    </div>
                    <span className="text-xs font-black tracking-wide text-red-500">
                        Sponsors
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-3 bg-background/30">
                {isLoading ? (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-red-500" />
                    </div>
                ) : sponsors.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-xs text-muted-foreground/50 italic">No sponsors added yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {sponsors.map((sponsor) => (
                            <div 
                                key={sponsor.id}
                                className="flex flex-col items-center justify-center p-2 border bg-card/50 rounded-sm group/item relative hover:border-red-500/30 transition-all text-center h-24"
                            >
                                <div className="h-12 w-full flex items-center justify-center overflow-hidden mb-1">
                                    {sponsor.logo_img ? (
                                        <Image 
                                            src={sponsor.logo_img} 
                                            alt={sponsor.sponsor_name} 
                                            width={120}
                                            height={48}
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    ) : (
                                        <Heart className="h-5 w-5 text-muted-foreground/20" />
                                    )}
                                </div>
                                <span className="text-[9px] font-black text-foreground line-clamp-1 w-full px-1">
                                    {sponsor.sponsor_name}
                                </span>
                                {sponsor.link_url && (
                                    <a 
                                        href={sponsor.link_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="absolute top-1 right-1 opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 hover:text-red-500 text-muted-foreground"
                                    >
                                        <Globe className="h-3 w-3" />
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

SponsorNode.displayName = "SponsorNode";
