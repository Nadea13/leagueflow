"use client";

import React, { useState, useEffect, useRef } from "react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Copy, Check, ArrowLeft, RotateCcw, Plus, Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "next-intl";

// Helper components copied from broadcast-dialog.tsx
const DraggableLabel = ({
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

const GradientColorPicker = ({
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

const isLightColor = (color: string): boolean => {
  if (color === "transparent") return false;
  if (color === "chromakey") return true;
  if (color.includes("gradient")) return false;
  const hex = color.replace("#", "");
  if (hex.length < 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128;
};

const DEFAULT_BLOCKS = [
  { id: "logo-tournament", name: "Tournament Logo", active: false, x: 0, y: -80, w: 40, h: 40, fontSize: 12, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#000000", color: "#ffffff" },
  { id: "header-text", name: "Tournament Name", active: true, x: 0, y: -45, w: 140, h: 32, fontSize: 10, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#000000", color: "#ffffff" },
  { id: "logo-home", name: "Home Team Logo", active: false, x: -140, y: 0, w: 40, h: 40, fontSize: 12, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#000000", color: "#ffffff" },
  { id: "name-home", name: "Home Team Name/Abbr", active: true, x: -95, y: 0, w: 76, h: 40, fontSize: 14, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#000000", color: "#ffffff" },
  { id: "score-home", name: "Home Score Box", active: true, x: -35, y: 0, w: 45, h: 40, fontSize: 20, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#ef4444", color: "#ffffff" },
  { id: "score-away", name: "Away Score Box", active: true, x: 35, y: 0, w: 45, h: 40, fontSize: 20, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#ef4444", color: "#ffffff" },
  { id: "name-away", name: "Away Team Name/Abbr", active: true, x: 95, y: 0, w: 76, h: 40, fontSize: 14, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#000000", color: "#ffffff" },
  { id: "logo-away", name: "Away Team Logo", active: false, x: 140, y: 0, w: 40, h: 40, fontSize: 12, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#000000", color: "#ffffff" },
  { id: "timer", name: "Match Timer & Clock", active: true, x: 0, y: 40, w: 90, h: 40, fontSize: 14, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#000000", color: "#ffffff" },
  { id: "add-time", name: "Added Time (+Mins)", active: false, x: 60, y: 40, w: 35, h: 40, fontSize: 14, rTL: 8, rTR: 8, rBL: 8, rBR: 8, opacity: 100, bg: "#ef4444", color: "#ffffff" }
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
  const snapThreshold = 18;

  let bestX = { val: x, diff: Infinity };
  let bestY = { val: y, diff: Infinity };

  for (const other of activeBlocks) {
    if (other.id === draggedId || !other.active) continue;
    const sizeB = { w: other.w, h: other.h };

    const verticalOverlap = Math.abs(y - other.y) < (sizeA.h / 2 + sizeB.h / 2 + gap + 25);
    const horizontalOverlap = Math.abs(x - other.x) < (sizeA.w / 2 + sizeB.w / 2 + gap + 25);

    if (verticalOverlap) {
      const centerX = other.x;
      const diffCenterX = Math.abs(x - centerX);
      if (diffCenterX < snapThreshold && diffCenterX < bestX.diff) {
        bestX = { val: centerX, diff: diffCenterX };
      }
      const leftAlignX = other.x - sizeB.w / 2 + sizeA.w / 2;
      const diffLeftAlignX = Math.abs(x - leftAlignX);
      if (diffLeftAlignX < snapThreshold && diffLeftAlignX < bestX.diff) {
        bestX = { val: leftAlignX, diff: diffLeftAlignX };
      }
      const rightAlignX = other.x + sizeB.w / 2 - sizeA.w / 2;
      const diffRightAlignX = Math.abs(x - rightAlignX);
      if (diffRightAlignX < snapThreshold && diffRightAlignX < bestX.diff) {
        bestX = { val: rightAlignX, diff: diffRightAlignX };
      }
      const leftDockX = other.x - (sizeA.w / 2 + sizeB.w / 2 + gap);
      const diffLeftDockX = Math.abs(x - leftDockX);
      if (diffLeftDockX < snapThreshold && diffLeftDockX < bestX.diff) {
        bestX = { val: leftDockX, diff: diffLeftDockX };
      }
      const rightDockX = other.x + (sizeA.w / 2 + sizeB.w / 2 + gap);
      const diffRightDockX = Math.abs(x - rightDockX);
      if (diffRightDockX < snapThreshold && diffRightDockX < bestX.diff) {
        bestX = { val: rightDockX, diff: diffRightDockX };
      }
    }

    if (horizontalOverlap) {
      const centerY = other.y;
      const diffCenterY = Math.abs(y - centerY);
      if (diffCenterY < snapThreshold && diffCenterY < bestY.diff) {
        bestY = { val: centerY, diff: diffCenterY };
      }
      const topAlignY = other.y - sizeB.h / 2 + sizeA.h / 2;
      const diffTopAlignY = Math.abs(y - topAlignY);
      if (diffTopAlignY < snapThreshold && diffTopAlignY < bestY.diff) {
        bestY = { val: topAlignY, diff: diffTopAlignY };
      }
      const bottomAlignY = other.y + sizeB.h / 2 - sizeA.h / 2;
      const diffBottomAlignY = Math.abs(y - bottomAlignY);
      if (diffBottomAlignY < snapThreshold && diffBottomAlignY < bestY.diff) {
        bestY = { val: bottomAlignY, diff: diffBottomAlignY };
      }
      const topDockY = other.y - (sizeA.h / 2 + sizeB.h / 2 + gap);
      const diffTopDockY = Math.abs(y - topDockY);
      if (diffTopDockY < snapThreshold && diffTopDockY < bestY.diff) {
        bestY = { val: topDockY, diff: diffTopDockY };
      }
      const bottomDockY = other.y + (sizeA.h / 2 + sizeB.h / 2 + gap);
      const diffBottomDockY = Math.abs(y - bottomDockY);
      if (diffBottomDockY < snapThreshold && diffBottomDockY < bestY.diff) {
        bestY = { val: bottomDockY, diff: diffBottomDockY };
      }
    }
  }

  return { x: bestX.val, y: bestY.val };
};

export default function OverlayPlayground() {
  const { toast } = useToast();
  const locale = useLocale();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  // Canvas Settings State
  const [bg, setBg] = useState("chromakey");
  const [scoreBg, setScoreBg] = useState("#ef4444");
  const [blockGap, setBlockGap] = useState(2);
  const [selectedBlockId, setSelectedBlockId] = useState<string>("name-home");
  const [linkCorners, setLinkCorners] = useState(true);

  // Dynamic contents to edit
  const [headerText, setHeaderText] = useState("LEAGUEFLOW LEAGUE");
  const [nameHome, setNameHome] = useState("TEAM ALPHA");
  const [nameAway, setNameAway] = useState("TEAM BETA");
  const [scoreHome, setScoreHome] = useState("0");
  const [scoreAway, setScoreAway] = useState("0");
  const [timerText, setTimerText] = useState("00:00");
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const [logoHome, setLogoHome] = useState<string>("");
  const [logoAway, setLogoAway] = useState<string>("");
  const [logoTournament, setLogoTournament] = useState<string>("");
  const [addTimeText, setAddTimeText] = useState("+0");

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, team: "home" | "away" | "tournament") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, 64, 64);
          const compressed = canvas.toDataURL("image/webp", 0.75);
          if (team === "home") {
            setLogoHome(compressed);
          } else if (team === "away") {
            setLogoAway(compressed);
          } else {
            setLogoTournament(compressed);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Hook to tick the timer every second if running
  useEffect(() => {
    if (!timerIsRunning) return;
    const interval = setInterval(() => {
      setTimerText(prev => {
        const parts = prev.split(":");
        if (parts.length === 2) {
          const m = parseInt(parts[0]) || 0;
          const s = parseInt(parts[1]) || 0;
          const totalSeconds = m * 60 + s + 1;
          const nextM = Math.floor(totalSeconds / 60);
          const nextS = totalSeconds % 60;
          return `${String(nextM).padStart(2, "0")}:${String(nextS).padStart(2, "0")}`;
        }
        return "00:00";
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerIsRunning]);

  // Home / Away color bars decoration settings
  const [homeBarDir, setHomeBarDir] = useState("left");
  const [homeBarColor, setHomeBarColor] = useState("#3b82f6");
  const [awayBarDir, setAwayBarDir] = useState("right");
  const [awayBarColor, setAwayBarColor] = useState("#ef4444");

  // OBS alignment settings
  const [font, setFont] = useState("orbitron");
  const [posX, setPosX] = useState("center");
  const [posY, setPosY] = useState("top");

  // Blocks position & styling settings
  const [blocks, setBlocks] = useState(DEFAULT_BLOCKS);

  // Drag states
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const blockStartPos = useRef({ x: 0, y: 0 });

  const [copied, setCopied] = useState(false);

  // Dictionary for localization matching broadcast-dialog.tsx
  const dict = locale === "th" ? {
      pos_spacing: "ตำแหน่งและระยะห่าง",
      left: "ซ้าย",
      center: "กึ่งกลาง",
      right: "ขวา",
      top: "บน",
      bottom: "ล่าง",
      x_offset: "ระยะห่างแนวนอน",
      y_offset: "ระยะห่างแนวตั้ง",
      width: "ความกว้าง",
      height: "ความสูง",
      opacity: "ความโปร่งใส",
      bg_color: "สีพื้นหลัง",
      corner_radius: "ความโค้งมนของขอบ",
      top_left: "บนซ้าย",
      top_right: "บนขวา",
      bottom_left: "ล่างซ้าย",
      bottom_right: "ล่างขวา",
      link_corners: "ลิงก์ทุกมุมเข้าด้วยกัน",
      appearance: "ลักษณะทั่วไป",
      typography: "แบบอักษร",
      font_family: "รูปแบบอักษร",
      font_size: "ขนาดตัวอักษร",
      font_color: "สีตัวอักษร",
      content: "เนื้อหา",
      team_color_bars: "แถบสีประจำทีม",
      home_team: "ทีมเหย้า",
      away_team: "ทีมเยือน",
      none: "ไม่มี",
      bar_color: "สีของแถบ",
      obs_settings: "การตั้งค่า OBS",
      obs_bg: "สีพื้นหลัง"
  } : {
      pos_spacing: "Position & Spacing",
      left: "Left",
      center: "Center",
      right: "Right",
      top: "Top",
      bottom: "Bottom",
      x_offset: "X Offset",
      y_offset: "Y Offset",
      width: "Width",
      height: "Height",
      opacity: "Opacity",
      bg_color: "Background Color",
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
      content: "Content",
      team_color_bars: "Team Color Bars",
      home_team: "Home Team",
      away_team: "Away Team",
      none: "None",
      bar_color: "Bar Color",
      obs_settings: "OBS Settings",
      obs_bg: "Background"
  };

  const getBlockName = (id: string, name: string) => {
    if (locale === 'th') {
      switch (id) {
        case "logo-tournament": return "โลโก้รายการแข่งขัน";
        case "header-text": return "ชื่อรายการแข่งขัน";
        case "logo-home": return "โลโก้ทีมเหย้า";
        case "name-home": return "ชื่อ/ตัวย่อทีมเหย้า";
        case "score-home": return "กล่องคะแนนทีมเหย้า";
        case "score-away": return "กล่องคะแนนทีมเยือน";
        case "name-away": return "ชื่อ/ตัวย่อทีมเยือน";
        case "logo-away": return "โลโก้ทีมเยือน";
        case "timer": return "ตัวจับเวลา";
        case "add-time": return "ทดเวลาบาดเจ็บ";
        default: return name;
      }
    }
    return name;
  };

  // Load configuration from localStorage on mount Safely
  const isLoaded = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("overlay_playground_setup");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setTimeout(() => {
          if (data.bg) setBg(data.bg);
          if (data.scoreBg) setScoreBg(data.scoreBg);
          if (data.blockGap !== undefined) setBlockGap(data.blockGap);
          if (data.headerText) setHeaderText(data.headerText);
          if (data.nameHome) setNameHome(data.nameHome);
          if (data.nameAway) setNameAway(data.nameAway);
          if (data.scoreHome) setScoreHome(data.scoreHome);
          if (data.scoreAway) setScoreAway(data.scoreAway);
          if (data.timerText) setTimerText(data.timerText);
          if (data.timerIsRunning !== undefined) setTimerIsRunning(data.timerIsRunning);
          if (data.logoHome !== undefined) setLogoHome(data.logoHome);
          if (data.logoAway !== undefined) setLogoAway(data.logoAway);
          if (data.logoTournament !== undefined) setLogoTournament(data.logoTournament);
          if (data.addTimeText) setAddTimeText(data.addTimeText);
          if (data.homeBarDir) setHomeBarDir(data.homeBarDir);
          if (data.homeBarColor) setHomeBarColor(data.homeBarColor);
          if (data.awayBarDir) setAwayBarDir(data.awayBarDir);
          if (data.awayBarColor) setAwayBarColor(data.awayBarColor);
          if (data.blocks) setBlocks(data.blocks);
          if (data.font) setFont(data.font);
          if (data.posX) setPosX(data.posX);
          if (data.posY) setPosY(data.posY);
          isLoaded.current = true;
        }, 0);
      } catch (e) {
        console.error("Failed to parse saved config", e);
        isLoaded.current = true;
      }
    } else {
      isLoaded.current = true;
    }
  }, []);

  // Auto-save settings on modification
  useEffect(() => {
    if (!isLoaded.current) return;
    const data = {
      bg, scoreBg, blockGap, headerText, nameHome, nameAway, scoreHome, scoreAway, 
      timerText, timerIsRunning, logoHome, logoAway, logoTournament, addTimeText, homeBarDir, homeBarColor, awayBarDir, awayBarColor, blocks,
      font, posX, posY
    };
    localStorage.setItem("overlay_playground_setup", JSON.stringify(data));
  }, [bg, scoreBg, blockGap, headerText, nameHome, nameAway, scoreHome, scoreAway, 
      timerText, timerIsRunning, logoHome, logoAway, logoTournament, addTimeText, homeBarDir, homeBarColor, awayBarDir, awayBarColor, blocks,
      font, posX, posY]);

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

    newX = Math.round(newX * 10) / 10;
    newY = Math.round(newY * 10) / 10;

    const snapped = getSnappedCoords(blockId, newX, newY, blocks, blockGap);
    updateCoordinates(blockId, snapped.x, snapped.y);
  };

  const handlePointerUp = (e: React.PointerEvent, blockId: string) => {
    if (draggingId === blockId) {
      setDraggingId(null);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const toggleBlock = (index: number) => {
    const updated = [...blocks];
    updated[index] = { ...updated[index], active: !updated[index].active };
    setBlocks(updated);
  };

  const updateBlockProperty = (id: string, updates: Partial<typeof DEFAULT_BLOCKS[0]>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const updateCoordinates = (id: string, x: number, y: number) => {
    updateBlockProperty(id, { x, y });
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  const getShortPreviewLabel = (id: string) => {
    switch (id) {
      case "logo-tournament": return "League Logo";
      case "header-text": return headerText || "Tournament Name";
      case "logo-home": return "Home Logo";
      case "logo-away": return "Away Logo";
      case "name-home": return nameHome || "Home Name";
      case "name-away": return nameAway || "Away Name";
      case "score-home": return scoreHome || "0";
      case "score-away": return scoreAway || "0";
      case "timer": return timerText || "00:00";
      case "add-time": return addTimeText || "+0";
      default: return id;
    }
  };

  // Generate dynamic OBS link
  const getObsUrl = () => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    const config = {
      bg, scoreBg, blockGap, headerText, nameHome, nameAway, scoreHome, scoreAway,
      timerText, timerIsRunning, logoHome, logoAway, logoTournament, addTimeText, homeBarDir, homeBarColor, awayBarDir, awayBarColor, blocks,
      font, posX, posY
    };
    return `${origin}/overlay/render?config=${encodeURIComponent(JSON.stringify(config))}`;
  };

  const handleCopy = () => {
    const url = getObsUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({
      title: "คัดลอกลิงก์สำเร็จ",
      description: "นำลิงก์นี้ไปแปะใน OBS Browser Source ได้เลยครับ",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setBg("chromakey");
    setScoreBg("#ef4444");
    setBlockGap(2);
    setHeaderText("LEAGUEFLOW LEAGUE");
    setNameHome("TEAM ALPHA");
    setNameAway("TEAM BETA");
    setScoreHome("0");
    setScoreAway("0");
    setTimerText("00:00");
    setTimerIsRunning(false);
    setLogoHome("");
    setLogoAway("");
    setAddTimeText("+0");
    setHomeBarDir("left");
    setHomeBarColor("#3b82f6");
    setAwayBarDir("right");
    setAwayBarColor("#ef4444");
    setBlocks(DEFAULT_BLOCKS);
    setFont("orbitron");
    setPosX("center");
    setPosY("top");
    toast({
      description: "รีเซ็ตการตั้งค่าเริ่มต้นเรียบร้อยแล้ว",
    });
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
      description: `นำค่ามุมโค้งมนไปใช้กับกล่องทั้งหมดเรียบร้อย`,
    });
  };

  const handleSave = () => {
    const data = {
      bg, scoreBg, blockGap, headerText, nameHome, nameAway, scoreHome, scoreAway, 
      timerText, timerIsRunning, logoHome, logoAway, logoTournament, addTimeText, homeBarDir, homeBarColor, awayBarDir, awayBarColor, blocks,
      font, posX, posY
    };
    localStorage.setItem("overlay_playground_setup", JSON.stringify(data));
    toast({
      description: "บันทึกข้อมูลการตั้งค่าลงเครื่องเรียบร้อยแล้ว",
    });
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight">LeagueFlow Live Broadcast Scoreboard Editor</span>
              <span className="bg-primary/10 text-primary font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest">PRO BUILDER</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" type="button" size="sm" onClick={handleReset} className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
              <RotateCcw className="h-3.5 w-3.5" />
              รีเซ็ต
            </Button>
            <Button variant="default" type="button" size="sm" onClick={handleSave} className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
              <Save className="h-3.5 w-3.5" />
              บันทึก
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 container max-w-7xl mx-auto p-4 grid lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Canvas Board (col-span-7) */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-sm tracking-widest uppercase">กระดานออกแบบตำแหน่ง (Scoreboard Canvas)</h2>
            </div>
            
            {/* Background selection */}
            <div className="flex gap-2">
              <Select value={bg} onValueChange={setBg}>
                <SelectTrigger className="h-8 text-xs font-bold w-40 bg-card border">
                  <SelectValue placeholder="เลือกพื้นหลัง" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chromakey">Green Screen (Chromakey)</SelectItem>
                  <SelectItem value="transparent">โปร่งใส (Transparent)</SelectItem>
                  <SelectItem value="#0f172a">Dark Slate</SelectItem>
                  <SelectItem value="#000000">Deep Black</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dotted Grid Board */}
          <div
            className="w-full h-[320px] md:h-[480px] border rounded-lg relative overflow-hidden flex items-center justify-center transition-colors duration-300"
            style={{
              backgroundColor: bg === "transparent" ? undefined : bg === "chromakey" ? "#00ff00" : bg,
              backgroundImage: bg === "transparent"
                ? `radial-gradient(${isLightColor(bg) ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.08)"} 1px, transparent 1px)`
                : `radial-gradient(${isLightColor(bg) ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.08)"} 1px, transparent 1px)`,
              backgroundSize: "16px 16px"
            }}
          >
            {/* Center Reference crosshair lines */}
            <div className={`absolute top-1/2 left-0 right-0 border-b ${isLightColor(bg) ? "border-black/10" : "border-white/5"} pointer-events-none`} />
            <div className={`absolute left-1/2 top-0 bottom-0 border-l ${isLightColor(bg) ? "border-black/10" : "border-white/5"} pointer-events-none`} />

            {/* NEW component list Popover button */}
            <div className="absolute top-4 right-4 z-40">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="default" className="shadow-lg h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground hover:bg-primary/95">
                    <Plus className="h-3.5 w-3.5" />
                    NEW
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-64 p-0 bg-card border shadow-2xl rounded-md">
                  <div className="p-2 border-b bg-muted/20">
                    <span className="text-xs font-black tracking-wider text-foreground">เพิ่มชิ้นส่วนประกอบ</span>
                  </div>
                  <div className="flex flex-col p-1 max-h-[300px] overflow-y-auto">
                    {blocks.map((b, idx) => (
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
                        className={`w-full justify-start gap-3 h-auto py-2 px-3 hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all ${b.active ? "bg-muted/40" : ""}`}
                      >
                        <div className="w-8 h-8 rounded-sm bg-primary/10 text-primary border flex items-center justify-center font-black text-xs shrink-0">
                          {b.active ? <Check className="h-3.5 w-3.5" /> : b.id.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="text-[11px] font-black tracking-tight text-left">{getBlockName(b.id, b.name)}</span>
                          <span className="text-[8px] text-muted-foreground font-medium text-left">
                            {b.active ? "แสดงอยู่บนบอร์ด" : "คลิกเพื่อแสดง"}
                          </span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Draggable blocks */}
            {blocks.map((b) => {
              if (!b.active) return null;
              const isAddZero = b.id === "add-time" && (addTimeText === "+0" || addTimeText === "0" || !addTimeText);
              const isSelected = b.id === selectedBlockId;
              if (isAddZero && !isSelected) return null;
              const isScoreBlock = b.id === "score-home" || b.id === "score-away";
              const blockBg = b.bg || (isScoreBlock ? (scoreBg || "#ef4444") : "#000000");

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
                    color: b.color ?? "#ffffff",
                    touchAction: "none",
                    background: "transparent",
                    backgroundColor: "transparent",
                  }}
                  className={`absolute flex items-center justify-center font-black tracking-tight cursor-grab active:cursor-grabbing select-none transition-all duration-75 ${isSelected ? "z-20 border border-primary shadow-lg" : "overflow-hidden z-10 border border-transparent"
                    }`}
                >
                  {/* Background container supporting opacity without fading text */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 0,
                      borderTopLeftRadius: `${b.rTL}px`,
                      borderTopRightRadius: `${b.rTR}px`,
                      borderBottomLeftRadius: `${b.rBL}px`,
                      borderBottomRightRadius: `${b.rBR}px`,
                      pointerEvents: "none",
                      backgroundColor: blockBg.includes("gradient") ? undefined : blockBg,
                      background: blockBg.includes("gradient") ? blockBg : undefined,
                      opacity: typeof b.opacity === "number" ? b.opacity / 100 : (b.opacity ? parseInt(String(b.opacity)) / 100 : 1)
                    }}
                  />

                  {/* Content wrapper */}
                  <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }} className="flex items-center justify-center pointer-events-none">
                    {b.id === "logo-tournament" ? (
                      logoTournament ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={logoTournament} className="w-full h-full object-cover pointer-events-none" alt="Tournament Logo" />
                      ) : (
                        <span className="text-[10px] opacity-60">Logo L</span>
                      )
                    ) : b.id === "logo-home" ? (
                      logoHome ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={logoHome} className="w-full h-full object-cover pointer-events-none" alt="Home Logo" />
                      ) : (
                        <span className="text-[10px] opacity-60">Logo H</span>
                      )
                    ) : b.id === "logo-away" ? (
                      logoAway ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={logoAway} className="w-full h-full object-cover pointer-events-none" alt="Away Logo" />
                      ) : (
                        <span className="text-[10px] opacity-60">Logo A</span>
                      )
                    ) : (
                      <span className="truncate px-1 flex items-center gap-0.5">
                        {getShortPreviewLabel(b.id)}
                      </span>
                    )}
                  </div>

                  {/* Sidebar/indicator decorations */}
                  {b.id === "name-home" && homeBarDir !== "none" && (
                    <div
                      style={{
                        position: "absolute",
                        backgroundColor: homeBarColor,
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
                        backgroundColor: awayBarColor,
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

          {/* OBS Link Generator section */}
          <div className="border rounded-lg p-2 md:p-4 space-y-2 md:space-y-4 bg-card">
            <div className="flex items-center gap-2 text-primary">
              <span className="font-black text-xs tracking-wider uppercase">OBS Browser Source URL</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              คัดลอกลิงก์ปรับแต่งตามตำแหน่ง (Canvas) นำไปใส่เป็นแหล่งข้อมูล OBS เพื่อขึ้นจอถ่ายทอดสดจริง
            </p>

            <div className="flex gap-2 items-center bg-background border rounded-md p-1 pl-3 overflow-hidden">
              <span className="text-[11px] font-mono truncate text-muted-foreground flex-1">
                {getObsUrl()}
              </span>
              <Button size="icon" className="h-8 w-8 cursor-pointer" onClick={handleCopy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </section>

        {/* Right Column: Customizer Tools (col-span-5) */}
        <section className="lg:col-span-5 space-y-4 max-h-[750px] overflow-y-auto pr-1">
          <div className="border rounded-lg p-2 md:p-4 space-y-2 md:space-y-4 bg-card">
            <Label>ตัวปรับแต่งข้อมูลสตรีม (Overlay Controller)</Label>

            {/* Tournament label name */}
            <div className="flex gap-2 items-end">
              <div className="space-y-1.5 shrink-0">
                <Label>โลโก้รายการ</Label>
                <div className="relative w-10 h-10 border rounded-md flex items-center justify-center bg-muted/20 overflow-hidden cursor-pointer hover:bg-muted/40 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, "tournament")}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {logoTournament ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={logoTournament} className="w-full h-full object-cover" alt="Tournament Logo" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="space-y-1.5 flex-1">
                <Label>หัวข้อทัวร์นาเมนต์ / ชื่องาน</Label>
                <Input value={headerText} onChange={(e) => setHeaderText(e.target.value)} />
              </div>
            </div>

            {/* Team H Details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex gap-2 items-end">
                <div className="space-y-1.5 shrink-0">
                  <Label>โลโก้ H</Label>
                  <div className="relative w-10 h-10 border rounded-md flex items-center justify-center bg-muted/20 overflow-hidden cursor-pointer hover:bg-muted/40 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e, "home")}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {logoHome ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={logoHome} className="w-full h-full object-cover" alt="Logo H" />
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label>ชื่อทีม H</Label>
                  <Input value={nameHome} onChange={(e) => setNameHome(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>คะแนน ทีม H</Label>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-10 w-10 text-base font-bold cursor-pointer" onClick={() => setScoreHome(String(Math.max(0, parseInt(scoreHome || "0") - 1)))}>-</Button>
                  <Input className="text-center font-bold text-lg" value={scoreHome} onChange={(e) => setScoreHome(e.target.value.replace(/[^0-9]/g, ""))} />
                  <Button variant="outline" size="sm" className="h-10 w-10 text-base font-bold cursor-pointer" onClick={() => setScoreHome(String(parseInt(scoreHome || "0") + 1))}>+</Button>
                </div>
              </div>
            </div>

            {/* Team A Details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex gap-2 items-end">
                <div className="space-y-1.5 shrink-0">
                  <Label>โลโก้ A</Label>
                  <div className="relative w-10 h-10 border rounded-md flex items-center justify-center bg-muted/20 overflow-hidden cursor-pointer hover:bg-muted/40 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e, "away")}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {logoAway ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={logoAway} className="w-full h-full object-cover" alt="Logo A" />
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label>ชื่อทีม A</Label>
                  <Input value={nameAway} onChange={(e) => setNameAway(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>คะแนน ทีม A</Label>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-10 w-10 text-base font-bold cursor-pointer" onClick={() => setScoreAway(String(Math.max(0, parseInt(scoreAway || "0") - 1)))}>-</Button>
                  <Input className="text-center font-bold text-lg" value={scoreAway} onChange={(e) => setScoreAway(e.target.value.replace(/[^0-9]/g, ""))} />
                  <Button variant="outline" size="sm" className="h-10 w-10 text-base font-bold cursor-pointer" onClick={() => setScoreAway(String(parseInt(scoreAway || "0") + 1))}>+</Button>
                </div>
              </div>
            </div>

            {/* Timer & Extra info */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>เวลาการแข่งขัน</Label>
                  <Input 
                    value={timerText} 
                    onChange={(e) => {
                      const val = e.target.value;
                      const upperVal = val.toUpperCase();
                      if (["H", "HT", "F", "FT"].includes(upperVal)) {
                        setTimerText(upperVal);
                        return;
                      }
                      if (val.includes(":")) {
                        setTimerText(val.slice(0, 6));
                        return;
                      }
                      const clean = val.replace(/[^0-9]/g, "");
                      const startsWithOne = clean.startsWith("1");
                      const maxDigits = startsWithOne ? 5 : 4;
                      const truncated = clean.slice(0, maxDigits);

                      if (startsWithOne) {
                        if (truncated.length > 3) {
                          setTimerText(truncated.slice(0, 3) + ":" + truncated.slice(3));
                        } else {
                          setTimerText(truncated);
                        }
                      } else {
                        if (truncated.length > 2) {
                          setTimerText(truncated.slice(0, 2) + ":" + truncated.slice(2));
                        } else {
                          setTimerText(truncated);
                        }
                      }
                    }} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>ทดเวลาบาดเจ็บ</Label>
                  <Input value={addTimeText} onChange={(e) => setAddTimeText(e.target.value)} />
                </div>
              </div>

              {/* Timer control buttons */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setTimerIsRunning(!timerIsRunning)}
                  className={`h-9 text-xs font-bold cursor-pointer transition-all ${
                    timerIsRunning
                      ? "bg-orange-500/10 border-orange-500/30 text-orange-500 hover:bg-orange-500/20"
                      : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                  }`}
                >
                  {timerIsRunning ? "หยุด (Pause)" : "เริ่ม (Start)"}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setTimerIsRunning(false);
                    setTimerText("00:00");
                  }}
                  className="h-9 text-xs font-bold cursor-pointer"
                >
                  รีเซ็ต
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setTimerIsRunning(false);
                    setAddTimeText("+0");
                    setTimerText("HT");
                  }}
                  className="h-9 text-xs font-bold cursor-pointer"
                >
                  HT
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setTimerIsRunning(false);
                    setAddTimeText("+0");
                    setTimerText("FT");
                  }}
                  className="h-9 text-xs font-bold cursor-pointer"
                >
                  FT
                </Button>
              </div>
            </div>
          </div>

          {/* Section 2: Canvas Coordinates & Toggles Panel (Matches layout of broadcast-dialog Part 2) */}
          <div className="border rounded-lg p-2 md:p-4 space-y-2 md:space-y-4 bg-card">
            <div className="flex items-center justify-between">
              <Label>{dict.pos_spacing}</Label>

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
                  className="text-xs font-black text-destructive hover:underline cursor-pointer"
                >
                  {locale === 'th' ? "ลบ" : "Delete"}
                </button>
              )}
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
                </>
              )}

              {/* Box Width */}
              {selectedBlock && (
                <div className="flex items-center justify-between gap-2">
                  <DraggableLabel value={selectedBlock.w || 0} onChange={(val) => updateBlockProperty(selectedBlockId, { w: val })} min={0}>{dict.width}</DraggableLabel>
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
                  <DraggableLabel value={selectedBlock.h || 0} onChange={(val) => updateBlockProperty(selectedBlockId, { h: val })} min={0}>{dict.height}</DraggableLabel>
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
                <Label>{dict.appearance}</Label>

                {/* Block Spacing / Gap */}
                <div className="flex items-center justify-between gap-2">
                  <DraggableLabel value={blockGap || 0} onChange={(val) => setBlockGap(val)} min={0}>Spacing</DraggableLabel>
                  <Input
                    type="text"
                    value={blockGap || "0"}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, "");
                      setBlockGap(clean === "" ? 0 : Number(clean));
                    }}
                    className="w-24 h-8 text-xs text-right"
                  />
                </div>

                {/* Opacity */}
                {selectedBlock && (
                  <div className="flex items-center justify-between gap-2">
                    <DraggableLabel value={selectedBlock.opacity ?? 100} onChange={(val) => updateBlockProperty(selectedBlockId, { opacity: val })} min={0} max={100}>{dict.opacity}</DraggableLabel>
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

                {/* Fill Color Picker */}
                {selectedBlock && (
                  <GradientColorPicker
                    label={dict.bg_color}
                    value={selectedBlock.bg ?? (selectedBlockId.startsWith("score") ? scoreBg : "#000000")}
                    onChange={(val) => updateBlockProperty(selectedBlockId, { bg: val })}
                    fallbackColor="#000000"
                  />
                )}

                {/* Corner Radii 2x2 Grid */}
                {selectedBlock && (
                  <div className="space-y-1 md:space-y-2">
                    <div className="flex items-center justify-between mt-1">
                      <Label>{dict.corner_radius}</Label>
                      <button
                        type="button"
                        onClick={applyRadiiToAll}
                        className="text-[10px] font-black text-primary hover:underline cursor-pointer"
                      >
                        {locale === 'th' ? "ใช้กับทุกบล็อก" : "Apply to All Blocks"}
                      </button>
                    </div>

                    {/* Link Corners Toggle */}
                    <div className="flex items-center justify-between p-2 rounded-sm border h-10">
                      <span className="text-[10px]">{dict.link_corners}</span>
                      <Switch
                        checked={linkCorners}
                        onCheckedChange={setLinkCorners}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-1 md:gap-2">
                      {/* Top-Left */}
                      <div className="flex items-center justify-between gap-2">
                        <DraggableLabel value={selectedBlock.rTL} onChange={(val) => { if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val }); else updateBlockProperty(selectedBlockId, { rTL: val }); }} min={0}>{dict.top_left}</DraggableLabel>
                        <Input
                          type="text"
                          value={selectedBlock.rTL}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/[^0-9]/g, "");
                            const val = Number(clean) || 0;
                            if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val });
                            else updateBlockProperty(selectedBlockId, { rTL: val });
                          }}
                          className="w-24 h-8 text-xs text-right"
                        />
                      </div>
                      {/* Top-Right */}
                      <div className="flex items-center justify-between gap-2">
                        <DraggableLabel value={selectedBlock.rTR} onChange={(val) => { if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val }); else updateBlockProperty(selectedBlockId, { rTR: val }); }} min={0}>{dict.top_right}</DraggableLabel>
                        <Input
                          type="text"
                          value={selectedBlock.rTR}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/[^0-9]/g, "");
                            const val = Number(clean) || 0;
                            if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val });
                            else updateBlockProperty(selectedBlockId, { rTR: val });
                          }}
                          className="w-24 h-8 text-xs text-right"
                        />
                      </div>
                      {/* Bottom-Left */}
                      <div className="flex items-center justify-between gap-2">
                        <DraggableLabel value={selectedBlock.rBL} onChange={(val) => { if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val }); else updateBlockProperty(selectedBlockId, { rBL: val }); }} min={0}>{dict.bottom_left}</DraggableLabel>
                        <Input
                          type="text"
                          value={selectedBlock.rBL}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/[^0-9]/g, "");
                            const val = Number(clean) || 0;
                            if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val });
                            else updateBlockProperty(selectedBlockId, { rBL: val });
                          }}
                          className="w-24 h-8 text-xs text-right"
                        />
                      </div>
                      {/* Bottom-Right */}
                      <div className="flex items-center justify-between gap-2">
                        <DraggableLabel value={selectedBlock.rBR} onChange={(val) => { if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val }); else updateBlockProperty(selectedBlockId, { rBR: val }); }} min={0}>{dict.bottom_right}</DraggableLabel>
                        <Input
                          type="text"
                          value={selectedBlock.rBR}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/[^0-9]/g, "");
                            const val = Number(clean) || 0;
                            if (linkCorners) updateBlockProperty(selectedBlockId, { rTL: val, rTR: val, rBL: val, rBR: val });
                            else updateBlockProperty(selectedBlockId, { rBR: val });
                          }}
                          className="w-24 h-8 text-xs text-right"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Typography section inside Appearance */}
                <div className="space-y-2 border-t pt-2 md:pt-4 mt-2 md:mt-4">
                  <Label>{dict.typography}</Label>
                  <div className="space-y-2">
                    {/* Font Family selector */}
                    <div className="flex items-center justify-between gap-2">
                      <Label className="shrink-0">{dict.font_family}</Label>
                      <Select value={font} onValueChange={setFont}>
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
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

                    {/* Font Size Selector (for selected block) */}
                    {selectedBlock && (
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
                    )}

                    {/* Font Color Selector (for selected block) */}
                    {selectedBlock && (
                      <div className="flex items-center justify-between gap-2">
                        <Label className="shrink-0">{dict.font_color}</Label>
                        <div className="flex items-center gap-1 md:gap-2 justify-end">
                          <input
                            type="color"
                            value={selectedBlock.color ?? "#ffffff"}
                            onChange={(e) => updateBlockProperty(selectedBlockId, { color: e.target.value })}
                            className="w-10 h-10 cursor-pointer shrink-0"
                            style={{ padding: 0 }}
                          />
                          <Input
                            type="text"
                            value={selectedBlock.color ?? "#ffffff"}
                            onChange={(e) => updateBlockProperty(selectedBlockId, { color: e.target.value })}
                            className="w-24 h-8 text-xs text-right font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Extra decorations (Stripe Decor) */}
          <div className="border rounded-lg p-2 md:p-4 space-y-1 md:space-y-2 bg-card">
            <Label>{dict.content}</Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2 items-end">
              {/* Team Name Color Bars */}
              <div className="md:col-span-2 space-y-2 border-t pt-2 md:pt-4 mt-1 md:mt-2">
                <Label>{dict.team_color_bars}</Label>
                <div className="grid gap-1 md:gap-2">
                  {/* Home Team Color Bar */}
                  <div className="space-y-1">
                    <Label>{dict.home_team}</Label>
                    <div className="flex gap-1 md:gap-2">
                      <div className="space-y-1">
                        <Select value={homeBarDir} onValueChange={(val: string) => setHomeBarDir(val)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card">
                            <SelectItem value="none">{dict.none}</SelectItem>
                            <SelectItem value="top">{dict.top}</SelectItem>
                            <SelectItem value="right">{dict.right}</SelectItem>
                            <SelectItem value="bottom">{dict.bottom}</SelectItem>
                            <SelectItem value="left">{dict.left}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <GradientColorPicker
                        label={dict.bar_color}
                        value={homeBarColor}
                        onChange={setHomeBarColor}
                        fallbackColor="#3b82f6"
                      />
                    </div>
                  </div>

                  {/* Away Team Color Bar */}
                  <div className="space-y-1">
                    <Label>{dict.away_team}</Label>
                    <div className="flex gap-1 md:gap-2">
                      <div className="space-y-1">
                        <Select value={awayBarDir} onValueChange={(val: string) => setAwayBarDir(val)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card">
                            <SelectItem value="none">{dict.none}</SelectItem>
                            <SelectItem value="top">{dict.top}</SelectItem>
                            <SelectItem value="right">{dict.right}</SelectItem>
                            <SelectItem value="bottom">{dict.bottom}</SelectItem>
                            <SelectItem value="left">{dict.left}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <GradientColorPicker
                        label={dict.bar_color}
                        value={awayBarColor}
                        onChange={setAwayBarColor}
                        fallbackColor="#ef4444"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: OBS Specific layouts & alignment */}
          <div className="border rounded-lg p-2 md:p-4 space-y-2 md:space-y-4 bg-card">
            <Label>{dict.obs_settings}</Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2">
              {/* Horizontal alignment */}
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setPosX("left")}
                  className={`px-2 py-1.5 rounded-sm border text-[10px] font-bold transition-all cursor-pointer ${posX === "left"
                    ? "border-primary bg-primary/5 text-primary"
                    : "hover:bg-foreground/10 text-muted-foreground"
                    }`}
                >
                  {dict.left}
                </button>
                <button
                  type="button"
                  onClick={() => setPosX("center")}
                  className={`px-2 py-1.5 rounded-sm border text-[10px] font-bold transition-all cursor-pointer ${posX === "center"
                    ? "border-primary bg-primary/5 text-primary"
                    : "hover:bg-foreground/10 text-muted-foreground"
                    }`}
                >
                  {dict.center}
                </button>
                <button
                  type="button"
                  onClick={() => setPosX("right")}
                  className={`px-2 py-1.5 rounded-sm border text-[10px] font-bold transition-all cursor-pointer ${posX === "right"
                    ? "border-primary bg-primary/5 text-primary"
                    : "hover:bg-foreground/10 text-muted-foreground"
                    }`}
                >
                  {dict.right}
                </button>
              </div>

              {/* Vertical alignment */}
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setPosY("top")}
                  className={`px-2 py-1.5 rounded-sm border text-[10px] font-bold transition-all cursor-pointer ${posY === "top"
                    ? "border-primary bg-primary/5 text-primary"
                    : "hover:bg-foreground/10 text-muted-foreground"
                    }`}
                >
                  {dict.top}
                </button>
                <button
                  type="button"
                  onClick={() => setPosY("bottom")}
                  className={`px-2 py-1.5 rounded-sm border text-[10px] font-bold transition-all cursor-pointer ${posY === "bottom"
                    ? "border-primary bg-primary/5 text-primary"
                    : "hover:bg-foreground/10 text-muted-foreground"
                    }`}
                >
                  {dict.bottom}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{dict.obs_bg}</Label>
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
                      className={`flex flex-col items-center justify-center p-2 rounded-sm border text-[10px] font-bold transition-all cursor-pointer ${isActive
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
        </section>
      </main>
    </div>
  );
}
