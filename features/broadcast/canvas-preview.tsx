import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shapes, Square, Circle, Triangle, Star, Type, ChevronDown } from "lucide-react";
import { CanvasBlock, getSnappedCoords } from "./types";
import { isLightColor } from "./helpers";

interface CanvasPreviewProps {
    readOnly?: boolean;
    bg: string;
    blocks: CanvasBlock[];
    setBlocks?: React.Dispatch<React.SetStateAction<CanvasBlock[]>>;
    selectedBlockId: string;
    setSelectedBlockId: (id: string) => void;
    scoreBg: string;
    font?: string;
    homeBarDir: string;
    homeBarColor: string;
    awayBarDir: string;
    awayBarColor: string;
    headerText: string;
    nameHome?: string;
    nameAway?: string;
    logoHome?: string;
    logoAway?: string;
    logoTournament?: string;
    scoreHome?: string;
    scoreAway?: string;
    timerText?: string;
    addTimeText?: string;
    homeScorer?: string;
    awayScorer?: string;
    blockGap: number;
    locale: string;
    toggleBlock: (index: number) => void;
    getBlockName: (id: string, name: string) => string;
    getShortPreviewLabel: (id: string) => string;
    onUpdateBlockPosition: (id: string, x: number, y: number) => void;
}

const DEFAULT_PRESET_BLOCKS: CanvasBlock[] = [
    { id: "header-text", name: "Header", active: true, x: 0, y: -100, w: 420, h: 28, fontSize: 13, rTL: 4, rTR: 4, rBL: 0, rBR: 0, bg: "#0f172a", color: "#ffffff", bindTo: "header-text" },
    { id: "logo-home", name: "Home Logo", active: true, x: -170, y: -50, w: 44, h: 44, fontSize: 12, rTL: 4, rTR: 0, rBL: 4, rBR: 0, bg: "#1e293b", bindTo: "logo-home" },
    { id: "name-home", name: "Home Team", active: true, x: -90, y: -50, w: 110, h: 44, fontSize: 16, rTL: 0, rTR: 0, rBL: 0, rBR: 0, bg: "#1e293b", color: "#ffffff", bindTo: "name-home" },
    { id: "score-home", name: "Home Score", active: true, x: -20, y: -50, w: 34, h: 44, fontSize: 22, rTL: 0, rTR: 0, rBL: 0, rBR: 0, bg: "#3b82f6", color: "#ffffff", bindTo: "score-home" },
    { id: "score-away", name: "Away Score", active: true, x: 20, y: -50, w: 34, h: 44, fontSize: 22, rTL: 0, rTR: 0, rBL: 0, rBR: 0, bg: "#ef4444", color: "#ffffff", bindTo: "score-away" },
    { id: "name-away", name: "Away Team", active: true, x: 90, y: -50, w: 110, h: 44, fontSize: 16, rTL: 0, rTR: 0, rBL: 0, rBR: 0, bg: "#1e293b", color: "#ffffff", bindTo: "name-away" },
    { id: "logo-away", name: "Away Logo", active: true, x: 170, y: -50, w: 44, h: 44, fontSize: 12, rTL: 0, rTR: 4, rBL: 0, rBR: 4, bg: "#1e293b", bindTo: "logo-away" },
    { id: "timer", name: "Timer", active: true, x: 0, y: 0, w: 120, h: 32, fontSize: 16, rTL: 0, rTR: 0, rBL: 4, rBR: 4, bg: "#020617", color: "#f59e0b", bindTo: "timer" },
];

export function CanvasPreview({
    readOnly = false,
    bg,
    blocks,
    setBlocks,
    selectedBlockId,
    setSelectedBlockId,
    scoreBg,
    font = "inter",
    homeBarDir,
    homeBarColor,
    awayBarDir,
    awayBarColor,
    headerText,
    nameHome,
    nameAway,
    logoHome,
    logoAway,
    logoTournament,
    scoreHome,
    scoreAway,
    timerText,
    addTimeText,
    homeScorer,
    awayScorer,
    blockGap,
    locale,
    toggleBlock: _toggleBlock,
    getBlockName: _getBlockName,
    getShortPreviewLabel,
    onUpdateBlockPosition,
}: CanvasPreviewProps) {
    const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number; active: boolean } | null>(null);
    const [dragStart, setDragStart] = useState<{ pointerX: number; pointerY: number; initialBlocks: { id: string; x: number; y: number }[] } | null>(null);
    const [activeGuideLines, setActiveGuideLines] = useState<{ vLines: number[]; hLines: number[] } | null>(null);

    const selectedIds = (selectedBlockId || "").split(",").filter(Boolean);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
        e.preventDefault();
        e.stopPropagation();

        const clickedBlock = blocks.find(b => b.id === id);
        let idsToSelect: string[] = [id];

        if (clickedBlock?.groupId) {
            const groupMembers = blocks.filter(b => b.active && b.groupId === clickedBlock.groupId).map(b => b.id);
            if (groupMembers.length > 0) {
                idsToSelect = groupMembers;
            }
        }

        let currentSelectedIds = selectedIds;
        const isAllAlreadySelected = idsToSelect.every(bId => currentSelectedIds.includes(bId));

        if (!isAllAlreadySelected) {
            currentSelectedIds = idsToSelect;
            setSelectedBlockId(idsToSelect.join(","));
        }

        const initialBlocks = currentSelectedIds.map(bId => {
            const b = blocks.find(item => item.id === bId);
            return { id: bId, x: b?.x || 0, y: b?.y || 0 };
        });
        setDragStart({
            pointerX: e.clientX,
            pointerY: e.clientY,
            initialBlocks,
        });
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (_err) { }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, _id: string) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId) || !dragStart) return;
        const deltaX = e.clientX - dragStart.pointerX;
        const deltaY = e.clientY - dragStart.pointerY;

        const primaryInit = dragStart.initialBlocks[0];
        if (primaryInit) {
            const rawX = primaryInit.x + deltaX;
            const rawY = primaryInit.y + deltaY;
            const snapResult = getSnappedCoords(primaryInit.id, rawX, rawY, blocks, blockGap);
            const moveDeltaX = snapResult.x - primaryInit.x;
            const moveDeltaY = snapResult.y - primaryInit.y;

            setActiveGuideLines({
                vLines: snapResult.vLines,
                hLines: snapResult.hLines,
            });

            if (setBlocks) {
                setBlocks(prev => prev.map(b => {
                    const init = dragStart.initialBlocks.find(item => item.id === b.id);
                    if (init) {
                        return {
                            ...b,
                            x: Math.round((init.x + moveDeltaX) * 10) / 10,
                            y: Math.round((init.y + moveDeltaY) * 10) / 10,
                        };
                    }
                    return b;
                }));
            } else {
                dragStart.initialBlocks.forEach((item: { id: string; x: number; y: number }) => {
                    const newX = Math.round((item.x + moveDeltaX) * 10) / 10;
                    const newY = Math.round((item.y + moveDeltaY) * 10) / 10;
                    onUpdateBlockPosition(item.id, newX, newY);
                });
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>, _id: string) => {
        setDragStart(null);
        setActiveGuideLines(null);
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (_err) { }
    };

    const handleAddShape = (shapeType: "rectangle" | "circle" | "polygon" | "star" | "text") => {
        const timestamp = Date.now();
        const names: Record<string, string> = {
            rectangle: locale === 'th' ? "สี่เหลี่ยม" : "Rectangle",
            circle: locale === 'th' ? "วงกลม" : "Circle",
            polygon: locale === 'th' ? "Polygon" : "Polygon",
            star: locale === 'th' ? "ดาว" : "Star",
            text: locale === 'th' ? "ข้อความ" : "Text",
        };

        const newShape: CanvasBlock = {
            id: `shape-${shapeType}-${timestamp}`,
            name: names[shapeType] || shapeType,
            active: true,
            x: 0,
            y: 0,
            w: shapeType === "text" ? 140 : 100,
            h: shapeType === "text" ? 40 : 100,
            fontSize: 16,
            rTL: shapeType === "circle" ? 50 : 0,
            rTR: shapeType === "circle" ? 50 : 0,
            rBL: shapeType === "circle" ? 50 : 0,
            rBR: shapeType === "circle" ? 50 : 0,
            opacity: 100,
            bg: shapeType === "text" ? "transparent" : "#737373",
            color: "#ffffff",
            shapeType: shapeType,
            fontWeight: shapeType === "text" ? "400" : undefined,
            text: shapeType === "text" ? (locale === 'th' ? "ข้อความใหม่" : "New Text") : undefined,
        };

        if (setBlocks) {
            setBlocks(prev => [...prev, newShape]);
        }
        setSelectedBlockId(newShape.id);
    };

    const getBlockDisplayContent = (b: CanvasBlock): string => {
        if (b.bindTo && b.bindTo !== "none") {
            switch (b.bindTo) {
                case "name-home": return nameHome || (locale === 'th' ? "ทีมเหย้า" : "HOME");
                case "name-away": return nameAway || (locale === 'th' ? "ทีมเยือน" : "AWAY");
                case "score-home": return scoreHome || "0";
                case "score-away": return scoreAway || "0";
                case "set-home": return "0";
                case "set-away": return "0";
                case "point-won-home": return "🏐";
                case "point-won-away": return "🏐";
                case "score-bar-home": return "🏐 ○ 🏐 🏐 ○";
                case "score-bar-away": return "○ 🏐 ○ ○ 🏐";
                case "header-text": return headerText || "LEAGUEFLOW";
                case "timer": return timerText || "00:00";
                case "add-time": return addTimeText || "+0";
                case "logo-home": return "🛡️ Home";
                case "logo-away": return "🛡️ Away";
                case "logo-tournament": return "🛡️ Tour";
                case "home-scorer": return homeScorer || (locale === 'th' ? "👟 A. Player (12'), B. Player (45')" : "👟 A. Player (12'), B. Player (45')");
                case "away-scorer": return awayScorer || (locale === 'th' ? "👟 X. Player (30'), Y. Player (75')" : "👟 X. Player (30'), Y. Player (75')");
                default: break;
            }
        }
        if (b.id === "name-home") return nameHome || (locale === 'th' ? "ทีมเหย้า" : "HOME");
        if (b.id === "name-away") return nameAway || (locale === 'th' ? "ทีมเยือน" : "AWAY");
        if (b.id === "score-home") return scoreHome || "0";
        if (b.id === "score-away") return scoreAway || "0";
        if (b.id === "timer") return timerText || "00:00";
        if (b.id === "add-time") return addTimeText || "+0";
        if (b.id === "header-text") return headerText || "LEAGUEFLOW";
        if (b.shapeType === "text") return b.text || (locale === 'th' ? "ข้อความ" : "Text");
        return b.shapeType ? "" : getShortPreviewLabel(b.id);
    };

    const displayBlocks = (() => {
        if (blocks.length === 0) return DEFAULT_PRESET_BLOCKS;
        const activeCount = blocks.filter(b => b.active).length;
        if (readOnly && activeCount === 0) return DEFAULT_PRESET_BLOCKS;
        return blocks;
    })();

    return (
        <div className={`h-full flex flex-col min-h-0 relative ${readOnly ? "w-full" : "md:col-span-6 lg:col-span-6.5"}`}>
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-font-style {
                    font-family: ${font === 'orbitron' ? "'Orbitron', sans-serif" :
                                 font === 'montserrat' ? "'Montserrat', sans-serif" :
                                 font === 'bebas-neue' ? "'Bebas Neue', sans-serif" :
                                 font === 'outfit' ? "'Outfit', sans-serif" :
                                 "'Inter', sans-serif"};
                }
            ` }} />
            {/* Visual Dotted Grid Board */}
            <div
                onPointerDown={(e) => {
                    if (readOnly) return;
                    const activeEl = document.activeElement;
                    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
                        (activeEl as HTMLElement).blur();
                    }
                    if (e.target === e.currentTarget) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const relX = e.clientX - rect.left;
                        const relY = e.clientY - rect.top;
                        setSelectionBox({ startX: relX, startY: relY, currentX: relX, currentY: relY, active: true });
                        setSelectedBlockId("");
                        try {
                            e.currentTarget.setPointerCapture(e.pointerId);
                        } catch (_err) { }
                    }
                }}
                onPointerMove={(e) => {
                    if (readOnly) return;
                    if (selectionBox?.active) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const currentX = e.clientX - rect.left;
                        const currentY = e.clientY - rect.top;
                        setSelectionBox(prev => prev ? { ...prev, currentX, currentY } : null);

                        const boxMinX = Math.min(selectionBox.startX, currentX) - rect.width / 2;
                        const boxMaxX = Math.max(selectionBox.startX, currentX) - rect.width / 2;
                        const boxMinY = Math.min(selectionBox.startY, currentY) - rect.height / 2;
                        const boxMaxY = Math.max(selectionBox.startY, currentY) - rect.height / 2;

                        const matchedIds = displayBlocks.filter(b => b.active).filter(b => {
                            const bw = b.w || 100;
                            const bh = b.h || 40;
                            const bLeft = b.x - bw / 2;
                            const bRight = b.x + bw / 2;
                            const bTop = b.y - bh / 2;
                            const bBottom = b.y + bh / 2;
                            return !(bRight < boxMinX || bLeft > boxMaxX || bBottom < boxMinY || bTop > boxMaxY);
                        }).map(b => b.id);

                        setSelectedBlockId(matchedIds.join(","));
                    }
                }}
                onPointerUp={(e) => {
                    if (readOnly) return;
                    if (selectionBox?.active) {
                        try {
                            e.currentTarget.releasePointerCapture(e.pointerId);
                        } catch (_err) { }
                        setSelectionBox(null);
                    }
                }}
                className={`w-full flex-1 h-full ${readOnly ? "min-h-[220px]" : "min-h-[500px] max-h-[82vh]"} border rounded-sm relative overflow-hidden flex items-center justify-center transition-colors duration-300 focus:outline-none custom-font-style bg-card`}
                        style={{
                            backgroundColor: (bg === "transparent" || bg === "chromakey")
                                ? undefined
                                : bg,
                            backgroundImage: `radial-gradient(${isLightColor(bg) && bg !== "chromakey" ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.08)"} 1px, transparent 1px)`,
                            backgroundSize: "16px 16px"
                        }}
                    >
                        {/* Rubber-band Selection Box */}
                        {!readOnly && selectionBox?.active && Math.abs(selectionBox.currentX - selectionBox.startX) > 2 && (
                            <div
                                className="absolute border border-primary bg-primary/20 backdrop-blur-[0.5px] pointer-events-none z-50 rounded-none"
                                style={{
                                    left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
                                    top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
                                    width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
                                    height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`,
                                }}
                            />
                        )}

                        {/* Active Alignment Guide Lines (Cyan Smart Snapping Guides) */}
                        {!readOnly && activeGuideLines?.vLines.map((vX, i) => (
                            <div
                                key={`v-guide-${i}`}
                                className="absolute top-0 bottom-0 border-l-2 border-primary z-50 pointer-events-none"
                                style={{
                                    left: `calc(50% + ${vX}px)`,
                                }}
                            />
                        ))}
                        {!readOnly && activeGuideLines?.hLines.map((hY, i) => (
                            <div
                                key={`h-guide-${i}`}
                                className="absolute left-0 right-0 border-t-2 border-primary z-50 pointer-events-none"
                                style={{
                                    top: `calc(50% + ${hY}px)`,
                                }}
                            />
                        ))}

                        {/* Center Crosshair Reference */}
                        {!readOnly && (
                            <>
                                <div className={`absolute top-1/2 left-0 right-0 border-b ${isLightColor(bg) ? "border-black/10" : "border-white/5"} pointer-events-none`} />
                                <div className={`absolute left-1/2 top-0 bottom-0 border-l ${isLightColor(bg) ? "border-black/10" : "border-white/5"} pointer-events-none`} />
                            </>
                        )}

                        {/* Empty Canvas Helpful Tip Overlay */}
                        {!readOnly && displayBlocks.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none select-none z-10">
                                <div className="bg-card/80 backdrop-blur-sm border rounded-lg p-4 shadow-md max-w-xs space-y-1.5 border-border">
                                    <span className="text-2xl">✨</span>
                                    <p className="text-xs font-black text-foreground">
                                        {locale === 'th' ? "กระดานว่างเปล่า (Empty Canvas)" : "Empty Canvas"}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground leading-normal">
                                        {locale === 'th' ? "คลิกปุ่ม 'รูปทรง', 'ข้อความ' หรือ 'ตัวแปร' ด้านล่างเพื่อเริ่มสร้างป้ายคะแนน" : "Click 'Shapes', 'Text', or 'Variables' below to start building."}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Bottom Center Floating Toolbar Menu */}
                        {!readOnly && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-card border shadow-xl rounded-sm p-1 flex items-center">
                                {/* Dropdown Shapes */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="rounded h-8 px-2 text-xs font-bold gap-1.5 hover:bg-muted text-foreground"
                                        >
                                            <Shapes className="h-4 w-4" />
                                            <span>{locale === 'th' ? "รูปทรง" : "Shapes"}</span>
                                            <ChevronDown className="h-3 w-3 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="center" side="top" sideOffset={8} className="bg-card border shadow-xl rounded-sm w-44">
                                        <DropdownMenuItem onClick={() => handleAddShape("rectangle")} className="gap-2 rounded font-semibold text-xs cursor-pointer">
                                            <Square className="h-4 w-4" />
                                            <span>{locale === 'th' ? "สี่เหลี่ยม" : "Rectangle"}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAddShape("circle")} className="gap-2 rounded font-semibold text-xs cursor-pointer">
                                            <Circle className="h-4 w-4" />
                                            <span>{locale === 'th' ? "วงกลม" : "Circle"}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAddShape("polygon")} className="gap-2 rounded font-semibold text-xs cursor-pointer">
                                            <Triangle className="h-4 w-4" />
                                            <span>{locale === 'th' ? "Polygon (สามเหลี่ยม)" : "Polygon"}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAddShape("star")} className="gap-2 rounded font-semibold text-xs cursor-pointer">
                                            <Star className="h-4 w-4" />
                                            <span>{locale === 'th' ? "ดาว" : "Star"}</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Text Tool */}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAddShape("text")}
                                    className="rounded h-8 px-2 text-xs font-bold gap-1.5 hover:bg-muted text-foreground"
                                >
                                    <Type className="h-4 w-4" />
                                    <span>{locale === 'th' ? "ข้อความ" : "Text"}</span>
                                </Button>
                            </div>
                        )}

                        {/* Render positioned Blocks */}
                        {displayBlocks.map((b, idx) => {
                            if (!b.active) return null;
                            const isSelected = selectedIds.includes(b.id);
                            const isScoreBlock = b.id === "score" || b.id === "score-home" || b.id === "score-away";
                            const blockBg = b.bg ?? (isScoreBlock ? scoreBg : "#000000");

                            const isCircle = b.shapeType === "circle";
                            const isPolygon = b.shapeType === "polygon";
                            const isStar = b.shapeType === "star";
                            const isText = b.shapeType === "text";
                            const strokePos = b.strokePos || "inside";
                            const strokeWidth = b.strokeWidth ?? 0;
                            const strokeInset = strokeWidth > 0
                                ? (strokePos === "outside" ? `-${strokeWidth}px` : strokePos === "center" ? `-${strokeWidth / 2}px` : "0px")
                                : "0px";

                            return (
                                <div
                                    key={b.id}
                                    onPointerDown={!readOnly ? (e) => handlePointerDown(e, b.id) : undefined}
                                    onPointerMove={!readOnly ? (e) => handlePointerMove(e, b.id) : undefined}
                                    onPointerUp={!readOnly ? (e) => handlePointerUp(e, b.id) : undefined}
                            style={{
                                transform: `translate(calc(-50% + ${b.x}px), calc(-50% + ${b.y}px)) rotate(${b.rotation || 0}deg) scaleX(${b.flipX ? -1 : 1}) scaleY(${b.flipY ? -1 : 1})`,
                                left: "50%",
                                top: "50%",
                                width: isText ? "max-content" : `${b.w}px`,
                                height: isText ? "max-content" : `${b.h}px`,
                                fontSize: `${b.fontSize}px`,
                                borderTopLeftRadius: isCircle ? "50%" : `${b.rTL}px`,
                                borderTopRightRadius: isCircle ? "50%" : `${b.rTR}px`,
                                borderBottomLeftRadius: isCircle ? "50%" : `${b.rBL}px`,
                                borderBottomRightRadius: isCircle ? "50%" : `${b.rBR}px`,
                                color: b.color ?? "#ffffff",
                                touchAction: "none",
                                background: "transparent",
                                backgroundColor: "transparent",
                                isolation: "isolate",
                                zIndex: 10 + idx,
                                clipPath: isPolygon
                                    ? "polygon(50% 0%, 100% 100%, 0% 100%)"
                                    : isStar
                                        ? "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"
                                        : undefined,
                            }}
                            className={`absolute flex items-center justify-center ${isText ? "font-normal" : "font-black"} tracking-tight cursor-grab active:cursor-grabbing select-none transition-all duration-75 ${isSelected ? "z-20" : ""}`}
                        >
                            {/* Background container that supports opacity for gradient without fading text */}
                            <div
                                style={{
                                    position: "absolute",
                                    inset: strokeInset,
                                    transform: `skewX(${b.skewX || 0}deg) skewY(${b.skewY || 0}deg)`,
                                    zIndex: -1,
                                    borderRadius: isCircle ? "50%" : undefined,
                                    borderTopLeftRadius: isCircle ? "50%" : `${b.rTL}px`,
                                    borderTopRightRadius: isCircle ? "50%" : `${b.rTR}px`,
                                    borderBottomLeftRadius: isCircle ? "50%" : `${b.rBL}px`,
                                    borderBottomRightRadius: isCircle ? "50%" : `${b.rBR}px`,
                                    clipPath: isPolygon
                                        ? "polygon(50% 0%, 100% 100%, 0% 100%)"
                                        : isStar
                                            ? "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"
                                            : undefined,
                                    pointerEvents: "none",
                                    borderStyle: (b.strokeWidth ?? 0) > 0 ? "solid" : "none",
                                    borderWidth: (b.strokeWidth ?? 0) > 0 ? `${b.strokeWidth}px` : "0px",
                                    borderColor: b.strokeColor ?? "#ffffff",
                                    boxSizing: "border-box",
                                    ...(blockBg.includes("gradient") ? {
                                        background: blockBg,
                                        opacity: (b.opacity ?? 100) / 100,
                                    } : {
                                        backgroundColor: `color-mix(in srgb, ${blockBg} ${b.opacity ?? 100}%, transparent)`,
                                    })
                                }}
                            />
                            {/* Selection / Hover Outline frame that skews along with shape background */}
                            <div
                                className={`absolute inset-0 border pointer-events-none z-30 transition-all ${isSelected ? "border-2 border-primary" : "border-transparent hover:border-primary/60"}`}
                                style={{
                                    transform: `skewX(${b.skewX || 0}deg) skewY(${b.skewY || 0}deg)`,
                                    borderRadius: isCircle ? "50%" : undefined,
                                    borderTopLeftRadius: isCircle ? "50%" : `${b.rTL}px`,
                                    borderTopRightRadius: isCircle ? "50%" : `${b.rTR}px`,
                                    borderBottomLeftRadius: isCircle ? "50%" : `${b.rBL}px`,
                                    borderBottomRightRadius: isCircle ? "50%" : `${b.rBR}px`,
                                }}
                            />
                            {b.id === "logo-tournament" || b.bindTo === "logo-tournament" ? (
                                logoTournament ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={logoTournament} className="w-full h-full object-contain pointer-events-none p-1" alt="" />
                                ) : (
                                    <span className="text-[10px] opacity-60">🛡️ Tour</span>
                                )
                            ) : b.id === "logo-home" || b.bindTo === "logo-home" ? (
                                logoHome ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={logoHome} className="w-full h-full object-contain pointer-events-none p-1" alt="" />
                                ) : (
                                    <span className="text-[10px] opacity-60">🛡️ Home</span>
                                )
                            ) : b.id === "logo-away" || b.bindTo === "logo-away" ? (
                                logoAway ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={logoAway} className="w-full h-full object-contain pointer-events-none p-1" alt="" />
                                ) : (
                                    <span className="text-[10px] opacity-60">🛡️ Away</span>
                                )
                            ) : (
                                <span
                                    className={`${isText ? "whitespace-nowrap px-2 py-1" : "truncate px-1"} flex items-center gap-0.5`}
                                    style={{
                                        fontWeight: b.fontWeight ?? undefined,
                                        fontStyle: b.fontStyle ?? "normal",
                                        textDecoration: b.textDecoration ?? "none",
                                    }}
                                >
                                    {getBlockDisplayContent(b)}
                                </span>
                            )}
                            {b.id === "name-home" && homeBarDir !== "none" && (
                                <div
                                    style={{
                                        position: "absolute",
                                        [homeBarColor.includes("gradient") ? "background" : "backgroundColor"]: homeBarColor,
                                        ...(homeBarDir === "top" && { top: 0, left: 0, right: 0, height: "4px", borderTopLeftRadius: `${b.rTL}px`, borderTopRightRadius: `${b.rTR}px` }),
                                        ...(homeBarDir === "right" && { top: 0, bottom: 0, right: 0, width: "4px", borderTopRightRadius: `${b.rTR}px`, borderBottomRightRadius: `${b.rBR}px` }),
                                        ...(homeBarDir === "bottom" && { bottom: 0, left: 0, right: 0, height: "4px", borderBottomLeftRadius: `${b.rBL}px`, borderBottomRightRadius: `${b.rBR}px` }),
                                        ...(homeBarDir === "left" && { top: 0, bottom: 0, left: 0, width: "4px", borderTopLeftRadius: `${b.rTL}px`, borderBottomLeftRadius: `${b.rBL}px` }),
                                    }}
                                />
                            )}
                            {b.id === "name-away" && awayBarDir !== "none" && (
                                <div
                                    style={{
                                        position: "absolute",
                                        [awayBarColor.includes("gradient") ? "background" : "backgroundColor"]: awayBarColor,
                                        ...(awayBarDir === "top" && { top: 0, left: 0, right: 0, height: "4px", borderTopLeftRadius: `${b.rTL}px`, borderTopRightRadius: `${b.rTR}px` }),
                                        ...(awayBarDir === "right" && { top: 0, bottom: 0, right: 0, width: "4px", borderTopRightRadius: `${b.rTR}px`, borderBottomRightRadius: `${b.rBR}px` }),
                                        ...(awayBarDir === "bottom" && { bottom: 0, left: 0, right: 0, height: "4px", borderBottomLeftRadius: `${b.rBL}px`, borderBottomRightRadius: `${b.rBR}px` }),
                                        ...(awayBarDir === "left" && { top: 0, bottom: 0, left: 0, width: "4px", borderTopLeftRadius: `${b.rTL}px`, borderBottomLeftRadius: `${b.rBL}px` }),
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
