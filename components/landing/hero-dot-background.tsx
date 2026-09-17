"use client";

import React, { useEffect, useRef } from "react";

export function HeroDotBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    const dotGap = 24;
    const baseRadius = 1.6;
    const interactionRadius = 140;

    const render = () => {
      mouse.x += (mouse.targetX - mouse.x) * 0.15;
      mouse.y += (mouse.targetY - mouse.y) * 0.15;

      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains("dark");
      // Solid rich dot colors
      const baseR = isDark ? 255 : 30;
      const baseG = isDark ? 255 : 30;
      const baseB = isDark ? 255 : 30;

      for (let x = dotGap / 2; x < width; x += dotGap) {
        for (let y = dotGap / 2; y < height; y += dotGap) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let drawX = x;
          let drawY = y;
          let radius = baseRadius;
          let alpha = isDark ? 0.75 : 0.8;
          let colorR = baseR;
          let colorG = baseG;
          let colorB = baseB;

          if (dist < interactionRadius) {
            const factor = (1 - dist / interactionRadius);
            
            // Subtle elastic displacement away from mouse
            const moveDist = factor * factor * 9;
            const angle = Math.atan2(dy, dx);
            drawX = x + Math.cos(angle) * moveDist;
            drawY = y + Math.sin(angle) * moveDist;

            // Highlight with vivid emerald/teal
            radius = baseRadius + factor * 2.2;
            alpha = 1.0;
            colorR = Math.round(baseR + (0 - baseR) * factor);
            colorG = Math.round(baseG + (210 - baseG) * factor);
            colorB = Math.round(baseB + (150 - baseB) * factor);
          }

          ctx.beginPath();
          ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${colorR}, ${colorG}, ${colorB}, ${alpha})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
