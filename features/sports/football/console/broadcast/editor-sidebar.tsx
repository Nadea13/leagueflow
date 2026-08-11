import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tab } from "@/components/ui/tab";
import {
    Sliders, Settings, Check, Copy, Eye, Trash2,
    MoveHorizontal, MoveVertical, RotateCw, FlipHorizontal2,
    FlipVertical2, SquareDashedBottom, CornerUpLeft, SquareRoundCorner,
    CornerUpRight, CornerDownLeft, CornerDownRight, Square, Circle, Group, Ungroup,
    Italic, Underline
} from "lucide-react";
import { CanvasBlock, BlankCanvas, DataBindType } from "./types";
import { DraggableLabel, GradientColorPicker } from "./helpers";
import { Header } from "@/components/ui/header";

interface EditorSidebarProps {
    blocks: CanvasBlock[];
    setBlocks: React.Dispatch<React.SetStateAction<CanvasBlock[]>>;
    selectedBlockId: string;
    setSelectedBlockId: (id: string) => void;
    selectedBlock?: CanvasBlock;
    updateCoordinates: (id: string, x: number, y: number) => void;
    updateBlockProperty: (id: string, props: Partial<CanvasBlock>) => void;
    blockGap: number;
    setBlockGap: (gap: number) => void;
    scoreBg: string;
    applyRadiiToAll: () => void;
    linkCorners: boolean;
    setLinkCorners: (val: boolean) => void;
    font: string;
    setFont: (font: string) => void;
    teamNameMode: "abbr" | "full";
    setTeamNameMode: (mode: "abbr" | "full") => void;
    homeBarDir: "none" | "top" | "right" | "bottom" | "left";
    setHomeBarDir: (dir: "none" | "top" | "right" | "bottom" | "left") => void;
    homeBarColor: string;
    setHomeBarColor: (color: string) => void;
    awayBarDir: "none" | "top" | "right" | "bottom" | "left";
    setAwayBarDir: (dir: "none" | "top" | "right" | "bottom" | "left") => void;
    awayBarColor: string;
    setAwayBarColor: (color: string) => void;
    posX: "left" | "center" | "right";
    setPosX: (pos: "left" | "center" | "right") => void;
    posY: "top" | "bottom";
    setPosY: (pos: "top" | "bottom") => void;
    bg: string;
    setBg: (bg: string) => void;
    locale: string;
    dict: Record<string, string>;

    // Config Tab Props
    selectedCanvasId: string;
    activeBlankCanvas?: BlankCanvas;
    blankCanvases: BlankCanvas[];
    setBlankCanvases: React.Dispatch<React.SetStateAction<BlankCanvas[]>>;
    setSelectedCanvasId: (id: string) => void;
    handleCanvasSwitch: (targetId: string) => void;
    scoreboardUrl: string;
    blankUrl: string;
    copiedScoreboard: boolean;
    copiedBlank: boolean;
    handleCopy: (url: string, type: "scoreboard" | "blank") => void;
    saveTemplate?: (showToast?: boolean) => void;
    saving?: boolean;
}

export function EditorSidebar({
    blocks,
    setBlocks,
    selectedBlockId,
    setSelectedBlockId,
    selectedBlock,
    updateCoordinates,
    updateBlockProperty,
    blockGap: _blockGap,
    setBlockGap: _setBlockGap,
    scoreBg,
    applyRadiiToAll: _applyRadiiToAll,
    linkCorners,
    setLinkCorners,
    font,
    setFont,
    teamNameMode,
    setTeamNameMode,
    homeBarDir: _homeBarDir,
    setHomeBarDir: _setHomeBarDir,
    homeBarColor: _homeBarColor,
    setHomeBarColor: _setHomeBarColor,
    awayBarDir: _awayBarDir,
    setAwayBarDir: _setAwayBarDir,
    awayBarColor: _awayBarColor,
    setAwayBarColor: _setAwayBarColor,
    posX: _posX,
    setPosX: _setPosX,
    posY: _posY,
    setPosY: _setPosY,
    bg: _bg,
    setBg: _setBg,
    locale,
    dict,
    selectedCanvasId,
    activeBlankCanvas,
    blankCanvases,
    setBlankCanvases,
    setSelectedCanvasId: _setSelectedCanvasId,
    handleCanvasSwitch,
    scoreboardUrl,
    blankUrl,
    copiedScoreboard,
    copiedBlank,
    handleCopy,
    saveTemplate: _saveTemplate,
    saving: _saving,
}: EditorSidebarProps) {
    const [activeTab, setActiveTab] = useState<"editor" | "config">("editor");

    const tabOptions = [
        {
            value: "editor" as const,
            label: locale === 'th' ? "ตัวแก้ไข (Editor)" : "Editor",
            icon: Sliders,
        },
        {
            value: "config" as const,
            label: locale === 'th' ? "การตั้งค่า (Config)" : "Config",
            icon: Settings,
        },
    ];

    return (
        <div className="md:col-span-3 flex flex-col gap-2 h-full max-h-[82vh] min-h-0">
            {/* Tab Navigation Header */}
            <Tab
                options={tabOptions}
                value={activeTab}
                onChange={setActiveTab}
                fullWidth
            />

            <div className="flex-1 overflow-y-auto min-h-0 pr-0.5 flex flex-col">
                {activeTab === "editor" ? (
                    <div className="flex-1 h-full flex flex-col border rounded-sm p-2 md:p-4 space-y-1 md:space-y-2 overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <Header level={5}>{dict.pos_spacing}</Header>

                            <div className="flex items-center gap-1">
                                {/* Group / Ungroup Buttons */}
                                {(() => {
                                    const selectedIds = selectedBlockId.split(",").filter(Boolean);
                                    const isMulti = selectedIds.length > 1;
                                    const hasGroup = selectedIds.some(id => blocks.find(b => b.id === id)?.groupId);

                                    return (
                                        <>
                                            {isMulti && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => {
                                                        const newGroupId = `group-${crypto.randomUUID()}`;
                                                        setBlocks(prev => prev.map(b => selectedIds.includes(b.id) ? { ...b, groupId: newGroupId } : b));
                                                    }}
                                                    title={locale === 'th' ? "รวมกลุ่ม (Ctrl+G)" : "Group (Ctrl+G)"}
                                                >
                                                    <Group className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {hasGroup && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => {
                                                        setBlocks(prev => prev.map(b => selectedIds.includes(b.id) ? { ...b, groupId: undefined } : b));
                                                    }}
                                                    title={locale === 'th' ? "ยกเลิกกลุ่ม (Ctrl+Shift+G)" : "Ungroup (Ctrl+Shift+G)"}
                                                >
                                                    <Ungroup className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </>
                                    );
                                })()}

                                {/* Block Delete Button */}
                                {selectedBlock && selectedBlock.active && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => {
                                            const ids = selectedBlockId.split(",").filter(Boolean);
                                            setBlocks(prev => prev.filter(b => !ids.includes(b.id)));
                                            setSelectedBlockId("");
                                        }}
                                        className="text-destructive"
                                        title={locale === 'th' ? "ลบ" : "Delete"}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2">
                            {/* X, Y Position Offset */}
                            {selectedBlock && (
                                <>
                                    <div className="flex items-center justify-between gap-2">
                                        <DraggableLabel value={selectedBlock.x} onChange={(val) => updateCoordinates(selectedBlockId, val, selectedBlock.y)} step={0.5}>{dict.x_offset}</DraggableLabel>
                                        <Input
                                            type="text"
                                            value={selectedBlock.x}
                                            onChange={(e) => {
                                                let clean = e.target.value.replace(/[^-0-9.]/g, "");
                                                if (clean.includes("-")) {
                                                    const isNegative = clean.startsWith("-");
                                                    clean = (isNegative ? "-" : "") + clean.replace(/-/g, "");
                                                }
                                                const dots = clean.split(".");
                                                if (dots.length > 2) {
                                                    clean = dots[0] + "." + dots.slice(1).join("");
                                                }
                                                updateCoordinates(selectedBlockId, clean === "" || clean === "-" || clean === "." ? 0 : Number(clean), selectedBlock.y);
                                            }}
                                            className="w-24 h-8 text-xs text-right"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <DraggableLabel value={selectedBlock.y} onChange={(val) => updateCoordinates(selectedBlockId, selectedBlock.x, val)} step={0.5}>{dict.y_offset}</DraggableLabel>
                                        <Input
                                            type="text"
                                            value={selectedBlock.y}
                                            onChange={(e) => {
                                                let clean = e.target.value.replace(/[^-0-9.]/g, "");
                                                if (clean.includes("-")) {
                                                    const isNegative = clean.startsWith("-");
                                                    clean = (isNegative ? "-" : "") + clean.replace(/-/g, "");
                                                }
                                                const dots = clean.split(".");
                                                if (dots.length > 2) {
                                                    clean = dots[0] + "." + dots.slice(1).join("");
                                                }
                                                updateCoordinates(selectedBlockId, selectedBlock.x, clean === "" || clean === "-" || clean === "." ? 0 : Number(clean));
                                            }}
                                            className="w-24 h-8 text-xs text-right"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <DraggableLabel value={selectedBlock.rotation || 0} onChange={(val) => updateBlockProperty(selectedBlockId, { rotation: val })} step={1}>
                                            <RotateCw className="h-4 w-4" />
                                        </DraggableLabel>
                                        <Input
                                            type="text"
                                            value={selectedBlock.rotation || 0}
                                            onChange={(e) => {
                                                let clean = e.target.value.replace(/[^-0-9.]/g, "");
                                                if (clean.includes("-")) {
                                                    const isNegative = clean.startsWith("-");
                                                    clean = (isNegative ? "-" : "") + clean.replace(/-/g, "");
                                                }
                                                const dots = clean.split(".");
                                                if (dots.length > 2) {
                                                    clean = dots[0] + "." + dots.slice(1).join("");
                                                }
                                                updateBlockProperty(selectedBlockId, { rotation: clean === "" || clean === "-" || clean === "." ? 0 : Number(clean) });
                                            }}
                                            className="w-24 h-8 text-xs text-right"
                                        />
                                    </div>
                                    <div className="flex items-center justify-end">
                                        <Button
                                            type="button"
                                            variant={selectedBlock.flipX ? "default" : "ghost"}
                                            size="icon"
                                            onClick={() => updateBlockProperty(selectedBlockId, { flipX: !selectedBlock.flipX })}
                                            title={locale === 'th' ? "พลิกแนวนอน" : "Flip Horizontal"}
                                        >
                                            <FlipHorizontal2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={selectedBlock.flipY ? "default" : "ghost"}
                                            size="icon"
                                            onClick={() => updateBlockProperty(selectedBlockId, { flipY: !selectedBlock.flipY })}
                                            title={locale === 'th' ? "พลิกแนวตั้ง" : "Flip Vertical"}
                                        >
                                            <FlipVertical2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* Box Width */}
                            {selectedBlock && (
                                <div className="flex items-center justify-between gap-2">
                                    <DraggableLabel value={selectedBlock.w || 0} onChange={(val) => updateBlockProperty(selectedBlockId, { w: val })} min={0}>
                                        <MoveHorizontal className="h-4 w-4" />
                                    </DraggableLabel>
                                    <Input
                                        type="text"
                                        value={selectedBlock.w || ""}
                                        onChange={(e) => {
                                            const clean = e.target.value.replace(/[^0-9]/g, "");
                                            updateBlockProperty(selectedBlockId, { w: clean === "" ? 0 : Number(clean) });
                                        }}
                                        className="w-24 h-8 text-xs text-right"
                                    />
                                </div>
                            )}

                            {/* Box Height */}
                            {selectedBlock && (
                                <div className="flex items-center justify-between gap-2">
                                    <DraggableLabel value={selectedBlock.h || 0} onChange={(val) => updateBlockProperty(selectedBlockId, { h: val })} min={0}>
                                        <MoveVertical className="h-4 w-4" />
                                    </DraggableLabel>
                                    <Input
                                        type="text"
                                        value={selectedBlock.h || ""}
                                        onChange={(e) => {
                                            const clean = e.target.value.replace(/[^0-9]/g, "");
                                            updateBlockProperty(selectedBlockId, { h: clean === "" ? 0 : Number(clean) });
                                        }}
                                        className="w-24 h-8 text-xs text-right"
                                    />
                                </div>
                            )}

                            {/* Appearance Section */}
                            <div className="md:col-span-2 space-y-2 border-t pt-2 md:pt-4 mt-1 md:mt-2">
                                <Header level={5}>{dict.appearance}</Header>

                                {/* Opacity */}
                                {selectedBlock && (
                                    <div className="flex items-center justify-between gap-2">
                                        <DraggableLabel value={selectedBlock.opacity ?? 100} onChange={(val) => updateBlockProperty(selectedBlockId, { opacity: val })} min={0} max={100}>
                                            <SquareDashedBottom className="h-4 w-4" />
                                        </DraggableLabel>
                                        <Input
                                            type="text"
                                            value={selectedBlock.opacity ?? 100}
                                            onChange={(e) => {
                                                const clean = e.target.value.replace(/[^0-9]/g, "");
                                                let val = clean === "" ? 0 : Number(clean);
                                                val = Math.max(0, Math.min(100, val));
                                                updateBlockProperty(selectedBlockId, { opacity: val });
                                            }}
                                            className="w-24 h-8 text-xs text-right"
                                        />
                                    </div>
                                )}

                                {/* Corner Radius Section */}
                                {selectedBlock && (
                                    <div className="space-y-1.5">
                                        {/* Unified Corner Radius Row */}
                                        <div className="flex items-center justify-between gap-2">
                                            <DraggableLabel
                                                value={selectedBlock.rTL}
                                                onChange={(val) => updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val })}
                                                min={0}
                                            >
                                                <Square className="h-4 w-4" />
                                            </DraggableLabel>
                                            <div className="flex items-center">
                                                <Button
                                                    type="button"
                                                    variant={!linkCorners ? "default" : "ghost"}
                                                    size="icon"
                                                    onClick={() => setLinkCorners(!linkCorners)}
                                                    title={locale === 'th' ? "แยกปรับแต่ละมุม" : "Separate Corner Radii"}
                                                >
                                                    <SquareRoundCorner className="h-4 w-4" />
                                                </Button>
                                                <Input
                                                    type="text"
                                                    value={linkCorners ? selectedBlock.rTL : `${selectedBlock.rTL}/${selectedBlock.rTR}/${selectedBlock.rBL}/${selectedBlock.rBR}`}
                                                    onChange={(e) => {
                                                        const clean = e.target.value.replace(/[^0-9]/g, "");
                                                        const val = Number(clean) || 0;
                                                        updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val });
                                                    }}
                                                    disabled={!linkCorners}
                                                    className="w-24 h-8 text-xs text-right"
                                                />
                                            </div>
                                        </div>

                                        {/* Individual Corner Inputs (When Link Corners is OFF) */}
                                        {!linkCorners && (
                                            <div className="grid grid-cols-2 gap-1 lg:gap-2">
                                                {/* Top-Left */}
                                                <div className="flex items-center justify-between gap-1">
                                                    <DraggableLabel value={selectedBlock.rTL} onChange={(val) => updateBlockProperty(selectedBlockId, { rTL: val })} min={0}>
                                                        <CornerUpLeft className="h-4 w-4 text-muted-foreground" />
                                                    </DraggableLabel>
                                                    <Input
                                                        type="text"
                                                        value={selectedBlock.rTL}
                                                        onChange={(e) => {
                                                            const clean = e.target.value.replace(/[^0-9]/g, "");
                                                            updateBlockProperty(selectedBlockId, { rTL: Number(clean) || 0 });
                                                        }}
                                                        className="w-16 h-7 text-xs text-right"
                                                    />
                                                </div>
                                                {/* Top-Right */}
                                                <div className="flex items-center justify-between gap-1">
                                                    <DraggableLabel value={selectedBlock.rTR} onChange={(val) => updateBlockProperty(selectedBlockId, { rTR: val })} min={0}>
                                                        <CornerUpRight className="h-4 w-4 text-muted-foreground" />
                                                    </DraggableLabel>
                                                    <Input
                                                        type="text"
                                                        value={selectedBlock.rTR}
                                                        onChange={(e) => {
                                                            const clean = e.target.value.replace(/[^0-9]/g, "");
                                                            updateBlockProperty(selectedBlockId, { rTR: Number(clean) || 0 });
                                                        }}
                                                        className="w-16 h-7 text-xs text-right"
                                                    />
                                                </div>
                                                {/* Bottom-Left */}
                                                <div className="flex items-center justify-between gap-1">
                                                    <DraggableLabel value={selectedBlock.rBL} onChange={(val) => updateBlockProperty(selectedBlockId, { rBL: val })} min={0}>
                                                        <CornerDownLeft className="h-4 w-4 text-muted-foreground" />
                                                    </DraggableLabel>
                                                    <Input
                                                        type="text"
                                                        value={selectedBlock.rBL}
                                                        onChange={(e) => {
                                                            const clean = e.target.value.replace(/[^0-9]/g, "");
                                                            updateBlockProperty(selectedBlockId, { rBL: Number(clean) || 0 });
                                                        }}
                                                        className="w-16 h-7 text-xs text-right"
                                                    />
                                                </div>
                                                {/* Bottom-Right */}
                                                <div className="flex items-center justify-between gap-1">
                                                    <DraggableLabel value={selectedBlock.rBR} onChange={(val) => updateBlockProperty(selectedBlockId, { rBR: val })} min={0}>
                                                        <CornerDownRight className="h-4 w-4 text-muted-foreground" />
                                                    </DraggableLabel>
                                                    <Input
                                                        type="text"
                                                        value={selectedBlock.rBR}
                                                        onChange={(e) => {
                                                            const clean = e.target.value.replace(/[^0-9]/g, "");
                                                            updateBlockProperty(selectedBlockId, { rBR: Number(clean) || 0 });
                                                        }}
                                                        className="w-16 h-7 text-xs text-right"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Fill Color Picker */}
                                {selectedBlock && (
                                    <GradientColorPicker
                                        label={dict.bg_color}
                                        value={selectedBlock.bg ?? (selectedBlockId.startsWith("score") ? scoreBg : "#000000")}
                                        onChange={(val) => updateBlockProperty(selectedBlockId, { bg: val })}
                                        fallbackColor="#000000"
                                    />
                                )}

                                {/* Stroke Section */}
                                {selectedBlock && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <DraggableLabel
                                                value={selectedBlock.strokeWidth ?? 0}
                                                onChange={(val) => updateBlockProperty(selectedBlockId, { strokeWidth: val })}
                                                min={0}
                                                max={50}
                                            >
                                                <Circle className="h-4 w-4" />
                                            </DraggableLabel>
                                            <Input
                                                type="text"
                                                value={selectedBlock.strokeWidth ?? 0}
                                                onChange={(e) => {
                                                    const clean = e.target.value.replace(/[^0-9]/g, "");
                                                    const val = Math.max(0, Number(clean) || 0);
                                                    updateBlockProperty(selectedBlockId, { strokeWidth: val });
                                                }}
                                                className="w-24 h-8 text-xs text-right"
                                            />
                                        </div>
                                        {(selectedBlock.strokeWidth ?? 0) > 0 && (
                                            <div className="space-y-2">
                                                <GradientColorPicker
                                                    label={dict.stroke_color}
                                                    value={selectedBlock.strokeColor ?? "#ffffff"}
                                                    onChange={(val) => updateBlockProperty(selectedBlockId, { strokeColor: val })}
                                                    fallbackColor="#ffffff"
                                                />
                                                <div className="flex items-center justify-between gap-2">
                                                    <Label className="shrink-0 text-xs font-medium">
                                                        {locale === 'th' ? "ตำแหน่งเส้นขอบ" : "Stroke Position"}
                                                    </Label>
                                                    <Select
                                                        value={selectedBlock.strokePos || "inside"}
                                                        onValueChange={(val: "inside" | "center" | "outside") => updateBlockProperty(selectedBlockId, { strokePos: val })}
                                                    >
                                                        <SelectTrigger className="w-24 h-8 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-card">
                                                            <SelectItem value="inside">{locale === 'th' ? "Inside (ด้านใน)" : "Inside"}</SelectItem>
                                                            <SelectItem value="center">{locale === 'th' ? "Center (กึ่งกลาง)" : "Center"}</SelectItem>
                                                            <SelectItem value="outside">{locale === 'th' ? "Outside (ด้านนอก)" : "Outside"}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        )}

                                        {/* Skew Section (เฉียงนอน / เฉียงตั้ง) */}
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                {/* Skew X (เฉียงนอน) */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <DraggableLabel
                                                        value={selectedBlock.skewX || 0}
                                                        onChange={(val) => updateBlockProperty(selectedBlockId, { skewX: val })}
                                                        step={1}
                                                    >
                                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M8 4h12l-4 16H4z" />
                                                        </svg>
                                                    </DraggableLabel>
                                                    <Input
                                                        type="text"
                                                        value={selectedBlock.skewX || 0}
                                                        onChange={(e) => {
                                                            let clean = e.target.value.replace(/[^-0-9.]/g, "");
                                                            if (clean.includes("-")) {
                                                                const isNegative = clean.startsWith("-");
                                                                clean = (isNegative ? "-" : "") + clean.replace(/-/g, "");
                                                            }
                                                            updateBlockProperty(selectedBlockId, { skewX: clean === "" || clean === "-" ? 0 : Number(clean) });
                                                        }}
                                                        className="w-24 h-8 text-xs text-right"
                                                    />
                                                </div>
                                                {/* Skew Y (เฉียงตั้ง) */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <DraggableLabel
                                                        value={selectedBlock.skewY || 0}
                                                        onChange={(val) => updateBlockProperty(selectedBlockId, { skewY: val })}
                                                        step={1}
                                                    >
                                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M4 8v12l16-4V4z" />
                                                        </svg>
                                                    </DraggableLabel>
                                                    <Input
                                                        type="text"
                                                        value={selectedBlock.skewY || 0}
                                                        onChange={(e) => {
                                                            let clean = e.target.value.replace(/[^-0-9.]/g, "");
                                                            if (clean.includes("-")) {
                                                                const isNegative = clean.startsWith("-");
                                                                clean = (isNegative ? "-" : "") + clean.replace(/-/g, "");
                                                            }
                                                            updateBlockProperty(selectedBlockId, { skewY: clean === "" || clean === "-" ? 0 : Number(clean) });
                                                        }}
                                                        className="w-24 h-8 text-xs text-right"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Typography section inside Appearance (Hidden for shape blocks like polygon, circle, rectangle, star) */}
                                {selectedBlock && (!selectedBlock.shapeType || selectedBlock.shapeType === "text") && (
                                    <div className="space-y-2 border-t pt-2 md:pt-4 mt-2 md:mt-4">
                                        <Label>{dict.typography}</Label>
                                        <div className="space-y-2">
                                            {/* Font Family selector */}
                                            <div className="flex items-center justify-between gap-2">
                                                <Label className="shrink-0">{dict.font_family}</Label>
                                                <Select value={font} onValueChange={setFont}>
                                                    <SelectTrigger className="w-24 h-8 text-xs">
                                                        <SelectValue placeholder={dict.select_font} />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-card">
                                                        <SelectItem value="inter" className="font-sans">Inter</SelectItem>
                                                        <SelectItem value="orbitron" className="font-mono">Orbitron</SelectItem>
                                                        <SelectItem value="montserrat" className="font-sans font-semibold">Montserrat</SelectItem>
                                                        <SelectItem value="bebas-neue" className="font-sans font-bold">Bebas Neue</SelectItem>
                                                        <SelectItem value="outfit" className="font-sans">Outfit</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Text Content Field for Text Shapes */}
                                            {(selectedBlock.shapeType === "text" || selectedBlock.text !== undefined) && (
                                                <div className="flex items-center justify-between gap-2">
                                                    <Label className="shrink-0">{locale === 'th' ? "ข้อความ" : "Text"}</Label>
                                                    <Input
                                                        type="text"
                                                        value={selectedBlock.text ?? ""}
                                                        onChange={(e) => updateBlockProperty(selectedBlockId, { text: e.target.value })}
                                                        className="w-24 h-8 text-xs text-right font-medium"
                                                    />
                                                </div>
                                            )}

                                            {/* Font Size Selector */}
                                            <div className="flex items-center justify-between gap-2">
                                                <DraggableLabel value={selectedBlock.fontSize || 0} onChange={(val) => updateBlockProperty(selectedBlockId, { fontSize: val })} min={0}>{dict.font_size}</DraggableLabel>
                                                <Input
                                                    type="text"
                                                    value={selectedBlock.fontSize || ""}
                                                    onChange={(e) => {
                                                        const clean = e.target.value.replace(/[^0-9]/g, "");
                                                        updateBlockProperty(selectedBlockId, { fontSize: clean === "" ? 0 : Number(clean) });
                                                    }}
                                                    className="w-24 h-8 text-xs text-right"
                                                />
                                            </div>
                                            {/* Font Weight Selector (Thin to Black) */}
                                             <div className="flex items-center justify-between gap-2">
                                                 <Label className="shrink-0">{locale === 'th' ? "ความหนาตัวหนังสือ" : "Font Weight"}</Label>
                                                 <Select
                                                     value={String(selectedBlock.fontWeight || "400")}
                                                     onValueChange={(val) => updateBlockProperty(selectedBlockId, { fontWeight: val })}
                                                 >
                                                     <SelectTrigger className="w-24 h-8 text-xs">
                                                         <SelectValue />
                                                     </SelectTrigger>
                                                     <SelectContent className="bg-card">
                                                         <SelectItem value="100" className="font-thin">Thin</SelectItem>
                                                         <SelectItem value="200" className="font-extralight">Extra Light</SelectItem>
                                                         <SelectItem value="300" className="font-light">Light</SelectItem>
                                                         <SelectItem value="400" className="font-normal">Normal</SelectItem>
                                                         <SelectItem value="500" className="font-medium">Medium</SelectItem>
                                                         <SelectItem value="600" className="font-semibold">Semi Bold</SelectItem>
                                                         <SelectItem value="700" className="font-bold">Bold</SelectItem>
                                                         <SelectItem value="800" className="font-extrabold">Extra Bold</SelectItem>
                                                         <SelectItem value="900" className="font-black">Black</SelectItem>
                                                     </SelectContent>
                                                 </Select>
                                             </div>

                                             {/* Font Style & Formatting (Italic & Underline) */}
                                             <div className="flex items-center justify-between gap-2">
                                                 <Label className="shrink-0">{locale === 'th' ? "รูปแบบตัวอักษร" : "Style"}</Label>
                                                 <div className="flex items-center gap-1">
                                                     <Button
                                                         type="button"
                                                         variant={selectedBlock.fontStyle === "italic" ? "default" : "ghost"}
                                                         size="icon"
                                                         onClick={() => updateBlockProperty(selectedBlockId, {
                                                             fontStyle: selectedBlock.fontStyle === "italic" ? "normal" : "italic"
                                                         })}
                                                         title={locale === 'th' ? "ตัวเอียง (Italic)" : "Italic"}
                                                         className="h-8 w-8"
                                                     >
                                                         <Italic className="h-4 w-4" />
                                                     </Button>
                                                     <Button
                                                         type="button"
                                                         variant={selectedBlock.textDecoration === "underline" ? "default" : "ghost"}
                                                         size="icon"
                                                         onClick={() => updateBlockProperty(selectedBlockId, {
                                                             textDecoration: selectedBlock.textDecoration === "underline" ? "none" : "underline"
                                                         })}
                                                         title={locale === 'th' ? "ขีดเส้นใต้ (Underline)" : "Underline"}
                                                         className="h-8 w-8"
                                                     >
                                                         <Underline className="h-4 w-4" />
                                                     </Button>
                                                 </div>
                                             </div>

                                            {/* Font Color Selector */}
                                            <div className="flex items-center justify-between gap-2">
                                                <Label className="shrink-0">{dict.font_color}</Label>
                                                <div className="flex items-center gap-1 md:gap-2 justify-end">
                                                    <input
                                                        type="color"
                                                        value={selectedBlock.color ?? "#ffffff"}
                                                        onChange={(e) => updateBlockProperty(selectedBlockId, { color: e.target.value })}
                                                        className="w-10 h-10 cursor-pointer shrink-0"
                                                    />
                                                    <Input
                                                        type="text"
                                                        value={selectedBlock.color ?? "#ffffff"}
                                                        onChange={(e) => updateBlockProperty(selectedBlockId, { color: e.target.value })}
                                                        className="w-24 h-8 text-xs text-right font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Config Tab */
                    <div className="flex-1 h-full flex flex-col border rounded-sm p-2 md:p-4 space-y-2 md:space-y-4 overflow-y-auto">
                        {/* Canvas Management */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                                <Header level={5}>{dict.canvas_type}</Header>
                                {selectedCanvasId !== "scoreboard" && activeBlankCanvas && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (confirm(locale === 'th' ? `ต้องการลบ Blank Canvas "${activeBlankCanvas.name}" ใช่หรือไม่?` : `Are you sure you want to delete Blank Canvas "${activeBlankCanvas.name}"?`)) {
                                                setBlankCanvases(prev => prev.filter(c => c.id !== activeBlankCanvas.id));
                                                handleCanvasSwitch("scoreboard");
                                            }
                                        }}
                                        className="text-[10px] text-destructive hover:underline font-bold"
                                    >
                                        {dict.delete_canvas}
                                    </button>
                                )}
                            </div>
                            <Select
                                value={selectedCanvasId}
                                onValueChange={handleCanvasSwitch}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card">
                                    <SelectItem value="scoreboard">{dict.main_canvas}</SelectItem>
                                    {blankCanvases.map((c) => (
                                        <SelectItem key={c.id} value={`blank-${c.id}`}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="create_blank" className="cursor-pointer text-primary focus:text-primary focus:bg-primary/10">
                                        + {locale === 'th' ? "สร้าง Blank Canvas..." : "Create Blank Canvas..."}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Match Data Link Binding (Shown only when polygon or text block is selected) */}
                        {selectedBlock && (selectedBlock.shapeType === "polygon" || selectedBlock.shapeType === "text" || !selectedBlock.shapeType) && (
                            <div className="space-y-2 border-t pt-4">
                                <div className="flex items-center gap-1.5">
                                    <Header level={5}>{locale === 'th' ? "การเชื่อมโยงข้อมูลแมตช์ (Data Link)" : "Match Data Link"}</Header>
                                </div>
                                {(() => {
                                    const isShape = selectedBlock.shapeType && selectedBlock.shapeType !== "text";
                                    return (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                    {locale === 'th' ? `เชื่อมโยงเลเยอร์ "${selectedBlock.name}":` : `Link layer "${selectedBlock.name}":`}
                                                </span>
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">
                                                    {isShape ? (locale === 'th' ? "รูปภาพ/โลโก้เท่านั้น" : "Images Only") : (locale === 'th' ? "ข้อความ/ตัวเลขเท่านั้น" : "Text/Numbers Only")}
                                                </span>
                                            </div>
                                            <Select
                                                value={selectedBlock.bindTo || "none"}
                                                onValueChange={(val) => updateBlockProperty(selectedBlockId, { bindTo: val as DataBindType })}
                                            >
                                                <SelectTrigger className="w-full h-9 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card">
                                                    <SelectItem value="none">{locale === 'th' ? "ไม่มี (ทั่วไป)" : "None (Static)"}</SelectItem>
                                                    {isShape ? (
                                                        <>
                                                            <SelectItem value="logo-home">{locale === 'th' ? "🛡️ โลโก้ทีมเหย้า" : "Home Logo"}</SelectItem>
                                                            <SelectItem value="logo-away">{locale === 'th' ? "🛡️ โลโก้ทีมเยือน" : "Away Logo"}</SelectItem>
                                                            <SelectItem value="logo-tournament">{locale === 'th' ? "🛡️ โลโก้รายการแข่งขัน" : "Tournament Logo"}</SelectItem>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <SelectItem value="name-home">{locale === 'th' ? "⚽ ชื่อ/ตัวย่อทีมเหย้า" : "Home Team Name"}</SelectItem>
                                                            <SelectItem value="name-away">{locale === 'th' ? "⚽ ชื่อ/ตัวย่อทีมเยือน" : "Away Team Name"}</SelectItem>
                                                            <SelectItem value="score-home">{locale === 'th' ? "🔢 สกอร์ทีมเหย้า" : "Home Score"}</SelectItem>
                                                            <SelectItem value="score-away">{locale === 'th' ? "🔢 สกอร์ทีมเยือน" : "Away Score"}</SelectItem>
                                                            <SelectItem value="header-text">{locale === 'th' ? "🏆 ชื่อรายการแข่งขัน" : "Tournament Name"}</SelectItem>
                                                            <SelectItem value="timer">{locale === 'th' ? "⏱️ เวลาและนาฬิกาแมตช์" : "Match Timer"}</SelectItem>
                                                            <SelectItem value="add-time">{locale === 'th' ? "⏱️ เวลาทดบาดเจ็บ" : "Added Time"}</SelectItem>
                                                            <SelectItem value="home-scorer">{locale === 'th' ? "👟 ผู้ทำประตูทีมเหย้า" : "Home Scorer"}</SelectItem>
                                                            <SelectItem value="away-scorer">{locale === 'th' ? "👟 ผู้ทำประตูทีมเยือน" : "Away Scorer"}</SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Content Adjustments */}
                        <div className="space-y-2 border-t pt-3">
                            <Header level={5}>{dict.content}</Header>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTeamNameMode("abbr")}
                                    className={`px-2 py-1 rounded-sm border text-xs font-bold transition-all ${teamNameMode === "abbr"
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "hover:bg-foreground/10 text-muted-foreground"
                                        }`}
                                >
                                    {dict.abbr}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTeamNameMode("full")}
                                    className={`px-2 py-1 rounded-sm border text-xs font-bold transition-all ${teamNameMode === "full"
                                        ? "border-primary/50 bg-primary/10 text-primary"
                                        : "hover:bg-foreground/10 text-muted-foreground"
                                        }`}
                                >
                                    {dict.full_name}
                                </button>
                            </div>
                        </div>



                        {/* OBS Overlay Links */}
                        <div className="space-y-2 border-t pt-3">
                            <Label className="text-xs font-black tracking-wider text-muted-foreground">
                                {locale === 'th' ? "ลิงก์ OBS Overlay" : "OBS Overlay URL"}
                            </Label>
                            {selectedCanvasId === "scoreboard" ? (
                                <div className="flex gap-2">
                                    <Input
                                        readOnly
                                        value={scoreboardUrl}
                                        className="font-mono text-[10px] h-10 select-all border-foreground/10 flex-1"
                                    />
                                    <Button
                                        size="icon"
                                        type="button"
                                        onClick={() => handleCopy(scoreboardUrl, "scoreboard")}
                                        className={`h-10 w-10 shrink-0 transition-all ${copiedScoreboard ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-primary hover:bg-primary/90 text-black"}`}
                                    >
                                        {copiedScoreboard ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="h-10 w-10 shrink-0"
                                    >
                                        <a href={scoreboardUrl} target="_blank" rel="noopener noreferrer">
                                            <Eye className="h-4 w-4" />
                                        </a>
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Input
                                        readOnly
                                        value={blankUrl}
                                        className="font-mono text-[10px] h-10 select-all border-foreground/10 flex-1"
                                    />
                                    <Button
                                        size="icon"
                                        type="button"
                                        onClick={() => handleCopy(blankUrl, "blank")}
                                        className={`h-10 w-10 shrink-0 transition-all ${copiedBlank ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-primary hover:bg-primary/90 text-black"}`}
                                    >
                                        {copiedBlank ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="h-10 w-10 shrink-0"
                                    >
                                        <a href={blankUrl} target="_blank" rel="noopener noreferrer">
                                            <Eye className="h-4 w-4" />
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
