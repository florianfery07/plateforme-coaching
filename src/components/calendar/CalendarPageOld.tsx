// @ts-nocheck
"use client";

import { Panel } from "@/components/ui/ui";

import CalendarToolbar from "@/components/calendar/CalendarToolbar";
import YearView from "@/components/calendar/YearView";
import MonthView from "@/components/calendar/MonthView";
import DayView from "@/components/calendar/DayView";
import QuickLibrary from "@/components/calendar/QuickLibrary";

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

function formatHours(value) {
  if (!value) return "0h00";

  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);

  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

function WeekLoadSummary({ sessions, selectedDate }) {
  const info = weekInfo(selectedDate);

  const start = weekStart(
    selectedDate.getFullYear(),
    Number(info.label.replace("S", "")) - 1
  );

  const end = addDays(start, 6);

  const weekSessions = sessions.filter((session) => {
    const key = session.date;
    return key >= dateKey(start) && key <= dateKey(end);
  });

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
            {Math.round(plannedLoad)}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
          <div className="text-[11px] text-zinc-400">Charge réalisée</div>
          <div className="mt-1 text-lg font-bold">
            {Math.round(realizedLoad)}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
          <div className="text-[11px] text-zinc-400">Temps prévu</div>
          <div className="mt-1 text-lg font-bold">
            {formatHours(plannedTime)}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
          <div className="text-[11px] text-zinc-400">Temps réalisé</div>
          <div className="mt-1 text-lg font-bold">
            {formatHours(realizedTime)}
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
          <WeekLoadSummary
            sessions={props.activeSessions}
            selectedDate={props.selectedDate}
          />
        )}
      </Panel>

      {props.isCoach && (
        <QuickLibrary {...props} />
      )}
    </div>
  );
}