export const APP_COLORS: [string, string][] = [
  ["Bleu", "bg-blue-500"],
  ["Bleu ciel", "bg-sky-500"],
  ["Cyan", "bg-cyan-500"],
  ["Turquoise", "bg-teal-500"],
  ["Émeraude", "bg-emerald-500"],
  ["Vert", "bg-green-500"],
  ["Lime", "bg-lime-500"],
  ["Jaune", "bg-yellow-500"],
  ["Ambre", "bg-amber-500"],
  ["Orange", "bg-orange-500"],
  ["Rouge", "bg-red-500"],
  ["Rose", "bg-rose-500"],
  ["Pink", "bg-pink-500"],
  ["Fuchsia", "bg-fuchsia-500"],
  ["Violet", "bg-violet-500"],
  ["Pourpre", "bg-purple-500"],
  ["Indigo", "bg-indigo-500"],
  ["Slate", "bg-slate-500"],
  ["Gris", "bg-gray-500"],
  ["Zinc", "bg-zinc-500"],
  ["Stone", "bg-stone-500"],
  ["Rouge foncé", "bg-red-700"],
  ["Orange foncé", "bg-orange-700"],
  ["Vert foncé", "bg-green-700"],
  ["Bleu foncé", "bg-blue-700"],
  ["Violet foncé", "bg-purple-700"],
  ["Cyan foncé", "bg-cyan-700"],
  ["Rose foncé", "bg-pink-700"],
  ["Marron", "bg-amber-800"],
];

export const COLOR_HEX: Record<string, string> = {
  "bg-blue-500": "#3b82f6",
  "bg-sky-500": "#0ea5e9",
  "bg-cyan-500": "#06b6d4",
  "bg-teal-500": "#14b8a6",
  "bg-emerald-500": "#10b981",
  "bg-green-500": "#22c55e",
  "bg-lime-500": "#84cc16",
  "bg-yellow-500": "#eab308",
  "bg-amber-500": "#f59e0b",
  "bg-orange-500": "#f97316",
  "bg-red-500": "#ef4444",
  "bg-rose-500": "#f43f5e",
  "bg-pink-500": "#ec4899",
  "bg-fuchsia-500": "#d946ef",
  "bg-violet-500": "#8b5cf6",
  "bg-purple-500": "#a855f7",
  "bg-indigo-500": "#6366f1",
  "bg-slate-500": "#64748b",
  "bg-gray-500": "#6b7280",
  "bg-zinc-500": "#71717a",
  "bg-stone-500": "#78716c",
  "bg-red-700": "#b91c1c",
  "bg-orange-700": "#c2410c",
  "bg-green-700": "#15803d",
  "bg-blue-700": "#1d4ed8",
  "bg-purple-700": "#7e22ce",
  "bg-cyan-700": "#0e7490",
  "bg-pink-700": "#be185d",
  "bg-amber-800": "#92400e",
};

export const FALLBACK_COLOR_HEX = APP_COLORS.map(([, color]) => COLOR_HEX[color]);

export function getColorHex(color?: string) {
  return COLOR_HEX[color || ""] || COLOR_HEX["bg-blue-500"];
}

export function getFallbackColorHex(index = 0) {
  return FALLBACK_COLOR_HEX[index % FALLBACK_COLOR_HEX.length] || getColorHex();
}

export function getColorClass(color?: string) {
  return color || "bg-blue-500";
}

export function getColorLabel(color?: string) {
  return (
    APP_COLORS.find(([, value]) => value === color)?.[0] ||
    "Bleu"
  );
}