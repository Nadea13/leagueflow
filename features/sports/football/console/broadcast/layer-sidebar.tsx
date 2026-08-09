import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import {
    Layers,
    Eye,
    EyeOff,
    GripVertical,
    Trash2,
    Square,
    Circle,
    Triangle,
    Star,
    Type,
    LayoutGrid,
    Ungroup,
} from "lucide-react";
import { CanvasBlock } from "./types";

interface LayerSidebarProps {
    blocks: CanvasBlock[];
    setBlocks: React.Dispatch<React.SetStateAction<CanvasBlock[]>>;
    selectedBlockId: string;
    setSelectedBlockId: (id: string) => void;
    toggleBlock: (index: number) => void;
    getBlockName: (id: string, name: string) => string;
    locale: string;
}

export function LayerSidebar({
    blocks,
    setBlocks,
    selectedBlockId,
    setSelectedBlockId,
    toggleBlock,
    getBlockName,
    locale,
}: LayerSidebarProps) {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Display all layers in the layer list (hidden ones are kept with toggle state)
    const visibleBlocks = blocks;

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, originalIdx: number) => {
        setDraggedIndex(originalIdx);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(originalIdx));
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, originalIdx: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragOverIndex !== originalIdx) {
            setDragOverIndex(originalIdx);
        }
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIdx: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === targetIdx) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const updated = [...blocks];
        const [movedItem] = updated.splice(draggedIndex, 1);
        updated.splice(targetIdx, 0, movedItem);

        setBlocks(updated);
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDeleteLayer = (index: number, id: string) => {
        setBlocks(prev => prev.filter((_, i) => i !== index));
        if (selectedBlockId === id) {
            const remaining = blocks.filter((_, i) => i !== index);
            if (remaining.length > 0) {
                setSelectedBlockId(remaining[remaining.length - 1].id);
            }
        }
    };

    const getLayerIcon = (b: CanvasBlock) => {
        if (b.shapeType === "rectangle") return <Square className="h-4 w-4 text-blue-500" />;
        if (b.shapeType === "circle") return <Circle className="h-4 w-4 text-emerald-500" />;
        if (b.shapeType === "polygon") return <Triangle className="h-4 w-4 text-amber-500" />;
        if (b.shapeType === "star") return <Star className="h-4 w-4 text-purple-500" />;
        if (b.shapeType === "text") return <Type className="h-4 w-4 text-indigo-500" />;
        return <LayoutGrid className="h-4 w-4 text-primary" />;
    };

    return (
        <div className="md:col-span-3 lg:col-span-2.5 flex flex-col gap-2 h-full max-h-[82vh] min-h-0 border rounded-sm p-2 md:p-3 bg-card/50">
            {/* Header with Layer Title */}
            <div className="flex items-center justify-between border-b pb-2 shrink-0">
                <div className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" />
                    <Label className="text-xs font-black tracking-wider">
                        {locale === 'th' ? "เลเยอร์ (Layers)" : "Layers"}
                    </Label>
                </div>
            </div>

            {/* Layer Items Stack (Drag-and-Drop) */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 min-h-0">
                {visibleBlocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-xs font-medium text-center p-2">
                        <span>{locale === 'th' ? "ยังไม่มีเลเยอร์" : "No active layers"}</span>
                        <span className="text-[10px] text-muted-foreground/70 mt-1">
                            {locale === 'th' ? "เพิ่มเลเยอร์จากเมนูรูปทรงด้านล่าง Canvas" : "Add layers from shapes menu below canvas"}
                        </span>
                    </div>
                ) : (
                    (() => {
                        const selectedIds = (selectedBlockId || "").split(",").filter(Boolean);

                        // Process elements into rendering units (Standalone block or Group block)
                        // Note: display top layer first (reverse order)
                        const itemsToRender: ({ type: "single"; block: CanvasBlock } | { type: "group"; groupId: string; blocks: CanvasBlock[] })[] = [];
                        const processedGroupIds = new Set<string>();

                        for (let idx = visibleBlocks.length - 1; idx >= 0; idx--) {
                            const b = visibleBlocks[idx];
                            if (!b.groupId) {
                                itemsToRender.push({ type: "single", block: b });
                            } else if (!processedGroupIds.has(b.groupId)) {
                                processedGroupIds.add(b.groupId);
                                // Gather all blocks belonging to this group maintaining layer ordering (top first)
                                const groupBlocks = visibleBlocks
                                    .filter(item => item.groupId === b.groupId)
                                    .reverse();
                                itemsToRender.push({ type: "group", groupId: b.groupId, blocks: groupBlocks });
                            }
                        }

                        return itemsToRender.map((unit) => {
                            if (unit.type === "group") {
                                const groupMemberIds = unit.blocks.map(m => m.id);
                                const isGroupSelected = groupMemberIds.every(id => selectedIds.includes(id));
                                const isGroupPartiallySelected = !isGroupSelected && groupMemberIds.some(id => selectedIds.includes(id));

                                const handleGroupClick = (e: React.MouseEvent) => {
                                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                                        const newSelected = Array.from(new Set([...selectedIds, ...groupMemberIds]));
                                        setSelectedBlockId(newSelected.join(","));
                                    } else {
                                        setSelectedBlockId(groupMemberIds.join(","));
                                    }
                                };

                                const handleUngroup = (e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    setBlocks(prev => prev.map(b => b.groupId === unit.groupId ? { ...b, groupId: undefined } : b));
                                };

                                return (
                                    <div
                                        key={`group-${unit.groupId}`}
                                        className={`border rounded-sm p-1.5 space-y-1 transition-all ${
                                            isGroupSelected
                                                ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                                                : isGroupPartiallySelected
                                                    ? "border-primary/50 bg-primary/5"
                                                    : "border-border/60"
                                        }`}
                                    >
                                        {/* Group Card Header */}
                                        <div
                                            onClick={handleGroupClick}
                                            className="flex items-center justify-between px-1 py-1 cursor-pointer select-none text-xs font-bold text-primary"
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <LayoutGrid className="h-4 w-4 shrink-0 text-primary" />
                                                <span className="truncate text-[11px]">
                                                    {locale === 'th' ? `กลุ่ม (${unit.blocks.length} เลเยอร์)` : `Group (${unit.blocks.length} layers)`}
                                                </span>
                                            </div>

                                            {/* Ungroup Button */}
                                            <button
                                                type="button"
                                                onClick={handleUngroup}
                                                className="p-1 rounded-sm hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                                title={locale === 'th' ? "ยกเลิกการรวมกลุ่ม (Ungroup)" : "Ungroup"}
                                            >
                                                <Ungroup className="h-4 w-4" />
                                            </button>
                                        </div>

                                        {/* Nested Group Child Layer Cards */}
                                        <div className="space-y-1">
                                            {unit.blocks.map((b) => {
                                                const realIdx = blocks.findIndex(item => item.id === b.id);
                                                const isDragging = draggedIndex === realIdx;
                                                const isDragOver = dragOverIndex === realIdx;
                                                const isSelected = selectedIds.includes(b.id);

                                                const handleLayerClick = (e: React.MouseEvent) => {
                                                    e.stopPropagation();
                                                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                                                        const newSelected = selectedIds.includes(b.id)
                                                            ? selectedIds.filter(id => id !== b.id)
                                                            : [...selectedIds, b.id];
                                                        setSelectedBlockId(newSelected.join(","));
                                                    } else {
                                                        setSelectedBlockId(b.id);
                                                    }
                                                };

                                                return (
                                                    <div
                                                        key={b.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, realIdx)}
                                                        onDragOver={(e) => handleDragOver(e, realIdx)}
                                                        onDragEnd={handleDragEnd}
                                                        onDrop={(e) => handleDrop(e, realIdx)}
                                                        onClick={handleLayerClick}
                                                        className={`flex items-center justify-between p-1.5 rounded-sm border text-xs transition-all cursor-grab active:cursor-grabbing group select-none relative ${
                                                            isDragging
                                                                ? "opacity-30 border-dashed border-primary bg-primary/5"
                                                                : isDragOver
                                                                    ? "border-primary bg-primary/20 shadow-md ring-2 ring-primary/30"
                                                                    : isSelected
                                                                        ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                                                                        : b.active
                                                                            ? "border-border hover:bg-muted/50 text-foreground"
                                                                            : "border-border/40 text-muted-foreground opacity-60"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                                                            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-foreground/80 transition-colors" />
                                                            <span className="shrink-0">{getLayerIcon(b)}</span>
                                                            <span className="truncate text-[11px]">
                                                                {getBlockName(b.id, b.name)}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (realIdx !== -1) toggleBlock(realIdx);
                                                                }}
                                                                className={`p-1 rounded hover:bg-foreground/10 ${b.active ? "text-primary" : "text-muted-foreground"}`}
                                                                title={b.active ? (locale === 'th' ? "ซ่อนเลเยอร์" : "Hide Layer") : (locale === 'th' ? "แสดงเลเยอร์" : "Show Layer")}
                                                            >
                                                                {b.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (realIdx !== -1) handleDeleteLayer(realIdx, b.id);
                                                                }}
                                                                className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                                                                title={locale === 'th' ? "ลบเลเยอร์" : "Delete Layer"}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            }

                            // Single Layer Card
                            const b = unit.block;
                            const realIdx = blocks.findIndex(item => item.id === b.id);
                            const isDragging = draggedIndex === realIdx;
                            const isDragOver = dragOverIndex === realIdx;
                            const isSelected = selectedIds.includes(b.id);

                            const handleLayerClick = (e: React.MouseEvent) => {
                                if (e.shiftKey || e.ctrlKey || e.metaKey) {
                                    const newSelected = selectedIds.includes(b.id)
                                        ? selectedIds.filter(id => id !== b.id)
                                        : [...selectedIds, b.id];
                                    setSelectedBlockId(newSelected.join(","));
                                } else {
                                    setSelectedBlockId(b.id);
                                }
                            };

                            return (
                                <div
                                    key={b.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, realIdx)}
                                    onDragOver={(e) => handleDragOver(e, realIdx)}
                                    onDragEnd={handleDragEnd}
                                    onDrop={(e) => handleDrop(e, realIdx)}
                                    onClick={handleLayerClick}
                                    className={`flex items-center justify-between p-1.5 rounded-sm border text-xs transition-all cursor-grab active:cursor-grabbing group select-none relative ${
                                        isDragging
                                            ? "opacity-30 border-dashed border-primary bg-primary/5"
                                            : isDragOver
                                                ? "border-primary bg-primary/20 shadow-md ring-2 ring-primary/30"
                                                : isSelected
                                                    ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                                                    : b.active
                                                        ? "border-border hover:bg-muted/50 text-foreground"
                                                        : "border-border/40 bg-muted/20 text-muted-foreground opacity-60"
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-foreground/80 transition-colors" />
                                        <span className="shrink-0">{getLayerIcon(b)}</span>
                                        <span className="truncate text-[11px] font-bold">
                                            {getBlockName(b.id, b.name)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (realIdx !== -1) toggleBlock(realIdx);
                                            }}
                                            className={`p-1 rounded hover:bg-foreground/10 ${b.active ? "text-primary" : "text-muted-foreground"}`}
                                            title={b.active ? (locale === 'th' ? "ซ่อนเลเยอร์" : "Hide Layer") : (locale === 'th' ? "แสดงเลเยอร์" : "Show Layer")}
                                        >
                                            {b.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (realIdx !== -1) handleDeleteLayer(realIdx, b.id);
                                            }}
                                            className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                                            title={locale === 'th' ? "ลบเลเยอร์" : "Delete Layer"}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        });
                    })()
                )}
            </div>
        </div>
    );
}
