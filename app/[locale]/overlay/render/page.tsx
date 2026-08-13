"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface BlockItem {
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
  opacity: number;
  bg?: string;
  strokeWidth?: number;
  strokeColor?: string;
  strokePos?: "inside" | "center" | "outside";
  color?: string;
  shapeType?: string;
  text?: string;
  bindTo?: string;
  skewX?: number;
  skewY?: number;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
}

interface OverlayConfig {
  blocks?: BlockItem[];
  scoreBg?: string;
  headerText?: string;
  nameHome?: string;
  nameAway?: string;
  scoreHome?: string;
  scoreAway?: string;
  timerText?: string;
  timerIsRunning?: boolean;
  addTimeText?: string;
  homeBarDir?: string;
  homeBarColor?: string;
  awayBarDir?: string;
  awayBarColor?: string;
  font?: string;
  posX?: string;
  posY?: string;
  logoHome?: string;
  logoAway?: string;
  logoTournament?: string;
}

function CustomOverlayRenderer() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  const searchParams = useSearchParams();
  const configString = searchParams.get("config");
  const positionsString = searchParams.get("positions");

  // Load configuration safely from query params
  let config: OverlayConfig | null = null;
  if (configString) {
    try {
      config = JSON.parse(decodeURIComponent(configString)) as OverlayConfig;
    } catch (e) {
      console.error("Failed to parse overlay config parameter", e);
    }
  }

  const [localData, setLocalData] = useState<{
    logoHome?: string;
    logoAway?: string;
    logoTournament?: string;
    blocks?: BlockItem[];
    timerText?: string;
    timerIsRunning?: boolean;
    scoreHome?: string;
    scoreAway?: string;
    nameHome?: string;
    nameAway?: string;
    headerText?: string;
    addTimeText?: string;
    homeScorer?: string;
    awayScorer?: string;
  }>({});

  useEffect(() => {
    const updateLocalData = () => {
      try {
        const saved = localStorage.getItem("overlay_playground_setup");
        if (saved) {
          const data = JSON.parse(saved);
          setLocalData({
            logoHome: data.logoHome,
            logoAway: data.logoAway,
            logoTournament: data.logoTournament,
            blocks: data.blocks,
            timerText: data.timerText,
            timerIsRunning: data.timerIsRunning,
            scoreHome: data.scoreHome,
            scoreAway: data.scoreAway,
            nameHome: data.nameHome,
            nameAway: data.nameAway,
            headerText: data.headerText,
            addTimeText: data.addTimeText,
            homeScorer: data.homeScorer,
            awayScorer: data.awayScorer,
          });
        }
      } catch (_e) {}
    };
    updateLocalData();
    const interval = setInterval(updateLocalData, 200);
    window.addEventListener("storage", updateLocalData);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", updateLocalData);
    };
  }, []);

  // Parse blocks from positions string fallback if config blocks is empty
  let parsedBlocksFromPositions: BlockItem[] = [];
  if (positionsString) {
    try {
      parsedBlocksFromPositions = positionsString.split(";").map(part => {
        const f = part.split(":");
        return {
          id: f[0] || "",
          name: f[0] || "",
          active: true,
          x: parseFloat(f[1]) || 0,
          y: parseFloat(f[2]) || 0,
          w: parseFloat(f[3]) || 100,
          h: parseFloat(f[4]) || 40,
          fontSize: parseFloat(f[5]) || 16,
          rTL: parseFloat(f[6]) || 0,
          rTR: parseFloat(f[7]) || 0,
          rBL: parseFloat(f[8]) || 0,
          rBR: parseFloat(f[9]) || 0,
          opacity: parseFloat(f[10]) ?? 100,
          bg: f[11] ? decodeURIComponent(f[11]) : undefined,
          color: f[12] ? `#${f[12]}` : "#ffffff",
          shapeType: f[13] || "rectangle",
          text: f[14] ? decodeURIComponent(f[14]) : undefined,
          bindTo: f[15] || "none",
          strokeWidth: parseFloat(f[16]) || 0,
          strokeColor: f[17] ? `#${f[17]}` : "#ffffff",
          strokePos: (f[18] as "inside" | "center" | "outside") || "inside",
          skewX: parseFloat(f[19]) || 0,
          skewY: parseFloat(f[20]) || 0,
          fontWeight: f[21] || "400",
          fontStyle: f[22] || "normal",
          textDecoration: f[23] || "none",
        };
      }).filter(b => b.id);
    } catch (_e) {}
  }

  // Fallbacks if no config is parsed
  const blocks: BlockItem[] = (config?.blocks && config.blocks.length > 0)
    ? config.blocks
    : (parsedBlocksFromPositions.length > 0 ? parsedBlocksFromPositions : (localData.blocks || []));
  const scoreBg = config?.scoreBg || "#ef4444";
  const headerText = localData.headerText || config?.headerText || "LEAGUEFLOW LEAGUE";
  const nameHome = localData.nameHome || config?.nameHome || "TEAM ALPHA";
  const nameAway = localData.nameAway || config?.nameAway || "TEAM BETA";
  const scoreHome = localData.scoreHome ?? config?.scoreHome ?? "0";
  const scoreAway = localData.scoreAway ?? config?.scoreAway ?? "0";
  const baseTimerText = localData.timerText || config?.timerText || "00:00";
  const logoHome = config?.logoHome || localData.logoHome || "";
  const logoAway = config?.logoAway || localData.logoAway || "";
  const logoTournament = config?.logoTournament || localData.logoTournament || "";
  const addTimeText = localData.addTimeText || config?.addTimeText || "+0";
  const homeBarDir = config?.homeBarDir || "none";
  const homeBarColor = config?.homeBarColor || "#3b82f6";
  const awayBarDir = config?.awayBarDir || "none";
  const awayBarColor = config?.awayBarColor || "#ef4444";
  const font = searchParams.get("font") || config?.font || "orbitron";
  const isTimerRunning = localData.timerIsRunning ?? config?.timerIsRunning ?? false;
  
  // Placement
  const posX = config?.posX || "center";
  const posY = config?.posY || "center";

  // Live timer ticking state synced with Live Console
  const [liveTimerText, setLiveTimerText] = React.useState(baseTimerText);

  React.useEffect(() => {
    setLiveTimerText(baseTimerText);
  }, [baseTimerText]);

  React.useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setLiveTimerText(prev => {
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
  }, [isTimerRunning]);

  const getLabelContent = (b: BlockItem) => {
    const target = b.bindTo && b.bindTo !== "none" ? b.bindTo : b.id;
    switch (target) {
      case "header-text": return headerText;
      case "logo-home": return "🛡️";
      case "logo-away": return "🛡️";
      case "name-home": return nameHome;
      case "name-away": return nameAway;
      case "score-home": return scoreHome;
      case "score-away": return scoreAway;
      case "timer": return liveTimerText;
      case "add-time": return addTimeText;
      case "home-scorer": {
        const text = ((config as Record<string, unknown>)?.homeScorer as string) || "";
        return text.split(",").slice(0, 2).join(",").trim();
      }
      case "away-scorer": {
        const text = ((config as Record<string, unknown>)?.awayScorer as string) || "";
        return text.split(",").slice(0, 2).join(",").trim();
      }
      default:
        if (b.shapeType === "text") return b.text || "";
        return "";
    }
  };

  const getFontFamilyClass = (f: string) => {
    switch (f) {
      case "inter": return "font-sans";
      case "montserrat": return "font-sans tracking-wide";
      case "bebas-neue": return "font-serif tracking-widest font-black";
      case "orbitron": return "font-mono tracking-widest";
      case "outfit": return "font-sans";
      default: return "font-sans";
    }
  };

  const getFontFamilyStyle = (f: string) => {
    switch (f) {
      case "inter":
        return { fontFamily: "'Inter', sans-serif" };
      case "montserrat":
        return { fontFamily: "'Montserrat', sans-serif" };
      case "bebas-neue":
        return { fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.12em" };
      case "orbitron":
        return { fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.08em" };
      case "outfit":
        return { fontFamily: "'Outfit', sans-serif" };
      default:
        return {};
    }
  };

  // PosX mapping
  const getHorizontalClass = (x: string) => {
    if (x === "left") return "justify-start p-8";
    if (x === "right") return "justify-end p-8";
    return "justify-center";
  };

  // PosY mapping
  const getVerticalClass = (y: string) => {
    if (y === "top") return "items-start pt-8 px-8 pb-8";
    if (y === "bottom") return "items-end p-8";
    return "items-center justify-center";
  };

  if (!mounted) return null;

  return (
    <div 
      className={`h-screen w-screen bg-transparent flex items-center justify-center relative overflow-hidden ${getHorizontalClass(posX)} ${getVerticalClass(posY)} ${getFontFamilyClass(font)}`}
      style={getFontFamilyStyle(font)}
    >
      <style jsx global>{`
        body {
          background-color: transparent !important;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>

      {/* Render absolute positioned blocks */}
      <div className="relative w-full h-full flex items-center justify-center">
        {blocks.map((b, idx) => {
          if (!b.active) return null;
          if (b.id === "add-time" && (addTimeText === "+0" || addTimeText === "0" || !addTimeText)) return null;
          const isCircle = b.shapeType === "circle";
          const isPolygon = b.shapeType === "polygon";
          const isStar = b.shapeType === "star";
          const strokePos = b.strokePos || "inside";
          const strokeWidth = b.strokeWidth ?? 0;
          const strokeInset = strokeWidth > 0
            ? (strokePos === "outside" ? `-${strokeWidth}px` : strokePos === "center" ? `-${strokeWidth / 2}px` : "0px")
            : "0px";
          const isScoreBlock = b.id === "score-home" || b.id === "score-away";
          const blockBg = b.bg || (isScoreBlock ? (scoreBg || "#ef4444") : "#000000");

          return (
            <div
              key={b.id}
              style={{
                position: "absolute",
                transform: `translate(calc(-50% + ${b.x}px), calc(-50% + ${b.y}px))`,
                left: "50%",
                top: "50%",
                width: b.shapeType === "text" ? "max-content" : `${b.w}px`,
                height: b.shapeType === "text" ? "max-content" : `${b.h}px`,
                fontSize: `${b.fontSize}px`,
                color: b.color ?? "#ffffff",
                background: "transparent",
                backgroundColor: "transparent",
                isolation: "isolate",
                zIndex: 10 + idx,
                ...getFontFamilyStyle(font),
              }}
              className="flex items-center justify-center font-black tracking-tight select-none relative"
            >
              {/* Background Shape Container (Skews independently without warping logo images) */}
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
                  borderStyle: strokeWidth > 0 ? "solid" : "none",
                  borderWidth: strokeWidth > 0 ? `${strokeWidth}px` : "0px",
                  borderColor: b.strokeColor ?? "#ffffff",
                  boxSizing: "border-box",
                  opacity: typeof b.opacity === "number" ? b.opacity / 100 : (b.opacity ? parseInt(String(b.opacity)) / 100 : 1),
                  ...(blockBg.includes("gradient") ? {
                    background: blockBg,
                  } : {
                    backgroundColor: blockBg,
                  })
                }}
              />

              {b.id === "logo-tournament" || b.bindTo === "logo-tournament" ? (
                logoTournament ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logoTournament} className="w-full h-full object-contain pointer-events-none p-1" alt="Tournament Logo" />
                ) : (
                  <span className="text-[10px] opacity-60">🛡️</span>
                )
              ) : b.id === "logo-home" || b.bindTo === "logo-home" ? (
                logoHome ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logoHome} className="w-full h-full object-contain pointer-events-none p-1" alt="Home Logo" />
                ) : (
                  <span className="text-[10px] opacity-60">🛡️</span>
                )
              ) : b.id === "logo-away" || b.bindTo === "logo-away" ? (
                logoAway ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logoAway} className="w-full h-full object-contain pointer-events-none p-1" alt="Away Logo" />
                ) : (
                  <span className="text-[10px] opacity-60">🛡️</span>
                )
              ) : (
                <span
                  className={`${b.shapeType === "text" ? "whitespace-nowrap px-2 py-1" : "truncate px-1"}`}
                  style={{
                    fontSize: `${b.fontSize || 16}px`,
                    fontWeight: b.fontWeight || undefined,
                    fontStyle: b.fontStyle || "normal",
                    textDecoration: b.textDecoration || "none",
                  }}
                >
                  {getLabelContent(b)}
                </span>
              )}

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
    </div>
  );
}

export default function CustomOverlayRenderPage() {
  return (
    <Suspense fallback={null}>
      <CustomOverlayRenderer />
    </Suspense>
  );
}
