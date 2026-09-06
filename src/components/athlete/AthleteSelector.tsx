// @ts-nocheck

import { useState } from "react";
import { Badge } from "@/components/ui/ui";
import { getColorClass } from "@/lib/colors";

export default function AthleteSelector({
  visible,
  athletes,
  activeId,
  setActiveId,
  planningTargetType = "athlete",
  setPlanningTargetType,
  athleteGroups = [],
  selectedGroupId = "",
  setSelectedGroupId,
  showStatusLegend = true,
}) {
  const [open, setOpen] = useState(false);

  if (!visible) return null;

  const activeAthlete = athletes.find((a) => a.id === activeId);
  const activeGroup = athleteGroups.find((g) => g.id === selectedGroupId);

  const badges = [
    ["Programmée", "bg-white text-black"],
    ["Action attendue", "bg-yellow-400 text-black"],
    ["Réalisée", "bg-emerald-500 text-white"],
    ["Non faite justifiée", "bg-zinc-700 text-white"],
    ["Proposition", "bg-zinc-500 text-white"],
  ];

  return (
    <div className="border-b border-zinc-800/80 py-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <div role="group" aria-label="Cible de planification" className="mb-1.5 inline-flex rounded-lg border border-zinc-700 bg-zinc-900/70 p-0.5">
            <button
              type="button"
              onClick={() => setPlanningTargetType?.("athlete")}
              aria-pressed={planningTargetType === "athlete"}
              className={`min-h-11 rounded-md px-3 py-2 text-sm font-semibold transition sm:min-h-10 sm:py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${planningTargetType === "athlete" ? "bg-white text-black" : "text-zinc-300 hover:bg-zinc-800"}`}
            >
              Athlète
            </button>
            <button
              type="button"
              onClick={() => setPlanningTargetType?.("group")}
              aria-pressed={planningTargetType === "group"}
              className={`min-h-11 rounded-md px-3 py-2 text-sm font-semibold transition sm:min-h-10 sm:py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${planningTargetType === "group" ? "bg-white text-black" : "text-zinc-300 hover:bg-zinc-800"}`}
            >
              Groupes
            </button>
          </div>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="planning-target-options"
            className="flex min-h-11 w-full items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-left transition hover:bg-zinc-800 sm:min-h-10 sm:py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{planningTargetType === "group" ? "Groupe sélectionné" : "Athlète sélectionné"}</div>
              <div className="flex items-center gap-2 font-semibold text-white">
                {planningTargetType === "athlete" && activeAthlete && (
                  <span className={`h-3 w-3 rounded-full ${getColorClass(activeAthlete.color)}`} />
                )}
                <span>
                  {planningTargetType === "group"
                   ? (activeGroup?.name || "Choisir un groupe")
                   : (activeAthlete?.calendarName || "Choisir un athlète")}
                </span>
              </div>
            </div>
            <span className="text-zinc-400">{open ? "▲" : "▼"}</span>
          </button>

          {open && (
            <div id="planning-target-options" role="group" aria-label={planningTargetType === "group" ? "Groupes disponibles" : "Athlètes disponibles"} className="absolute left-0 right-0 z-20 mt-1.5 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
              {planningTargetType === "athlete"
                ? athletes.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setActiveId(a.id);
                        setOpen(false);
                      }}
                      aria-pressed={activeId === a.id}
                      className={`flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-zinc-800 sm:min-h-10 sm:py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-amber-400 ${activeId === a.id ? "bg-zinc-800" : ""}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full ${getColorClass(a.color)}`} />
                        <span>{a.calendarName}</span>
                      </span>
                      {activeId === a.id && <span>✓</span>}
                    </button>
                  ))
                : athleteGroups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setSelectedGroupId(g.id);
                        setOpen(false);
                      }}
                      aria-pressed={selectedGroupId === g.id}
                      className={`flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-zinc-800 sm:min-h-10 sm:py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-amber-400 ${selectedGroupId === g.id ? "bg-zinc-800" : ""}`}
                    >
                      <span>{g.name}</span>
                      {selectedGroupId === g.id && <span>✓</span>}
                    </button>
                  ))
              }
            </div>
          )}
        </div>

        {showStatusLegend && (
          <div className="flex flex-wrap gap-1.5">
            {badges.map(([text, klass]) => (
              <Badge key={text} className={klass}>
                {text}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
