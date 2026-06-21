// @ts-nocheck
"use client";

import Stats from "@/components/athlete/Stats";
import AthleteTestsReadOnly from "@/components/athlete/AthleteTestsReadOnly";
import { durationHours, feedbackDone } from "@/lib/trainingUtils";

export default function AthleteStatsPage({
  athlete,
  activeId,
  calendarYear,
  cpData,
  stats,
  training,
  activeSessions,
  weekColors,
  setWeekColors,
  weekNotes,
  setWeekNotes,
  categories,
  subcategories,
}) {
  const todayKey = new Date().toISOString().slice(0, 10);

  const eligibleSessions = activeSessions.filter((session) => {
    const isPastOrToday = session.date <= todayKey;
    const isRest =
      String(session.category || "").toLowerCase() === "repos" ||
      String(session.title || "").toLowerCase() === "repos";

    return isPastOrToday && !isRest;
  });

  const realizedSessions = eligibleSessions.filter((session) =>
    feedbackDone(session.feedback)
  );

  const notDoneSessions = eligibleSessions.filter(
    (session) => session.nonDone?.validated
  );

  const realizedTime = realizedSessions.reduce(
    (sum, session) => sum + durationHours(session.feedback?.actualTime),
    0
  );

  const completionRate = eligibleSessions.length
    ? Math.round((realizedSessions.length / eligibleSessions.length) * 100)
    : 0;

  const formatHours = (value) => {
    const hours = Math.floor(value || 0);
    const minutes = Math.round(((value || 0) - hours) * 60);

    return `${hours}h${String(minutes).padStart(2, "0")}`;
  };

  return (
    <section className="space-y-6 xl:col-span-2">
      <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
        <h2 className="text-2xl font-bold">Mes stats</h2>
        <p className="mt-2 rounded-2xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-300">
          💡 Plus tu complètes précisément tes séances, plus les statistiques affichées ici seront fiables et utiles.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AthleteStatCard
          label="Temps réalisé"
          value={formatHours(realizedTime)}
        />
        <AthleteStatCard
          label="Séances réalisées"
          value={realizedSessions.length}
        />
        <AthleteStatCard
          label="Séances non réalisées"
          value={notDoneSessions.length}
        />
        <AthleteStatCard
          label="Année sportive"
          value={calendarYear}
        />
        <AthleteStatCard
          label="Taux complété"
          value={`${completionRate}%`}
        />
      </div>
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
        categories={categories}
        subcategories={subcategories}
      />
      <AthleteTestsReadOnly
        athlete={athlete}
        athleteId={activeId}
        cpData={cpData}
      />
    </section>
  );
}

function AthleteStatCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}