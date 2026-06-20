// @ts-nocheck

import { useState } from "react";
import { Badge } from "@/components/ui/ui";

export default function AthleteSelector({
  visible,
  athletes,
  activeId,
  setActiveId,
}) {
  if (!visible) return null;

  const [open, setOpen] = useState(false);
  const activeAthlete = athletes.find((a) => a.id === activeId);

  const badges = [
    ["Programmée", "bg-white text-black"],
    ["Action attendue", "bg-yellow-400 text-black"],
    ["Réalisée", "bg-emerald-500 text-white"],
    ["Non faite justifiée", "bg-zinc-700 text-white"],
    ["Proposition", "bg-zinc-500 text-white"],
  ];

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 px-4 py-3 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex w-full items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-left transition hover:bg-zinc-700"
          >
            <div>
              <div className="text-[11px] text-zinc-500">Athlète sélectionné</div>
              <div className="font-semibold text-white">
                {activeAthlete?.calendarName || "Choisir un athlète"}
              </div>
            </div>
            <span className="text-zinc-400">{open ? "▲" : "▼"}</span>
          </button>

          {open && (
            <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
              {athletes.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setActiveId(a.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-zinc-800 ${activeId === a.id ? "bg-zinc-800" : ""}`}
                >
                  <span>{a.calendarName}</span>
                  {activeId === a.id && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
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