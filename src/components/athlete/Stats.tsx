// @ts-nocheck
"use client";

import {
  avg,
  parseLocalDate,
  sessionLoadParts,
  trainingStats,
} from "@/lib/trainingUtils";

import { CALENDAR_YEARS } from "@/lib/platformDefaults";
import { Field, Panel, Select } from "@/components/ui/ui";

import AnnualLoadChart from "@/components/athlete/AnnualLoadChart";
import TrainingDistribution from "@/components/athlete/TrainingDistribution";
import { useState } from "react";

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
  sessions,
  calendarYear,
  categories,
  subcategories,
}) {
  const years = getAvailableYears(sessions, calendarYear);

const [selectedYear, setSelectedYear] = useState(
  years.includes(Number(calendarYear)) ? Number(calendarYear) : years[0]
);

const activeYear = years.includes(Number(selectedYear))
  ? Number(selectedYear)
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

  return (
    <Panel>
      <div className="mb-6 flex flex-col gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Analyse annuelle</p>
          <h2 className="mt-1 text-2xl font-semibold">Charge et répartition</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">Retrouve la charge réalisée, la tendance de forme et la répartition du temps d’entraînement.</p>
        </div>

        <Field label="Année affichée" className="w-full md:w-40">
          <Select
            value={activeYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={`Repères pour l’année ${activeYear}`}>
        <SummaryCard label="Séances réalisées" value={yearDone.length} />
        <SummaryCard label="Charge totale" value={Math.round(totalLoad)} />
        <SummaryCard label="RPE moyen" value={formatScore(yearStats.rpe)} />
        <SummaryCard label="Plaisir moyen" value={formatScore(yearStats.pleasure)} />
      </div>

      <AnnualLoadChart weeks={yearTraining.weeks} />
      <TrainingDistribution
  sessions={yearDone}
  categories={categories}
  subcategories={subcategories}
/>
    </Panel>
  );
}

function formatScore(value) {
  const score = Number(value);
  return Number.isFinite(score) && score > 0 ? `${score.toFixed(1)} / 10` : "—";
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3 sm:p-4">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-white sm:text-2xl">{value}</p>
    </div>
  );
}
