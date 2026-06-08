// @ts-nocheck
"use client";

import { useEffect, useState } from "react";

import {
  feedbackDone,
  parseLocalDate,
  trainingStats,
  weekInfoForYear,
} from "@/lib/trainingUtils";

import { CALENDAR_YEARS } from "@/lib/platformDefaults";
import { Btn, Panel, Select } from "@/components/ui/ui";

import WeeklyLoadChart from "@/components/athlete/WeeklyLoadChart";
import WeekPicker from "@/components/athlete/WeekPicker";
import WeekDetail from "@/components/athlete/WeekDetail";
import WeekIndicators from "@/components/athlete/WeekIndicators";

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

export default function WeeklyReviewPage({
  sessions,
  athleteId,
  calendarYear,
  weekColors,
  setWeekColors,
  weekNotes,
  setWeekNotes,
}) {
  const years = getAvailableYears(sessions, calendarYear);

  const latestDone = [...sessions]
    .filter((session) => feedbackDone(session.feedback))
    .sort(
      (a, b) =>
        parseLocalDate(b.date).getTime() -
        parseLocalDate(a.date).getTime()
    )[0];

  const latestInfo = latestDone
    ? weekInfoForYear(
        latestDone.date,
        parseLocalDate(latestDone.date).getFullYear()
      )
    : null;

  const latestKey = latestDone
    ? `${latestDone.id}-${latestDone.feedback?.validated}-${latestDone.date}`
    : "";

  const [selectedYear, setSelectedYear] = useState(
    latestInfo?.year || calendarYear || years[0]
  );

  const [selectedWeek, setSelectedWeek] = useState(
    latestInfo?.label || "S1"
  );

  useEffect(() => {
    if (latestInfo) {
      setSelectedYear(latestInfo.year);
      setSelectedWeek(latestInfo.label);
    }
  }, [latestKey]);

  const activeYear = years.includes(Number(selectedYear))
    ? Number(selectedYear)
    : years[0];

  const yearTraining = trainingStats(sessions, activeYear);

  const week =
    yearTraining.weeks.find((row) => row.week === selectedWeek) ||
    yearTraining.weeks[0];

  const tagKey = `${athleteId}-${activeYear}-${selectedWeek}`;
  const selectedTag = weekColors[tagKey] || "Aucun";

  function tagWeek(value) {
    setWeekColors((items) => {
      const next = { ...items };

      if (value === "Aucun") {
        delete next[tagKey];
      } else {
        next[tagKey] = value;
      }

      return next;
    });
  }

  return (
    <Panel>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            Suivi hebdomadaire
          </h2>

          <p className="mt-1 text-sm text-zinc-400">
            Sélectionne une semaine, ajoute une couleur de suivi et complète la note de fin de semaine.
          </p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Btn
            onClick={() => {
              if (latestInfo) {
                setSelectedYear(latestInfo.year);
                setSelectedWeek(latestInfo.label);
              }
            }}
            className={!latestInfo ? "opacity-40" : ""}
            disabled={!latestInfo}
          >
            Dernière séance réalisée
          </Btn>

          <Select
            value={activeYear}
            onChange={(event) => {
              setSelectedYear(Number(event.target.value));
              setSelectedWeek("S1");
            }}
            className="md:w-40"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <WeeklyLoadChart week={week} />
      <WeekIndicators week={week} />

      <WeekPicker
        weeks={yearTraining.weeks}
        selectedWeek={selectedWeek}
        setSelectedWeek={setSelectedWeek}
        selectedYear={activeYear}
        athleteId={athleteId}
        weekColors={weekColors}
      />

      <WeekDetail
        week={week}
        selectedTag={selectedTag}
        tagWeek={tagWeek}
        athleteId={athleteId}
        activeYear={activeYear}
        weekNotes={weekNotes}
        setWeekNotes={setWeekNotes}
      />
    </Panel>
  );
}