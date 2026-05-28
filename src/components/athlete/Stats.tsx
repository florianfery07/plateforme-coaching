// @ts-nocheck
"use client";

import { useEffect, useState } from "react";

import {
  avg,
  feedbackDone,
  parseLocalDate,
  trainingStats,
  weekInfoForYear,
} from "@/lib/trainingUtils";

import { CALENDAR_YEARS } from "@/lib/platformDefaults";

import { Btn, Panel, Select } from "@/components/ui/ui";

import StatCard from "@/components/athlete/StatCard";
import WeeklyLoadChart from "@/components/athlete/WeeklyLoadChart";
import WeekPicker from "@/components/athlete/WeekPicker";
import WeekDetail from "@/components/athlete/WeekDetail";

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
  athleteId,
  calendarYear,
  weekColors,
  setWeekColors,
  weekNotes,
  setWeekNotes,
}) {
  const years = getAvailableYears(
  sessions,
  calendarYear
);

  const latestDone = [...sessions]
    .filter((session) =>
      feedbackDone(session.feedback)
    )
    .sort(
      (a, b) =>
        parseLocalDate(b.date).getTime() -
        parseLocalDate(a.date).getTime()
    )[0];

  const latestInfo = latestDone
    ? weekInfoForYear(
        latestDone.date,
        parseLocalDate(
          latestDone.date
        ).getFullYear()
      )
    : null;

  const latestKey = latestDone
    ? `${latestDone.id}-${latestDone.feedback?.validated}-${latestDone.date}`
    : "";

  const [selectedYear, setSelectedYear] =
    useState(
      latestInfo?.year ||
        calendarYear ||
        training.year ||
        years[0]
    );

  const [selectedWeek, setSelectedWeek] =
    useState(
      latestInfo?.label || "S1"
    );

  useEffect(() => {
    if (latestInfo) {
      setSelectedYear(latestInfo.year);
      setSelectedWeek(latestInfo.label);
    }
  }, [latestKey]);

  const activeYear = years.includes(
    Number(selectedYear)
  )
    ? Number(selectedYear)
    : years[0];

  const yearTraining = trainingStats(
    sessions,
    activeYear
  );

  const yearDone =
    yearTraining.doneSessions || [];

  const yearStats = {
    rpe: avg(yearDone, "rpe"),
    motivation: avg(
      yearDone,
      "motivation"
    ),
    pleasure: avg(
      yearDone,
      "pleasure"
    ),
  };

  const week =
    yearTraining.weeks.find(
      (row) =>
        row.week === selectedWeek
    ) || yearTraining.weeks[0];

  const tagKey = `${athleteId}-${activeYear}-${selectedWeek}`;

  const selectedTag =
    weekColors[tagKey] || "Aucun";

  const cards = [
    [
      "Séances prévues",
      yearTraining.planned,
    ],
    [
      "Séances réalisées",
      yearTraining.done,
    ],
    [
      "Temps total",
      `${yearTraining.totals.time.toFixed(
        1
      )} h`,
    ],
    [
      "RPE moyen",
      yearStats.rpe,
    ],
    [
      "Motivation moyenne",
      yearStats.motivation,
    ],
    [
      "Plaisir moyen",
      yearStats.pleasure,
    ],
  ];

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
            Statistiques entraînement de
            l’année
          </h2>

          <p className="mt-1 text-sm text-zinc-400">
            Choisis une année,
            sélectionne une semaine,
            puis ajoute une couleur de
            planification.
          </p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Btn
            onClick={() => {
              if (latestInfo) {
                setSelectedYear(
                  latestInfo.year
                );

                setSelectedWeek(
                  latestInfo.label
                );
              }
            }}
            className={
              !latestInfo
                ? "opacity-40"
                : ""
            }
            disabled={!latestInfo}
          >
            Dernière séance réalisée
          </Btn>

          <Select
            value={activeYear}
            onChange={(event) => {
              setSelectedYear(
                Number(
                  event.target.value
                )
              );

              setSelectedWeek("S1");
            }}
            className="md:w-40"
          >
            {years.map((year) => (
              <option
                key={year}
                value={year}
              >
                {year}
              </option>
            ))}
          </Select>
        </div>
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

      <WeeklyLoadChart
        weeks={yearTraining.weeks}
      />

      <WeekPicker
        weeks={yearTraining.weeks}
        selectedWeek={selectedWeek}
        setSelectedWeek={
          setSelectedWeek
        }
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