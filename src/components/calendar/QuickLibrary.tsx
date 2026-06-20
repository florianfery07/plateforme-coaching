// @ts-nocheck
"use client";

import { Btn, Empty } from "@/components/ui/ui";
import FilterSelects from "@/components/calendar/FilterSelects";

export default function QuickLibrary({
  categories,
  subcategories,
  filter,
  setFilter,
  filteredLibrary,
  importWorkout,
}) {
  const sortedLibrary = [...filteredLibrary].sort((a, b) => {
    const toMinutes = (value) => {
      const text = String(value || "").toLowerCase();
      const hours = Number(text.match(/(\d+)h/)?.[1] || 0);
      const minutes = Number(text.match(/h(\d+)/)?.[1] || text.match(/(\d+)min/)?.[1] || 0);
      return hours * 60 + minutes;
    };

    return toMinutes(a.totalDuration) - toMinutes(b.totalDuration);
  });

  return (
    <aside className="h-fit rounded-3xl border border-zinc-800 bg-zinc-900 p-3 shadow-xl sm:p-5">
      <h2 className="mb-2 text-xl font-semibold">Bibliothèque rapide</h2>

      <p className="mb-4 text-sm text-zinc-400">
        Importer une séance sur le jour sélectionné.
      </p>

      <FilterSelects {...{ categories, subcategories, filter, setFilter }} />

      <div className="space-y-3">
        {!filteredLibrary.length && <Empty text="Aucune séance." />}

        {sortedLibrary.map((workout) => (
          <div
            key={workout.id}
            className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4"
          >
            <h3 className="font-bold">{workout.title}</h3>

            <p className="text-sm text-zinc-400">
              {workout.totalDuration || "Durée libre"} • {workout.blocks.length}{" "}
              bloc(s)
            </p>

            <Btn
              variant="primary"
              onClick={() => importWorkout(workout)}
              className="mt-3 w-full"
            >
              Importer ce jour
            </Btn>
          </div>
        ))}
      </div>
    </aside>
  );
}