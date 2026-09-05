"use client";

import { useState } from "react";

import { Select, Textarea } from "@/components/ui/ui";
import AthleteBehaviorAnalysis from "@/components/calendar/AthleteBehaviorAnalysis";
import { useWeekNoteAutosave } from "@/hooks/use-week-note-autosave";
import { isReliableMutationsPilotEnabled } from "@/lib/features";
import { feedbackDone, shortDate } from "@/lib/trainingUtils";
import { validateWeekNotePayload } from "@/services/week-notes";
import { weekNoteService } from "@/services/week-notes/week-note-client-service";
import {
  computeWeekLoad,
  weekBounds,
  weekSessionsFor,
} from "@/components/calendar/calendar-week-utils";

const WEEK_GOALS = [
  "Off",
  "Maintien",
  "Récup",
  "Charge",
  "Grosse charge",
  "Affûtage",
  "Affûtage / Course",
];

export default function WeekPlanningTool({
  activeId,
  sessions = [],
  selectedDate,
  subcategories = [],
  weekPlanning = {},
  updateWeekPlanning,
  weekNotes = {},
  setWeekNotes,
  updateWeekNote,
  className = "mt-4",
}) {
  const [open, setOpen] = useState(false);
  const { info, start, end } = weekBounds(selectedDate);
  const selectedYear = selectedDate.getFullYear();
  const selectedKey = `${activeId}-${selectedYear}-${info.label}`;
  const currentPlanning = weekPlanning[selectedKey] || {
    goal: "Off",
    category: "",
    subcategory: "",
  };
  const weekNote = weekNotes[selectedKey] || "";
  const reliableWeekNotePilot =
    isReliableMutationsPilotEnabled() &&
    validateWeekNotePayload({
      athleteId: activeId,
      note: "",
      week: info.label,
      year: selectedYear,
    }) === null;

  const weekNoteAutosave = useWeekNoteAutosave({
    athleteId: activeId,
    enabled: reliableWeekNotePilot,
    legacySave: (value) => updateWeekNote(selectedYear, info.label, value),
    service: weekNoteService,
    week: info.label,
    year: selectedYear,
  });

  function handleWeekNoteChange(value) {
    if (reliableWeekNotePilot) {
      setWeekNotes((items) => ({ ...items, [selectedKey]: value }));
    }

    weekNoteAutosave.save(value);
  }

  const selectedWeekSessions = weekSessionsFor(sessions, start, end);
  const selectedLoad = computeWeekLoad(selectedWeekSessions);
  const similarWeeks = (() => {
    if (!activeId || currentPlanning.goal === "Off") return [];

    const grouped = {};
    sessions.forEach((session) => {
      const date = new Date(session.date);
      const bounds = weekBounds(date);
      const year = date.getFullYear();
      const weekKey = `${activeId}-${year}-${bounds.info.label}`;
      const planning = weekPlanning[weekKey];

      if (!planning || planning.goal !== currentPlanning.goal || weekKey === selectedKey) return;
      grouped[weekKey] ||= [];
      grouped[weekKey].push(session);
    });

    return Object.entries(grouped)
      .map(([weekKey, weekSessions]) => {
        const doneSessions = weekSessions.filter((session) => feedbackDone(session.feedback));
        if (!doneSessions.length) return null;
        return { weekKey, load: computeWeekLoad(weekSessions).realizedLoad };
      })
      .filter((row) => row && row.load > 0);
  })();

  const historicalAverage = similarWeeks.length
    ? similarWeeks.reduce((sum, row) => sum + row.load, 0) / similarWeeks.length
    : null;
  const lowerTarget = historicalAverage ? historicalAverage * 0.9 : null;
  const upperTarget = historicalAverage ? historicalAverage * 1.1 : null;
  const reliabilityLabel = similarWeeks.length === 0
    ? "Pas encore assez d’historique"
    : similarWeeks.length < 3
      ? "Référence indicative"
      : "Référence fiable";
  const comparisonLabel = !historicalAverage
    ? "Aucune comparaison disponible"
    : selectedLoad.plannedLoad < lowerTarget
      ? "Plus faible que les semaines similaires"
      : selectedLoad.plannedLoad > upperTarget
        ? "Plus élevée que les semaines similaires"
        : "Dans la plage habituelle";

  return (
    <section className={`${className} rounded-2xl border border-zinc-700 bg-zinc-900 p-3`} aria-labelledby="week-planning-tool-title">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="week-planning-tool-content"
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
      >
        <span>
          <span id="week-planning-tool-title" className="block text-base font-bold">Outil de charge prévisionnel</span>
          <span className="mt-1 block text-xs text-zinc-500">{info.label} — {shortDate(start)} au {shortDate(end)}</span>
        </span>
        <span aria-hidden="true" className="text-sm font-bold text-zinc-400">{open ? "▼" : "▶"}</span>
      </button>

      {open && (
        <div id="week-planning-tool-content" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-zinc-400">Objectif semaine</div>
              <Select
                value={currentPlanning.goal}
                onChange={(event) => updateWeekPlanning(selectedYear, info.label, "goal", event.target.value)}
              >
                {WEEK_GOALS.map((goal) => <option key={goal} value={goal}>{goal}</option>)}
              </Select>
            </div>
            <div>
              <div className="mb-1 text-xs text-zinc-400">Thème</div>
              <Select
                value={currentPlanning.subcategory}
                onChange={(event) => updateWeekPlanning(selectedYear, info.label, "subcategory", event.target.value)}
              >
                <option value="">Tous</option>
                {subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.name}>{subcategory.name}</option>)}
              </Select>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs text-zinc-400">Idée générale de la semaine</div>
            <Textarea
              value={weekNote}
              onBlur={weekNoteAutosave.flush}
              onChange={(event) => handleWeekNoteChange(event.target.value)}
              rows={3}
              placeholder="Ex : bloc PMA avant objectif, semaine de relance, affûtage avant course..."
            />
            {reliableWeekNotePilot && (
              <div className="mt-2 min-h-5 text-xs">
                {weekNoteAutosave.state.state === "pending" && <p className="text-zinc-400" role="status">Enregistrement...</p>}
                {weekNoteAutosave.state.state === "success" && <p className="text-emerald-400" role="status">Enregistré</p>}
                {weekNoteAutosave.state.state === "error" && (
                  <div className="flex items-center gap-2 text-amber-300" role="alert">
                    <span>Echec de l&apos;enregistrement</span>
                    <button type="button" className="underline underline-offset-2" onClick={weekNoteAutosave.retry}>Reessayer</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <Metric label="Semaines similaires" value={similarWeeks.length} />
            <Metric label="Référence" value={reliabilityLabel} compact />
            <Metric label="Charge habituelle" value={historicalAverage ? Math.round(historicalAverage) : "—"} />
            <Metric label="Plage habituelle" value={historicalAverage ? `${Math.round(lowerTarget)} - ${Math.round(upperTarget)}` : "—"} />
          </div>
          <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
            <div className="text-[11px] text-zinc-400">Lecture</div>
            <div className="mt-1 text-sm font-bold">{comparisonLabel}</div>
          </div>
          <AthleteBehaviorAnalysis sessions={sessions} />
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, compact = false }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
      <div className="text-[11px] text-zinc-400">{label}</div>
      <div className={`mt-1 font-bold ${compact ? "text-sm" : "text-lg"}`}>{value}</div>
    </div>
  );
}
