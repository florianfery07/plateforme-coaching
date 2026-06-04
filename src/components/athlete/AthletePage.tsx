// @ts-nocheck
"use client";

import { useState } from "react";

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
  const [tab, setTab] = useState("profile");

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-700 bg-zinc-900 p-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab("profile")}
            className={`rounded-2xl px-4 py-3 text-sm font-bold ${
              tab === "profile"
                ? "bg-white text-zinc-950"
                : "bg-zinc-800 text-zinc-300"
            }`}
          >
            Profil athlète
          </button>

          <button
            type="button"
            onClick={() => setTab("stats")}
            className={`rounded-2xl px-4 py-3 text-sm font-bold ${
              tab === "stats"
                ? "bg-white text-zinc-950"
                : "bg-zinc-800 text-zinc-300"
            }`}
          >
            Statistiques
          </button>
        </div>
      </div>

      {tab === "profile" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="space-y-6 xl:col-span-3">
            <AthleteProfilePage
              athlete={a}
              updateAthlete={updateAthlete}
              cpData={cpData}
            />
          </section>
        </div>
      )}

      {tab === "stats" && (
        <div className="grid grid-cols-1 gap-6">
          <AthleteStatsPage
            activeId={activeId}
            calendarYear={calendarYear}
            stats={stats}
            training={training}
            activeSessions={activeSessions}
            weekColors={weekColors}
            setWeekColors={setWeekColors}
            weekNotes={weekNotes}
            setWeekNotes={setWeekNotes}
          />
        </div>
      )}
    </div>
  );
}