"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Trophy,
    GitBranch,
    TableProperties,
    LayoutGrid,
    CheckCircle2,
    Sparkles,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { Tab } from "@/components/ui/tab";
import { useLocale } from "next-intl";
import {
    generateSingleElimination,
    generateDoubleElimination,
    generateRoundRobin,
    generateGroupStageWithKnockout,
    GeneratedTemplate,
} from "./templates/bracket-templates";

export interface TournamentTemplateDialogProps {
    getCenterPos: () => { x: number; y: number };
    maxTeams?: number;
    triggerButton?: React.ReactNode;
}

type TemplateCategory = "all" | "knockout" | "league" | "hybrid";

interface TemplateItem {
    id: string;
    name: string;
    category: "knockout" | "league" | "hybrid";
    teamsLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    hasThirdPlaceOption?: boolean;
    preview: React.ReactNode;
    generate: (options: { includeThirdPlace: boolean; centerPosition: { x: number; y: number } }) => GeneratedTemplate;
}

/* -------------------------------------------------------------
   Mini SVG Diagram Previews for each Tournament Format
------------------------------------------------------------- */

function SingleElim4Preview() {
    return (
        <svg viewBox="0 0 200 68" className="w-full h-16 text-muted-foreground/80 select-none">
            {/* Round 1 (2 matches) */}
            <rect x="10" y="8" width="46" height="18" rx="2" className="fill-muted/40 stroke-border" strokeWidth="1" />
            <line x1="14" y1="17" x2="52" y2="17" className="stroke-border" strokeWidth="0.8" />
            
            <rect x="10" y="42" width="46" height="18" rx="2" className="fill-muted/40 stroke-border" strokeWidth="1" />
            <line x1="14" y1="51" x2="52" y2="51" className="stroke-border" strokeWidth="0.8" />

            {/* Connecting lines */}
            <path d="M 56 17 H 76 V 29 H 96" fill="none" className="stroke-node-2" strokeWidth="1.2" />
            <path d="M 56 51 H 76 V 39 H 96" fill="none" className="stroke-node-2" strokeWidth="1.2" />

            {/* Final */}
            <rect x="96" y="25" width="48" height="18" rx="2" className="fill-node-2/10 stroke-node-2/50" strokeWidth="1.2" />
            <line x1="100" y1="34" x2="140" y2="34" className="stroke-node-2/40" strokeWidth="0.8" />
        </svg>
    );
}

function SingleElim8Preview() {
    return (
        <svg viewBox="0 0 220 80" className="w-full h-16 text-muted-foreground/80 select-none">
            {/* QF (4 matches) */}
            <rect x="6" y="4" width="36" height="12" rx="1.5" className="fill-muted/40 stroke-border" strokeWidth="0.8" />
            <rect x="6" y="22" width="36" height="12" rx="1.5" className="fill-muted/40 stroke-border" strokeWidth="0.8" />
            <rect x="6" y="46" width="36" height="12" rx="1.5" className="fill-muted/40 stroke-border" strokeWidth="0.8" />
            <rect x="6" y="64" width="36" height="12" rx="1.5" className="fill-muted/40 stroke-border" strokeWidth="0.8" />

            {/* QF -> SF Lines */}
            <path d="M 42 10 H 54 V 19 H 66" fill="none" className="stroke-node-2/70" strokeWidth="1" />
            <path d="M 42 28 H 54 V 19 H 66" fill="none" className="stroke-node-2/70" strokeWidth="1" />
            <path d="M 42 52 H 54 V 61 H 66" fill="none" className="stroke-node-2/70" strokeWidth="1" />
            <path d="M 42 70 H 54 V 61 H 66" fill="none" className="stroke-node-2/70" strokeWidth="1" />

            {/* SF (2 matches) */}
            <rect x="66" y="13" width="38" height="12" rx="1.5" className="fill-muted/40 stroke-border" strokeWidth="0.8" />
            <rect x="66" y="55" width="38" height="12" rx="1.5" className="fill-muted/40 stroke-border" strokeWidth="0.8" />

            {/* SF -> Final Lines */}
            <path d="M 104 19 H 118 V 36 H 132" fill="none" className="stroke-node-2" strokeWidth="1.2" />
            <path d="M 104 61 H 118 V 44 H 132" fill="none" className="stroke-node-2" strokeWidth="1.2" />

            {/* Final */}
            <rect x="132" y="34" width="42" height="13" rx="2" className="fill-node-2/15 stroke-node-2" strokeWidth="1.2" />
        </svg>
    );
}

function SingleElim16Preview() {
    return (
        <svg viewBox="0 0 240 84" className="w-full h-16 text-muted-foreground/80 select-none">
            {/* R16 Dots / mini bars */}
            <g className="fill-muted/50 stroke-border" strokeWidth="0.6">
                {[0, 10, 20, 30, 44, 54, 64, 74].map((y, i) => (
                    <rect key={i} x="4" y={y} width="26" height="7" rx="1" />
                ))}
            </g>

            {/* QF Bars */}
            <g className="fill-muted/60 stroke-border" strokeWidth="0.8">
                <rect x="48" y="5" width="28" height="8" rx="1" />
                <rect x="48" y="25" width="28" height="8" rx="1" />
                <rect x="48" y="49" width="28" height="8" rx="1" />
                <rect x="48" y="69" width="28" height="8" rx="1" />
            </g>

            {/* Connectors R16 -> QF */}
            <path d="M 30 3.5 H 39 V 9 H 48" fill="none" className="stroke-node-2/40" strokeWidth="0.8" />
            <path d="M 30 13.5 H 39 V 9 H 48" fill="none" className="stroke-node-2/40" strokeWidth="0.8" />
            <path d="M 30 23.5 H 39 V 29 H 48" fill="none" className="stroke-node-2/40" strokeWidth="0.8" />
            <path d="M 30 33.5 H 39 V 29 H 48" fill="none" className="stroke-node-2/40" strokeWidth="0.8" />
            <path d="M 30 47.5 H 39 V 53 H 48" fill="none" className="stroke-node-2/40" strokeWidth="0.8" />
            <path d="M 30 57.5 H 39 V 53 H 48" fill="none" className="stroke-node-2/40" strokeWidth="0.8" />
            <path d="M 30 67.5 H 39 V 73 H 48" fill="none" className="stroke-node-2/40" strokeWidth="0.8" />
            <path d="M 30 77.5 H 39 V 73 H 48" fill="none" className="stroke-node-2/40" strokeWidth="0.8" />

            {/* SF Bars */}
            <rect x="96" y="15" width="30" height="9" rx="1" className="fill-muted/60 stroke-border" strokeWidth="0.8" />
            <rect x="96" y="59" width="30" height="9" rx="1" className="fill-muted/60 stroke-border" strokeWidth="0.8" />
            <path d="M 76 9 H 86 V 19.5 H 96" fill="none" className="stroke-node-2/70" strokeWidth="0.9" />
            <path d="M 76 29 H 86 V 19.5 H 96" fill="none" className="stroke-node-2/70" strokeWidth="0.9" />
            <path d="M 76 53 H 86 V 63.5 H 96" fill="none" className="stroke-node-2/70" strokeWidth="0.9" />
            <path d="M 76 73 H 86 V 63.5 H 96" fill="none" className="stroke-node-2/70" strokeWidth="0.9" />

            {/* Final */}
            <rect x="146" y="37" width="36" height="11" rx="1.5" className="fill-node-2/15 stroke-node-2" strokeWidth="1" />
            <path d="M 126 19.5 H 136 V 42.5 H 146" fill="none" className="stroke-node-2" strokeWidth="1" />
            <path d="M 126 63.5 H 136 V 42.5 H 146" fill="none" className="stroke-node-2" strokeWidth="1" />
        </svg>
    );
}

function DoubleElimPreview() {
    return (
        <svg viewBox="0 0 220 80" className="w-full h-16 text-muted-foreground/80 select-none">
            {/* Upper Bracket */}
            <text x="6" y="10" className="fill-muted-foreground text-[8px] font-black">UPPER</text>
            <rect x="36" y="4" width="28" height="9" rx="1.5" className="fill-muted/40 stroke-border" strokeWidth="0.8" />
            <rect x="36" y="17" width="28" height="9" rx="1.5" className="fill-muted/40 stroke-border" strokeWidth="0.8" />
            <path d="M 64 8.5 H 74 V 15 H 84" fill="none" className="stroke-node-2/70" strokeWidth="0.8" />
            <path d="M 64 21.5 H 74 V 15 H 84" fill="none" className="stroke-node-2/70" strokeWidth="0.8" />
            <rect x="84" y="10" width="30" height="10" rx="1.5" className="fill-node-2/10 stroke-node-2/50" strokeWidth="0.8" />

            {/* Lower Bracket */}
            <text x="6" y="52" className="fill-muted-foreground text-[8px] font-black">LOWER</text>
            <rect x="36" y="44" width="28" height="9" rx="1.5" className="fill-muted/40 stroke-border" strokeWidth="0.8" />
            <rect x="36" y="58" width="28" height="9" rx="1.5" className="fill-muted/40 stroke-border" strokeWidth="0.8" />
            <path d="M 64 48.5 H 74 V 56 H 84" fill="none" className="stroke-node-2/50" strokeWidth="0.8" />
            <path d="M 64 62.5 H 74 V 56 H 84" fill="none" className="stroke-node-2/50" strokeWidth="0.8" />
            <rect x="84" y="51" width="30" height="10" rx="1.5" className="fill-muted/40 stroke-border" strokeWidth="0.8" />

            <path d="M 114 56 H 124 V 46 H 134" fill="none" className="stroke-node-2/70" strokeWidth="0.8" />
            <rect x="134" y="41" width="30" height="10" rx="1.5" className="fill-node-2/10 stroke-node-2/50" strokeWidth="0.8" />

            {/* Grand Final */}
            <path d="M 114 15 H 170 V 30 H 176" fill="none" className="stroke-node-2" strokeWidth="1" />
            <path d="M 164 46 H 170 V 36 H 176" fill="none" className="stroke-node-2" strokeWidth="1" />
            <rect x="176" y="26" width="36" height="14" rx="2" className="fill-node-2/20 stroke-node-2" strokeWidth="1.2" />
        </svg>
    );
}

function RoundRobinPreview({ teams }: { teams: number }) {
    return (
        <svg viewBox="0 0 220 75" className="w-full h-16 text-muted-foreground/80 select-none">
            {/* Group Node */}
            <g>
                <rect x="6" y="10" width="54" height="55" rx="2" className="fill-node-5/10 stroke-node-5/40" strokeWidth="1" />
                <rect x="10" y="14" width="46" height="7" rx="1" className="fill-node-5/20" />
                {Array.from({ length: 4 }).map((_, i) => (
                    <rect key={i} x="10" y={25 + i * 9} width="46" height="6" rx="1" className="fill-muted/50 stroke-border" strokeWidth="0.5" />
                ))}
            </g>

            {/* Connect Arrow */}
            <path d="M 60 37.5 H 74" fill="none" className="stroke-node-5" strokeWidth="1.5" />
            <polygon points="74,35 78,37.5 74,40" className="fill-node-5" />

            {/* Table / Standing Node */}
            <g>
                <rect x="80" y="8" width="62" height="59" rx="2" className="fill-node-1/10 stroke-node-1/40" strokeWidth="1" />
                <rect x="84" y="12" width="54" height="7" rx="1" className="fill-node-1/20" />
                {Array.from({ length: 4 }).map((_, i) => (
                    <g key={i}>
                        <rect x="84" y={23 + i * 10} width="54" height="7" rx="1" className="fill-card stroke-border" strokeWidth="0.5" />
                        <line x1="94" y1={23 + i * 10} x2="94" y2={30 + i * 10} className="stroke-border" strokeWidth="0.5" />
                        <line x1="124" y1={23 + i * 10} x2="124" y2={30 + i * 10} className="stroke-border" strokeWidth="0.5" />
                    </g>
                ))}
            </g>

            {/* Fixtures Match Node */}
            <path d="M 142 37.5 H 154" fill="none" className="stroke-node-1" strokeWidth="1" strokeDasharray="2 2" />
            <g>
                <rect x="156" y="14" width="58" height="47" rx="2" className="fill-node-2/10 stroke-node-2/40" strokeWidth="1" />
                <text x="162" y="24" className="fill-node-2 text-[7px] font-black">MATCHES ({teams})</text>
                <rect x="160" y="28" width="50" height="7" rx="1" className="fill-card stroke-border" strokeWidth="0.5" />
                <rect x="160" y="38" width="50" height="7" rx="1" className="fill-card stroke-border" strokeWidth="0.5" />
                <rect x="160" y="48" width="50" height="7" rx="1" className="fill-card stroke-border" strokeWidth="0.5" />
            </g>
        </svg>
    );
}

function GroupKnockout2GPreview() {
    return (
        <svg viewBox="0 0 220 75" className="w-full h-16 text-muted-foreground/80 select-none">
            {/* Group A & Standings A */}
            <g>
                <rect x="6" y="6" width="34" height="28" rx="1.5" className="fill-node-5/10 stroke-node-5/40" strokeWidth="0.8" />
                <text x="10" y="14" className="fill-node-5 text-[7px] font-black">Group A</text>
                <rect x="44" y="6" width="34" height="28" rx="1.5" className="fill-node-1/10 stroke-node-1/40" strokeWidth="0.8" />
                <text x="48" y="14" className="fill-node-1 text-[7px] font-black">Table A</text>
                <path d="M 40 20 H 44" fill="none" className="stroke-node-5" strokeWidth="1" />
            </g>

            {/* Group B & Standings B */}
            <g>
                <rect x="6" y="40" width="34" height="28" rx="1.5" className="fill-node-5/10 stroke-node-5/40" strokeWidth="0.8" />
                <text x="10" y="48" className="fill-node-5 text-[7px] font-black">Group B</text>
                <rect x="44" y="40" width="34" height="28" rx="1.5" className="fill-node-1/10 stroke-node-1/40" strokeWidth="0.8" />
                <text x="48" y="48" className="fill-node-1 text-[7px] font-black">Table B</text>
                <path d="M 40 54 H 44" fill="none" className="stroke-node-5" strokeWidth="1" />
            </g>

            {/* Connectors to SFs (Cross Pairing) */}
            <path d="M 78 16 H 92 V 22 H 102" fill="none" className="stroke-node-2/70" strokeWidth="0.9" />
            <path d="M 78 48 H 86 V 26 H 102" fill="none" className="stroke-node-2/70" strokeWidth="0.9" />
            <path d="M 78 24 H 86 V 48 H 102" fill="none" className="stroke-node-2/70" strokeWidth="0.9" />
            <path d="M 78 56 H 92 V 52 H 102" fill="none" className="stroke-node-2/70" strokeWidth="0.9" />

            {/* Semifinals */}
            <rect x="102" y="18" width="36" height="12" rx="1.5" className="fill-muted/40 stroke-border" strokeWidth="0.8" />
            <rect x="102" y="44" width="36" height="12" rx="1.5" className="fill-muted/40 stroke-border" strokeWidth="0.8" />

            {/* Final */}
            <path d="M 138 24 H 148 V 34 H 158" fill="none" className="stroke-node-2" strokeWidth="1" />
            <path d="M 138 50 H 148 V 40 H 158" fill="none" className="stroke-node-2" strokeWidth="1" />
            <rect x="158" y="30" width="40" height="14" rx="2" className="fill-node-2/20 stroke-node-2" strokeWidth="1.2" />
        </svg>
    );
}

function GroupKnockout4GPreview() {
    return (
        <svg viewBox="0 0 220 75" className="w-full h-16 text-muted-foreground/80 select-none">
            {/* 4 Group boxes */}
            <g>
                <rect x="6" y="4" width="22" height="14" rx="1" className="fill-node-5/15 stroke-node-5/40" strokeWidth="0.6" />
                <rect x="6" y="21" width="22" height="14" rx="1" className="fill-node-5/15 stroke-node-5/40" strokeWidth="0.6" />
                <rect x="6" y="38" width="22" height="14" rx="1" className="fill-node-5/15 stroke-node-5/40" strokeWidth="0.6" />
                <rect x="6" y="55" width="22" height="14" rx="1" className="fill-node-5/15 stroke-node-5/40" strokeWidth="0.6" />
            </g>

            {/* Standings boxes */}
            <g>
                <rect x="34" y="4" width="22" height="14" rx="1" className="fill-node-1/15 stroke-node-1/40" strokeWidth="0.6" />
                <rect x="34" y="21" width="22" height="14" rx="1" className="fill-node-1/15 stroke-node-1/40" strokeWidth="0.6" />
                <rect x="34" y="38" width="22" height="14" rx="1" className="fill-node-1/15 stroke-node-1/40" strokeWidth="0.6" />
                <rect x="34" y="55" width="22" height="14" rx="1" className="fill-node-1/15 stroke-node-1/40" strokeWidth="0.6" />
            </g>

            {/* QF (4 matches) */}
            <g>
                <rect x="76" y="5" width="28" height="9" rx="1" className="fill-muted/40 stroke-border" strokeWidth="0.6" />
                <rect x="76" y="22" width="28" height="9" rx="1" className="fill-muted/40 stroke-border" strokeWidth="0.6" />
                <rect x="76" y="39" width="28" height="9" rx="1" className="fill-muted/40 stroke-border" strokeWidth="0.6" />
                <rect x="76" y="56" width="28" height="9" rx="1" className="fill-muted/40 stroke-border" strokeWidth="0.6" />
            </g>

            <path d="M 56 11 H 76" fill="none" className="stroke-node-2/50" strokeWidth="0.7" />
            <path d="M 56 28 H 76" fill="none" className="stroke-node-2/50" strokeWidth="0.7" />
            <path d="M 56 45 H 76" fill="none" className="stroke-node-2/50" strokeWidth="0.7" />
            <path d="M 56 62 H 76" fill="none" className="stroke-node-2/50" strokeWidth="0.7" />

            {/* SF */}
            <rect x="120" y="13" width="30" height="10" rx="1" className="fill-muted/50 stroke-border" strokeWidth="0.7" />
            <rect x="120" y="47" width="30" height="10" rx="1" className="fill-muted/50 stroke-border" strokeWidth="0.7" />
            <path d="M 104 9.5 H 112 V 18 H 120" fill="none" className="stroke-node-2/70" strokeWidth="0.8" />
            <path d="M 104 26.5 H 112 V 18 H 120" fill="none" className="stroke-node-2/70" strokeWidth="0.8" />
            <path d="M 104 43.5 H 112 V 52 H 120" fill="none" className="stroke-node-2/70" strokeWidth="0.8" />
            <path d="M 104 60.5 H 112 V 52 H 120" fill="none" className="stroke-node-2/70" strokeWidth="0.8" />

            {/* Final */}
            <path d="M 150 18 H 160 V 34 H 168" fill="none" className="stroke-node-2" strokeWidth="1" />
            <path d="M 150 52 H 160 V 40 H 168" fill="none" className="stroke-node-2" strokeWidth="1" />
            <rect x="168" y="30" width="36" height="14" rx="2" className="fill-node-2/20 stroke-node-2" strokeWidth="1.2" />
        </svg>
    );
}

function GroupKnockout8GPreview() {
    const yR16 = [3, 11, 19, 27, 36, 44, 52, 60];
    const yQF = [7, 23, 40, 56];
    return (
        <svg viewBox="0 0 220 75" className="w-full h-16 text-muted-foreground/80 select-none">
            {/* 8 Group boxes */}
            <g>
                {yR16.map((y, i) => (
                    <rect key={i} x="4" y={y} width="14" height="6" rx="0.5" className="fill-node-5/15 stroke-node-5/40" strokeWidth="0.5" />
                ))}
            </g>
            {/* Standings boxes */}
            <g>
                {yR16.map((y, i) => (
                    <rect key={i} x="20" y={y} width="14" height="6" rx="0.5" className="fill-node-1/15 stroke-node-1/40" strokeWidth="0.5" />
                ))}
            </g>

            {/* Standings to R16 connector lines */}
            {yR16.map((y, i) => (
                <line key={i} x1="34" y1={y + 3} x2="42" y2={y + 3} className="stroke-node-2/50" strokeWidth="0.6" />
            ))}

            {/* R16 (8 matches) */}
            <g>
                {yR16.map((y, i) => (
                    <rect key={i} x="42" y={y} width="18" height="6" rx="0.5" className="fill-muted/40 stroke-border" strokeWidth="0.5" />
                ))}
            </g>

            {/* R16 -> QF connectors */}
            <path d="M 60 6 H 68 V 10.5 H 76" fill="none" className="stroke-node-2/60" strokeWidth="0.7" />
            <path d="M 60 14 H 68 V 10.5 H 76" fill="none" className="stroke-node-2/60" strokeWidth="0.7" />

            <path d="M 60 22 H 68 V 26.5 H 76" fill="none" className="stroke-node-2/60" strokeWidth="0.7" />
            <path d="M 60 30 H 68 V 26.5 H 76" fill="none" className="stroke-node-2/60" strokeWidth="0.7" />

            <path d="M 60 39 H 68 V 43.5 H 76" fill="none" className="stroke-node-2/60" strokeWidth="0.7" />
            <path d="M 60 47 H 68 V 43.5 H 76" fill="none" className="stroke-node-2/60" strokeWidth="0.7" />

            <path d="M 60 55 H 68 V 59.5 H 76" fill="none" className="stroke-node-2/60" strokeWidth="0.7" />
            <path d="M 60 63 H 68 V 59.5 H 76" fill="none" className="stroke-node-2/60" strokeWidth="0.7" />

            {/* QF (4 matches) */}
            <g>
                {yQF.map((y, i) => (
                    <rect key={i} x="76" y={y} width="22" height="7" rx="0.6" className="fill-muted/40 stroke-border" strokeWidth="0.6" />
                ))}
            </g>

            {/* QF -> SF connectors */}
            <path d="M 98 10.5 H 106 V 15 H 114" fill="none" className="stroke-node-2/70" strokeWidth="0.8" />
            <path d="M 98 26.5 H 106 V 15 H 114" fill="none" className="stroke-node-2/70" strokeWidth="0.8" />

            <path d="M 98 43.5 H 106 V 49 H 114" fill="none" className="stroke-node-2/70" strokeWidth="0.8" />
            <path d="M 98 59.5 H 106 V 49 H 114" fill="none" className="stroke-node-2/70" strokeWidth="0.8" />

            {/* SF (2 matches) */}
            <rect x="114" y="11" width="26" height="8" rx="0.8" className="fill-muted/50 stroke-border" strokeWidth="0.7" />
            <rect x="114" y="45" width="26" height="8" rx="0.8" className="fill-muted/50 stroke-border" strokeWidth="0.7" />

            {/* SF -> Final connectors */}
            <path d="M 140 15 H 150 V 33 H 160" fill="none" className="stroke-node-2" strokeWidth="1" />
            <path d="M 140 49 H 150 V 39 H 160" fill="none" className="stroke-node-2" strokeWidth="1" />

            {/* Final */}
            <rect x="160" y="28" width="36" height="14" rx="2" className="fill-node-2/20 stroke-node-2" strokeWidth="1.2" />
        </svg>
    );
}

function GenericGroupKnockoutPreview({ groupCount }: { groupCount: number }) {
    if (groupCount <= 2) return <GroupKnockout2GPreview />;
    if (groupCount <= 4) return <GroupKnockout4GPreview />;
    if (groupCount <= 8) return <GroupKnockout8GPreview />;

    const yR = [3, 11, 19, 27, 36, 44, 52, 60];
    const yQF = [7, 23, 40, 56];

    return (
        <svg viewBox="0 0 220 75" className="w-full h-16 text-muted-foreground/80 select-none">
            {/* Dense Group list representation */}
            <g>
                {yR.map((y, i) => (
                    <rect key={i} x="4" y={y} width="14" height="6" rx="0.5" className="fill-node-5/15 stroke-node-5/40" strokeWidth="0.5" />
                ))}
            </g>
            <g>
                {yR.map((y, i) => (
                    <rect key={i} x="20" y={y} width="14" height="6" rx="0.5" className="fill-node-1/15 stroke-node-1/40" strokeWidth="0.5" />
                ))}
            </g>

            {/* Standings to Knockout connectors */}
            {yR.map((y, i) => (
                <line key={i} x1="34" y1={y + 3} x2="42" y2={y + 3} className="stroke-node-2/50" strokeWidth="0.6" />
            ))}

            {/* Round 1 Matches */}
            <g>
                {yR.map((y, i) => (
                    <rect key={i} x="42" y={y} width="18" height="6" rx="0.5" className="fill-muted/40 stroke-border" strokeWidth="0.5" />
                ))}
            </g>

            {/* Tree connectors */}
            <path d="M 60 6 H 68 V 10.5 H 76" fill="none" className="stroke-node-2/60" strokeWidth="0.7" />
            <path d="M 60 14 H 68 V 10.5 H 76" fill="none" className="stroke-node-2/60" strokeWidth="0.7" />
            <path d="M 60 22 H 68 V 26.5 H 76" fill="none" className="stroke-node-2/60" strokeWidth="0.7" />
            <path d="M 60 30 H 68 V 26.5 H 76" fill="none" className="stroke-node-2/60" strokeWidth="0.7" />
            <path d="M 60 39 H 68 V 43.5 H 76" fill="none" className="stroke-node-2/60" strokeWidth="0.7" />
            <path d="M 60 47 H 68 V 43.5 H 76" fill="none" className="stroke-node-2/60" strokeWidth="0.7" />
            <path d="M 60 55 H 68 V 59.5 H 76" fill="none" className="stroke-node-2/60" strokeWidth="0.7" />
            <path d="M 60 63 H 68 V 59.5 H 76" fill="none" className="stroke-node-2/60" strokeWidth="0.7" />

            {/* Round 2 */}
            <g>
                {yQF.map((y, i) => (
                    <rect key={i} x="76" y={y} width="22" height="7" rx="0.6" className="fill-muted/40 stroke-border" strokeWidth="0.6" />
                ))}
            </g>

            {/* SF connectors */}
            <path d="M 98 10.5 H 106 V 15 H 114" fill="none" className="stroke-node-2/70" strokeWidth="0.8" />
            <path d="M 98 26.5 H 106 V 15 H 114" fill="none" className="stroke-node-2/70" strokeWidth="0.8" />
            <path d="M 98 43.5 H 106 V 49 H 114" fill="none" className="stroke-node-2/70" strokeWidth="0.8" />
            <path d="M 98 59.5 H 106 V 49 H 114" fill="none" className="stroke-node-2/70" strokeWidth="0.8" />

            {/* SF */}
            <rect x="114" y="11" width="26" height="8" rx="0.8" className="fill-muted/50 stroke-border" strokeWidth="0.7" />
            <rect x="114" y="45" width="26" height="8" rx="0.8" className="fill-muted/50 stroke-border" strokeWidth="0.7" />

            {/* Final connectors */}
            <path d="M 140 15 H 150 V 33 H 160" fill="none" className="stroke-node-2" strokeWidth="1" />
            <path d="M 140 49 H 150 V 39 H 160" fill="none" className="stroke-node-2" strokeWidth="1" />

            {/* Final */}
            <rect x="160" y="28" width="36" height="14" rx="2" className="fill-node-2/20 stroke-node-2" strokeWidth="1.2" />
        </svg>
    );
}

function buildTemplates(maxTeams: number, isThai: boolean): TemplateItem[] {
    const templates: TemplateItem[] = [];

    const effectiveTeams = Math.max(2, maxTeams);
    const roundCount = Math.ceil(Math.log2(effectiveTeams));

    // 1. Single Elimination (Based on maxTeams)
    templates.push({
        id: `single_elim_${effectiveTeams}`,
        name: isThai
            ? `แพ้คัดออก (${effectiveTeams} ทีม)`
            : `Single Elimination (${effectiveTeams} Teams)`,
        category: "knockout",
        teamsLabel: isThai
            ? `${effectiveTeams} ทีม • ${roundCount} รอบ`
            : `${effectiveTeams} Teams • ${roundCount} Rounds`,
        icon: Trophy,
        accentColor: "text-node-2 bg-node-2/10 border-node-2/30",
        hasThirdPlaceOption: true,
        preview: effectiveTeams >= 16 ? <SingleElim16Preview /> : effectiveTeams >= 8 ? <SingleElim8Preview /> : <SingleElim4Preview />,
        generate: ({ includeThirdPlace, centerPosition }) =>
            generateSingleElimination(effectiveTeams, { includeThirdPlace, centerPosition }),
    });

    // 2. Double Elimination (Based on maxTeams)
    templates.push({
        id: `double_elim_${effectiveTeams}`,
        name: isThai
            ? `สายบน-สายล่าง (${effectiveTeams} ทีม)`
            : `Double Elimination (${effectiveTeams} Teams)`,
        category: "knockout",
        teamsLabel: isThai
            ? `${effectiveTeams} ทีม • สายบน & สายล่าง`
            : `${effectiveTeams} Teams • Upper & Lower Bracket`,
        icon: GitBranch,
        accentColor: "text-node-2 bg-node-2/10 border-node-2/30",
        hasThirdPlaceOption: false,
        preview: <DoubleElimPreview />,
        generate: ({ centerPosition }) =>
            generateDoubleElimination(effectiveTeams, { centerPosition }),
    });

    // 3. League (Round Robin based on maxTeams)
    const leagueMatches = (effectiveTeams * (effectiveTeams - 1)) / 2;
    templates.push({
        id: `round_robin_${effectiveTeams}`,
        name: isThai
            ? `ลีกพบกันหมด (${effectiveTeams} ทีม)`
            : `Round Robin League (${effectiveTeams} Teams)`,
        category: "league",
        teamsLabel: isThai
            ? `${effectiveTeams} ทีม • ${leagueMatches} นัด`
            : `${effectiveTeams} Teams • ${leagueMatches} Matches`,
        icon: TableProperties,
        accentColor: "text-node-1 bg-node-1/10 border-node-1/30",
        hasThirdPlaceOption: false,
        preview: <RoundRobinPreview teams={effectiveTeams} />,
        generate: ({ centerPosition }) =>
            generateRoundRobin(effectiveTeams, { centerPosition }),
    });

    // 4. Hybrid: Group Stage + Knockout (2, 4, 8, 16, 32, 64 Groups where teams/group >= 2)
    const possibleGroupCounts = [2, 4, 8, 16, 32, 64];

    const getStageSummary = (numGroups: number) => {
        if (numGroups === 2) return "Semi/Final";
        if (numGroups === 4) return "QF/SF/Final";
        if (numGroups === 8) return "R16/QF/SF/Final";
        if (numGroups === 16) return "R32/R16/QF/SF/Final";
        if (numGroups === 32) return "R64/R32/R16/QF/SF/Final";
        return `R${numGroups * 2}/.../Final`;
    };

    possibleGroupCounts.forEach((numGroups) => {
        // Condition: each group must have at least 2 teams (i.e. effectiveTeams >= numGroups * 2)
        if (effectiveTeams >= numGroups * 2) {
            const teamsPerGroup = Math.floor(effectiveTeams / numGroups);
            const stageSummary = getStageSummary(numGroups);

            templates.push({
                id: `group_knockout_${numGroups}g_${effectiveTeams}`,
                name: isThai
                    ? `${numGroups} กลุ่ม (${effectiveTeams} ทีม) + รอบน็อคเอาท์`
                    : `${numGroups} Groups (${effectiveTeams} Teams) + Knockout`,
                category: "hybrid",
                teamsLabel: isThai
                    ? `${effectiveTeams} ทีม • ${numGroups} กลุ่ม (${teamsPerGroup} ทีม/กลุ่ม) + ${stageSummary}`
                    : `${effectiveTeams} Teams • ${numGroups} Groups (${teamsPerGroup}/group) + ${stageSummary}`,
                icon: LayoutGrid,
                accentColor: "text-node-5 bg-node-5/10 border-node-5/30",
                hasThirdPlaceOption: true,
                preview: <GenericGroupKnockoutPreview groupCount={numGroups} />,
                generate: ({ includeThirdPlace, centerPosition }) =>
                    generateGroupStageWithKnockout(numGroups, {
                        includeThirdPlace,
                        centerPosition,
                        teamsPerGroup,
                    }),
            });
        }
    });

    return templates;
}

export function TournamentTemplateDialog({
    getCenterPos,
    maxTeams = 8,
    triggerButton,
}: TournamentTemplateDialogProps) {
    const locale = useLocale();
    const isThai = locale === "th";

    const templates = React.useMemo(() => buildTemplates(maxTeams, isThai), [maxTeams, isThai]);

    const [open, setOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>("all");
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || "single_elim_8");
    const [includeThirdPlace, setIncludeThirdPlace] = useState(true);

    // Sync selected template if templates change
    React.useEffect(() => {
        if (templates.length > 0 && !templates.some((t) => t.id === selectedTemplateId)) {
            setSelectedTemplateId(templates[0].id);
        }
    }, [templates, selectedTemplateId]);

    const insertTemplate = useBracketStore((state) => state.insertTemplate);

    const filteredTemplates = templates.filter((tpl) => {
        if (selectedCategory === "all") return true;
        return tpl.category === selectedCategory;
    });

    const activeTemplate = templates.find((tpl) => tpl.id === selectedTemplateId) || filteredTemplates[0] || templates[0];

    const handleApplyTemplate = () => {
        if (!activeTemplate) return;
        const centerPos = getCenterPos();
        const templateData = activeTemplate.generate({
            includeThirdPlace,
            centerPosition: centerPos,
        });

        insertTemplate(templateData.nodes, templateData.edges, centerPos);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {triggerButton || (
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                    >
                        <Sparkles className="h-4 w-4" />
                        {isThai ? "เทมเพลต" : "Templates"}
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent
                showCloseButton={false}
                className="w-full h-full sm:h-auto sm:max-w-[780px] max-h-screen sm:max-h-[90vh] overflow-hidden flex flex-col bg-card p-0 shadow-2xl rounded-none sm:rounded-sm"
            >
                {/* Standard Dialog Header with Top-Right Close Button */}
                <DialogHeader className="p-2 md:p-4 border-b relative pr-10 shrink-0">
                    <DialogTitle className="text-xl font-black tracking-tighter flex items-center gap-2 flex-wrap">
                        <span>{isThai ? "เทมเพลตรูปแบบการแข่งขัน" : "Tournament Structure Templates"}</span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {isThai ? `สูงสุด ${maxTeams} ทีม` : `Max ${maxTeams} Teams`}
                        </span>
                    </DialogTitle>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-2 top-2"
                        onClick={() => setOpen(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </DialogHeader>

                {/* Dialog Content Area */}
                <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-3 custom-scrollbar">
                    {/* Standard Category Tabs */}
                    <Tab
                        value={selectedCategory}
                        onChange={(val) => setSelectedCategory(val as TemplateCategory)}
                        className="w-full"
                        fullWidth={true}
                        options={[
                            { label: isThai ? "ทั้งหมด" : "All", value: "all" },
                            { label: isThai ? "แพ้คัดออก (Knockout)" : "Knockout", value: "knockout", icon: Trophy },
                            { label: isThai ? "พบกันหมด (League)" : "Round Robin", value: "league", icon: TableProperties },
                            { label: isThai ? "แบ่งกลุ่ม + รอบลึก" : "Group + Knockout", value: "hybrid", icon: LayoutGrid },
                        ]}
                    />

                    {/* Template Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-2.5">
                        {filteredTemplates.map((tpl) => {
                            const Icon = tpl.icon;
                            const isSelected = selectedTemplateId === tpl.id;

                            return (
                                <div
                                    key={tpl.id}
                                    onClick={() => setSelectedTemplateId(tpl.id)}
                                    className={cn(
                                        "relative p-2.5 md:p-3 rounded-sm border text-left cursor-pointer transition-all flex flex-col justify-between group overflow-hidden",
                                        isSelected
                                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                                            : "border-border hover:border-muted-foreground/40 hover:bg-muted/10"
                                    )}
                                >
                                    <div>
                                        {/* Header Info */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={cn(
                                                        "w-9 h-9 rounded-sm flex items-center justify-center transition-colors shrink-0",
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground"
                                                    )}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-xs font-black tracking-tight truncate">{tpl.name}</h4>
                                                    <span className="text-[10px] font-bold text-muted-foreground">
                                                        {tpl.teamsLabel}
                                                    </span>
                                                </div>
                                            </div>

                                            {isSelected && (
                                                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                            )}
                                        </div>

                                        {/* Mini Diagram Visual Preview */}
                                        <div className={cn(
                                            "mt-1.5 p-1 rounded-sm border transition-colors flex items-center justify-center",
                                            isSelected 
                                                ? "bg-card/90 border-primary/20" 
                                                : "bg-muted/20 border-border/60 group-hover:bg-muted/30"
                                        )}>
                                            {tpl.preview}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Standard Dialog Footer */}
                <div className="p-2 md:p-4 border-t bg-card flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        {activeTemplate?.hasThirdPlaceOption && (
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="third-place-toggle"
                                    checked={includeThirdPlace}
                                    onCheckedChange={setIncludeThirdPlace}
                                />
                                <Label
                                    htmlFor="third-place-toggle"
                                    className="text-xs font-bold cursor-pointer select-none"
                                >
                                    {isThai ? "เพิ่มคู่ชิงอันดับ 3 (3rd Place Match)" : "Include 3rd Place Match"}
                                </Label>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setOpen(false)}
                        >
                            {isThai ? "ยกเลิก" : "Cancel"}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleApplyTemplate}
                            className="font-black gap-1.5"
                        >
                            <Sparkles className="h-4 w-4" />
                            {isThai ? "นำเทมเพลตไปใช้" : "Add Template"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
