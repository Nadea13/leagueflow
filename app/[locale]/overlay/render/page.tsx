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
  color?: string;
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

  // Load configuration safely from query params
  let config: OverlayConfig | null = null;
  if (configString) {
    try {
      config = JSON.parse(decodeURIComponent(configString)) as OverlayConfig;
    } catch (e) {
      console.error("Failed to parse overlay config parameter", e);
    }
  }

  // Fallbacks if no config is parsed
  const blocks: BlockItem[] = config?.blocks || [];
  const scoreBg = config?.scoreBg || "#ef4444";
  const headerText = config?.headerText || "LEAGUEFLOW LEAGUE";
  const nameHome = config?.nameHome || "TEAM ALPHA";
  const nameAway = config?.nameAway || "TEAM BETA";
  const scoreHome = config?.scoreHome || "0";
  const scoreAway = config?.scoreAway || "0";
  const timerText = config?.timerText || "00:00";
  const logoHome = config?.logoHome || "";
  const logoAway = config?.logoAway || "";
  const logoTournament = config?.logoTournament || "";
  const addTimeText = config?.addTimeText || "+0";
  const homeBarDir = config?.homeBarDir || "none";
  const homeBarColor = config?.homeBarColor || "#3b82f6";
  const awayBarDir = config?.awayBarDir || "none";
  const awayBarColor = config?.awayBarColor || "#ef4444";
  const font = config?.font || "orbitron";
  
  // Placement
  const posX = config?.posX || "center";
  const posY = config?.posY || "top";

  // Live timer ticking state
  const [liveTimerText, setLiveTimerText] = React.useState(timerText);

  React.useEffect(() => {
    setLiveTimerText(timerText);
  }, [timerText]);

  React.useEffect(() => {
    if (!config?.timerIsRunning) return;
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
  }, [config?.timerIsRunning]);

  const getLabelContent = (id: string) => {
    switch (id) {
      case "header-text": return headerText;
      case "logo-home": return "🛡️"; // default logo placeholder
      case "logo-away": return "🛡️"; // default logo placeholder
      case "name-home": return nameHome;
      case "name-away": return nameAway;
      case "score-home": return scoreHome;
      case "score-away": return scoreAway;
      case "timer": return liveTimerText;
      case "add-time": return addTimeText;
      default: return "";
    }
  };

  const getFontFamilyClass = (f: string) => {
    switch (f) {
      case "inter": return "font-sans";
      case "montserrat": return "font-sans tracking-wide";
      case "bebas-neue": return "font-serif tracking-widest uppercase font-black";
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
    if (y === "top") return "items-start pt-16 px-8 pb-8";
    if (y === "bottom") return "items-end p-8";
    return "items-center";
  };

  if (!mounted) return null;

  return (
    <div 
      className={`min-h-screen w-full bg-transparent flex relative overflow-hidden ${getHorizontalClass(posX)} ${getVerticalClass(posY)} ${getFontFamilyClass(font)}`}
      style={getFontFamilyStyle(font)}
    >
      {/* Import external fonts */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Orbitron:wght@400;700;900&family=Outfit:wght@400;700;900&display=swap');
        body {
          background-color: transparent !important;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>

      {/* Render absolute positioned blocks */}
      <div className="relative w-full h-full flex items-center justify-center">
        {blocks.map((b) => {
          if (!b.active) return null;
          if (b.id === "add-time" && (addTimeText === "+0" || addTimeText === "0" || !addTimeText)) return null;
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
                width: `${b.w}px`,
                height: `${b.h}px`,
                fontSize: `${b.fontSize}px`,
                borderTopLeftRadius: `${b.rTL}px`,
                borderTopRightRadius: `${b.rTR}px`,
                borderBottomLeftRadius: `${b.rBL}px`,
                borderBottomRightRadius: `${b.rBR}px`,
                color: b.color ?? "#ffffff",
                backgroundColor: blockBg.includes("gradient") ? undefined : blockBg,
                background: blockBg.includes("gradient") ? blockBg : undefined,
                overflow: "hidden",
                opacity: typeof b.opacity === "number" ? b.opacity / 100 : (b.opacity ? parseInt(String(b.opacity)) / 100 : 1),
              }}
              className="flex items-center justify-center font-black tracking-tight select-none z-10"
            >
              {b.id === "logo-tournament" ? (
                logoTournament ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logoTournament} className="w-full h-full object-cover pointer-events-none" alt="Tournament Logo" />
                ) : (
                  <span className="text-[10px] opacity-60">🛡️</span>
                )
              ) : b.id === "logo-home" ? (
                logoHome ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logoHome} className="w-full h-full object-cover pointer-events-none" alt="Home Logo" />
                ) : (
                  <span className="text-[10px] opacity-60">🛡️</span>
                )
              ) : b.id === "logo-away" ? (
                logoAway ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logoAway} className="w-full h-full object-cover pointer-events-none" alt="Away Logo" />
                ) : (
                  <span className="text-[10px] opacity-60">🛡️</span>
                )
              ) : (
                <span className="truncate px-1">
                  {getLabelContent(b.id)}
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
