import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Eye, Check, Save, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface BroadcastDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    matchId: string;
    tournamentId: string;
}

const DEFAULT_BLOCKS = [
    { id: "header-text", name: "Tournament Name", active: false, x: 0, y: -45, w: 140, h: 32, fontSize: 10, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#000000", color: "#ffffff" },
    { id: "logo-tournament", name: "Tournament Logo", active: false, x: -140, y: -45, w: 40, h: 40, fontSize: 12, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#000000", color: "#ffffff" },
    { id: "logo-home", name: "Home Team Logo", active: true, x: -140, y: 0, w: 40, h: 40, fontSize: 12, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#000000", color: "#ffffff" },
    { id: "name-home", name: "Home Team Name/Abbr", active: true, x: -95, y: 0, w: 76, h: 40, fontSize: 14, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#000000", color: "#ffffff" },
    { id: "score-home", name: "Home Score Box", active: true, x: -35, y: 0, w: 45, h: 40, fontSize: 20, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#ef4444", color: "#ffffff" },
    { id: "score-away", name: "Away Score Box", active: true, x: 35, y: 0, w: 45, h: 40, fontSize: 20, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#ef4444", color: "#ffffff" },
    { id: "name-away", name: "Away Team Name/Abbr", active: true, x: 95, y: 0, w: 76, h: 40, fontSize: 14, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#000000", color: "#ffffff" },
    { id: "logo-away", name: "Away Team Logo", active: true, x: 140, y: 0, w: 40, h: 40, fontSize: 12, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#000000", color: "#ffffff" },
    { id: "timer", name: "Match Timer & Clock", active: true, x: 0, y: 40, w: 90, h: 40, fontSize: 14, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#000000", color: "#ffffff" },
    // { id: "substitution", name: "Substitution (การเปลี่ยนตัว)", active: false, x: 0, y: 80, w: 200, h: 48, fontSize: 12, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#000000", color: "#ffffff" },
    // { id: "alerts", name: "Alerts Popup (ใบเหลือง/แดง/ทำประตู)", active: false, x: 0, y: 140, w: 320, h: 80, fontSize: 12, rTL: 12, rTR: 12, rBL: 12, rBR: 12, opacity: 100, bg: "#000000", color: "#ffffff" }
];

const getSnappedCoords = (
    draggedId: string,
    x: number,
    y: number,
    activeBlocks: { id: string, active: boolean, x: number, y: number, w: number, h: number }[],
    gap: number
) => {
    const blockA = activeBlocks.find(b => b.id === draggedId);
    if (!blockA) return { x, y };

    const sizeA = { w: blockA.w, h: blockA.h };
    const snapThreshold = 18; // Strong sticky magnet snap zone

    let bestX = { val: x, diff: Infinity };
    let bestY = { val: y, diff: Infinity };

    for (const other of activeBlocks) {
        if (other.id === draggedId || !other.active) continue;
        const sizeB = { w: other.w, h: other.h };

        // Proximity checks: only snap on one axis if coordinates are reasonably close on the other axis
        const verticalOverlap = Math.abs(y - other.y) < (sizeA.h / 2 + sizeB.h / 2 + gap + 25);
        const horizontalOverlap = Math.abs(x - other.x) < (sizeA.w / 2 + sizeB.w / 2 + gap + 25);

        if (verticalOverlap) {
            // --- HORIZONTAL SNAP CANDIDATES (X alignments & Docking) ---
            // 1. Center-to-Center Alignment
            const centerX = other.x;
            const diffCenterX = Math.abs(x - centerX);
            if (diffCenterX < snapThreshold && diffCenterX < bestX.diff) {
                bestX = { val: centerX, diff: diffCenterX };
            }

            // 2. Left-to-Left Alignment
            const leftAlignX = other.x - sizeB.w / 2 + sizeA.w / 2;
            const diffLeftAlignX = Math.abs(x - leftAlignX);
            if (diffLeftAlignX < snapThreshold && diffLeftAlignX < bestX.diff) {
                bestX = { val: leftAlignX, diff: diffLeftAlignX };
            }

            // 3. Right-to-Right Alignment
            const rightAlignX = other.x + sizeB.w / 2 - sizeA.w / 2;
            const diffRightAlignX = Math.abs(x - rightAlignX);
            if (diffRightAlignX < snapThreshold && diffRightAlignX < bestX.diff) {
                bestX = { val: rightAlignX, diff: diffRightAlignX };
            }

            // 4. Left Docking
            const leftDockX = other.x - (sizeA.w / 2 + sizeB.w / 2 + gap);
            const diffLeftDockX = Math.abs(x - leftDockX);
            if (diffLeftDockX < snapThreshold && diffLeftDockX < bestX.diff) {
                bestX = { val: leftDockX, diff: diffLeftDockX };
            }

            // 5. Right Docking
            const rightDockX = other.x + (sizeA.w / 2 + sizeB.w / 2 + gap);
            const diffRightDockX = Math.abs(x - rightDockX);
            if (diffRightDockX < snapThreshold && diffRightDockX < bestX.diff) {
                bestX = { val: rightDockX, diff: diffRightDockX };
            }
        }

        if (horizontalOverlap) {
            // --- VERTICAL SNAP CANDIDATES (Y alignments & Docking) ---
            // 1. Center-to-Center Alignment
            const centerY = other.y;
            const diffCenterY = Math.abs(y - centerY);
            if (diffCenterY < snapThreshold && diffCenterY < bestY.diff) {
                bestY = { val: centerY, diff: diffCenterY };
            }

            // 2. Top-to-Top Alignment
            const topAlignY = other.y - sizeB.h / 2 + sizeA.h / 2;
            const diffTopAlignY = Math.abs(y - topAlignY);
            if (diffTopAlignY < snapThreshold && diffTopAlignY < bestY.diff) {
                bestY = { val: topAlignY, diff: diffTopAlignY };
            }

            // 3. Bottom-to-Bottom Alignment
            const bottomAlignY = other.y + sizeB.h / 2 - sizeA.h / 2;
            const diffBottomAlignY = Math.abs(y - bottomAlignY);
            if (diffBottomAlignY < snapThreshold && diffBottomAlignY < bestY.diff) {
                bestY = { val: bottomAlignY, diff: diffBottomAlignY };
            }

            // 4. Above Docking
            const aboveDockY = other.y - (sizeA.h / 2 + sizeB.h / 2 + gap);
            const diffAboveDockY = Math.abs(y - aboveDockY);
            if (diffAboveDockY < snapThreshold && diffAboveDockY < bestY.diff) {
                bestY = { val: aboveDockY, diff: diffAboveDockY };
            }

            // 5. Below Docking
            const belowDockY = other.y + (sizeA.h / 2 + sizeB.h / 2 + gap);
            const diffBelowDockY = Math.abs(y - belowDockY);
            if (diffBelowDockY < snapThreshold && diffBelowDockY < bestY.diff) {
                bestY = { val: belowDockY, diff: diffBelowDockY };
            }
        }
    }

    return { x: bestX.val, y: bestY.val };
};

const isLightColor = (color: string): boolean => {
    if (color === "transparent") return false;
    if (color === "chromakey") return true;
    const hex = color.replace("#", "");
    if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        const hsp = Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b);
        return hsp > 127.5;
    }
    if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const hsp = Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b);
        return hsp > 127.5;
    }
    return false;
};

export function BroadcastDialog({ open, onOpenChange, matchId, tournamentId }: BroadcastDialogProps) {
    const t = useTranslations("Console");
    const { toast } = useToast();
    const [copiedScoreboard, setCopiedScoreboard] = useState(false);
    const [copiedBlank, setCopiedBlank] = useState(false);
    const [delay, setDelay] = useState<number>(0);


    // Configuration states
    const [layout, setLayout] = useState<"top-bar" | "minimal-left" | "minimal-right">("top-bar");
    const [bg, setBg] = useState<string>("transparent");
    const [size, setSize] = useState<"small" | "medium" | "large">("medium");
    const [showTimeline, setShowTimeline] = useState(false);

    // Customization states
    const [font, setFont] = useState<string>("inter");
    const [scoreBg, setScoreBg] = useState<string>("#ef4444");
    const [teamNameMode, setTeamNameMode] = useState<"abbr" | "full">("abbr");
    const [showLogos, setShowLogos] = useState<boolean>(true);
    const [headerText, setHeaderText] = useState<string>("");
    const [posX, setPosX] = useState<"left" | "center" | "right">("center");
    const [posY, setPosY] = useState<"top" | "bottom">("top");
    const [alertDuration, setAlertDuration] = useState<number>(6);
    const [linkCorners, setLinkCorners] = useState<boolean>(true);

    // Custom match-by-match color bar states
    const [homeBarDir, setHomeBarDir] = useState<"none" | "top" | "right" | "bottom" | "left">("none");
    const [homeBarColor, setHomeBarColor] = useState<string>("#10b981");
    const [awayBarDir, setAwayBarDir] = useState<"none" | "top" | "right" | "bottom" | "left">("none");
    const [awayBarColor, setAwayBarColor] = useState<string>("#3b82f6");

    // Canvas Block Editor States with custom dimensions & radii
    const [blocks, setBlocks] = useState<typeof DEFAULT_BLOCKS>(DEFAULT_BLOCKS);
    const [selectedBlockId, setSelectedBlockId] = useState<string>("score-home");
    const [orientation, setOrientation] = useState<"horizontal" | "vertical">("horizontal");
    const [blockGap, setBlockGap] = useState<number>(8);
    const [blockBg, setBlockBg] = useState<"spaced" | "docked">("spaced");
    const [rounded, setRounded] = useState<"none" | "md" | "full">("md");

    const [blankCanvases, setBlankCanvases] = useState<{
        id: string;
        name: string;
        delay: number;
        bg: string;
        posX: "left" | "center" | "right";
        posY: "top" | "bottom";
        alertDuration: number;
        font: string;
        layout: "top-bar" | "minimal-left" | "minimal-right";
        size: "small" | "medium" | "large";
        showTimeline: boolean;
        scoreBg: string;
        teamNameMode: "abbr" | "full";
        showLogos: boolean;
        headerText: string;
        homeBarDir: "none" | "top" | "right" | "bottom" | "left";
        homeBarColor: string;
        awayBarDir: "none" | "top" | "right" | "bottom" | "left";
        awayBarColor: string;
        blockGap: number;
        blockBg: "spaced" | "docked";
        rounded: "none" | "md" | "full";
        blocks: typeof blocks;
    }[]>([
        {
            id: "default",
            name: "Blank Canvas (Alerts Only)",
            delay: 0,
            bg: "transparent",
            posX: "center",
            posY: "top",
            alertDuration: 6,
            font: "inter",
            layout: "top-bar",
            size: "medium",
            showTimeline: false,
            scoreBg: "#ef4444",
            teamNameMode: "abbr",
            showLogos: true,
            headerText: "",
            homeBarDir: "none",
            homeBarColor: "#10b981",
            awayBarDir: "none",
            awayBarColor: "#3b82f6",
            blockGap: 8,
            blockBg: "spaced",
            rounded: "md",
            blocks: []
        }
    ]);
    const [selectedCanvasId, setSelectedCanvasId] = useState<string>("scoreboard");

    // Backup of scoreboard (main canvas) settings to restore when switching back
    const mainCanvasSettingsRef = useRef({
        bg: "transparent" as string,
        posX: "center" as "left" | "center" | "right",
        posY: "top" as "top" | "bottom",
        alertDuration: 6,
        font: "inter",
        layout: "top-bar" as "top-bar" | "minimal-left" | "minimal-right",
        size: "medium" as "small" | "medium" | "large",
        showTimeline: false,
        scoreBg: "#ef4444",
        teamNameMode: "abbr" as "abbr" | "full",
        showLogos: true,
        headerText: "",
        homeBarDir: "none" as "none" | "top" | "right" | "bottom" | "left",
        homeBarColor: "#10b981",
        awayBarDir: "none" as "none" | "top" | "right" | "bottom" | "left",
        awayBarColor: "#3b82f6",
        blockGap: 8,
        blockBg: "spaced" as "spaced" | "docked",
        rounded: "md" as "none" | "md" | "full",
        blocks: [] as typeof blocks
    });



    const [saving, setSaving] = useState(false);
    const supabase = createClient();

    // Load template on mount / open
    useEffect(() => {
        if (!open) return;
        const loadTemplate = async () => {
            try {
                const { data, error } = await supabase
                    .from("tournaments")
                    .select("broadcast_settings")
                    .eq("id", tournamentId)
                    .single();

                if (!error && data?.broadcast_settings) {
                    interface SettingsData {
                        layout?: "top-bar" | "minimal-left" | "minimal-right";
                        bg?: string;
                        size?: "small" | "medium" | "large";
                        showTimeline?: boolean;
                        font?: string;
                        scoreBg?: string;
                        teamNameMode?: "abbr" | "full";
                        showLogos?: boolean;
                        headerText?: string;
                        posX?: "left" | "center" | "right";
                        posY?: "top" | "bottom";
                        alertDuration?: number;
                        homeBarDir?: "none" | "top" | "right" | "bottom" | "left";
                        homeBarColor?: string;
                        awayBarDir?: "none" | "top" | "right" | "bottom" | "left";
                        awayBarColor?: string;
                        blocks?: {
                            id: string;
                            name: string;
                            active: boolean;
                            x: number;
                            y: number;
                            w: number;
                            h: number;
                            fontSize: number;
                            rTL: number;
                            rTR: number;
                            rBL: number;
                            rBR: number;
                            opacity?: number;
                            bg?: string;
                            color?: string;
                        }[];
                        selectedBlockId?: string;
                        orientation?: "horizontal" | "vertical";
                        blockGap?: number;
                        blockBg?: "spaced" | "docked";
                        rounded?: "none" | "md" | "full";
                        delay?: number;
                        blankDelay?: number;
                        blankCanvases?: {
                            id: string;
                            name: string;
                            delay: number;
                            bg?: string;
                            posX?: "left" | "center" | "right";
                            posY?: "top" | "bottom";
                            alertDuration?: number;
                            font?: string;
                            layout?: "top-bar" | "minimal-left" | "minimal-right";
                            size?: "small" | "medium" | "large";
                            showTimeline?: boolean;
                            scoreBg?: string;
                            teamNameMode?: "abbr" | "full";
                            showLogos?: boolean;
                            headerText?: string;
                            homeBarDir?: "none" | "top" | "right" | "bottom" | "left";
                            homeBarColor?: string;
                            awayBarDir?: "none" | "top" | "right" | "bottom" | "left";
                            awayBarColor?: string;
                            blockGap?: number;
                            blockBg?: "spaced" | "docked";
                            rounded?: "none" | "md" | "full";
                            blocks?: typeof blocks;
                        }[];
                        selectedCanvasId?: string;
                    }
                    const settings = data.broadcast_settings as SettingsData;
                    if (settings.layout) setLayout(settings.layout);
                    if (settings.bg) setBg(settings.bg);
                    if (settings.size) setSize(settings.size);
                    if (settings.showTimeline !== undefined) setShowTimeline(settings.showTimeline);
                    if (settings.font) setFont(settings.font);
                    if (settings.scoreBg) setScoreBg(settings.scoreBg);
                    if (settings.teamNameMode) setTeamNameMode(settings.teamNameMode);
                    if (settings.showLogos !== undefined) setShowLogos(settings.showLogos);
                    if (settings.headerText !== undefined) setHeaderText(settings.headerText);
                    if (settings.posX) setPosX(settings.posX);
                    if (settings.posY) setPosY(settings.posY);
                    if (settings.alertDuration) setAlertDuration(settings.alertDuration);
                    if (settings.homeBarDir) setHomeBarDir(settings.homeBarDir);
                    if (settings.homeBarColor) setHomeBarColor(settings.homeBarColor);
                    if (settings.awayBarDir) setAwayBarDir(settings.awayBarDir);
                    if (settings.awayBarColor) setAwayBarColor(settings.awayBarColor);
                    if (settings.blocks) {
                        const merged = DEFAULT_BLOCKS.map(def => {
                            const loaded = settings.blocks?.find(b => b.id === def.id);
                            return loaded ? { ...def, ...loaded } : def;
                        });
                        setBlocks(merged);
                    }
                    if (settings.selectedBlockId) setSelectedBlockId(settings.selectedBlockId);
                    if (settings.orientation) setOrientation(settings.orientation);
                    if (settings.blockGap !== undefined) setBlockGap(settings.blockGap);
                    if (settings.blockBg) setBlockBg(settings.blockBg);
                    if (settings.rounded) setRounded(settings.rounded);
                    if (settings.delay !== undefined) setDelay(settings.delay);
                    if (settings.blankCanvases) {
                        setBlankCanvases(settings.blankCanvases.map(c => ({
                            id: c.id,
                            name: c.name,
                            delay: c.delay ?? 0,
                            bg: c.bg ?? "transparent",
                            posX: c.posX ?? "center",
                            posY: c.posY ?? "top",
                            alertDuration: c.alertDuration ?? 6,
                            font: c.font ?? "inter",
                            layout: c.layout ?? "top-bar",
                            size: c.size ?? "medium",
                            showTimeline: c.showTimeline ?? false,
                            scoreBg: c.scoreBg ?? "#ef4444",
                            teamNameMode: c.teamNameMode ?? "abbr",
                            showLogos: c.showLogos ?? true,
                            headerText: c.headerText ?? "",
                            homeBarDir: c.homeBarDir ?? "none",
                            homeBarColor: c.homeBarColor ?? "#10b981",
                            awayBarDir: c.awayBarDir ?? "none",
                            awayBarColor: c.awayBarColor ?? "#3b82f6",
                            blockGap: c.blockGap ?? 8,
                            blockBg: c.blockBg ?? "spaced",
                            rounded: c.rounded ?? "md",
                            blocks: (c.blocks && c.blocks.length > 0)
                                ? DEFAULT_BLOCKS.map(def => {
                                    const loaded = c.blocks?.find(b => b.id === def.id);
                                    return loaded ? { ...def, ...loaded } : def;
                                })
                                : DEFAULT_BLOCKS.map(def => ({ ...def, active: false }))
                        })));
                    } else if (settings.blankDelay !== undefined) {
                        setBlankCanvases([{
                            id: "default",
                            name: "Blank Canvas (Alerts Only)",
                            delay: settings.blankDelay,
                            bg: "transparent",
                            posX: "center",
                            posY: "top",
                            alertDuration: 6,
                            font: "inter",
                            layout: "top-bar",
                            size: "medium",
                            showTimeline: false,
                            scoreBg: "#ef4444",
                            teamNameMode: "abbr",
                            showLogos: true,
                            headerText: "",
                            homeBarDir: "none",
                            homeBarColor: "#10b981",
                            awayBarDir: "none",
                            awayBarColor: "#3b82f6",
                            blockGap: 8,
                            blockBg: "spaced",
                            rounded: "md",
                            blocks: []
                        }]);
                    }
                    if (settings.selectedCanvasId) {
                        const targetId = settings.selectedCanvasId;
                        setSelectedCanvasId(targetId);
                        if (targetId !== "scoreboard" && settings.blankCanvases) {
                            const active = settings.blankCanvases.find(c => `blank-${c.id}` === targetId);
                            if (active) {
                                setBg(active.bg || "transparent");
                                setPosX(active.posX || "center");
                                setPosY(active.posY || "top");
                                setAlertDuration(active.alertDuration || 6);
                                setFont(active.font || "inter");
                                setLayout(active.layout || "top-bar");
                                setSize(active.size || "medium");
                                setShowTimeline(active.showTimeline ?? false);
                                setScoreBg(active.scoreBg || "#ef4444");
                                setTeamNameMode(active.teamNameMode || "abbr");
                                setShowLogos(active.showLogos ?? true);
                                setHeaderText(active.headerText || "");
                                setHomeBarDir(active.homeBarDir || "none");
                                setHomeBarColor(active.homeBarColor || "#10b981");
                                setAwayBarDir(active.awayBarDir || "none");
                                setAwayBarColor(active.awayBarColor || "#3b82f6");
                                setBlockGap(active.blockGap ?? 8);
                                setBlockBg(active.blockBg || "spaced");
                                setRounded(active.rounded || "md");
                                if (active.blocks && active.blocks.length > 0) {
                                    setBlocks(active.blocks);
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Error loading broadcast template:", e);
            }
        };
        loadTemplate();
    }, [open, tournamentId, supabase]);

    // Delete selected block on Backspace or Delete keypress
    useEffect(() => {
        if (!open || !selectedBlockId) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || (activeEl as HTMLElement).isContentEditable)) {
                return;
            }

            if (e.key === "Backspace" || e.key === "Delete") {
                const idx = blocks.findIndex(b => b.id === selectedBlockId);
                if (idx !== -1 && blocks[idx].active) {
                    e.preventDefault();
                    const updated = [...blocks];
                    updated[idx] = { ...updated[idx], active: false };
                    setBlocks(updated);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, selectedBlockId, blocks]);

    const saveTemplate = async () => {
        setSaving(true);
        try {
            const isScoreboard = selectedCanvasId === "scoreboard";
            const scoreboardSettings = isScoreboard ? {
                layout,
                bg,
                size,
                showTimeline,
                font,
                scoreBg,
                teamNameMode,
                showLogos,
                headerText,
                posX,
                posY,
                alertDuration,
                blocks,
                selectedBlockId,
                orientation,
                blockGap,
                blockBg,
                rounded,
                delay,
                homeBarDir,
                homeBarColor,
                awayBarDir,
                awayBarColor
            } : mainCanvasSettingsRef.current;

            const latestBlankCanvases = isScoreboard ? blankCanvases : blankCanvases.map(c => `blank-${c.id}` === selectedCanvasId ? {
                ...c,
                bg,
                posX,
                posY,
                alertDuration,
                font,
                layout,
                size,
                showTimeline,
                scoreBg,
                teamNameMode,
                showLogos,
                headerText,
                homeBarDir,
                homeBarColor,
                awayBarDir,
                awayBarColor,
                blockGap,
                blockBg,
                rounded,
                blocks
            } : c);

            const settings = {
                ...scoreboardSettings,
                blankCanvases: latestBlankCanvases,
                selectedCanvasId
            };

            const { error } = await supabase
                .from("tournaments")
                .update({ broadcast_settings: settings })
                .eq("id", tournamentId);

            if (error) throw error;

            if (!isScoreboard) {
                setBlankCanvases(latestBlankCanvases);
            }

            toast({
                title: "Template Saved Successfully!",
                description: "Overlay configuration has been stored as the template for this tournament.",
            });
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to save template";
            toast({
                variant: "destructive",
                title: "Failed to save template",
                description: errorMessage,
            });
        } finally {
            setSaving(false);
        }
    };

    // Drag states
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const blockStartPos = useRef({ x: 0, y: 0 });

    const handlePointerDown = (e: React.PointerEvent, blockId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedBlockId(blockId);
        setDraggingId(blockId);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        const block = blocks.find(b => b.id === blockId);
        if (block) {
            blockStartPos.current = { x: block.x, y: block.y };
        }
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent, blockId: string) => {
        if (draggingId !== blockId) return;
        e.stopPropagation();

        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;

        let newX = blockStartPos.current.x + dx;
        let newY = blockStartPos.current.y + dy;

        newX = Math.max(-180, Math.min(180, newX));
        newY = Math.max(-80, Math.min(80, newY));

        const snapped = getSnappedCoords(blockId, newX, newY, blocks, blockGap);
        updateCoordinates(blockId, snapped.x, snapped.y);
    };

    const handlePointerUp = (e: React.PointerEvent, blockId: string) => {
        if (draggingId === blockId) {
            setDraggingId(null);
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        }
    };

    // Toggle active state
    const toggleBlock = (index: number) => {
        const updated = [...blocks];
        updated[index] = { ...updated[index], active: !updated[index].active };
        setBlocks(updated);
    };

    // Update block properties (width, height, font size, border radius)
    const updateBlockProperty = (id: string, updates: Partial<typeof blocks[0]>) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const updateCoordinates = (id: string, x: number, y: number) => {
        updateBlockProperty(id, { x, y });
    };

    const applyRadiiToAll = () => {
        if (!selectedBlock) return;
        setBlocks(prev => prev.map(b => ({
            ...b,
            rTL: selectedBlock.rTL,
            rTR: selectedBlock.rTR,
            rBL: selectedBlock.rBL,
            rBR: selectedBlock.rBR
        })));
        toast({
            title: "Applied Corner Radius!",
            description: `Corner radius values (${selectedBlock.rTL}px, ${selectedBlock.rTR}px, ${selectedBlock.rBL}px, ${selectedBlock.rBR}px) applied to all blocks.`,
        });
    };

    // Selected block reference
    const selectedBlock = blocks.find(b => b.id === selectedBlockId);

    // Get absolute origin
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const locale = typeof window !== "undefined" ? window.location.pathname.split("/")[1] || "th" : "th";

    const handleCanvasSwitch = (targetId: string) => {
        // 1. Save the CURRENT editor values to the canvas we are leaving:
        if (selectedCanvasId === "scoreboard") {
            mainCanvasSettingsRef.current = {
                bg, posX, posY, alertDuration, font,
                layout, size, showTimeline, scoreBg, teamNameMode, showLogos,
                headerText, homeBarDir, homeBarColor, awayBarDir, awayBarColor,
                blockGap, blockBg, rounded, blocks
            };
        } else {
            const activeId = selectedCanvasId.replace("blank-", "");
            setBlankCanvases(prev => prev.map(c => c.id === activeId ? {
                ...c,
                bg, posX, posY, alertDuration, font,
                layout, size, showTimeline, scoreBg, teamNameMode, showLogos,
                headerText, homeBarDir, homeBarColor, awayBarDir, awayBarColor,
                blockGap, blockBg, rounded, blocks: [...blocks]
            } : c));
        }

        // 2. Perform switch
        if (targetId === "create_blank") {
            const name = window.prompt(locale === 'th' ? "ป้อนชื่อ Blank Canvas ใหม่:" : "Enter new Blank Canvas name:");
            if (name && name.trim()) {
                const newId = `${Date.now()}`;
                const newCanvas = {
                    id: newId,
                    name: name.trim(),
                    delay: 0,
                    bg: "transparent" as const,
                    posX: "center" as const,
                    posY: "top" as const,
                    alertDuration: 6,
                    font: "inter",
                    layout: "top-bar" as const,
                    size: "medium" as const,
                    showTimeline: false,
                    scoreBg: "#ef4444",
                    teamNameMode: "abbr" as const,
                    showLogos: true,
                    headerText: "",
                    homeBarDir: "none" as const,
                    homeBarColor: "#10b981",
                    awayBarDir: "none" as const,
                    awayBarColor: "#3b82f6",
                    blockGap: 8,
                    blockBg: "spaced" as const,
                    rounded: "md" as const,
                    blocks: DEFAULT_BLOCKS.map(b => ({ ...b, active: false }))
                };
                setBlankCanvases(prev => [...prev, newCanvas]);
                setSelectedCanvasId(`blank-${newId}`);

                // Set editor states for the new canvas
                setBg("transparent");
                setPosX("center");
                setPosY("top");
                setAlertDuration(6);
                setFont("inter");
                setLayout("top-bar");
                setSize("medium");
                setShowTimeline(false);
                setScoreBg("#ef4444");
                setTeamNameMode("abbr");
                setShowLogos(true);
                setHeaderText("");
                setHomeBarDir("none");
                setHomeBarColor("#10b981");
                setAwayBarDir("none");
                setAwayBarColor("#3b82f6");
                setBlockGap(8);
                setBlockBg("spaced");
                setRounded("md");
                setBlocks(DEFAULT_BLOCKS.map(b => ({ ...b, active: false })));
            }
            return;
        }

        setSelectedCanvasId(targetId);

        if (targetId === "scoreboard") {
            // Restore Main Canvas settings
            const s = mainCanvasSettingsRef.current;
            setBg(s.bg);
            setPosX(s.posX);
            setPosY(s.posY);
            setAlertDuration(s.alertDuration);
            setFont(s.font);
            setLayout(s.layout);
            setSize(s.size);
            setShowTimeline(s.showTimeline);
            setScoreBg(s.scoreBg);
            setTeamNameMode(s.teamNameMode);
            setShowLogos(s.showLogos);
            setHeaderText(s.headerText);
            setHomeBarDir(s.homeBarDir);
            setHomeBarColor(s.homeBarColor);
            setAwayBarDir(s.awayBarDir);
            setAwayBarColor(s.awayBarColor);
            setBlockGap(s.blockGap);
            setBlockBg(s.blockBg);
            setRounded(s.rounded);
            const mergedScoreboard = DEFAULT_BLOCKS.map(def => {
                const loaded = s.blocks?.find(b => b.id === def.id);
                return loaded ? { ...def, ...loaded } : def;
            });
            setBlocks(mergedScoreboard);
        } else {
            // Load selected Blank Canvas settings
            const active = blankCanvases.find(c => `blank-${c.id}` === targetId);
            if (active) {
                setBg(active.bg || "transparent");
                setPosX(active.posX || "center");
                setPosY(active.posY || "top");
                setAlertDuration(active.alertDuration || 6);
                setFont(active.font || "inter");
                setLayout(active.layout || "top-bar");
                setSize(active.size || "medium");
                setShowTimeline(active.showTimeline ?? false);
                setScoreBg(active.scoreBg || "#ef4444");
                setTeamNameMode(active.teamNameMode || "abbr");
                setShowLogos(active.showLogos ?? true);
                setHeaderText(active.headerText || "");
                setHomeBarDir(active.homeBarDir || "none");
                setHomeBarColor(active.homeBarColor || "#10b981");
                setAwayBarDir(active.awayBarDir || "none");
                setAwayBarColor(active.awayBarColor || "#3b82f6");
                setBlockGap(active.blockGap ?? 8);
                setBlockBg(active.blockBg || "spaced");
                setRounded(active.rounded || "md");
                const mergedBlank = DEFAULT_BLOCKS.map(def => {
                    const loaded = active.blocks?.find(b => b.id === def.id);
                    return loaded ? { ...def, ...loaded } : def;
                });
                setBlocks(mergedBlank);
            }
        }
    };

    // Generate OBS URLs
    const activeBlocksString = blocks
        .filter(b => b.active)
        .map(b => b.id)
        .join(",");

    const positionsString = blocks
        .filter(b => b.active)
        .map(b => `${b.id}:${b.x}:${b.y}:${b.w}:${b.h}:${b.fontSize}:${b.rTL}:${b.rTR}:${b.rBL}:${b.rBR}:${b.opacity ?? 100}:${(b.bg ?? (b.id.startsWith("score") ? scoreBg : "#000000")).replace("#", "")}:${(b.color ?? "#ffffff").replace("#", "")}`)
        .join(";");

    const scoreboardParams = new URLSearchParams({
        layout,
        bg,
        size,
        timeline: String(showTimeline),
        font,
        scoreBg,
        teamNameMode,
        showLogos: String(showLogos),
        headerText,
        posX,
        posY,
        alertDuration: String(alertDuration),
        blocks: activeBlocksString,
        positions: positionsString,
        orientation,
        blockGap: String(blockGap),
        blockBg,
        rounded,
        homeBarDir,
        homeBarColor,
        awayBarDir,
        awayBarColor,
        delay: String(delay)
    });
    const scoreboardUrl = `${origin}/${locale}/${tournamentId}/matches/${matchId}/overlay?${scoreboardParams.toString()}`;

    const activeBlankCanvas = blankCanvases.find(c => `blank-${c.id}` === selectedCanvasId) || blankCanvases[0];
    const activeBlankDelay = activeBlankCanvas?.delay ?? 0;

    const hasActiveBlocks = blocks.some(b => b.active);

    const blankParamsObj: Record<string, string> = {
        bg,
        posX,
        posY,
        alertDuration: String(alertDuration),
        delay: String(activeBlankDelay),
    };

    if (hasActiveBlocks) {
        blankParamsObj.layout = layout;
        blankParamsObj.size = size;
        blankParamsObj.timeline = String(showTimeline);
        blankParamsObj.font = font;
        blankParamsObj.scoreBg = scoreBg;
        blankParamsObj.teamNameMode = teamNameMode;
        blankParamsObj.showLogos = String(showLogos);
        blankParamsObj.headerText = headerText;
        blankParamsObj.blocks = activeBlocksString;
        blankParamsObj.positions = positionsString;
        blankParamsObj.orientation = orientation;
        blankParamsObj.blockGap = String(blockGap);
        blankParamsObj.blockBg = blockBg;
        blankParamsObj.rounded = rounded;
        blankParamsObj.homeBarDir = homeBarDir;
        blankParamsObj.homeBarColor = homeBarColor;
        blankParamsObj.awayBarDir = awayBarDir;
        blankParamsObj.awayBarColor = awayBarColor;
    } else {
        blankParamsObj.blank = "true";
    }

    const blankParams = new URLSearchParams(blankParamsObj);
    const blankUrl = `${origin}/${locale}/${tournamentId}/matches/${matchId}/overlay?${blankParams.toString()}`;

    const handleCopy = (url: string, type: "scoreboard" | "blank") => {
        navigator.clipboard.writeText(url);
        if (type === "scoreboard") {
            setCopiedScoreboard(true);
            setTimeout(() => setCopiedScoreboard(false), 2000);
        } else {
            setCopiedBlank(true);
            setTimeout(() => setCopiedBlank(false), 2000);
        }
        toast({
            title: "Copied successfully!",
            description: "Paste this URL as a Browser Source in OBS or vMix.",
        });
    };

    const getShortPreviewLabel = (id: string) => {
        switch (id) {
            case "header-text": return headerText || "Tournament Name";
            case "logo-tournament": return "Tour. Logo";
            case "logo-home": return "Home logo";
            case "logo-away": return "Away logo";
            case "name-home": return "Home name";
            case "name-away": return "Away name";
            case "score-home": return "0";
            case "score-away": return "0";
            case "timer": return "00:00";
            case "substitution": return "Sub: In ⇄ Out";
            default: return id;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card rounded-xl border p-0 overflow-hidden max-w-5xl md:max-w-6xl max-h-[95vh] md:max-h-[90vh] flex flex-col">
                <DialogHeader className="p-2 md:p-4 border-b shrink-0">
                    <DialogTitle className="flex items-center text-2xl font-black tracking-tighter text-foreground">
                        {t("board_editor")}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Select a block and place it anywhere on the virtual grid. Build complex stacked layouts freely.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="p-2 md:p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Left Column: Canvas Preview (col-span-7) */}
                        <div className="md:col-span-7 space-y-1">

                            {/* Visual Dotted Grid Board */}
                            <div
                                className="w-full h-[320px] md:h-[480px] border rounded-lg relative overflow-hidden flex items-center justify-center transition-colors duration-300"
                                style={{
                                    backgroundColor: bg === "transparent"
                                        ? undefined
                                        : bg === "chromakey"
                                            ? "#00ff00"
                                            : bg,
                                    backgroundImage: `radial-gradient(${isLightColor(bg) ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.08)"} 1px, transparent 1px)`,
                                    backgroundSize: "16px 16px"
                                }}
                            >
                                {/* Center Crosshair Reference */}
                                <div className={`absolute top-1/2 left-0 right-0 border-b ${isLightColor(bg) ? "border-black/10" : "border-white/5"} pointer-events-none`} />
                                <div className={`absolute left-1/2 top-0 bottom-0 border-l ${isLightColor(bg) ? "border-black/10" : "border-white/5"} pointer-events-none`} />

                                {/* NEW component list Popover button */}
                                <div className="absolute top-4 right-4 z-40">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="default"
                                                className="shadow-lg h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground hover:bg-primary/95"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                NEW
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            side="bottom"
                                            align="end"
                                            className="w-64 p-0 bg-card border shadow-2xl rounded-md"
                                            sideOffset={5}
                                        >
                                            <div className="p-2 border-b bg-muted/20">
                                                <span className="text-xs font-black tracking-wider text-foreground">{locale === 'th' ? "เพิ่มส่วนประกอบ" : "Add Components"}</span>
                                            </div>
                                            <div className="flex flex-col p-1 max-h-[300px] overflow-y-auto">
                                                {blocks.map((b, idx) => {
                                                    const iconColors = [
                                                        "bg-red-500/10 text-red-500 border-red-500/20",
                                                        "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                                        "bg-blue-500/10 text-blue-500 border-blue-500/20",
                                                        "bg-amber-500/10 text-amber-500 border-amber-500/20",
                                                        "bg-purple-500/10 text-purple-500 border-purple-500/20",
                                                        "bg-pink-500/10 text-pink-500 border-pink-500/20",
                                                        "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
                                                        "bg-violet-500/10 text-violet-500 border-violet-500/20"
                                                    ];
                                                    const colorClass = iconColors[idx % iconColors.length];

                                                    return (
                                                        <Button
                                                            key={b.id}
                                                            variant="ghost"
                                                            type="button"
                                                            onClick={() => {
                                                                if (!b.active) {
                                                                    toggleBlock(idx);
                                                                }
                                                                setSelectedBlockId(b.id);
                                                            }}
                                                            className={`w-full justify-start gap-3 h-auto py-2 px-3 hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all group ${b.active ? "bg-muted/40" : ""}`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-sm flex items-center justify-center shrink-0 border transition-all ${colorClass}`}>
                                                                {b.active ? <Check className="h-4 w-4" /> : <span className="text-[10px] font-black">{b.id.substring(0, 2).toUpperCase()}</span>}
                                                            </div>
                                                            <div className="flex flex-col items-start gap-0.5">
                                                                <span className={`text-[11px] font-black tracking-tight text-left ${b.active ? "text-foreground font-extrabold" : "text-muted-foreground"}`}>{b.name}</span>
                                                                <span className="text-[8px] text-muted-foreground tracking-tighter font-medium text-left">
                                                                    {b.active ? (locale === 'th' ? "แสดงอยู่บนบอร์ด" : "Visible on Canvas") : (locale === 'th' ? "คลิกเพื่อแสดง" : "Click to show on Canvas")}
                                                                </span>
                                                            </div>
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Render positioned Blocks */}
                                {blocks.map((b) => {
                                    if (!b.active) return null;
                                    const isSelected = b.id === selectedBlockId;
                                    const isScoreBlock = b.id === "score" || b.id === "score-home" || b.id === "score-away";
                                    const blockBg = b.bg ?? (isScoreBlock ? scoreBg : "#000000");

                                    return (
                                        <div
                                            key={b.id}
                                            onPointerDown={(e) => handlePointerDown(e, b.id)}
                                            onPointerMove={(e) => handlePointerMove(e, b.id)}
                                            onPointerUp={(e) => handlePointerUp(e, b.id)}
                                            style={{
                                                transform: `translate(calc(-50% + ${b.x}px), calc(-50% + ${b.y}px))`,
                                                left: "50%",
                                                top: "50%",
                                                width: `${b.w}px`,
                                                height: `${b.h}px`,
                                                fontSize: `${b.fontSize}px`,
                                                borderTopLeftRadius: `${b.rTL}px`,
                                                borderTopRightRadius: `${b.rTR}px`,
                                                borderBottomLeftRadius: `${b.rBL}px`,
                                                borderBottomRightRadius: `${b.rBR}px`,
                                                backgroundColor: `color-mix(in srgb, ${blockBg} ${b.opacity ?? 100}%, transparent)`,
                                                color: b.color ?? "#ffffff",
                                                touchAction: "none"
                                            }}
                                            className={`absolute flex items-center justify-center font-black tracking-tight cursor-grab active:cursor-grabbing select-none transition-all duration-75 ${isSelected
                                                ? "z-20"
                                                : "overflow-hidden z-10"
                                                }`}
                                        >
                                            {isSelected && (
                                                <div
                                                    className="absolute -inset-[1px] border border-primary pointer-events-none z-30"
                                                    style={{ borderRadius: 0 }}
                                                />
                                            )}
                                            <span className="truncate px-1 flex items-center gap-0.5">
                                                {getShortPreviewLabel(b.id)}
                                            </span>
                                            {b.id === "name-home" && homeBarDir !== "none" && (
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        backgroundColor: homeBarColor,
                                                        ...(homeBarDir === "top" && { top: 0, left: 0, right: 0, height: "4px" }),
                                                        ...(homeBarDir === "right" && { top: 0, bottom: 0, right: 0, width: "4px" }),
                                                        ...(homeBarDir === "bottom" && { bottom: 0, left: 0, right: 0, height: "4px" }),
                                                        ...(homeBarDir === "left" && { top: 0, bottom: 0, left: 0, width: "4px" }),
                                                    }}
                                                />
                                            )}
                                            {b.id === "name-away" && awayBarDir !== "none" && (
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        backgroundColor: awayBarColor,
                                                        ...(awayBarDir === "top" && { top: 0, left: 0, right: 0, height: "4px" }),
                                                        ...(awayBarDir === "right" && { top: 0, bottom: 0, right: 0, width: "4px" }),
                                                        ...(awayBarDir === "bottom" && { bottom: 0, left: 0, right: 0, height: "4px" }),
                                                        ...(awayBarDir === "left" && { top: 0, bottom: 0, left: 0, width: "4px" }),
                                                    }}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right Column: Editor Tools (col-span-5) */}
                        <div className="md:col-span-5 space-y-4 h-[480px] overflow-y-auto pr-1">
                            {/* Part 2: Canvas Coordinates & Toggles Panel */}
                            <div className="border rounded-lg p-2 md:p-4 space-y-2 md:space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Position & Spacing</Label>

                                    {/* Block Delete Button */}
                                    {selectedBlock && selectedBlock.active && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const idx = blocks.findIndex(b => b.id === selectedBlockId);
                                                if (idx !== -1) {
                                                    const updated = [...blocks];
                                                    updated[idx] = { ...updated[idx], active: false };
                                                    setBlocks(updated);
                                                }
                                            }}
                                            className="text-xs font-black text-destructive hover:underline"
                                        >
                                            {locale === 'th' ? "ลบ" : "Delete"}
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2">
                                    {/* Horizontal alignment */}
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Align Horizontal</Label>
                                        <Select value={posX} onValueChange={(val: string) => setPosX(val as "left" | "center" | "right")}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Align X" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card">
                                                <SelectItem value="left">Left</SelectItem>
                                                <SelectItem value="center">Center</SelectItem>
                                                <SelectItem value="right">Right</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Vertical alignment */}
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Align Vertical</Label>
                                        <Select value={posY} onValueChange={(val: string) => setPosY(val as "top" | "bottom")}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Align Y" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card">
                                                <SelectItem value="top">Top</SelectItem>
                                                <SelectItem value="bottom">Bottom</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* X, Y Position Offset */}
                                    {selectedBlock && (
                                        <>
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-[10px] flex justify-between items-center">
                                                        <span>X Offset (Horizontal)</span>
                                                    </Label>
                                                </div>
                                                <div className="flex items-center gap-1 md:gap-2">
                                                    <input
                                                        type="range"
                                                        min="-180"
                                                        max="180"
                                                        value={selectedBlock.x}
                                                        onChange={(e) => updateCoordinates(selectedBlockId, Number(e.target.value), selectedBlock.y)}
                                                        className="w-full accent-primary bg-foreground/10 h-1 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                    <Input
                                                        type="text"
                                                        value={selectedBlock.x}
                                                        onChange={(e) => {
                                                            let clean = e.target.value.replace(/[^-0-9]/g, "");
                                                            if (clean.includes("-")) {
                                                                const isNegative = clean.startsWith("-");
                                                                clean = (isNegative ? "-" : "") + clean.replace(/-/g, "");
                                                            }
                                                            updateCoordinates(selectedBlockId, clean === "" || clean === "-" ? 0 : Number(clean), selectedBlock.y);
                                                        }}
                                                        className="w-16"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-[10px] flex justify-between items-center">
                                                        <span>Y Offset (Vertical)</span>
                                                    </Label>
                                                </div>
                                                <div className="flex items-center gap-1 md:gap-2">
                                                    <input
                                                        type="range"
                                                        min="-80"
                                                        max="80"
                                                        value={selectedBlock.y}
                                                        onChange={(e) => updateCoordinates(selectedBlockId, selectedBlock.x, Number(e.target.value))}
                                                        className="w-full accent-primary bg-foreground/10 h-1 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                    <Input
                                                        type="text"
                                                        value={selectedBlock.y}
                                                        onChange={(e) => {
                                                            let clean = e.target.value.replace(/[^-0-9]/g, "");
                                                            if (clean.includes("-")) {
                                                                const isNegative = clean.startsWith("-");
                                                                clean = (isNegative ? "-" : "") + clean.replace(/-/g, "");
                                                            }
                                                            updateCoordinates(selectedBlockId, selectedBlock.x, clean === "" || clean === "-" ? 0 : Number(clean));
                                                        }}
                                                        className="w-16"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}


                                    {/* Box Width Slider */}
                                    {selectedBlock && (
                                        <div className="space-y-1">
                                            <Label className="text-[10px] flex justify-between items-center">
                                                <span>Width</span>
                                            </Label>
                                            <div className="flex items-center gap-1 md:gap-2">
                                                <input
                                                    type="range"
                                                    min="30"
                                                    max="250"
                                                    value={selectedBlock.w}
                                                    onChange={(e) => updateBlockProperty(selectedBlockId, { w: Number(e.target.value) })}
                                                    className="w-full accent-primary bg-border h-1 rounded-lg appearance-none cursor-pointer"
                                                />
                                                <Input
                                                    type="text"
                                                    value={selectedBlock.w || ""}
                                                    onChange={(e) => {
                                                        const clean = e.target.value.replace(/[^0-9]/g, "");
                                                        updateBlockProperty(selectedBlockId, { w: clean === "" ? 0 : Number(clean) });
                                                    }}
                                                    className="w-16"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Box Height Slider */}
                                    {selectedBlock && (
                                        <div className="space-y-1">
                                            <Label className="text-[10px] flex justify-between items-center">
                                                <span>Height</span>
                                            </Label>
                                            <div className="flex items-center gap-1 md:gap-2">
                                                <input
                                                    type="range"
                                                    min="20"
                                                    max="100"
                                                    value={selectedBlock.h}
                                                    onChange={(e) => updateBlockProperty(selectedBlockId, { h: Number(e.target.value) })}
                                                    className="w-full accent-primary bg-border h-1 rounded-lg appearance-none cursor-pointer"
                                                />
                                                <Input
                                                    type="text"
                                                    value={selectedBlock.h || ""}
                                                    onChange={(e) => {
                                                        const clean = e.target.value.replace(/[^0-9]/g, "");
                                                        updateBlockProperty(selectedBlockId, { h: clean === "" ? 0 : Number(clean) });
                                                    }}
                                                    className="w-16"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Appearance Section */}
                                    <div className="md:col-span-2 space-y-2 border-t pt-2 md:pt-4 mt-1 md:mt-2">
                                        <Label>Appearance</Label>

                                        {/* Block Spacing / Gap Slider */}
                                        <div>
                                            <Label className="text-[10px] flex justify-between items-center">
                                                <span>Spacing</span>
                                            </Label>
                                            <div className="flex items-center gap-1 md:gap-2">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="24"
                                                    value={blockGap}
                                                    onChange={(e) => setBlockGap(Number(e.target.value))}
                                                    className="w-full accent-primary bg-border h-1 rounded-lg appearance-none cursor-pointer"
                                                />
                                                <Input
                                                    type="text"
                                                    value={blockGap || "0"}
                                                    onChange={(e) => {
                                                        const clean = e.target.value.replace(/[^0-9]/g, "");
                                                        setBlockGap(clean === "" ? 0 : Number(clean));
                                                    }}
                                                    className="w-16"
                                                />
                                            </div>
                                        </div>

                                        {/* Opacity Slider */}
                                        {selectedBlock && (
                                            <div>
                                                <Label className="text-[10px] flex justify-between items-center">
                                                    <span>Opacity</span>
                                                </Label>
                                                <div className="flex items-center gap-1 md:gap-2">
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={selectedBlock.opacity ?? 100}
                                                        onChange={(e) => updateBlockProperty(selectedBlockId, { opacity: Number(e.target.value) })}
                                                        className="w-full accent-primary bg-border h-1 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                    <Input
                                                        type="text"
                                                        value={selectedBlock.opacity ?? 100}
                                                        onChange={(e) => {
                                                            const clean = e.target.value.replace(/[^0-9]/g, "");
                                                            let val = clean === "" ? 0 : Number(clean);
                                                            val = Math.max(0, Math.min(100, val));
                                                            updateBlockProperty(selectedBlockId, { opacity: val });
                                                        }}
                                                        className="w-16"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Fill Color Picker */}
                                        {selectedBlock && (
                                            <div className="space-y-1">
                                                <Label className="text-[10px] flex justify-between items-center">
                                                    <span>Fill Color</span>
                                                </Label>
                                                <div className="flex items-center gap-1 md:gap-2">
                                                    <input
                                                        type="color"
                                                        value={selectedBlock.bg ?? (selectedBlockId.startsWith("score") ? scoreBg : "#000000")}
                                                        onChange={(e) => updateBlockProperty(selectedBlockId, { bg: e.target.value })}
                                                        className="w-10 h-10 cursor-pointer shrink-0"
                                                    />
                                                    <Input
                                                        type="text"
                                                        value={selectedBlock.bg ?? (selectedBlockId.startsWith("score") ? scoreBg : "#000000")}
                                                        onChange={(e) => updateBlockProperty(selectedBlockId, { bg: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Corner Radii 2x2 Grid */}
                                        {selectedBlock && (
                                            <div className="space-y-1 md:space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[10px]">Radius</Label>
                                                    <button
                                                        type="button"
                                                        onClick={applyRadiiToAll}
                                                        className="text-[10px] font-black text-primary hover:underline"
                                                    >
                                                        Apply to All Blocks
                                                    </button>
                                                </div>

                                                {/* Link Corners Toggle */}
                                                <div className="flex items-center justify-between p-2 rounded-sm border h-10">
                                                    <span className="text-[10px] font-bold text-muted-foreground">Link 4 Corner Borders</span>
                                                    <Switch
                                                        checked={linkCorners}
                                                        onCheckedChange={setLinkCorners}
                                                        className="data-[state=checked]:bg-primary"
                                                    />
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-1 md:gap-2">
                                                    {/* Top-Left */}
                                                    <div>
                                                        <Label className="text-[10px]">Top-Left</Label>
                                                        <div className="flex items-center gap-1 md:gap-2 mt-1">
                                                            <input
                                                                type="range" min="0" max="40" value={selectedBlock.rTL}
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val });
                                                                    else updateBlockProperty(selectedBlockId, { rTL: val });
                                                                }}
                                                                className="w-full accent-primary bg-foreground/10 h-1 rounded-lg appearance-none cursor-pointer"
                                                            />
                                                            <Input
                                                                type="text"
                                                                value={selectedBlock.rTL}
                                                                onChange={(e) => {
                                                                    const clean = e.target.value.replace(/[^0-9]/g, "");
                                                                    const val = Math.max(0, Math.min(40, Number(clean) || 0));
                                                                    if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val });
                                                                    else updateBlockProperty(selectedBlockId, { rTL: val });
                                                                }}
                                                                className="w-16 h-8 text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                    {/* Top-Right */}
                                                    <div>
                                                        <Label className="text-[10px]">Top-Right</Label>
                                                        <div className="flex items-center gap-1 md:gap-2 mt-1">
                                                            <input
                                                                type="range" min="0" max="40" value={selectedBlock.rTR}
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val });
                                                                    else updateBlockProperty(selectedBlockId, { rTR: val });
                                                                }}
                                                                className="w-full accent-primary bg-foreground/10 h-1 rounded-lg appearance-none cursor-pointer"
                                                            />
                                                            <Input
                                                                type="text"
                                                                value={selectedBlock.rTR}
                                                                onChange={(e) => {
                                                                    const clean = e.target.value.replace(/[^0-9]/g, "");
                                                                    const val = Math.max(0, Math.min(40, Number(clean) || 0));
                                                                    if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val });
                                                                    else updateBlockProperty(selectedBlockId, { rTR: val });
                                                                }}
                                                                className="w-16 h-8 text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                    {/* Bottom-Left */}
                                                    <div>
                                                        <Label className="text-[10px]">Bottom-Left</Label>
                                                        <div className="flex items-center gap-1 md:gap-2 mt-1">
                                                            <input
                                                                type="range" min="0" max="40" value={selectedBlock.rBL}
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val });
                                                                    else updateBlockProperty(selectedBlockId, { rBL: val });
                                                                }}
                                                                className="w-full accent-primary bg-foreground/10 h-1 rounded-lg appearance-none cursor-pointer"
                                                            />
                                                            <Input
                                                                type="text"
                                                                value={selectedBlock.rBL}
                                                                onChange={(e) => {
                                                                    const clean = e.target.value.replace(/[^0-9]/g, "");
                                                                    const val = Math.max(0, Math.min(40, Number(clean) || 0));
                                                                    if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val });
                                                                    else updateBlockProperty(selectedBlockId, { rBL: val });
                                                                }}
                                                                className="w-16 h-8 text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                    {/* Bottom-Right */}
                                                    <div>
                                                        <Label className="text-[10px]">Bottom-Right</Label>
                                                        <div className="flex items-center gap-1 md:gap-2 mt-1">
                                                            <input
                                                                type="range" min="0" max="40" value={selectedBlock.rBR}
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val });
                                                                    else updateBlockProperty(selectedBlockId, { rBR: val });
                                                                }}
                                                                className="w-full accent-primary bg-foreground/10 h-1 rounded-lg appearance-none cursor-pointer"
                                                            />
                                                            <Input
                                                                type="text"
                                                                value={selectedBlock.rBR}
                                                                onChange={(e) => {
                                                                    const clean = e.target.value.replace(/[^0-9]/g, "");
                                                                    const val = Math.max(0, Math.min(40, Number(clean) || 0));
                                                                    if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val });
                                                                    else updateBlockProperty(selectedBlockId, { rBR: val });
                                                                }}
                                                                className="w-16 h-8 text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Typography section inside Appearance */}
                                        <div className="space-y-2 border-t pt-2 md:pt-4 mt-2 md:mt-4">
                                            <Label>Typography</Label>
                                            <div className="space-y-2">
                                                {/* Font Family selector */}
                                                <div className="space-y-1">
                                                    <Label className="text-[10px]">Font Family</Label>
                                                    <Select value={font} onValueChange={setFont}>
                                                        <SelectTrigger className="w-full h-8 text-xs">
                                                            <SelectValue placeholder="Select font" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-card">
                                                            <SelectItem value="inter" className="font-sans">Inter (Modern Clean)</SelectItem>
                                                            <SelectItem value="orbitron" className="font-mono">Orbitron (Digital Sports)</SelectItem>
                                                            <SelectItem value="montserrat" className="font-sans font-semibold">Montserrat (Geometric)</SelectItem>
                                                            <SelectItem value="bebas-neue" className="font-sans font-bold">Bebas Neue (Impact Tall)</SelectItem>
                                                            <SelectItem value="outfit" className="font-sans">Outfit (Premium Rounded)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Font Size Selector (for selected block) */}
                                                {selectedBlock && (
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] flex justify-between items-center">
                                                            <span>Font Size</span>
                                                        </Label>
                                                        <div className="flex items-center gap-1 md:gap-2">
                                                            <input
                                                                type="range"
                                                                min="8"
                                                                max="40"
                                                                value={selectedBlock.fontSize}
                                                                onChange={(e) => updateBlockProperty(selectedBlockId, { fontSize: Number(e.target.value) })}
                                                                className="w-full accent-primary bg-border h-1 rounded-lg appearance-none cursor-pointer"
                                                            />
                                                            <Input
                                                                type="text"
                                                                value={selectedBlock.fontSize || ""}
                                                                onChange={(e) => {
                                                                    const clean = e.target.value.replace(/[^0-9]/g, "");
                                                                    updateBlockProperty(selectedBlockId, { fontSize: clean === "" ? 0 : Number(clean) });
                                                                }}
                                                                className="w-16 h-8 text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Font Color Selector (for selected block) */}
                                                {selectedBlock && (
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px]">Font Color</Label>
                                                        <div className="flex items-center gap-1 md:gap-2">
                                                            <input
                                                                type="color"
                                                                value={selectedBlock.color ?? "#ffffff"}
                                                                onChange={(e) => updateBlockProperty(selectedBlockId, { color: e.target.value })}
                                                                className="w-10 h-8 cursor-pointer shrink-0"
                                                            />
                                                            <Input
                                                                type="text"
                                                                value={selectedBlock.color ?? "#ffffff"}
                                                                onChange={(e) => updateBlockProperty(selectedBlockId, { color: e.target.value })}
                                                                className="h-8 text-xs font-mono"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Part 4: Display Content Adjustments */}
                            <div className="border rounded-lg p-2 md:p-4 space-y-2 md:space-y-4">
                                <Label>Content</Label>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2 items-end">
                                    {/* Team Name Style selector */}
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Team Names Mode</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setTeamNameMode("abbr")}
                                                className={`px-2 py-1 rounded-sm border text-[10px] font-bold transition-all ${teamNameMode === "abbr"
                                                    ? "border-primary bg-primary/5 text-primary"
                                                    : "hover:bg-foreground/10 text-muted-foreground"
                                                    }`}
                                            >
                                                Abbreviations (3-Letters)
                                            </button>
                                            <button
                                                onClick={() => setTeamNameMode("full")}
                                                className={`px-2 py-1 rounded-sm border text-[10px] font-bold transition-all ${teamNameMode === "full"
                                                    ? "border-primary bg-primary/5 text-primary"
                                                    : "hover:bg-foreground/10 text-muted-foreground"
                                                    }`}
                                            >
                                                Full Team Name
                                            </button>
                                        </div>
                                    </div>

                                    {/* Additional Options */}
                                    <div className="flex items-center justify-between p-2 rounded-sm border h-10 self-end">
                                        <span className="text-[10px]">Show Goal Timeline</span>
                                        <Switch
                                            checked={showTimeline}
                                            onCheckedChange={setShowTimeline}
                                            className="data-[state=checked]:bg-primary"
                                        />
                                    </div>

                                    {/* Team Name Color Bars */}
                                    <div className="md:col-span-2 space-y-2 border-t pt-2 md:pt-4 mt-1 md:mt-2">
                                        <Label>Team Color Bars</Label>
                                        <div className="grid gap-1 md:gap-2">
                                            {/* Home Team Color Bar */}
                                            <div className="space-y-2 border p-2 rounded-sm">
                                                <Label className="text-[10px]">Home Team</Label>
                                                <div className="grid grid-cols-2 gap-1 md:gap-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px]">Direction</Label>
                                                        <Select value={homeBarDir} onValueChange={(val: string) => setHomeBarDir(val as "none" | "top" | "right" | "bottom" | "left")}>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card">
                                                                <SelectItem value="none">None</SelectItem>
                                                                <SelectItem value="top">Top</SelectItem>
                                                                <SelectItem value="right">Right</SelectItem>
                                                                <SelectItem value="bottom">Bottom</SelectItem>
                                                                <SelectItem value="left">Left</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px]">Bar Color</Label>
                                                        <div className="flex gap-1 md:gap-2">
                                                            <Input
                                                                type="text"
                                                                value={homeBarColor}
                                                                onChange={(e) => setHomeBarColor(e.target.value)}
                                                            />
                                                            <input
                                                                type="color"
                                                                value={homeBarColor}
                                                                onChange={(e) => setHomeBarColor(e.target.value)}
                                                                className="w-10 h-10 cursor-pointer shrink-0"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Away Team Color Bar */}
                                            <div className="space-y-2 border p-2 rounded-sm">
                                                <Label className="text-[10px]">Away Team</Label>
                                                <div className="grid grid-cols-2 gap-1 md:gap-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px]">Direction</Label>
                                                        <Select value={awayBarDir} onValueChange={(val: string) => setAwayBarDir(val as "none" | "top" | "right" | "bottom" | "left")}>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card">
                                                                <SelectItem value="none">None</SelectItem>
                                                                <SelectItem value="top">Top</SelectItem>
                                                                <SelectItem value="right">Right</SelectItem>
                                                                <SelectItem value="bottom">Bottom</SelectItem>
                                                                <SelectItem value="left">Left</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px]">Bar Color</Label>
                                                        <div className="flex gap-1 md:gap-2">
                                                            <Input
                                                                type="text"
                                                                value={awayBarColor}
                                                                onChange={(e) => setAwayBarColor(e.target.value)}
                                                            />
                                                            <input
                                                                type="color"
                                                                value={awayBarColor}
                                                                onChange={(e) => setAwayBarColor(e.target.value)}
                                                                className="w-10 h-10 cursor-pointer shrink-0"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Part 5: Positioning & OBS Canvas */}
                            <div className="border rounded-lg p-2 md:p-4 space-y-2 md:space-y-4">
                                <Label>OBS Settings</Label>

                                {/* Notification duration */}
                                {/* <div className="space-y-1 max-w-[200px]">
                                    <Label className="text-[10px]">Alert Display (Seconds)</Label>
                                    <Input
                                        type="number"
                                        min={3}
                                        max={20}
                                        value={alertDuration}
                                        onChange={(e) => setAlertDuration(Number(e.target.value) || 6)}
                                        className="w-full"
                                    />
                                </div> */}

                                <div className="space-y-2">
                                    <Label className="text-[10px]">OBS Canvas Background</Label>
                                    <div className="grid grid-cols-3 gap-1 md:gap-2">
                                        {(["transparent", "chromakey", "custom"] as const).map((bgMode) => {
                                            const isPresetBg = bg === "transparent" || bg === "chromakey";
                                            const isActive = bgMode === "custom" ? (!isPresetBg) : (bg === bgMode);
                                            return (
                                                <button
                                                    key={bgMode}
                                                    type="button"
                                                    onClick={() => {
                                                        if (bgMode === "custom") {
                                                            setBg("#0f172a");
                                                        } else {
                                                            setBg(bgMode);
                                                        }
                                                    }}
                                                    className={`flex flex-col items-center justify-center p-2 rounded-sm border text-[10px] font-bold transition-all ${isActive
                                                        ? "border-primary bg-primary/5 text-primary"
                                                        : "hover:bg-foreground/10 text-muted-foreground"
                                                        }`}
                                                >
                                                    <span className="capitalize">
                                                        {bgMode === "transparent" && (locale === 'th' ? "โปร่งใส" : "Transparent")}
                                                        {bgMode === "chromakey" && (locale === 'th' ? "โครมาคีย์" : "Chroma Key")}
                                                        {bgMode === "custom" && (locale === 'th' ? "กำหนดเอง" : "Custom")}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {!(bg === "transparent" || bg === "chromakey") && (
                                        <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-muted/10 border border-foreground/5">
                                            <div className="relative w-8 h-8 rounded border overflow-hidden shrink-0">
                                                <input
                                                    type="color"
                                                    value={bg.startsWith("#") ? bg : "#0f172a"}
                                                    onChange={(e) => setBg(e.target.value)}
                                                    className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-125 bg-transparent"
                                                />
                                            </div>
                                            <Input
                                                type="text"
                                                value={bg}
                                                onChange={(e) => setBg(e.target.value)}
                                                placeholder="#0f172a"
                                                className="h-8 text-xs font-mono"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-4 border-t p-4 shrink-0">
                    {/* Canvas Type Selection */}
                    <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-black tracking-wider text-muted-foreground">Canvas Type</Label>
                        <div className="flex items-center gap-2">
                            {selectedCanvasId !== "scoreboard" && activeBlankCanvas && (
                                <button
                                    onClick={() => {
                                        if (confirm(locale === 'th' ? `ต้องการลบ Blank Canvas "${activeBlankCanvas.name}" ใช่หรือไม่?` : `Are you sure you want to delete Blank Canvas "${activeBlankCanvas.name}"?`)) {
                                            setBlankCanvases(prev => prev.filter(c => c.id !== activeBlankCanvas.id));
                                            setSelectedCanvasId("scoreboard");
                                        }
                                    }}
                                    className="text-[10px] text-destructive hover:underline font-bold mr-1"
                                >
                                    {locale === 'th' ? "ลบ Canvas นี้" : "Delete Canvas"}
                                </button>
                            )}
                            <Select
                                value={selectedCanvasId}
                                onValueChange={handleCanvasSwitch}
                            >
                                <SelectTrigger className="w-[200px] h-8 text-xs font-bold bg-muted/10 border-foreground/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card">
                                    <SelectItem value="scoreboard" className="text-xs font-bold">Main Canvas</SelectItem>
                                    {blankCanvases.map((c) => (
                                        <SelectItem key={c.id} value={`blank-${c.id}`} className="text-xs font-bold">
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="create_blank" className="cursor-pointer text-xs font-bold text-primary focus:text-primary focus:bg-primary/10">
                                        + {locale === 'th' ? "สร้าง Blank Canvas..." : "Create Blank Canvas..."}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {selectedCanvasId === "scoreboard" ? (
                        /* Main Canvas Section */
                        <div className="flex gap-2">
                            <Input
                                readOnly
                                value={scoreboardUrl}
                                className="font-mono text-[10px] h-10 select-all border-foreground/10"
                            />
                            <Button
                                size="icon"
                                onClick={() => handleCopy(scoreboardUrl, "scoreboard")}
                                className={`h-10 w-10 shrink-0 transition-all ${copiedScoreboard ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-primary hover:bg-primary/90 text-black"}`}
                            >
                                {copiedScoreboard ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="h-10 w-10"
                            >
                                <a href={scoreboardUrl} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4" />
                                </a>
                            </Button>
                        </div>
                    ) : (
                        /* Blank Canvas Section */
                        <div className="flex gap-2">
                            <Input
                                readOnly
                                value={blankUrl}
                                className="font-mono text-[10px] h-10 select-all border-foreground/10"
                            />
                            <Button
                                size="icon"
                                onClick={() => handleCopy(blankUrl, "blank")}
                                className={`h-10 w-10 shrink-0 transition-all ${copiedBlank ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-primary hover:bg-primary/90 text-black"}`}
                            >
                                {copiedBlank ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="h-10 w-10"
                            >
                                <a href={blankUrl} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4" />
                                </a>
                            </Button>
                            {/* <div className="flex items-center gap-2">
                                <Label className="text-[10px] text-muted-foreground font-semibold">Delay</Label>
                                <Input
                                    type="text"
                                    min={0}
                                    max={60}
                                    value={activeBlankDelay}
                                    onChange={(e) => {
                                        const val = Math.max(0, Number(e.target.value) || 0);
                                        setBlankCanvases(prev => prev.map(c => c.id === activeBlankCanvas.id ? { ...c, delay: val } : c));
                                    }}
                                    className="w-16 h-7 text-xs px-2"
                                />
                                <Label className="text-[10px] text-muted-foreground font-semibold">Sec</Label>
                            </div> */}
                        </div>
                    )}

                    {/* Save Button */}
                    <Button
                        onClick={saveTemplate}
                        disabled={saving}
                        className="w-full h-11 text-sm font-bold"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Saving..." : "Save Canvas Template Settings"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog >
    );
}
