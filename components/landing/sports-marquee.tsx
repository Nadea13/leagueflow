"use client";

import React from "react";
import { motion } from "motion/react";

import {
  IconBallFootball,
  IconBallBasketball,
  IconPlayFootball,
  IconBallVolleyball,
  IconBallTennis,
  IconTrophy,
  IconCricket,
} from "@tabler/icons-react";
import { GiShuttlecock } from "react-icons/gi";

interface SportItem {
  name: string;
  nameEn: string;
  icon: React.ReactNode;
  tag: string;
}

const sportsList: SportItem[] = [
  {
    name: "ฟุตบอล",
    nameEn: "Football / Soccer",
    tag: "11v11 / 7v7",
    icon: <IconBallFootball className="w-5 h-5" stroke={1.75} />,
  },
  {
    name: "บาสเกตบอล",
    nameEn: "Basketball",
    tag: "5v5 / 3x3",
    icon: <IconBallBasketball className="w-5 h-5" stroke={1.75} />,
  },
  {
    name: "ฟุตซอล",
    nameEn: "Futsal",
    tag: "5v5 League",
    icon: <IconPlayFootball className="w-5 h-5" stroke={1.75} />,
  },
  {
    name: "วอลเลย์บอล",
    nameEn: "Volleyball",
    tag: "Indoor / Beach",
    icon: <IconBallVolleyball className="w-5 h-5" stroke={1.75} />,
  },
  {
    name: "แบดมินตัน",
    nameEn: "Badminton",
    tag: "Singles / Doubles",
    icon: <GiShuttlecock className="w-5 h-5" />,
  },
  {
    name: "เทนนิส",
    nameEn: "Tennis",
    tag: "Singles / Doubles",
    icon: <IconBallTennis className="w-5 h-5" stroke={1.75} />,
  },
  {
    name: "เซปักตะกร้อ",
    nameEn: "Sepak Takraw",
    tag: "Regu / Team",
    icon: <IconTrophy className="w-5 h-5" stroke={1.75} />,
  },
  {
    name: "คริกเก็ต",
    nameEn: "Cricket",
    tag: "T20 / Custom",
    icon: <IconCricket className="w-5 h-5" stroke={1.75} />,
  },
];

interface SportsMarqueeProps {
  className?: string;
  showTitle?: boolean;
}

export function SportsMarquee({ className = "", showTitle = true }: SportsMarqueeProps) {
  return (
    <div className={`relative overflow-hidden w-full ${className}`}>
      {showTitle && (
        <div className="container max-w-7xl mx-auto px-4 mb-4 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-xs uppercase tracking-widest font-bold text-muted-foreground/80"
          >
            รองรับทุกชนิดกีฬาและรูปแบบการแข่งขันสากล
          </motion.p>
        </div>
      )}

      {/* Infinite scrolling marquee */}
      <div className="relative w-full overflow-hidden flex items-center">
        {/* Soft edge fade overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-r from-background via-background/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none" />

        <div className="flex select-none overflow-hidden">
          <motion.div
            className="flex gap-4 sm:gap-6 shrink-0 py-2"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              repeat: Infinity,
              ease: "linear",
              duration: 35,
            }}
          >
            {/* Duplicated list for seamless infinite loop */}
            {[...sportsList, ...sportsList, ...sportsList, ...sportsList].map((sport, index) => (
              <div
                key={index}
                className="group relative flex items-center gap-3.5 p-4 rounded-sm bg-card/80 border border-border/60 hover:border-primary/40 hover:bg-card transition-all duration-300 shadow-xs hover:shadow-md cursor-default shrink-0 backdrop-blur-xs"
              >
                <div className="w-10 h-10 rounded-sm bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  {sport.icon}
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground tracking-tight group-hover:text-primary transition-colors">
                      {sport.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted font-medium text-muted-foreground">
                      {sport.tag}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground/80 font-medium">
                    {sport.nameEn}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
