// @ts-nocheck
"use client";

import { sessionLoadParts } from "@/lib/trainingUtils";

export default function WeeklyLoadChart({ weeks }) {
  const activeWeeks = weeks.filter(
    (week) => week.sessions > 0
  );

  if (!activeWeeks.length) {
    return (
      <div className="mt-6 rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-sm text-zinc-400">
        Pas encore assez de données pour afficher un graphique d’évolution.
      </div>
    );
  }

 const rows = activeWeeks.map((week) => {
  const loads = (week.sessionsList || []).reduce(
    (acc, session) => {
      const parts = sessionLoadParts(session);

      if (parts.globalBucket === "green") {
        acc.greenLoad += parts.globalLoad;
      }

      if (parts.globalBucket === "yellow") {
        acc.yellowLoad += parts.globalLoad;
      }

      if (parts.globalBucket === "red") {
        acc.redLoad += parts.globalLoad;
      }

      if (parts.specificBucket === "green") {
        acc.greenLoad += parts.specificBonus;
      }

      if (parts.specificBucket === "yellow") {
        acc.yellowLoad += parts.specificBonus;
      }

      if (parts.specificBucket === "red") {
        acc.redLoad += parts.specificBonus;
      }

      return acc;
    },
    {
      greenLoad: 0,
      yellowLoad: 0,
      redLoad: 0,
    }
  );

  const load =
    loads.greenLoad + loads.yellowLoad + loads.redLoad;

  return {
    week: week.week,
    time: week.time,
    load,
    greenLoad: loads.greenLoad,
    yellowLoad: loads.yellowLoad,
    redLoad: loads.redLoad,
  };
});

  const maxTime = Math.max(
    ...rows.map((row) => row.time),
    1
  );

  return (
    <div className="mt-6 rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
      <div className="mb-4">
        <h3 className="text-xl font-semibold">
          Évolution hebdomadaire
        </h3>

        <p className="text-sm text-zinc-400">
          Temps total et répartition de charge par intensité :
          RPE global + bonus spécifique, calculés séance par séance.
        </p>
      </div>

      <div className="space-y-5">
        {rows.map((row) => (
          <div key={row.week} className="space-y-2">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>{row.week}</span>

              <span>
                {row.time.toFixed(1)} h • charge{" "}
                {row.load.toFixed(1)}
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-white"
                style={{
                  width: `${Math.max(
                    6,
                    (row.time / maxTime) * 100
                  )}%`,
                }}
              />
            </div>

            <div className="h-8 overflow-hidden rounded-full bg-zinc-900">
              <div className="flex h-full w-full">
                {row.greenLoad > 0 && (
                  <div
                    className="flex h-full items-center justify-center bg-emerald-500 text-[10px] font-bold text-white"
                    style={{
                      width: `${
                        (row.greenLoad / row.load) * 100
                      }%`,
                    }}
                  >
                    {Math.round(
                      (row.greenLoad / row.load) * 100
                    )}
                    %
                  </div>
                )}

                {row.yellowLoad > 0 && (
                  <div
                    className="flex h-full items-center justify-center bg-yellow-400 text-[10px] font-bold text-black"
                    style={{
                      width: `${
                        (row.yellowLoad / row.load) * 100
                      }%`,
                    }}
                  >
                    {Math.round(
                      (row.yellowLoad / row.load) * 100
                    )}
                    %
                  </div>
                )}

                {row.redLoad > 0 && (
                  <div
                    className="flex h-full items-center justify-center bg-red-500 text-[10px] font-bold text-white"
                    style={{
                      width: `${
                        (row.redLoad / row.load) * 100
                      }%`,
                    }}
                  >
                    {Math.round(
                      (row.redLoad / row.load) * 100
                    )}
                    %
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-400">
        <span>Blanc = temps total</span>
        <span>Vert = RPE 1-4</span>
        <span>Jaune = RPE 5-8</span>
        <span>Rouge = RPE 9-10</span>
      </div>
    </div>
  );
}