import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTeamInitials(name?: string | null): string {
  if (!name) return "";
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const first = Array.from(words[0])[0] || "";
    const second = Array.from(words[1])[0] || "";
    return (first + second).toUpperCase();
  }
  const chars = Array.from(trimmed);
  if (chars.length >= 2) {
    return (chars[0] + chars[1]).toUpperCase();
  }
  return trimmed.toUpperCase();
}

export const getPlayerInitials = getTeamInitials;

