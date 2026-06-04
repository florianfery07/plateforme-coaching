// @ts-nocheck
"use client";

import Stats from "@/components/athlete/Stats";
import CP from "@/components/athlete/CP";

export default function AthleteStatsPage({
  athlete,
  activeId,
  calendarYear,
  updateAthlete,
  cpData,
  stats,
  training,
  activeSessions,
  weekColors,
  setWeekColors,
  weekNotes,
  setWeekNotes,
}) {
  return (
    <section className="space-y-6 xl:col-span-2">
      <Stats
        stats={stats}
        training={training}
        sessions={activeSessions}
        athleteId={activeId}
        calendarYear={calendarYear}
        weekColors={weekColors}
        setWeekColors={setWeekColors}
        weekNotes={weekNotes}
        setWeekNotes={setWeekNotes}
      />

      <CP
        athlete={athlete}
        updateAthlete={updateAthlete}
        cpData={cpData}
      />
    </section>
  );
}