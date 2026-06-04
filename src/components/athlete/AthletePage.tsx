// @ts-nocheck
"use client";

import AthleteProfilePage from "@/components/athlete/AthleteProfilePage";
import AthleteStatsPage from "@/components/athlete/AthleteStatsPage";

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

      <AthleteStatsPage
        athlete={a}
        activeId={activeId}
        calendarYear={calendarYear}
        updateAthlete={updateAthlete}
        cpData={cpData}
        stats={stats}
        training={training}
        activeSessions={activeSessions}
        weekColors={weekColors}
        setWeekColors={setWeekColors}
        weekNotes={weekNotes}
        setWeekNotes={setWeekNotes}
      />
    </div>
  );
}