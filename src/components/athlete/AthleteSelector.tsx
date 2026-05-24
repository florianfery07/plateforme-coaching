// @ts-nocheck

import { Badge } from "@/components/ui/ui";

export default function AthleteSelector({
  visible,
  athletes,
  activeId,
  setActiveId,
}) {
  if (!visible) return null;

  const badges = [
    ["Programmée", "bg-white text-black"],
    ["Action attendue", "bg-yellow-400 text-black"],
    ["Réalisée", "bg-emerald-500 text-white"],
    ["Non faite justifiée", "bg-zinc-700 text-white"],
    ["Proposition", "bg-zinc-500 text-white"],
  ];

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
          {athletes.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveId(a.id)}
              className={`shrink-0 rounded-xl border px-4 py-3 text-sm font-semibold sm:py-2 sm:text-base ${
                activeId === a.id
                  ? "border-white bg-white text-black"
                  : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {a.calendarName}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {badges.map(([text, klass]) => (
            <Badge key={text} className={klass}>
              {text}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}