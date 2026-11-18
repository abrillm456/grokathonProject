import { ACTIVITY_CATALOG } from "@/lib/catalog";
import type { ResidentialCollege } from "@/types";

export const COLLEGE_META: Record<
  ResidentialCollege,
  { code: string; hue: number }
> = {
  Berkeley: { code: "BK", hue: 198 },
  Branford: { code: "BR", hue: 28 },
  Davenport: { code: "DV", hue: 262 },
  "Ezra Stiles": { code: "ES", hue: 152 },
  "Grace Hopper": { code: "GH", hue: 188 },
  "Jonathan Edwards": { code: "JE", hue: 340 },
  Morse: { code: "MO", hue: 214 },
  "Pauli Murray": { code: "PM", hue: 12 },
  Pierson: { code: "PI", hue: 46 },
  Saybrook: { code: "SY", hue: 126 },
  Silliman: { code: "SI", hue: 230 },
  "Timothy Dwight": { code: "TD", hue: 304 },
  Trumbull: { code: "TR", hue: 172 },
  "Benjamin Franklin": { code: "BF", hue: 78 },
};

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "YR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function hueFromName(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

export function dimensionLabel(dimension: keyof typeof ACTIVITY_CATALOG): string {
  return ACTIVITY_CATALOG[dimension].label;
}

export function formatAmount(amount: number, unit: string): string {
  const rounded = Math.round(amount * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
  return `${text} ${unit}`;
}

export function formatXp(xp: number): string {
  return Math.round(xp).toLocaleString("en-US");
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
