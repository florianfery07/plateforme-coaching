import { shortDate } from "@/lib/trainingUtils";
import {
  computeWeekLoad,
  formatHours,
  weekBounds,
  weekSessionsFor,
} from "@/components/calendar/calendar-week-utils";

export default function CalendarWeekSummary({ sessions, selectedDate, className = "mt-4" }) {
  const { info, start, end } = weekBounds(selectedDate);
  const weekSessions = weekSessionsFor(sessions, start, end);
  const load = computeWeekLoad(weekSessions);

  return (
    <section className={`${className} rounded-2xl border border-zinc-700 bg-zinc-900 p-3`} aria-label={`Synthèse de ${info.label}`}>
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-bold">
          {info.label} — {shortDate(start)} au {shortDate(end)}
        </h3>
        <p className="text-xs text-zinc-500">Prévu / réalisé</p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
          <div className="text-[11px] text-zinc-400">Charge prévue</div>
          <div className="mt-1 text-lg font-bold">{Math.round(load.plannedLoad)}</div>
        </div>
        <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
          <div className="text-[11px] text-zinc-400">Charge réalisée</div>
          <div className="mt-1 text-lg font-bold">{Math.round(load.realizedLoad)}</div>
        </div>
        <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
          <div className="text-[11px] text-zinc-400">Temps prévu</div>
          <div className="mt-1 text-lg font-bold">{formatHours(load.plannedTime)}</div>
        </div>
        <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
          <div className="text-[11px] text-zinc-400">Temps réalisé</div>
          <div className="mt-1 text-lg font-bold">{formatHours(load.realizedTime)}</div>
        </div>
      </div>
    </section>
  );
}
