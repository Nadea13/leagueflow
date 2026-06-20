import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Eye, Check, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

interface BroadcastOverlayDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    matchId: string;
    tournamentId: string;
}

const BLOCK_SIZES: Record<string, { w: number, h: number }> = {
    "header-text": { w: 140, h: 32 },
    "logo-tournament": { w: 40, h: 40 },
    "logo-home": { w: 40, h: 40 },
    "name-home": { w: 76, h: 40 },
    "score-home": { w: 45, h: 40 },
    "score-away": { w: 45, h: 40 },
    "name-away": { w: 76, h: 40 },
    "logo-away": { w: 40, h: 40 },
    "timer": { w: 90, h: 40 }
};

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

export function BroadcastOverlayDialog({ open, onOpenChange, matchId, tournamentId }: BroadcastOverlayDialogProps) {
    const t = useTranslations("Console");
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    // Configuration states
    const [layout, setLayout] = useState<"top-bar" | "minimal-left" | "minimal-right">("top-bar");
    const [bg, setBg] = useState<"transparent" | "chromakey">("transparent");
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
    const [blocks, setBlocks] = useState<{
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
    }[]>([
        { id: "header-text", name: "Tournament Name", active: false, x: 0, y: -45, w: 140, h: 32, fontSize: 10, rTL: 8, rTR: 8, rBL: 8, rBR: 8 },
        { id: "logo-tournament", name: "Tournament Logo", active: false, x: -140, y: -45, w: 40, h: 40, fontSize: 12, rTL: 8, rTR: 8, rBL: 8, rBR: 8 },
        { id: "logo-home", name: "Home Team Logo", active: true, x: -140, y: 0, w: 40, h: 40, fontSize: 12, rTL: 8, rTR: 8, rBL: 8, rBR: 8 },
        { id: "name-home", name: "Home Team Name/Abbr", active: true, x: -95, y: 0, w: 76, h: 40, fontSize: 14, rTL: 8, rTR: 8, rBL: 8, rBR: 8 },
        { id: "score-home", name: "Home Score Box", active: true, x: -35, y: 0, w: 45, h: 40, fontSize: 20, rTL: 8, rTR: 8, rBL: 8, rBR: 8 },
        { id: "score-away", name: "Away Score Box", active: true, x: 35, y: 0, w: 45, h: 40, fontSize: 20, rTL: 8, rTR: 8, rBL: 8, rBR: 8 },
        { id: "name-away", name: "Away Team Name/Abbr", active: true, x: 95, y: 0, w: 76, h: 40, fontSize: 14, rTL: 8, rTR: 8, rBL: 8, rBR: 8 },
        { id: "logo-away", name: "Away Team Logo", active: true, x: 140, y: 0, w: 40, h: 40, fontSize: 12, rTL: 8, rTR: 8, rBL: 8, rBR: 8 },
        { id: "timer", name: "Match Timer & Clock", active: true, x: 0, y: 40, w: 90, h: 40, fontSize: 14, rTL: 8, rTR: 8, rBL: 8, rBR: 8 }
    ]);
    const [selectedBlockId, setSelectedBlockId] = useState<string>("score-home");
    const [orientation, setOrientation] = useState<"horizontal" | "vertical">("horizontal");
    const [blockGap, setBlockGap] = useState<number>(8);
    const [blockBg, setBlockBg] = useState<"spaced" | "docked">("spaced");
    const [rounded, setRounded] = useState<"none" | "md" | "full">("md");

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
                        bg?: "transparent" | "chromakey";
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
                        }[];
                        selectedBlockId?: string;
                        orientation?: "horizontal" | "vertical";
                        blockGap?: number;
                        blockBg?: "spaced" | "docked";
                        rounded?: "none" | "md" | "full";
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
                    if (settings.blocks) setBlocks(settings.blocks);
                    if (settings.selectedBlockId) setSelectedBlockId(settings.selectedBlockId);
                    if (settings.orientation) setOrientation(settings.orientation);
                    if (settings.blockGap !== undefined) setBlockGap(settings.blockGap);
                    if (settings.blockBg) setBlockBg(settings.blockBg);
                    if (settings.rounded) setRounded(settings.rounded);
                }
            } catch (e) {
                console.error("Error loading broadcast template:", e);
            }
        };
        loadTemplate();
    }, [open, tournamentId, supabase]);

    const saveTemplate = async () => {
        setSaving(true);
        try {
            const settings = {
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
                rounded
            };

            const { error } = await supabase
                .from("tournaments")
                .update({ broadcast_settings: settings })
                .eq("id", tournamentId);

            if (error) throw error;

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
    // Glue detection logic
    const isGlued = (blockId: string) => {
        const b = blocks.find(x => x.id === blockId);
        if (!b || !b.active) return false;
        return blocks.some(other => {
            if (other.id === blockId || !other.active) return false;
            const sizeA = { w: b.w, h: b.h };
            const sizeB = { w: other.w, h: other.h };

            const gluedXCenter = Math.abs(b.x - other.x) < 2;
            const gluedYCenter = Math.abs(b.y - other.y) < 2;

            const isLeftDocked = Math.abs(b.x - (other.x - (sizeA.w / 2 + sizeB.w / 2 + blockGap))) < 2;
            const isRightDocked = Math.abs(b.x - (other.x + (sizeA.w / 2 + sizeB.w / 2 + blockGap))) < 2;
            const isAboveDocked = Math.abs(b.y - (other.y - (sizeA.h / 2 + sizeB.h / 2 + blockGap))) < 2;
            const isBelowDocked = Math.abs(b.y - (other.y + (sizeA.h / 2 + sizeB.h / 2 + blockGap))) < 2;

            // Check alignment options (Top/Bottom for Horizontal, Left/Right for Vertical)
            const isTopAligned = Math.abs((b.y - b.h / 2) - (other.y - other.h / 2)) < 2;
            const isBottomAligned = Math.abs((b.y + b.h / 2) - (other.y + other.h / 2)) < 2;
            const isLeftAligned = Math.abs((b.x - b.w / 2) - (other.x - other.w / 2)) < 2;
            const isRightAligned = Math.abs((b.x + b.w / 2) - (other.x + other.w / 2)) < 2;

            const isHorizontallyGlued = (isLeftDocked || isRightDocked) && (gluedYCenter || isTopAligned || isBottomAligned);
            const isVerticallyGlued = (isAboveDocked || isBelowDocked) && (gluedXCenter || isLeftAligned || isRightAligned);

            return isHorizontallyGlued || isVerticallyGlued;
        });
    };

    // Selected block reference
    const selectedBlock = blocks.find(b => b.id === selectedBlockId);

    // Get absolute origin
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const locale = typeof window !== "undefined" ? window.location.pathname.split("/")[1] || "th" : "th";

    // Generate OBS URL
    const activeBlocksString = blocks
        .filter(b => b.active)
        .map(b => b.id)
        .join(",");

    const positionsString = blocks
        .filter(b => b.active)
        .map(b => `${b.id}:${b.x}:${b.y}:${b.w}:${b.h}:${b.fontSize}:${b.rTL}:${b.rTR}:${b.rBL}:${b.rBR}`)
        .join(";");

    const params = new URLSearchParams({
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
        // Canvas Modular parameters
        blocks: activeBlocksString,
        positions: positionsString,
        orientation,
        blockGap: String(blockGap),
        blockBg,
        rounded,
        homeBarDir,
        homeBarColor,
        awayBarDir,
        awayBarColor
    });
    const overlayUrl = `${origin}/${locale}/${tournamentId}/matches/${matchId}/overlay?${params.toString()}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(overlayUrl);
        setCopied(true);
        toast({
            title: "Copied successfully!",
            description: "Paste this URL as a Browser Source in OBS or vMix.",
        });
        setTimeout(() => setCopied(false), 2000);
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
            default: return id;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card rounded-xl border p-0 overflow-hidden">
                <DialogHeader className="p-2 md:p-4 border-b">
                    <DialogTitle className="flex items-center text-2xl font-black tracking-tighter text-foreground">
                        {t("board_editor")}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Select a block and place it anywhere on the virtual grid. Build complex stacked layouts freely.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-2 md:p-4 max-h-[60vh] overflow-y-auto space-y-2 md:space-y-4">

                    {/* Part 1: Grid Canvas Preview */}
                    <div className="space-y-2 md:space-y-4">
                        <div className="flex items-center justify-between text-xs font-black tracking-wider text-muted-foreground">
                            <Label>Interactive Design Canvas</Label>
                            <span className="text-[10px] text-muted-foreground font-normal">(Drag blocks or use coordinate sliders)</span>
                        </div>

                        {/* Visual Dotted Grid Board */}
                        <div
                            className="w-full h-64 border rounded-lg relative overflow-hidden bg-background flex items-center justify-center"
                            style={{
                                backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
                                backgroundSize: "16px 16px"
                            }}
                        >
                            {/* Center Crosshair Reference */}
                            <div className="absolute top-1/2 left-0 right-0 border-b border-white/5 pointer-events-none" />
                            <div className="absolute left-1/2 top-0 bottom-0 border-l border-white/5 pointer-events-none" />

                            {/* Render positioned Blocks */}
                            {blocks.map((b) => {
                                if (!b.active) return null;
                                const isSelected = b.id === selectedBlockId;
                                const glued = isGlued(b.id);

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
                                            touchAction: "none"
                                        }}
                                        className={`absolute flex items-center justify-center font-black tracking-tight cursor-grab active:cursor-grabbing select-none transition-all duration-75 border overflow-hidden ${isSelected
                                            ? "bg-primary text-black border-primary z-20"
                                            : glued
                                                ? "bg-background z-10"
                                                : "bg-background z-10"
                                            }`}
                                    >
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

                    {/* Part 2: Canvas Coordinates & Toggles Panel */}
                    <div className="border rounded-lg p-2 md:p-4 space-y-2 md:space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Position & Spacing Editor</Label>

                            {/* Block Switch Toggle */}
                            {selectedBlock && (
                                <div className="flex items-center gap-1 md:gap-2">
                                    <span className="text-[8px] md:text-[10px] font-bold text-muted-foreground">Show Block</span>
                                    <Switch
                                        checked={selectedBlock.active}
                                        onCheckedChange={() => toggleBlock(blocks.findIndex(b => b.id === selectedBlockId))}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2">
                            {/* Block Dropdown Selector */}
                            <div className="space-y-1">
                                <Label className="text-[10px]">Component</Label>
                                <Select value={selectedBlockId} onValueChange={setSelectedBlockId}>
                                    <SelectTrigger className="text-xs w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card">
                                        {blocks.map(b => (
                                            <SelectItem key={b.id} value={b.id} className="text-xs">
                                                {b.name} {!b.active && " (Hidden)"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Block Spacing / Gap Slider */}
                            <div className="space-y-1">
                                <Label className="text-[10px] flex justify-between items-center">
                                    <span>Spacing</span>
                                    <span className="text-primary font-black">{blockGap}px</span>
                                </Label>
                                <div className="flex items-center gap-1 md:gap-2">
                                    <input
                                        type="range"
                                        min="0"
                                        max="24"
                                        value={blockGap}
                                        onChange={(e) => setBlockGap(Number(e.target.value))}
                                        className="w-full accent-primary bg-border h-1.5 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <Input
                                        type="text"
                                        value={blockGap || ""}
                                        onChange={(e) => {
                                            const clean = e.target.value.replace(/[^0-9]/g, "");
                                            setBlockGap(clean === "" ? 0 : Number(clean));
                                        }}
                                        className="w-16"
                                    />
                                </div>
                            </div>

                            {/* Box Width Slider */}
                            {selectedBlock && (
                                <div className="space-y-1">
                                    <Label className="text-[10px] flex justify-between items-center">
                                        <span>Width</span>
                                        <span className="text-primary">{selectedBlock.w}px</span>
                                    </Label>
                                    <div className="flex items-center gap-1 md:gap-2">
                                        <input
                                            type="range"
                                            min="30"
                                            max="250"
                                            value={selectedBlock.w}
                                            onChange={(e) => updateBlockProperty(selectedBlockId, { w: Number(e.target.value) })}
                                            className="w-full accent-primary bg-border h-1.5 rounded-lg appearance-none cursor-pointer"
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
                                        <span className="text-primary">{selectedBlock.h}px</span>
                                    </Label>
                                    <div className="flex items-center gap-1 md:gap-2">
                                        <input
                                            type="range"
                                            min="20"
                                            max="100"
                                            value={selectedBlock.h}
                                            onChange={(e) => updateBlockProperty(selectedBlockId, { h: Number(e.target.value) })}
                                            className="w-full accent-primary bg-border h-1.5 rounded-lg appearance-none cursor-pointer"
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

                            {/* Font Size Slider */}
                            {selectedBlock && (
                                <div className="space-y-1">
                                    <Label className="text-[10px] flex justify-between items-center">
                                        <span>Font Size</span>
                                        <span className="text-primary">{selectedBlock.fontSize}px</span>
                                    </Label>
                                    <div className="flex items-center gap-1 md:gap-2">
                                        <input
                                            type="range"
                                            min="8"
                                            max="32"
                                            value={selectedBlock.fontSize}
                                            onChange={(e) => updateBlockProperty(selectedBlockId, { fontSize: Number(e.target.value) })}
                                            className="w-full accent-primary bg-foreground/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <Input
                                            type="text"
                                            value={selectedBlock.fontSize || ""}
                                            onChange={(e) => {
                                                const clean = e.target.value.replace(/[^0-9]/g, "");
                                                updateBlockProperty(selectedBlockId, { fontSize: clean === "" ? 0 : Number(clean) });
                                            }}
                                            className="w-16"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Link Corners Toggle */}
                            {selectedBlock && (
                                <div className="flex items-center justify-between p-2 rounded-sm border h-10 self-end">
                                    <span className="text-[10px] font-bold text-muted-foreground">Link 4 Corner Borders</span>
                                    <Switch
                                        checked={linkCorners}
                                        onCheckedChange={setLinkCorners}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </div>
                            )}

                            {/* Corner Radii 2x2 Grid */}
                            {selectedBlock && (
                                <div className="md:col-span-2 space-y-2 border-t pt-2 md:pt-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px]">Custom Radius (4 Corners)</Label>
                                        <button
                                            type="button"
                                            onClick={applyRadiiToAll}
                                            className="text-[10px] font-black text-primary hover:underline"
                                        >
                                            Apply to All Blocks
                                        </button>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-1 md:gap-2">
                                        {/* Top-Left */}
                                        <div className="space-y-1">
                                            <Label className="text-[10px] flex justify-between items-center">
                                                <span>Top-Left</span>
                                                <span className="text-primary text-[10px]">{selectedBlock.rTL}px</span>
                                            </Label>
                                            <input
                                                type="range" min="0" max="40" value={selectedBlock.rTL}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val });
                                                    else updateBlockProperty(selectedBlockId, { rTL: val });
                                                }}
                                                className="w-full accent-primary bg-foreground/10 h-1 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                        {/* Top-Right */}
                                        <div className="space-y-1">
                                            <Label className="text-[10px] flex justify-between items-center">
                                                <span>Top-Right</span>
                                                <span className="text-primary text-[10px]">{selectedBlock.rTR}px</span>
                                            </Label>
                                            <input
                                                type="range" min="0" max="40" value={selectedBlock.rTR}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val });
                                                    else updateBlockProperty(selectedBlockId, { rTR: val });
                                                }}
                                                className="w-full accent-primary bg-foreground/10 h-1 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                        {/* Bottom-Left */}
                                        <div className="space-y-1">
                                            <Label className="text-[10px] flex justify-between items-center">
                                                <span>Bottom-Left</span>
                                                <span className="text-primary text-[10px]">{selectedBlock.rBL}px</span>
                                            </Label>
                                            <input
                                                type="range" min="0" max="40" value={selectedBlock.rBL}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val });
                                                    else updateBlockProperty(selectedBlockId, { rBL: val });
                                                }}
                                                className="w-full accent-primary bg-foreground/10 h-1 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                        {/* Bottom-Right */}
                                        <div className="space-y-1">
                                            <Label className="text-[10px] flex justify-between items-center">
                                                <span>Bottom-Right</span>
                                                <span className="text-primary text-[10px]">{selectedBlock.rBR}px</span>
                                            </Label>
                                            <input
                                                type="range" min="0" max="40" value={selectedBlock.rBR}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val });
                                                    else updateBlockProperty(selectedBlockId, { rBR: val });
                                                }}
                                                className="w-full accent-primary bg-foreground/10 h-1 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* X, Y Position Slider */}
                            {selectedBlock && (
                                <div className="col-span-2 grid grid-cols-2 gap-1 md:gap-2 border-t pt-2 md:pt-4">
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-[10px] flex justify-between items-center">
                                                <span>X Offset (Horizontal)</span>
                                                <span className="text-primary text-[10px]">{selectedBlock.x}px</span>
                                            </Label>
                                        </div>
                                        <div className="flex items-center gap-1 md:gap-2">
                                            <input
                                                type="range"
                                                min="-180"
                                                max="180"
                                                value={selectedBlock.x}
                                                onChange={(e) => updateCoordinates(selectedBlockId, Number(e.target.value), selectedBlock.y)}
                                                className="w-full accent-primary bg-foreground/10 h-1.5 rounded-lg appearance-none cursor-pointer"
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
                                                <span className="text-primary">{selectedBlock.y}px</span></Label>
                                        </div>
                                        <div className="flex items-center gap-1 md:gap-2">
                                            <input
                                                type="range"
                                                min="-80"
                                                max="80"
                                                value={selectedBlock.y}
                                                onChange={(e) => updateCoordinates(selectedBlockId, selectedBlock.x, Number(e.target.value))}
                                                className="w-full accent-primary bg-foreground/10 h-1.5 rounded-lg appearance-none cursor-pointer"
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
                                </div>
                            )}

                            {/* Quick Dock / Connect buttons */}
                            {selectedBlock && (
                                <div className="space-y-2 md:col-span-2 pt-3 border-t border-foreground/5">
                                    <Label className="text-[11px] font-black tracking-wider text-muted-foreground flex items-center gap-1 md:gap-2">
                                        Quick Connect / Dock Actions
                                    </Label>
                                    <div className="flex flex-wrap gap-1 md:gap-2">
                                        {/* Center the block */}
                                        <button
                                            onClick={() => updateCoordinates(selectedBlockId, 0, 0)}
                                            className="px-2.5 py-1.5 bg-foreground/5 hover:bg-foreground/10 border border-foreground/5 rounded-lg text-[10px] font-bold text-muted-foreground transition-all flex items-center gap-1"
                                        >
                                            Reset to Center
                                        </button>
                                        {/* Context-aware snap buttons */}
                                        {selectedBlockId === "logo-home" && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        const ref = blocks.find(b => b.id === "name-home");
                                                        if (ref) updateCoordinates(selectedBlockId, ref.x - (BLOCK_SIZES["logo-home"].w / 2 + BLOCK_SIZES["name-home"].w / 2 + blockGap), ref.y);
                                                    }}
                                                    className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-[10px] font-bold text-primary transition-all"
                                                >
                                                    Dock Left of Home Name
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const ref = blocks.find(b => b.id === "score-home");
                                                        if (ref) updateCoordinates(selectedBlockId, ref.x - (BLOCK_SIZES["logo-home"].w / 2 + BLOCK_SIZES["score-home"].w / 2 + blockGap), ref.y);
                                                    }}
                                                    className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-[10px] font-bold text-primary transition-all"
                                                >
                                                    Dock Left of Home Score Box
                                                </button>
                                            </>
                                        )}
                                        {selectedBlockId === "name-home" && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        const ref = blocks.find(b => b.id === "score-home");
                                                        if (ref) updateCoordinates(selectedBlockId, ref.x - (BLOCK_SIZES["name-home"].w / 2 + BLOCK_SIZES["score-home"].w / 2 + blockGap), ref.y);
                                                    }}
                                                    className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-[10px] font-bold text-primary transition-all"
                                                >
                                                    Dock Left of Home Score Box
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const ref = blocks.find(b => b.id === "logo-home");
                                                        if (ref) updateCoordinates(selectedBlockId, ref.x + (BLOCK_SIZES["name-home"].w / 2 + BLOCK_SIZES["logo-home"].w / 2 + blockGap), ref.y);
                                                    }}
                                                    className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-[10px] font-bold text-primary transition-all"
                                                >
                                                    Dock Right of Home Logo
                                                </button>
                                            </>
                                        )}
                                        {selectedBlockId === "score-home" && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        const ref = blocks.find(b => b.id === "name-home");
                                                        if (ref) updateCoordinates(selectedBlockId, ref.x + (BLOCK_SIZES["score-home"].w / 2 + BLOCK_SIZES["name-home"].w / 2 + blockGap), ref.y);
                                                    }}
                                                    className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-[10px] font-bold text-primary transition-all"
                                                >
                                                    Dock Right of Home Name
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const ref = blocks.find(b => b.id === "timer");
                                                        if (ref) updateCoordinates(selectedBlockId, ref.x - (BLOCK_SIZES["score-home"].w / 2 + BLOCK_SIZES["timer"].w / 2 + blockGap), ref.y);
                                                    }}
                                                    className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-[10px] font-bold text-primary transition-all"
                                                >
                                                    Dock Left of Timer
                                                </button>
                                            </>
                                        )}
                                        {selectedBlockId === "score-away" && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        const ref = blocks.find(b => b.id === "name-away");
                                                        if (ref) updateCoordinates(selectedBlockId, ref.x - (BLOCK_SIZES["score-away"].w / 2 + BLOCK_SIZES["name-away"].w / 2 + blockGap), ref.y);
                                                    }}
                                                    className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-[10px] font-bold text-primary transition-all"
                                                >
                                                    Dock Left of Away Name
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const ref = blocks.find(b => b.id === "timer");
                                                        if (ref) updateCoordinates(selectedBlockId, ref.x + (BLOCK_SIZES["score-away"].w / 2 + BLOCK_SIZES["timer"].w / 2 + blockGap), ref.y);
                                                    }}
                                                    className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-[10px] font-bold text-primary transition-all"
                                                >
                                                    Dock Right of Timer
                                                </button>
                                            </>
                                        )}
                                        {selectedBlockId === "name-away" && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        const ref = blocks.find(b => b.id === "score-away");
                                                        if (ref) updateCoordinates(selectedBlockId, ref.x + (BLOCK_SIZES["name-away"].w / 2 + BLOCK_SIZES["score-away"].w / 2 + blockGap), ref.y);
                                                    }}
                                                    className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-[10px] font-bold text-primary transition-all"
                                                >
                                                    Dock Right of Away Score Box
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const ref = blocks.find(b => b.id === "logo-away");
                                                        if (ref) updateCoordinates(selectedBlockId, ref.x - (BLOCK_SIZES["name-away"].w / 2 + BLOCK_SIZES["logo-away"].w / 2 + blockGap), ref.y);
                                                    }}
                                                    className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-[10px] font-bold text-primary transition-all"
                                                >
                                                    Dock Left of Away Logo
                                                </button>
                                            </>
                                        )}
                                        {selectedBlockId === "logo-away" && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        const ref = blocks.find(b => b.id === "name-away");
                                                        if (ref) updateCoordinates(selectedBlockId, ref.x + (BLOCK_SIZES["logo-away"].w / 2 + BLOCK_SIZES["name-away"].w / 2 + blockGap), ref.y);
                                                    }}
                                                    className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-[10px] font-bold text-primary transition-all"
                                                >
                                                    Dock Right of Away Name
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const ref = blocks.find(b => b.id === "score-away");
                                                        if (ref) updateCoordinates(selectedBlockId, ref.x + (BLOCK_SIZES["logo-away"].w / 2 + BLOCK_SIZES["score-away"].w / 2 + blockGap), ref.y);
                                                    }}
                                                    className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-[10px] font-bold text-primary transition-all"
                                                >
                                                    Dock Right of Away Score Box
                                                </button>
                                            </>
                                        )}
                                        {selectedBlockId === "timer" && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        const ref = blocks.find(b => b.id === "score-home");
                                                        if (ref) updateCoordinates(selectedBlockId, ref.x, ref.y + (BLOCK_SIZES["timer"].h / 2 + BLOCK_SIZES["score-home"].h / 2 + blockGap));
                                                    }}
                                                    className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-[10px] font-bold text-primary transition-all"
                                                >
                                                    Dock Below Home Score
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const ref = blocks.find(b => b.id === "score-home");
                                                        if (ref) updateCoordinates(selectedBlockId, ref.x, ref.y - (BLOCK_SIZES["timer"].h / 2 + BLOCK_SIZES["score-home"].h / 2 + blockGap));
                                                    }}
                                                    className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-[10px] font-bold text-primary transition-all"
                                                >
                                                    Dock Above Home Score
                                                </button>
                                            </>
                                        )}
                                        {selectedBlockId === "header-text" && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        const ref = blocks.find(b => b.id === "score-home");
                                                        if (ref) updateCoordinates(selectedBlockId, ref.x, ref.y - (BLOCK_SIZES["header-text"].h / 2 + BLOCK_SIZES["score-home"].h / 2 + blockGap));
                                                    }}
                                                    className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-[10px] font-bold text-primary transition-all"
                                                >
                                                    Dock Above Home Score
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const ref = blocks.find(b => b.id === "timer");
                                                        if (ref) updateCoordinates(selectedBlockId, ref.x, ref.y - (BLOCK_SIZES["header-text"].h / 2 + BLOCK_SIZES["timer"].h / 2 + blockGap));
                                                    }}
                                                    className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-[10px] font-bold text-primary transition-all"
                                                >
                                                    Dock Above Timer
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Part 3: Styling & Theme */}
                    <div className="space-y-2 md:space-y-4">
                        <Label>Colors & Typography</Label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2">
                            {/* Font Family selector */}
                            <div className="space-y-2">
                                <Label className="text-[10px]">Typography / Font</Label>
                                <Select value={font} onValueChange={setFont}>
                                    <SelectTrigger className="w-full">
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

                            {/* Score Background Color Picker */}
                            <div className="space-y-2">
                                <Label className="text-[10px]">Score Area Color (Hex)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="text"
                                        value={scoreBg}
                                        onChange={(e) => setScoreBg(e.target.value)}
                                        placeholder="#ef4444"
                                        className="font-mono text-xs"
                                    />
                                    <input
                                        type="color"
                                        value={scoreBg}
                                        onChange={(e) => setScoreBg(e.target.value)}
                                        className="w-10 h-10 cursor-pointer shrink-0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Part 4: Display Content Adjustments */}
                    <div className="space-y-2 md:space-y-4 border-t border-foreground/5 pt-4">
                        <Label>Content Adjustments</Label>

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
                    <div className="space-y-2 md:space-y-4 border-t border-foreground/5 pt-4">
                        <Label>Layout Position & OBS Settings</Label>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-2">
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

                            {/* Notification duration */}
                            <div className="space-y-1">
                                <Label className="text-[10px]">Alert Display (Seconds)</Label>
                                <Input
                                    type="number"
                                    min={3}
                                    max={20}
                                    value={alertDuration}
                                    onChange={(e) => setAlertDuration(Number(e.target.value) || 6)}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px]">OBS Canvas Background</Label>
                            <div className="grid grid-cols-2 gap-1 md:gap-2">
                                {(["transparent", "chromakey"] as const).map((bgMode) => (
                                    <button
                                        key={bgMode}
                                        onClick={() => setBg(bgMode)}
                                        className={`flex flex-col items-center justify-center p-2 rounded-sm border text-[10px] font-bold transition-all ${bg === bgMode
                                            ? "border-primary bg-primary/5 text-primary"
                                            : "hover:bg-foreground/10 text-muted-foreground"
                                            }`}
                                    >
                                        <span className="capitalize">{bgMode === "chromakey" ? "Chroma Key (Green Screen)" : "Transparent (For OBS)"}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-1 md:gap-2 border-t p-2 md:p-4">
                    {/* Generated Link Field */}
                    <div className="space-y-1">
                        <div className="flex gap-2">
                            <Input
                                readOnly
                                value={overlayUrl}
                                className="font-mono text-[10px] h-10 select-all border-foreground/10"
                            />
                            <Button
                                size="icon"
                                onClick={handleCopy}
                                className={`h-10 w-10 shrink-0 transition-all ${copied ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-primary hover:bg-primary/90 text-black"}`}
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    {/* Bottom Action Grid */}
                    <div className="grid grid-cols-2 gap-1 md:gap-2">
                        <Button
                            asChild
                            variant="outline"
                        >
                            <a href={overlayUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                                Preview Overlay
                            </a>
                        </Button>
                        <Button
                            onClick={saveTemplate}
                            disabled={saving}
                        >
                            <Save className="h-4 w-4" />
                            {saving ? "Saving..." : "Save Template"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
