// @ts-nocheck
"use client";

import {
  avg,
  feedbackDone,
  parseLocalDate,
  sessionLoadParts,
  trainingStats,
} from "@/lib/trainingUtils";

import { CALENDAR_YEARS } from "@/lib/platformDefaults";
import { Panel } from "@/components/ui/ui";

import StatCard from "@/components/athlete/StatCard";
import AnnualLoadChart from "@/components/athlete/AnnualLoadChart";

function getAvailableYears(sessions, preferredYear = new Date().getFullYear()) {
  const currentYear = new Date().getFullYear();
  const years = new Set([
    currentYear - 5,
    currentYear,
    currentYear + 25,
    Number(preferredYear),
  ]);

  CALENDAR_YEARS.forEach((year) => years.add(year));

  sessions.forEach((session) =>
    years.add(parseLocalDate(session.date).getFullYear())
  );

  return [...years].sort((a, b) => b - a);
}

export default function Stats({
  training,
  sessions,
  calendarYear,
}) {
  const years = getAvailableYears(sessions, calendarYear);

  const activeYear = years.includes(Number(calendarYear))
    ? Number(calendarYear)
    : years[0];

  const yearTraining = trainingStats(sessions, activeYear);
  const yearDone = yearTraining.doneSessions || [];

  const totalLoad = yearDone.reduce(
    (sum, session) => sum + sessionLoadParts(session).totalLoad,
    0
  );

  const yearStats = {
    rpe: avg(yearDone, "rpe"),
    motivation: avg(yearDone, "motivation"),
    pleasure: avg(yearDone, "pleasure"),
  };

  const cards = [
    ["Séances prévues", yearTraining.planned],
    ["Séances réalisées", yearTraining.done],
    ["Temps total", `${yearTraining.totals.time.toFixed(1)} h`],
    ["Charge totale", totalLoad.toFixed(1)],
    ["RPE moyen", yearStats.rpe],
    ["Motivation moyenne", yearStats.motivation],
    ["Plaisir moyen", yearStats.pleasure],
  ];

  return (
    <Panel>
      <div className="mb-5">
        <h2 className="text-2xl font-semibold">
          Statistiques annuelles
        </h2>

        <p className="mt-1 text-sm text-zinc-400">
          Totaux réalisés sur l'année sélectionnée.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(([label, value]) => (
          <StatCard
            key={label}
            label={label}
            value={value}
          />
        ))}
      </div>

      <AnnualLoadChart weeks={yearTraining.weeks} />
    </Panel>
  );
}