// @ts-nocheck
"use client";

import { weekLabels } from "@/lib/platformDefaults";

export default function WeekPicker({
  weeks,
  selectedWeek,
  setSelectedWeek,
  selectedYear,
  athleteId,
  weekColors,
  weekPlanning,
}) {
  return (
    <div className="mt-6">
      <h3 className="mb-3 text-lg font-semibold">
        Semaines de l’année
      </h3>

      <div className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-[repeat(13,minmax(0,1fr))]">
        {weeks.map((week) => {
          const tag =
            weekColors[
              `${athleteId}-${selectedYear}-${week.week}`
            ];
          const planning =
  weekPlanning?.[
    `${athleteId}-${selectedYear}-${week.week}`
  ]; 

          const tagColor = weekLabels.find(
            (row) => row.name === tag
          )?.color;

          const base =
            selectedWeek === week.week
              ? "border-white bg-white text-black"
              : week.sessions
              ? "border-zinc-600 bg-zinc-800 text-white"
              : "border-zinc-800 bg-zinc-900 text-zinc-500";
            
          const isDone = planning?.status === "done";

const colorClass = tagColor || base;

const finalClass = isDone
  ? colorClass
  : `${colorClass} bg-transparent`;

          return (
            <button
              key={week.week}
              onClick={() => setSelectedWeek(week.week)}
              className={`rounded-xl border-2 px-2 py-2 text-sm font-semibold ${finalClass}`}
            >
              <span className="block">
                {week.week}
              </span>

              <span className="block text-[10px] font-normal opacity-80">
                {week.range}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
        {weekLabels
          .filter((row) => row.name !== "Aucun")
          .map((row) => (
            <span
              key={row.name}
              className={`rounded-full border px-3 py-1 ${row.color}`}
            >
              {row.name}
            </span>
          ))}
      </div>
    </div>
  );
}