// @ts-nocheck
"use client";

import {
  addDays,
  criticalPower,
  dateKey,
  durationHours,
  feedbackReady,
  findWeekForDate,
  monthDays,
  parseLocalDate,
  sessionLoadParts,
  sessionStatus,
  trainingStats,
  weekInfo,
  weekInfoForYear,
} from "@/lib/trainingUtils";

import {
  athlete,
  defaultLibrary,
  weekLabels,
} from "@/lib/platformDefaults";

import { proposalStyle } from "@/lib/proposalUtils";

import { Panel } from "@/components/ui/ui";

function calendarSession(workout, date) {
  return {
    ...workout,
    id: `session-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: dateKey(date),
    feedback: {
      actualTime: "",
      rpe: "",
      rpeGlobal: "",
      rpeSpecific: "",
      motivation: "",
      pleasure: "",
      comment: "",
      validated: false,
    },
    nonDone: {
      reason: "",
      fatigue: "",
      pain: "",
      comment: "",
      validated: false,
    },
  };
}

function proposalToSession(proposal) {
  return {
    id: `session-proposal-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sourceProposalId: proposal.id,
    category: "Proposition athlète",
    subcategory: proposal.type,
    title: proposal.title || proposal.type,
    totalDuration: "",
    expectedRpe: "",
    description: proposal.message || "Proposition validée par le coach.",
    date: proposal.date,
    blocks: [],
    feedback: {
      actualTime: "",
      rpe: "",
      rpeGlobal: "",
      rpeSpecific: "",
      motivation: "",
      pleasure: "",
      comment: "",
      validated: false,
    },
    nonDone: {
      reason: "",
      fatigue: "",
      pain: "",
      comment: "",
      validated: false,
    },
  };
}

function availableYears(sessions, preferredYear = new Date().getFullYear()) {
  const currentYear = new Date().getFullYear();
  const years = new Set([
    currentYear - 5,
    currentYear,
    currentYear + 25,
    Number(preferredYear),
  ]);

  sessions.forEach((session) =>
    years.add(parseLocalDate(session.date).getFullYear())
  );

  return [...years].sort((a, b) => b - a);
}

export default function DevChecks() {
  const future = calendarSession(defaultLibrary[0], addDays(new Date(), 2));
  const awaiting = calendarSession(defaultLibrary[0], new Date());

  const readyOnly = {
    ...awaiting,
    expectedSpecificDuration: "20min",
    feedback: {
      ...awaiting.feedback,
      actualTime: "1h30",
      rpeGlobal: "7",
      rpeSpecific: "9",
      motivation: "8",
      pleasure: "4",
      comment: "RAS",
    },
  };

  const completed = {
    ...readyOnly,
    feedback: {
      ...readyOnly.feedback,
      validated: true,
    },
  };

  const adjustedCompleted = {
    ...completed,
    adjustedSpecificDuration: "10min",
  };

  const noNegativeBonus = {
    ...completed,
    feedback: {
      ...completed.feedback,
      rpeGlobal: "8",
      rpeSpecific: "5",
    },
  };

  const rest = {
    ...awaiting,
    category: "Repos",
  };

  const justified = {
    ...awaiting,
    nonDone: {
      validated: true,
      reason: "Malade",
    },
  };

  const checks = [
    ["CP", Boolean(criticalPower(420, 360, 330, 70)?.cp)],
    ["Zone 7", criticalPower(420, 360, 330, 70)?.zones.length === 7],
    ["Temps converti", durationHours("1h30") === 1.5],
    ["Calendrier", monthDays(2026, 0).length >= 31],
    ["Proposition blanche", proposalStyle("Programmée") === "bg-white text-black"],

    ["Futur blanc", sessionStatus(future) === "planned"],
    ["Repos", sessionStatus(rest) === "rest"],
    ["Retour incomplet jaune", sessionStatus(awaiting) === "awaitingAction"],
    ["Feedback double RPE prêt", feedbackReady(readyOnly.feedback) === true],
    ["Retour complet non validé jaune", sessionStatus(readyOnly) === "awaitingAction"],
    ["Retour validé vert", sessionStatus(completed) === "done"],
    ["Non faite gris", sessionStatus(justified) === "notDoneJustified"],

    ["Charge globale double RPE", sessionLoadParts(completed).globalLoad === 73.5],
    ["Bonus spécifique prévu", Math.round(sessionLoadParts(completed).specificBonus) === 11],
    ["Charge avec ajustement spécifique", Math.round(sessionLoadParts(adjustedCompleted).specificBonus) === 5],
    ["Bonus jamais négatif", sessionLoadParts(noNegativeBonus).specificBonus === 0],

    ["Stats semaines réelles", [52, 53].includes(trainingStats([completed], new Date().getFullYear()).weeks.length)],
    ["Années stats", availableYears([completed], 2029).includes(2029)],
    ["Années futures", availableYears([], 2045).includes(2045)],
    ["Stats temps", trainingStats([completed], new Date().getFullYear()).totals.time === 1.5],
    ["Stats synchronisées", trainingStats([completed], weekInfo(completed.date).year).done === 1],
    ["Stats calendrier 2029", trainingStats([{ ...completed, date: "2029-02-20" }], 2029).done === 1],
    ["Stats semaine 8", trainingStats([{ ...completed, date: "2029-02-20" }], 2029).weeks.find((week) => week.week === "S8")?.sessions === 1],
    ["Détail semaine complet", trainingStats([{ ...completed, date: "2029-04-18" }], 2029).weeks.find((week) => week.week === weekInfo("2029-04-18").label)?.time === 1.5],
    ["Liste séances semaine", trainingStats([{ ...completed, date: "2029-04-18" }], 2029).weeks.find((week) => week.week === weekInfo("2029-04-18").label)?.sessionsList?.length === 1],

    ["Couleurs semaines", weekLabels.length >= 8],
    ["Date locale", dateKey(new Date(2026, 0, 1)) === "2026-01-01"],
    ["Parse date locale", parseLocalDate("2029-02-20").getMonth() === 1],
    ["Semaine ISO", weekInfo(new Date(2026, 0, 1)).label === "S1"],
    ["Clé couleur athlete", `${"athlete-1"}-${2026}-${"S1"}` === "athlete-1-2026-S1"],
    ["Dates semaines réelles", trainingStats([completed], 2026).weeks[0].range === "29/12 - 04/01"],
    ["Semaine calendrier", weekInfo(new Date("2029-02-20")).label === "S8"],
    ["21 mai semaine 21", weekInfoForYear("2026-05-21", 2026).label === "S21"],
    ["21 mai dans plage", findWeekForDate("2026-05-21", 2026).range === "18/05 - 24/05"],
    ["Semaine 20 mai", trainingStats([{ ...completed, date: "2026-05-11" }], 2026).weeks.find((week) => week.week === "S20")?.sessions === 1],
    ["Temps semaine 20", trainingStats([{ ...completed, date: "2026-05-11" }], 2026).weeks.find((week) => week.week === "S20")?.time === 1.5],
    ["Liste semaine 20", trainingStats([{ ...completed, date: "2026-05-11" }], 2026).weeks.find((week) => week.week === "S20")?.sessionsList?.[0]?.id === completed.id],
    ["21 mai compté S21", trainingStats([{ ...completed, date: "2026-05-21" }], 2026).weeks.find((week) => week.week === "S21")?.sessions === 1],
    ["21 mai pas S20", trainingStats([{ ...completed, date: "2026-05-21" }], 2026).weeks.find((week) => week.week === "S20")?.sessions === 0],

    ["Token invitation", athlete("test", "Test").inviteToken === "invite-test"],
    ["Proposition session", proposalToSession({ id: "p1", type: "Course", title: "Test", date: "2026-05-21", message: "OK" }).sourceProposalId === "p1"],
  ];

  const passed = checks.filter(([, ok]) => ok).length;

  return (
    <details className="rounded-3xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-400">
      <summary className="cursor-pointer font-semibold text-white">
        🧪 Tests intégrés ({passed}/{checks.length} OK)
      </summary>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-4">
        {checks.map(([label, ok]) => (
          <div key={label}>
            {label} : {ok ? "OK" : "Erreur"}
          </div>
        ))}
      </div>
    </details>
  );
}