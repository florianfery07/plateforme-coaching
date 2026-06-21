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
}) {
  if (!visible) return null;

  const [open, setOpen] = useState(false);
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
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 px-4 py-3 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <div className="mb-2 inline-flex rounded-xl bg-zinc-900 p-1 border border-zinc-700">
            <button
              type="button"
              onClick={() => setPlanningTargetType?.("athlete")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${planningTargetType === "athlete" ? "bg-white text-black" : "text-zinc-300"}`}
            >Athlète</button>
            <button
              type="button"
              onClick={() => setPlanningTargetType?.("group")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${planningTargetType === "group" ? "bg-white text-black" : "text-zinc-300"}`}
            >Groupes</button>
          </div>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex w-full items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-left transition hover:bg-zinc-700"
          >
            <div>
              <div className="text-[11px] text-zinc-500">{planningTargetType === "group" ? "Groupe sélectionné" : "Athlète sélectionné"}</div>
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
            <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
              {planningTargetType === "athlete"
                ? athletes.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setActiveId(a.id);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-zinc-800 ${activeId === a.id ? "bg-zinc-800" : ""}`}
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
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-zinc-800 ${selectedGroupId === g.id ? "bg-zinc-800" : ""}`}
                    >
                      <span>{g.name}</span>
                      {selectedGroupId === g.id && <span>✓</span>}
                    </button>
                  ))
              }
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