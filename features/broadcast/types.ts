export type DataBindType =
    | "none"
    | "name-home"
    | "name-away"
    | "score-home"
    | "score-away"
    | "set-home"
    | "set-away"
    | "point-won-home"
    | "point-won-away"
    | "score-bar-home"
    | "score-bar-away"
    | "header-text"
    | "timer"
    | "add-time"
    | "logo-home"
    | "logo-away"
    | "logo-tournament"
    | "home-scorer"
    | "away-scorer";

export interface CanvasBlock {
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
    strokeWidth?: number;
    strokeColor?: string;
    strokePos?: "inside" | "center" | "outside";
    color?: string;
    shapeType?: "rectangle" | "circle" | "polygon" | "star" | "text";
    bindTo?: DataBindType;
    rotation?: number;
    skewX?: number;
    skewY?: number;
    flipX?: boolean;
    flipY?: boolean;
    fontWeight?: string | number;
    fontStyle?: "normal" | "italic";
    textDecoration?: "none" | "underline" | "line-through";
    text?: string;
    groupId?: string;
}

export interface CanvasSettings {
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
    blocks: CanvasBlock[];
    selectedBlockId?: string;
    orientation?: "horizontal" | "vertical";
    delay?: number;
}

export interface BlankCanvas {
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
    blocks: CanvasBlock[];
}

export const DEFAULT_BLOCKS: CanvasBlock[] = [];

export interface SnapResult {
    x: number;
    y: number;
    vLines: number[];
    hLines: number[];
}

export const getSnappedCoords = (
    draggedId: string,
    x: number,
    y: number,
    activeBlocks: { id: string; active?: boolean; x: number; y: number; w?: number; h?: number }[],
    gap: number = 0
): SnapResult => {
    const blockA = activeBlocks.find(b => b.id === draggedId);
    const sizeA = { w: blockA?.w || 100, h: blockA?.h || 40 };

    const snapThreshold = 12;

    let bestX = { val: x, diff: Infinity };
    let bestY = { val: y, diff: Infinity };

    const vLines = new Set<number>();
    const hLines = new Set<number>();

    // 1. Canvas Center Snapping (X = 0, Y = 0)
    const canvasCenterXTargets = [
        { snappedX: 0, guideX: 0 },
        { snappedX: 0 - sizeA.w / 2, guideX: 0 },
        { snappedX: 0 + sizeA.w / 2, guideX: 0 },
    ];
    for (const t of canvasCenterXTargets) {
        const diff = Math.abs(x - t.snappedX);
        if (diff < snapThreshold && diff < bestX.diff) {
            bestX = { val: t.snappedX, diff };
            vLines.clear();
            vLines.add(t.guideX);
        }
    }

    const canvasCenterYTargets = [
        { snappedY: 0, guideY: 0 },
        { snappedY: 0 - sizeA.h / 2, guideY: 0 },
        { snappedY: 0 + sizeA.h / 2, guideY: 0 },
    ];
    for (const t of canvasCenterYTargets) {
        const diff = Math.abs(y - t.snappedY);
        if (diff < snapThreshold && diff < bestY.diff) {
            bestY = { val: t.snappedY, diff };
            hLines.clear();
            hLines.add(t.guideY);
        }
    }

    // 2. Alignment with other active blocks (Centers, Corners, Edges)
    for (const other of activeBlocks) {
        if (other.id === draggedId || other.active === false) continue;
        const sizeB = { w: other.w || 100, h: other.h || 40 };

        // X Targets (Vertical Alignment Lines)
        const xTargets = [
            { snappedX: other.x, guideX: other.x }, // Center
            { snappedX: other.x - sizeB.w / 2 + sizeA.w / 2, guideX: other.x - sizeB.w / 2 }, // Left edge / corner
            { snappedX: other.x + sizeB.w / 2 - sizeA.w / 2, guideX: other.x + sizeB.w / 2 }, // Right edge / corner
            { snappedX: other.x - sizeB.w / 2 - sizeA.w / 2 - gap, guideX: other.x - sizeB.w / 2 }, // Dock Left
            { snappedX: other.x + sizeB.w / 2 + sizeA.w / 2 + gap, guideX: other.x + sizeB.w / 2 }, // Dock Right
        ];

        for (const t of xTargets) {
            const diff = Math.abs(x - t.snappedX);
            if (diff < snapThreshold) {
                if (diff < bestX.diff) {
                    bestX = { val: t.snappedX, diff };
                    vLines.clear();
                    vLines.add(t.guideX);
                } else if (Math.abs(diff - bestX.diff) < 0.1) {
                    vLines.add(t.guideX);
                }
            }
        }

        // Y Targets (Horizontal Alignment Lines)
        const yTargets = [
            { snappedY: other.y, guideY: other.y }, // Center
            { snappedY: other.y - sizeB.h / 2 + sizeA.h / 2, guideY: other.y - sizeB.h / 2 }, // Top edge / corner
            { snappedY: other.y + sizeB.h / 2 - sizeA.h / 2, guideY: other.y - sizeB.h / 2 }, // Bottom edge / corner
            { snappedY: other.y - sizeB.h / 2 - sizeA.h / 2 - gap, guideY: other.y - sizeB.h / 2 }, // Dock Top
            { snappedY: other.y + sizeB.h / 2 + sizeA.h / 2 + gap, guideY: other.y + sizeB.h / 2 }, // Dock Bottom
        ];

        for (const t of yTargets) {
            const diff = Math.abs(y - t.snappedY);
            if (diff < snapThreshold) {
                if (diff < bestY.diff) {
                    bestY = { val: t.snappedY, diff };
                    hLines.clear();
                    hLines.add(t.guideY);
                } else if (Math.abs(diff - bestY.diff) < 0.1) {
                    hLines.add(t.guideY);
                }
            }
        }
    }

    return {
        x: bestX.val,
        y: bestY.val,
        vLines: Array.from(vLines),
        hLines: Array.from(hLines),
    };
};
