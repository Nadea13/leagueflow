"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { useTranslations, useLocale } from "next-intl";
import { updateBroadcastSettings } from "@/actions/tournaments/general";

import { CanvasBlock, CanvasSettings, BlankCanvas, DEFAULT_BLOCKS } from "./types";
import { CanvasPreview } from "./canvas-preview";
import { EditorSidebar } from "./editor-sidebar";
import { LayerSidebar } from "./layer-sidebar";

interface BroadcastDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    matchId: string;
    tournamentId: string;
    sport?: string;
}

export function BroadcastDialog({ open, onOpenChange, matchId, tournamentId, sport = "football" }: BroadcastDialogProps) {
    const t = useTranslations("Console");
    const locale = useLocale();
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

    // Canvas Block Editor States
    const [blocks, setBlocks] = useState<CanvasBlock[]>(DEFAULT_BLOCKS);
    const [selectedBlockId, setSelectedBlockId] = useState<string>("score-home");
    const [orientation, setOrientation] = useState<"horizontal" | "vertical">("horizontal");
    const [blockGap, setBlockGap] = useState<number>(0);
    const [blockBg, setBlockBg] = useState<"spaced" | "docked">("spaced");
    const [rounded, setRounded] = useState<"none" | "md" | "full">("md");

    const [blankCanvases, setBlankCanvases] = useState<BlankCanvas[]>([
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

    // Backup of scoreboard settings
    const mainCanvasSettingsRef = useRef<CanvasSettings>({
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
    });

    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const isInitialLoadedRef = useRef(false);
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
                    const settings = data.broadcast_settings as Partial<CanvasSettings> & {
                        blankCanvases?: BlankCanvas[];
                        blankDelay?: number;
                        selectedCanvasId?: string;
                        delay?: number;
                    };

                    const mergedMainBlocks = (settings.blocks && Array.isArray(settings.blocks))
                        ? settings.blocks
                        : DEFAULT_BLOCKS;

                    mainCanvasSettingsRef.current = {
                        bg: settings.bg || "transparent",
                        posX: settings.posX || "center",
                        posY: settings.posY || "top",
                        alertDuration: settings.alertDuration || 6,
                        font: settings.font || "inter",
                        layout: settings.layout || "top-bar",
                        size: settings.size || "medium",
                        showTimeline: settings.showTimeline ?? false,
                        scoreBg: settings.scoreBg || "#ef4444",
                        teamNameMode: settings.teamNameMode || "abbr",
                        showLogos: settings.showLogos ?? true,
                        headerText: settings.headerText || "",
                        homeBarDir: settings.homeBarDir || "none",
                        homeBarColor: settings.homeBarColor || "#10b981",
                        awayBarDir: settings.awayBarDir || "none",
                        awayBarColor: settings.awayBarColor || "#3b82f6",
                        blockGap: settings.blockGap ?? 8,
                        blockBg: settings.blockBg || "spaced",
                        rounded: settings.rounded || "md",
                        blocks: mergedMainBlocks
                    };

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
                    setBlocks(mergedMainBlocks);
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
                            blocks: (c.blocks && Array.isArray(c.blocks)) ? c.blocks : []
                        })));
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
            } finally {
                setTimeout(() => {
                    isInitialLoadedRef.current = true;
                    setIsDirty(false);
                }, 100);
            }
        };
        loadTemplate();
    }, [open, tournamentId, supabase]);

    // Undo / Redo History Stacks
    const historyPastRef = useRef<CanvasBlock[][]>([]);
    const historyFutureRef = useRef<CanvasBlock[][]>([]);
    const isUndoRedoActionRef = useRef<boolean>(false);

    // Keep fresh refs for keyboard shortcut event listeners
    const blocksRef = useRef(blocks);
    blocksRef.current = blocks;
    const selectedBlockIdRef = useRef(selectedBlockId);
    selectedBlockIdRef.current = selectedBlockId;
    const copiedBlocksRef = useRef<CanvasBlock[]>([]);

    // Track blocks state changes into history stack
    useEffect(() => {
        if (!isInitialLoadedRef.current || !open) return;
        if (isUndoRedoActionRef.current) {
            isUndoRedoActionRef.current = false;
            return;
        }

        const lastPast = historyPastRef.current[historyPastRef.current.length - 1];
        if (JSON.stringify(lastPast) !== JSON.stringify(blocks)) {
            historyPastRef.current.push(blocks);
            if (historyPastRef.current.length > 50) {
                historyPastRef.current.shift();
            }
            historyFutureRef.current = [];
        }
    }, [blocks, open]);

    // Global keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+D, Delete, Arrows, Undo/Redo)
    useEffect(() => {
        if (!open) return;

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || (activeEl as HTMLElement).isContentEditable)) {
                return;
            }

            const currentBlocks = blocksRef.current;
            const currentSelectedId = selectedBlockIdRef.current;
            const selectedIds = (currentSelectedId || "").split(",").filter(Boolean);

            const isCtrl = e.ctrlKey || e.metaKey;
            const key = e.key.toLowerCase();
            const code = e.code;

            const isC = key === "c" || code === "KeyC";
            const isV = key === "v" || code === "KeyV";
            const isX = key === "x" || code === "KeyX";
            const isA = key === "a" || code === "KeyA";
            const isD = key === "d" || code === "KeyD";
            const isZ = key === "z" || code === "KeyZ";
            const isY = key === "y" || code === "KeyY";

            // Ctrl + Shift + Z or Ctrl + Y: Redo
            if (isCtrl && ((isZ && e.shiftKey) || isY)) {
                if (historyFutureRef.current.length > 0) {
                    e.preventDefault();
                    const nextState = historyFutureRef.current.pop();
                    if (nextState) {
                        historyPastRef.current.push(currentBlocks);
                        isUndoRedoActionRef.current = true;
                        setBlocks(nextState);
                    }
                }
                return;
            }

            // Ctrl + Z: Undo
            if (isCtrl && isZ && !e.shiftKey) {
                if (historyPastRef.current.length > 1) {
                    e.preventDefault();
                    const currentState = historyPastRef.current.pop();
                    const previousState = historyPastRef.current[historyPastRef.current.length - 1];
                    if (currentState && previousState) {
                        historyFutureRef.current.push(currentState);
                        isUndoRedoActionRef.current = true;
                        setBlocks(previousState);
                    }
                }
                return;
            }

            // Ctrl + C: Copy
            if (isCtrl && isC) {
                if (selectedIds.length > 0) {
                    const targets = currentBlocks.filter(b => selectedIds.includes(b.id) && b.active);
                    if (targets.length > 0) {
                        e.preventDefault();
                        copiedBlocksRef.current = targets;
                    }
                }
                return;
            }

            // Ctrl + V: Paste
            if (isCtrl && isV) {
                if (copiedBlocksRef.current.length > 0) {
                    e.preventDefault();
                    const pastedBlocks: CanvasBlock[] = copiedBlocksRef.current.map((b, idx) => ({
                        ...b,
                        id: `shape-${b.shapeType || 'pasted'}-${crypto.randomUUID()}-${idx}`,
                        name: `${b.name || 'Block'} (Copy)`,
                        x: b.x + 20,
                        y: b.y + 20,
                    }));
                    setBlocks(prev => [...prev, ...pastedBlocks]);
                    setSelectedBlockId(pastedBlocks.map(b => b.id).join(","));
                }
                return;
            }

            // Ctrl + X: Cut
            if (isCtrl && isX) {
                if (selectedIds.length > 0) {
                    const targets = currentBlocks.filter(b => selectedIds.includes(b.id) && b.active);
                    if (targets.length > 0) {
                        e.preventDefault();
                        copiedBlocksRef.current = targets;
                        setBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
                        setSelectedBlockId("");
                    }
                }
                return;
            }

            // Ctrl + A: Select All
            if (isCtrl && isA) {
                e.preventDefault();
                const allActiveIds = currentBlocks.filter(b => b.active).map(b => b.id);
                if (allActiveIds.length > 0) {
                    setSelectedBlockId(allActiveIds.join(","));
                }
                return;
            }

            // Ctrl + D: Duplicate
            if (isCtrl && isD) {
                if (selectedIds.length > 0) {
                    const targets = currentBlocks.filter(b => selectedIds.includes(b.id) && b.active);
                    if (targets.length > 0) {
                        e.preventDefault();
                        const dupBlocks: CanvasBlock[] = targets.map((b, idx) => ({
                            ...b,
                            id: `shape-${b.shapeType || 'dup'}-${crypto.randomUUID()}-${idx}`,
                            name: `${b.name || 'Block'} (Copy)`,
                            x: b.x + 15,
                            y: b.y + 15,
                        }));
                        setBlocks(prev => [...prev, ...dupBlocks]);
                        setSelectedBlockId(dupBlocks.map(b => b.id).join(","));
                    }
                }
                return;
            }

            const isG = key === "g" || code === "KeyG";

            // Ctrl + Shift + G: Ungroup selected blocks
            if (isCtrl && isG && e.shiftKey) {
                if (selectedIds.length > 0) {
                    e.preventDefault();
                    setBlocks(prev => prev.map(b => selectedIds.includes(b.id) ? { ...b, groupId: undefined } : b));
                }
                return;
            }

            // Ctrl + G: Group selected blocks
            if (isCtrl && isG && !e.shiftKey) {
                if (selectedIds.length > 1) {
                    e.preventDefault();
                    const newGroupId = `group-${crypto.randomUUID()}`;
                    setBlocks(prev => prev.map(b => selectedIds.includes(b.id) ? { ...b, groupId: newGroupId } : b));
                }
                return;
            }

            // Backspace / Delete: Delete selected blocks (removes from array)
            if (e.key === "Backspace" || e.key === "Delete") {
                if (selectedIds.length > 0) {
                    e.preventDefault();
                    setBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
                    setSelectedBlockId("");
                }
                return;
            }

            // Arrow keys: Move selected blocks
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                if (selectedIds.length > 0) {
                    e.preventDefault();
                    const step = e.shiftKey ? 5 : 0.5;
                    let deltaX = 0;
                    let deltaY = 0;
                    if (e.key === "ArrowLeft") deltaX = -step;
                    if (e.key === "ArrowRight") deltaX = step;
                    if (e.key === "ArrowUp") deltaY = -step;
                    if (e.key === "ArrowDown") deltaY = step;

                    setBlocks(prev => prev.map(b => {
                        if (selectedIds.includes(b.id) && b.active) {
                            return {
                                ...b,
                                x: Math.round((b.x + deltaX) * 10) / 10,
                                y: Math.round((b.y + deltaY) * 10) / 10,
                            };
                        }
                        return b;
                    }));
                }
                return;
            }
        };

        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, [open]);

    // Listen for state changes to mark canvas dirty for auto-save
    useEffect(() => {
        if (!isInitialLoadedRef.current || !open) return;
        setIsDirty(true);
    }, [
        open, blocks, bg, posX, posY, alertDuration, font, layout, size, showTimeline,
        scoreBg, teamNameMode, showLogos, headerText, homeBarDir, homeBarColor,
        awayBarDir, awayBarColor, blockGap, blockBg, rounded, delay, blankCanvases,
        selectedCanvasId, orientation, selectedBlockId
    ]);

    const saveTemplate = useCallback(async (showToast: boolean = false) => {
        setSaving(true);
        try {
            let finalMain = mainCanvasSettingsRef.current;
            let finalBlanks = [...blankCanvases];

            if (selectedCanvasId === "scoreboard") {
                finalMain = {
                    bg, posX, posY, alertDuration, font,
                    layout, size, showTimeline, scoreBg, teamNameMode, showLogos,
                    headerText, homeBarDir, homeBarColor, awayBarDir, awayBarColor,
                    blockGap, blockBg, rounded, blocks
                };
            } else {
                const activeId = selectedCanvasId.replace("blank-", "");
                finalBlanks = finalBlanks.map(c => c.id === activeId ? {
                    ...c,
                    bg, posX, posY, alertDuration, font,
                    layout, size, showTimeline, scoreBg, teamNameMode, showLogos,
                    headerText, homeBarDir, homeBarColor, awayBarDir, awayBarColor,
                    blockGap, blockBg, rounded, blocks: [...blocks]
                } : c);
            }

            const currentBlankDelay = finalBlanks.find(c => `blank-${c.id}` === selectedCanvasId)?.delay ?? 0;

            const res = await updateBroadcastSettings(tournamentId, {
                ...finalMain,
                selectedBlockId,
                orientation,
                delay,
                blankDelay: currentBlankDelay,
                blankCanvases: finalBlanks,
                selectedCanvasId,
            });

            if (res.success) {
                setIsDirty(false);
                if (showToast) {
                    toast({
                        title: locale === 'th' ? "บันทึกเรียบร้อย!" : "Settings Saved!",
                        description: locale === 'th' ? "การตั้งค่าทั้งหมดถูกบันทึกสำเร็จ" : "Broadcast settings have been saved successfully.",
                    });
                }
            } else if (showToast) {
                toast({
                    variant: "destructive",
                    title: locale === 'th' ? "เกิดข้อผิดพลาด" : "Error saving",
                    description: res.error,
                });
            }
        } catch (err: unknown) {
            if (showToast) {
                toast({
                    variant: "destructive",
                    title: locale === 'th' ? "เกิดข้อผิดพลาด" : "Error saving",
                    description: err instanceof Error ? err.message : String(err),
                });
            }
        } finally {
            setSaving(false);
        }
    }, [tournamentId, selectedCanvasId, bg, posX, posY, alertDuration, font, layout, size, showTimeline, scoreBg, teamNameMode, showLogos, headerText, homeBarDir, homeBarColor, awayBarDir, awayBarColor, blockGap, blockBg, rounded, blocks, blankCanvases, selectedBlockId, orientation, delay, locale, toast]);

    // Auto-save effect: save seamlessly in background like builder/canvas.tsx
    useEffect(() => {
        if (!isDirty || saving || !open) return;

        const timer = setTimeout(() => {
            saveTemplate(false);
        }, 800);

        return () => clearTimeout(timer);
    }, [isDirty, saving, open, saveTemplate]);

    // Save immediately on focusout
    useEffect(() => {
        if (!open) return;

        const handleFocusOut = (e: FocusEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.getAttribute('contenteditable') === 'true')) {
                if (isDirty && !saving) {
                    saveTemplate(false);
                }
            }
        };

        window.addEventListener('focusout', handleFocusOut);
        return () => window.removeEventListener('focusout', handleFocusOut);
    }, [open, isDirty, saving, saveTemplate]);

    const toggleBlock = (index: number) => {
        const updated = [...blocks];
        updated[index] = { ...updated[index], active: !updated[index].active };
        setBlocks(updated);
    };

    const updateCoordinates = (id: string, x: number, y: number) => {
        const ids = id.split(",").filter(Boolean);
        if (ids.length === 0) return;
        if (ids.length === 1) {
            const idx = blocks.findIndex(b => b.id === ids[0]);
            if (idx === -1) return;
            const updated = [...blocks];
            updated[idx] = { ...updated[idx], x, y };
            setBlocks(updated);
        } else {
            const primary = blocks.find(b => b.id === ids[0]);
            if (!primary) return;
            const deltaX = x - primary.x;
            const deltaY = y - primary.y;
            setBlocks(prev => prev.map(b => ids.includes(b.id) ? { ...b, x: b.x + deltaX, y: b.y + deltaY } : b));
        }
    };

    const updateBlockProperty = (id: string, props: Partial<CanvasBlock>) => {
        const ids = id.split(",").filter(Boolean);
        if (ids.length === 0) return;
        setBlocks(prev => prev.map(b => ids.includes(b.id) ? { ...b, ...props } : b));
    };

    const primarySelectedId = (selectedBlockId || "").split(",")[0];
    const selectedBlock = blocks.find(b => b.id === primarySelectedId);

    const applyRadiiToAll = () => {
        if (!selectedBlock) return;
        const { rTL, rTR, rBL, rBR } = selectedBlock;
        setBlocks(prev => prev.map(b => ({ ...b, rTL, rTR, rBL, rBR })));
        toast({
            title: locale === 'th' ? "คัดลอกส่วนโค้งแล้ว" : "Radii applied to all blocks",
        });
    };

    const dict = locale === 'th' ? {
        desc: "คลิกเลือกและวางบล็อกส่วนประกอบในตำแหน่งที่ต้องการบนตารางกริดจำลองได้อย่างอิสระ",
        pos_spacing: "ตำแหน่ง",
        x_offset: "X",
        y_offset: "Y",
        width: "ความกว้าง",
        height: "ความสูง",
        opacity: "ความโปร่งใส",
        bg_color: "สีพื้นหลัง",
        stroke_width: "ขนาดเส้นขอบ (Stroke)",
        stroke_color: "สีเส้นขอบ (Stroke)",
        corner_radius: "ความโค้งมนของมุม",
        top_left: "บน-ซ้าย",
        top_right: "บน-ขวา",
        bottom_left: "ล่าง-ซ้าย",
        bottom_right: "ล่าง-ขวา",
        link_corners: "เชื่อมโยงมุมทุกด้าน",
        appearance: "การปรากฏและสไตล์",
        typography: "รูปแบบตัวอักษร",
        font_family: "แบบอักษร",
        font_size: "ขนาดตัวอักษร",
        font_color: "สีตัวอักษร",
        select_font: "เลือกรูปแบบอักษร",
        content: "เนื้อหา",
        team_names_mode: "โหมดชื่อทีม",
        abbr: "ชื่อย่อ",
        full_name: "ชื่อเต็มของทีม",
        team_color_bars: "แถบสีประจำทีม",
        home_team: "ทีมเหย้า",
        away_team: "ทีมเยือน",
        direction: "ทิศทาง",
        none: "ไม่มี",
        bar_color: "สีของแถบ",
        obs_settings: "การตั้งค่า OBS",
        obs_bg: "สีพื้นหลัง",
        canvas_type: "ประเภทของพื้นที่ทำงาน (Canvas)",
        main_canvas: "พื้นที่ทำงานหลัก (Main Canvas)",
        save_template_settings: "บันทึก",
        saving: "กำลังบันทึก...",
        delete_canvas: "ลบ Canvas นี้",
        left: "ซ้าย",
        center: "กลาง",
        right: "ขวา",
        top: "บน",
        bottom: "ล่าง",
    } : {
        desc: "Select a block and place it anywhere on the virtual grid. Build complex stacked layouts freely.",
        pos_spacing: "Position",
        x_offset: "X",
        y_offset: "Y",
        width: "Width",
        height: "Height",
        opacity: "Opacity",
        bg_color: "BG Color",
        stroke_width: "Stroke Width",
        stroke_color: "Stroke Color",
        corner_radius: "Corner Radius",
        top_left: "Top-Left",
        top_right: "Top-Right",
        bottom_left: "Bottom-Left",
        bottom_right: "Bottom-Right",
        link_corners: "Link Corners",
        appearance: "Appearance",
        typography: "Typography",
        font_family: "Font Family",
        font_size: "Font Size",
        font_color: "Font Color",
        select_font: "Select font",
        content: "Content",
        team_names_mode: "Team Names Mode",
        abbr: "Abbreviations",
        full_name: "Full Team Name",
        team_color_bars: "Team Color Bars",
        home_team: "Home Team",
        away_team: "Away Team",
        direction: "Direction",
        none: "None",
        bar_color: "Bar Color",
        obs_settings: "OBS Settings",
        obs_bg: "Background",
        canvas_type: "Canvas Type",
        main_canvas: "Main Canvas",
        save_template_settings: "Save",
        saving: "Saving...",
        delete_canvas: "Delete Canvas",
        left: "Left",
        center: "Center",
        right: "Right",
        top: "Top",
        bottom: "Bottom",
    };

    const getBlockName = (id: string, name: string) => {
        if (locale === 'th') {
            switch (id) {
                case "header-text": return "ชื่อรายการแข่งขัน";
                case "logo-tournament": return "โลโก้รายการแข่งขัน";
                case "logo-home": return "โลโก้ทีมเหย้า";
                case "name-home": return "ชื่อ/ตัวย่อทีมเหย้า";
                case "score-home": return "กล่องคะแนนทีมเหย้า";
                case "score-away": return "กล่องคะแนนทีมเยือน";
                case "name-away": return "ชื่อ/ตัวย่อทีมเยือน";
                case "logo-away": return "โลโก้ทีมเยือน";
                case "timer": return "เวลาและนาฬิกาการแข่งขัน";
                case "add-time": return "ทดเวลาบาดเจ็บ";
                case "timeline-home": return "ไทม์ไลน์ผู้ทำประตู (ทีมเหย้า)";
                case "timeline-away": return "ไทม์ไลน์ผู้ทำประตู (ทีมเยือน)";
                default: return name;
            }
        }
        return name;
    };

    const handleCanvasSwitch = (targetId: string) => {
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

        if (targetId === "create_blank") {
            const name = window.prompt(locale === 'th' ? "ป้อนชื่อ Blank Canvas ใหม่:" : "Enter new Blank Canvas name:");
            if (name && name.trim()) {
                const newId = `${Date.now()}`;
                const newCanvas: BlankCanvas = {
                    id: newId,
                    name: name.trim(),
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
                };
                setBlankCanvases(prev => [...prev, newCanvas]);
                setSelectedCanvasId(`blank-${newId}`);
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
            setBlocks(s.blocks || DEFAULT_BLOCKS);
        } else {
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
                setBlocks(active.blocks || []);
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
        .map(b => [
            b.id,
            b.x,
            b.y,
            b.w,
            b.h,
            b.fontSize,
            b.rTL,
            b.rTR,
            b.rBL,
            b.rBR,
            b.opacity ?? 100,
            encodeURIComponent(b.bg ?? (b.id.startsWith("score") ? scoreBg : "#737373")),
            (b.color ?? "#ffffff").replace("#", ""),
            b.shapeType || "rectangle",
            encodeURIComponent(b.text || ""),
            b.bindTo || "none",
            b.strokeWidth ?? 0,
            (b.strokeColor ?? "#ffffff").replace("#", ""),
            b.strokePos || "inside",
            b.skewX ?? 0,
            b.skewY ?? 0,
            b.fontWeight ?? "400",
            b.fontStyle || "normal",
            b.textDecoration || "none"
        ].join(":"))
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

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const scoreboardUrl = `${origin}/${locale}/tournaments/${tournamentId}/matches/${matchId}/overlay?${scoreboardParams.toString()}`;

    const activeBlankCanvas = blankCanvases.find(c => `blank-${c.id}` === selectedCanvasId) || blankCanvases[0];
    const activeBlankDelay = activeBlankCanvas?.delay ?? 0;

    const _hasActiveBlocks = blocks.some(b => b.active);

    const blankParamsObj: Record<string, string> = {
        bg,
        posX,
        posY,
        alertDuration: String(alertDuration),
        delay: String(activeBlankDelay),
    };

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

    const blankParams = new URLSearchParams(blankParamsObj);
    const blankUrl = `${origin}/${locale}/tournaments/${tournamentId}/matches/${matchId}/overlay?${blankParams.toString()}`;

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
            title: locale === 'th' ? "คัดลอกสำเร็จ!" : "Copied successfully!",
            description: locale === 'th' ? "นำ URL ไปวางใน Browser Source ของ OBS ได้ทันที" : "Paste this URL as a Browser Source in OBS or vMix.",
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
            case "add-time": return "+0";
            case "timeline-home": return "Home Goals";
            case "timeline-away": return "Away Goals";
            case "substitution": return "Sub: In ⇄ Out";
            default: return id;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="bg-card rounded-sm border overflow-hidden min-w-[80vw] max-w-[96vw] h-[92vh] max-h-[96vh] flex flex-col p-0">
                <DialogHeader className="relative pr-10 p-2 md:p-4 border-b shrink-0">
                    <DialogTitle>{t("board_editor")}</DialogTitle>
                    <DialogDescription>{dict.desc}</DialogDescription>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-2 top-2"
                        onClick={() => onOpenChange(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </DialogHeader>

                <div className="flex-1 overflow-hidden min-h-0 p-2 md:p-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 h-full min-h-0">
                        {/* Left Column: Layer Sidebar */}
                        <LayerSidebar
                            blocks={blocks}
                            setBlocks={setBlocks}
                            selectedBlockId={selectedBlockId}
                            setSelectedBlockId={setSelectedBlockId}
                            toggleBlock={toggleBlock}
                            getBlockName={getBlockName}
                            locale={locale}
                        />

                        {/* Center Column: Canvas Preview */}
                        <CanvasPreview
                            bg={bg}
                            blocks={blocks}
                            setBlocks={setBlocks}
                            selectedBlockId={selectedBlockId}
                            setSelectedBlockId={setSelectedBlockId}
                            scoreBg={scoreBg}
                            font={font}
                            homeBarDir={homeBarDir}
                            homeBarColor={homeBarColor}
                            awayBarDir={awayBarDir}
                            awayBarColor={awayBarColor}
                            headerText={headerText}
                            blockGap={blockGap}
                            locale={locale}
                            toggleBlock={toggleBlock}
                            getBlockName={getBlockName}
                            getShortPreviewLabel={getShortPreviewLabel}
                            onUpdateBlockPosition={updateCoordinates}
                        />

                        {/* Right Column: Editor Sidebar */}
                        <EditorSidebar
                            blocks={blocks}
                            setBlocks={setBlocks}
                            selectedBlockId={selectedBlockId}
                            setSelectedBlockId={setSelectedBlockId}
                            selectedBlock={selectedBlock}
                            updateCoordinates={updateCoordinates}
                            updateBlockProperty={updateBlockProperty}
                            blockGap={blockGap}
                            setBlockGap={setBlockGap}
                            scoreBg={scoreBg}
                            applyRadiiToAll={applyRadiiToAll}
                            linkCorners={linkCorners}
                            setLinkCorners={setLinkCorners}
                            font={font}
                            setFont={setFont}
                            teamNameMode={teamNameMode}
                            setTeamNameMode={setTeamNameMode}
                            homeBarDir={homeBarDir}
                            setHomeBarDir={setHomeBarDir}
                            homeBarColor={homeBarColor}
                            setHomeBarColor={setHomeBarColor}
                            awayBarDir={awayBarDir}
                            setAwayBarDir={setAwayBarDir}
                            awayBarColor={awayBarColor}
                            setAwayBarColor={setAwayBarColor}
                            posX={posX}
                            setPosX={setPosX}
                            posY={posY}
                            setPosY={setPosY}
                            bg={bg}
                            setBg={setBg}
                            locale={locale}
                            dict={dict}
                            selectedCanvasId={selectedCanvasId}
                            activeBlankCanvas={activeBlankCanvas}
                            blankCanvases={blankCanvases}
                            setBlankCanvases={setBlankCanvases}
                            setSelectedCanvasId={setSelectedCanvasId}
                            handleCanvasSwitch={handleCanvasSwitch}
                            scoreboardUrl={scoreboardUrl}
                            blankUrl={blankUrl}
                            copiedScoreboard={copiedScoreboard}
                            copiedBlank={copiedBlank}
                            handleCopy={handleCopy}
                            saveTemplate={saveTemplate}
                            saving={saving}
                            sport={sport}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
