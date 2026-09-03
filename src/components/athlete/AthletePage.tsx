// @ts-nocheck
"use client";

import { useState } from "react";

import AthleteProfilePage from "@/components/athlete/AthleteProfilePage";
import AthleteStatsPage from "@/components/athlete/AthleteStatsPage";
import WeeklyReviewPage from "@/components/athlete/WeeklyReviewPage";

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
  weekPlanning,
  updateWeekPlanning,
  categories,
  subcategories,
  goalsV2Enabled,
  goalsV2State,
  openGoalRequestV2,
  cancelGoalRequestV2,
  acceptGoalRequestV2,
  requestGoalChangesV2,
}) {
  const a = athleteActive;
  const [tab, setTab] = useState("profile");
  const tabs = [
    ["profile", "Profil athlète"],
    ["stats", "Statistiques annuelles"],
    ["weekly", "Suivi hebdo"],
  ];

  const moveTab = (event, key) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

    event.preventDefault();
    const currentIndex = tabs.findIndex(([tabKey]) => tabKey === key);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
      ? tabs.length - 1
      : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    const nextKey = tabs[nextIndex][0];

    setTab(nextKey);
    document.getElementById(`athlete-tab-${nextKey}`)?.focus();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-700 bg-zinc-900 p-3 sm:p-4">
        <div className="mb-4 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Espace coach</p>
            <p className="mt-1 text-sm text-zinc-300">Consultez le suivi, les performances et les réglages de {a?.name || "cet athlète"}.</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${a?.active === false ? "bg-zinc-700 text-zinc-200" : "bg-emerald-500/15 text-emerald-200"}`}>{a?.active === false ? "Athlète archivé" : "Athlète actif"}</span>
        </div>
        <div role="tablist" aria-label="Sections de la fiche athlète" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`athlete-tab-${key}`}
              aria-controls={`athlete-panel-${key}`}
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              onKeyDown={(event) => moveTab(event, key)}
              className={`min-h-11 rounded-2xl px-4 py-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
                tab === key
                  ? "bg-white text-zinc-950"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "profile" && (
        <div role="tabpanel" id="athlete-panel-profile" aria-labelledby="athlete-tab-profile" className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="space-y-6 xl:col-span-3">
            <AthleteProfilePage
              athlete={a}
              updateAthlete={updateAthlete}
              cpData={cpData}
              goalsV2Enabled={goalsV2Enabled}
              goalsV2State={goalsV2State}
              openGoalRequestV2={openGoalRequestV2}
              cancelGoalRequestV2={cancelGoalRequestV2}
              acceptGoalRequestV2={acceptGoalRequestV2}
              requestGoalChangesV2={requestGoalChangesV2}
            />
          </section>
        </div>
      )}

      {tab === "stats" && (
        <div role="tabpanel" id="athlete-panel-stats" aria-labelledby="athlete-tab-stats" className="grid grid-cols-1 gap-6">
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
            categories={categories}
            subcategories={subcategories}
          />
        </div>
      )}

      {tab === "weekly" && (
        <div role="tabpanel" id="athlete-panel-weekly" aria-labelledby="athlete-tab-weekly">
          <WeeklyReviewPage
            sessions={activeSessions}
            athleteId={activeId}
            calendarYear={calendarYear}
            weekColors={weekColors}
            setWeekColors={setWeekColors}
            weekNotes={weekNotes}
            setWeekNotes={setWeekNotes}
            weekPlanning={weekPlanning}
            updateWeekPlanning={updateWeekPlanning}
            categories={categories}
            subcategories={subcategories}
          />
        </div>
      )}
    </div>
  );
}
