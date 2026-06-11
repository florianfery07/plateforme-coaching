// @ts-nocheck
"use client";

import { useMemo, useState } from "react";

import { Panel, Select, Textarea } from "@/components/ui/ui";

import CalendarToolbar from "@/components/calendar/CalendarToolbar";
import YearView from "@/components/calendar/YearView";
import MonthView from "@/components/calendar/MonthView";
import DayView from "@/components/calendar/DayView";
import QuickLibrary from "@/components/calendar/QuickLibrary";
import AthleteGoalUpdateBanner from "@/components/calendar/AthleteGoalUpdateBanner";
import AthleteNotificationsBanner from "@/components/calendar/AthleteNotificationsBanner";

import {
  addDays,
  dateKey,
  durationHours,
  feedbackDone,
  plannedSessionLoadParts,
  sessionLoadParts,
  shortDate,
  weekInfo,
  weekStart,
} from "@/lib/trainingUtils";

const WEEK_GOALS = [
  "Off",
  "Maintien",
  "Récup",
  "Charge",
  "Grosse charge",
  "Affûtage",
  "Affûtage / Course",
];

function formatHours(value) {
  if (!value) return "0h00";

  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);

  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

function weekBounds(selectedDate) {
  const info = weekInfo(selectedDate);

  const start = weekStart(
    selectedDate.getFullYear(),
    Number(info.label.replace("S", "")) - 1
  );

  const end = addDays(start, 6);

  return { info, start, end };
}

function weekSessionsFor(sessions = [], start, end) {
  return sessions.filter((session) => {
    const key = session.date;
    return key >= dateKey(start) && key <= dateKey(end);
  });
}

function computeWeekLoad(weekSessions = []) {
  const plannedTime = weekSessions.reduce(
    (sum, session) => sum + durationHours(session.totalDuration),
    0
  );

  const doneSessions = weekSessions.filter((session) =>
    feedbackDone(session.feedback)
  );

  const realizedTime = doneSessions.reduce(
    (sum, session) => sum + durationHours(session.feedback?.actualTime),
    0
  );

  const plannedLoad = weekSessions.reduce(
    (sum, session) => sum + plannedSessionLoadParts(session).totalLoad,
    0
  );

  const realizedLoad = doneSessions.reduce(
    (sum, session) => sum + sessionLoadParts(session).totalLoad,
    0
  );

  return {
    plannedTime,
    realizedTime,
    plannedLoad,
    realizedLoad,
  };
}

function PlanningLoadTool({
  activeId,
  sessions = [],
  selectedDate,
  categories = [],
  subcategories = [],
  weekPlanning = {},
  updateWeekPlanning,
  weekNotes = {},
  updateWeekNote,
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

  const selectedWeekSessions = weekSessionsFor(sessions, start, end);
  const selectedLoad = computeWeekLoad(selectedWeekSessions);

  const similarWeeks = useMemo(() => {
    if (!activeId || currentPlanning.goal === "Off") return [];

    const grouped = {};

    sessions.forEach((session) => {
      const date = new Date(session.date);
      const bounds = weekBounds(date);
      const year = date.getFullYear();
      const weekKey = `${activeId}-${year}-${bounds.info.label}`;
      const planning = weekPlanning[weekKey];

      if (!planning) return;
      if (planning.goal !== currentPlanning.goal) return;
      if (currentPlanning.category && planning.category !== currentPlanning.category) return;
      if (currentPlanning.subcategory && planning.subcategory !== currentPlanning.subcategory) return;
      if (weekKey === selectedKey) return;

      grouped[weekKey] ||= [];
      grouped[weekKey].push(session);
    });

    return Object.entries(grouped)
      .map(([weekKey, weekSessions]) => {
        const doneSessions = weekSessions.filter((session) =>
          feedbackDone(session.feedback)
        );

        if (!doneSessions.length) return null;

        const load = computeWeekLoad(weekSessions);

        return {
          weekKey,
          load: load.realizedLoad,
        };
      })
      .filter((row) => row && row.load > 0);
  }, [
    activeId,
    sessions,
    weekPlanning,
    currentPlanning.goal,
    currentPlanning.category,
    currentPlanning.subcategory,
    selectedKey,
  ]);

  const historicalAverage = similarWeeks.length
    ? similarWeeks.reduce((sum, row) => sum + row.load, 0) / similarWeeks.length
    : null;

  const lowerTarget = historicalAverage ? historicalAverage * 0.9 : null;
  const upperTarget = historicalAverage ? historicalAverage * 1.1 : null;

  const reliabilityLabel =
    similarWeeks.length === 0
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
    <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h3 className="text-base font-bold">
            Outil de charge prévisionnel
          </h3>

          <p className="mt-1 text-xs text-zinc-500">
            {info.label} — {shortDate(start)} au {shortDate(end)}
          </p>
        </div>

        <span className="text-sm font-bold text-zinc-400">
          {open ? "▼" : "▶"}
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <div className="mb-1 text-xs text-zinc-400">
                Objectif semaine
              </div>

              <Select
                value={currentPlanning.goal}
                onChange={(event) =>
                  updateWeekPlanning(
                    selectedYear,
                    info.label,
                    "goal",
                    event.target.value
                  )
                }
              >
                {WEEK_GOALS.map((goal) => (
                  <option key={goal} value={goal}>
                    {goal}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <div className="mb-1 text-xs text-zinc-400">
                Discipline
              </div>

              <Select
                value={currentPlanning.category}
                onChange={(event) =>
                  updateWeekPlanning(
                    selectedYear,
                    info.label,
                    "category",
                    event.target.value
                  )
                }
              >
                <option value="">Toutes</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <div className="mb-1 text-xs text-zinc-400">
                Thème
              </div>

              <Select
                value={currentPlanning.subcategory}
                onChange={(event) =>
                  updateWeekPlanning(
                    selectedYear,
                    info.label,
                    "subcategory",
                    event.target.value
                  )
                }
              >
                <option value="">Tous</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.name}>
                    {subcategory.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs text-zinc-400">
              Idée générale de la semaine
            </div>

            <Textarea
              value={weekNote}
              onChange={(event) =>
                updateWeekNote(
                  selectedYear,
                  info.label,
                  event.target.value
                )
              }
              rows={3}
              placeholder="Ex : bloc PMA avant objectif, semaine de relance, affûtage avant course..."
            />
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
              <div className="text-[11px] text-zinc-400">
                Semaines similaires
              </div>
              <div className="mt-1 text-lg font-bold">
                {similarWeeks.length}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
              <div className="text-[11px] text-zinc-400">
                Référence
              </div>
              <div className="mt-1 text-sm font-bold">
                {reliabilityLabel}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
              <div className="text-[11px] text-zinc-400">
                Charge habituelle
              </div>
              <div className="mt-1 text-lg font-bold">
                {historicalAverage ? Math.round(historicalAverage) : "—"}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
              <div className="text-[11px] text-zinc-400">
                Plage habituelle
              </div>
              <div className="mt-1 text-lg font-bold">
                {historicalAverage
                  ? `${Math.round(lowerTarget)} - ${Math.round(upperTarget)}`
                  : "—"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
            <div className="text-[11px] text-zinc-400">
              Lecture
            </div>
            <div className="mt-1 text-sm font-bold">
              {comparisonLabel}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WeekLoadSummary({ sessions, selectedDate }) {
  const { info, start, end } = weekBounds(selectedDate);
  const weekSessions = weekSessionsFor(sessions, start, end);
  const load = computeWeekLoad(weekSessions);

  return (
    <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-3">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-bold">
          {info.label} — {shortDate(start)} au {shortDate(end)}
        </h3>

        <p className="text-xs text-zinc-500">
          Prévu / réalisé
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
          <div className="text-[11px] text-zinc-400">Charge prévue</div>
          <div className="mt-1 text-lg font-bold">
            {Math.round(load.plannedLoad)}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
          <div className="text-[11px] text-zinc-400">Charge réalisée</div>
          <div className="mt-1 text-lg font-bold">
            {Math.round(load.realizedLoad)}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
          <div className="text-[11px] text-zinc-400">Temps prévu</div>
          <div className="mt-1 text-lg font-bold">
            {formatHours(load.plannedTime)}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
          <div className="text-[11px] text-zinc-400">Temps réalisé</div>
          <div className="mt-1 text-lg font-bold">
            {formatHours(load.realizedTime)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPageOld(props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-4">
      <Panel
        className={
          props.isCoach
            ? "xl:col-span-3"
            : "xl:col-span-4"
        }
      >
        {!props.isCoach && (
          <>
            <AthleteGoalUpdateBanner
              athlete={props.athleteActive}
              updateAthlete={props.updateAthlete}
            />

            <AthleteNotificationsBanner
              sessions={props.activeSessions}
            />
          </>
        )}

        <CalendarToolbar {...props} />

        {props.mode === "year" && (
          <YearView
            setMonth={props.setMonth}
            setMode={props.setMode}
          />
        )}

        {props.mode === "month" && (
          <MonthView
            {...props}
            currentMonth={props.month}
          />
        )}

        {props.mode === "day" && (
          <DayView
            {...props}
            sessions={props.sessionsFor(props.selectedDate)}
            proposals={props.proposalsFor(props.selectedDate)}
          />
        )}

        {props.isCoach && (
          <>
            <PlanningLoadTool
              activeId={props.activeId}
              sessions={props.activeSessions}
              selectedDate={props.selectedDate}
              categories={props.categories}
              subcategories={props.subcategories}
              weekPlanning={props.weekPlanning}
              updateWeekPlanning={props.updateWeekPlanning}
              weekNotes={props.weekNotes}
              updateWeekNote={props.updateWeekNote}
            />

            <WeekLoadSummary
              sessions={props.activeSessions}
              selectedDate={props.selectedDate}
            />
          </>
        )}
      </Panel>

      {props.isCoach && (
        <QuickLibrary {...props} />
      )}
    </div>
  );
}