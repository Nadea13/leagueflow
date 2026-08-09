import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const DraggableLabel = ({
    children,
    value,
    onChange,
    step = 1,
    min,
    max,
    className = ""
}: {
    children: React.ReactNode;
    value: number;
    onChange: (val: number) => void;
    step?: number;
    min?: number;
    max?: number;
    className?: string;
}) => {
    const handlePointerDown = (e: React.PointerEvent<HTMLLabelElement>) => {
        const startX = e.clientX;
        const startValue = value;
        const target = e.currentTarget;
        target.setPointerCapture(e.pointerId);

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const deltaX = moveEvent.clientX - startX;
            let newValue = startValue + deltaX * step;
            if (min !== undefined) {
                newValue = Math.max(min, newValue);
            }
            if (max !== undefined) {
                newValue = Math.min(max, newValue);
            }
            if (step === 0.5) {
                newValue = Number(newValue.toFixed(1));
            } else {
                newValue = Math.round(newValue);
            }
            onChange(newValue);
        };

        const handlePointerUp = (upEvent: PointerEvent) => {
            try {
                target.releasePointerCapture(upEvent.pointerId);
            } catch (_err) { }
            target.removeEventListener("pointermove", handlePointerMove);
            target.removeEventListener("pointerup", handlePointerUp);
        };

        target.addEventListener("pointermove", handlePointerMove);
        target.addEventListener("pointerup", handlePointerUp);
    };

    return (
        <Label
            onPointerDown={handlePointerDown}
            className={`cursor-ew-resize select-none ${className}`}
        >
            {children}
        </Label>
    );
};

export const isLightColor = (color: string): boolean => {
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

export const GradientColorPicker = ({
    label,
    value,
    onChange,
    fallbackColor = "#000000"
}: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    fallbackColor?: string;
}) => {
    const rawVal = value || fallbackColor;
    const isGradient = rawVal.includes("gradient");

    const parse = (str: string) => {
        if (!str.includes("gradient")) {
            return { color1: str, color2: str, angle: 90 };
        }
        const matches = str.match(/linear-gradient\((?:(\d+)deg,\s*)?(#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}|[a-zA-Z]+),\s*(#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}|[a-zA-Z]+)\)/);
        if (matches) {
            return {
                angle: matches[1] ? Number(matches[1]) : 90,
                color1: matches[2],
                color2: matches[3],
            };
        }
        return { color1: "#ef4444", color2: "#000000", angle: 90 };
    };

    const { color1, color2, angle } = parse(rawVal);

    const updateValue = (c1: string, c2: string, ang: number, forceGradient: boolean) => {
        if (forceGradient) {
            onChange(`linear-gradient(${ang}deg, ${c1}, ${c2})`);
        } else {
            onChange(c1);
        }
    };

    return (
        <div className="flex items-center justify-between gap-1 w-full">
            <button
                type="button"
                onClick={() => updateValue(color1, color2, angle, !isGradient)}
                className="flex items-center gap-1 min-w-[65px] shrink-0 text-left transition-opacity"
            >
                <Label className="cursor-pointer">{label}</Label>
            </button>

            <div className="flex items-center gap-1 flex-1 justify-end">
                <div className="flex items-center gap-1 shrink-0">
                    <input
                        type="color"
                        value={color1.startsWith("#") ? color1 : "#000000"}
                        onChange={(e) => updateValue(e.target.value, color2, angle, isGradient)}
                        className="w-10 h-10 cursor-pointer shrink-0"
                        style={{ padding: 0 }}
                    />
                    {isGradient && (
                        <input
                            type="color"
                            value={color2.startsWith("#") ? color2 : "#000000"}
                            onChange={(e) => updateValue(color1, e.target.value, angle, true)}
                            className="w-10 h-10 cursor-pointer shrink-0"
                            style={{ padding: 0 }}
                        />
                    )}
                </div>

                {isGradient ? (
                    <div className="flex items-center gap-1 shrink-0">
                        <DraggableLabel
                            value={angle}
                            onChange={(val) => {
                                const looped = ((val % 360) + 360) % 360;
                                updateValue(color1, color2, looped, true);
                            }}
                            step={1}
                            className="text-xs font-bold select-none cursor-ew-resize px-1"
                        >
                            Ang
                        </DraggableLabel>
                        <input
                            type="text"
                            value={angle}
                            onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                const looped = ((val % 360) + 360) % 360;
                                updateValue(color1, color2, looped, true);
                            }}
                            className="w-10 h-10 border text-center rounded-sm"
                        />
                    </div>
                ) : (
                    <Input
                        type="text"
                        value={rawVal}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-24 h-8 text-xs text-right font-mono"
                    />
                )}
            </div>
        </div>
    );
};
