// @ts-nocheck
"use client";

import { sessionLoadParts } from "@/lib/trainingUtils";

export default function WeeklyLoadChart({ week }) {
  if (!week || week.sessions <= 0) {
    return (
      <div className="mt-6 rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-sm text-zinc-400">
        Pas encore de données pour la semaine sélectionnée.
      </div>
    );
  }

  const loads = (week.sessionsList || []).reduce(
    (acc, session) => {
      const parts = sessionLoadParts(session);

      if (parts.globalBucket === "green") acc.greenLoad += parts.globalLoad;
      if (parts.globalBucket === "yellow") acc.yellowLoad += parts.globalLoad;
      if (parts.globalBucket === "red") acc.redLoad += parts.globalLoad;

      if (parts.specificBucket === "green") acc.greenLoad += parts.specificBonus;
      if (parts.specificBucket === "yellow") acc.yellowLoad += parts.specificBonus;
      if (parts.specificBucket === "red") acc.redLoad += parts.specificBonus;

      return acc;
    },
    {
      greenLoad: 0,
      yellowLoad: 0,
      redLoad: 0,
    }
  );

  const load = loads.greenLoad + loads.yellowLoad + loads.redLoad;

  return (
    <section aria-labelledby="weekly-load-chart-title" className="mt-6 rounded-3xl border border-zinc-700 bg-zinc-800 p-4 sm:p-5">
      <div className="mb-4">
        <h3 id="weekly-load-chart-title" className="text-xl font-semibold">
          Charge de la semaine sélectionnée
        </h3>

        <p className="text-sm text-zinc-400">
          {week.week} • {week.range} • {week.time.toFixed(1)} h • charge{" "}
          {load.toFixed(1)}
        </p>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-zinc-900" role="img" aria-label={`Temps total de la semaine ${week.week}, ${week.time.toFixed(1)} heures`}>
        <div className="h-full rounded-full bg-white" style={{ width: "100%" }} />
      </div>

      <div className="mt-3 h-8 overflow-hidden rounded-full bg-zinc-900" role="img" aria-label={`Répartition de la charge : facile ${Math.round((loads.greenLoad / load) * 100) || 0} pour cent, modérée ${Math.round((loads.yellowLoad / load) * 100) || 0} pour cent, élevée ${Math.round((loads.redLoad / load) * 100) || 0} pour cent`}>
        <div className="flex h-full w-full">
          {loads.greenLoad > 0 && (
            <div
              className="flex h-full items-center justify-center bg-emerald-500 text-[10px] font-bold text-white"
              style={{
                width: `${(loads.greenLoad / load) * 100}%`,
              }}
            >
              {Math.round((loads.greenLoad / load) * 100)}%
            </div>
          )}

          {loads.yellowLoad > 0 && (
            <div
              className="flex h-full items-center justify-center bg-yellow-400 text-[10px] font-bold text-black"
              style={{
                width: `${(loads.yellowLoad / load) * 100}%`,
              }}
            >
              {Math.round((loads.yellowLoad / load) * 100)}%
            </div>
          )}

          {loads.redLoad > 0 && (
            <div
              className="flex h-full items-center justify-center bg-red-500 text-[10px] font-bold text-white"
              style={{
                width: `${(loads.redLoad / load) * 100}%`,
              }}
            >
              {Math.round((loads.redLoad / load) * 100)}%
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-400" aria-label="Légende de la charge hebdomadaire">
        <span>Blanc = temps total semaine</span>
        <span>Vert = charge facile</span>
        <span>Jaune = charge modérée</span>
        <span>Rouge = charge élevée</span>
      </div>
    </section>
  );
}
