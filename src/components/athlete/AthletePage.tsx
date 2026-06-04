// @ts-nocheck
"use client";

import Stats from "@/components/athlete/Stats";
import CP from "@/components/athlete/CP";
import AthleteProfilePage from "@/components/athlete/AthleteProfilePage";

export default function AthletePage({
  athleteActive,
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
  const a = athleteActive;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <section className="space-y-6">
        <AthleteProfilePage
          athlete={a}
          updateAthlete={updateAthlete}
        />
      </section>

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
          athlete={a}
          updateAthlete={updateAthlete}
          cpData={cpData}
        />
      </section>
    </div>
  );
}