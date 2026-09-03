// @ts-nocheck

import { DAYS, statusStyle } from "@/lib/platformDefaults";
import {
  dateKey,
  sessionStatus,
  weekInfo,
} from "@/lib/trainingUtils";
import { proposalStyle } from "@/lib/proposalUtils";
import { getColorClass } from "@/lib/colors";

function sameDay(left, right) {
  return left && right && dateKey(left) === dateKey(right);
}

function dayLabel(date) {
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function DaySummary({
  date,
  currentMonth,
  sessions,
  proposals,
  planningTargetType,
  groupDayAthletes,
  compact = false,
}) {
  const isOutsideMonth = date.getMonth() !== currentMonth;

  if (planningTargetType === "group") {
    if (!groupDayAthletes.length) {
      return <span className="text-xs text-zinc-500">Jour libre</span>;
    }

    return (
      <span className="flex min-w-0 flex-wrap gap-1">
        {groupDayAthletes.slice(0, compact ? 2 : 4).map((athlete) => (
          <span
            key={athlete.id}
            className={`max-w-full truncate rounded-md px-1.5 py-1 text-[10px] font-bold text-white sm:rounded-lg sm:px-2 sm:text-xs ${athlete.color}`}
            title={athlete.name}
          >
            {compact ? athlete.name : athlete.name.slice(0, 4)}
          </span>
        ))}
        {groupDayAthletes.length > (compact ? 2 : 4) && (
          <span className="rounded-md bg-zinc-700 px-1.5 py-1 text-[10px] font-bold text-zinc-200 sm:rounded-lg sm:px-2 sm:text-xs">
            +{groupDayAthletes.length - (compact ? 2 : 4)}
          </span>
        )}
      </span>
    );
  }

  const visibleSessions = sessions.slice(0, compact ? 2 : 2);
  const visibleProposals = proposals.slice(0, compact ? 1 : 2);
  const remaining = sessions.length + proposals.length - visibleSessions.length - visibleProposals.length;

  if (!sessions.length && !proposals.length) {
    return (
      <span className={isOutsideMonth ? "text-xs text-zinc-700" : "text-xs text-zinc-500"}>
        Libre
      </span>
    );
  }

  return (
    <span className="flex min-w-0 flex-col gap-1">
      {visibleSessions.map((session) => (
        <span
          key={session.id}
          className={`${
            session.category?.toLowerCase() === "repos"
              ? "bg-sky-500 text-white"
              : statusStyle[sessionStatus(session)]
          } truncate rounded-md px-1.5 py-1 text-[10px] font-bold sm:rounded-lg sm:px-2 sm:text-xs`}
        >
          {session.title}
        </span>
      ))}
      {visibleProposals.map((proposal) => (
        <span
          key={proposal.id}
          className={`${proposalStyle(proposal.status)} truncate rounded-md px-1.5 py-1 text-[10px] sm:rounded-lg sm:px-2 sm:text-xs`}
        >
          {proposal.title || proposal.type}
        </span>
      ))}
      {remaining > 0 && (
        <span className="text-xs font-semibold text-zinc-400">+{remaining} élément{remaining > 1 ? "s" : ""}</span>
      )}
    </span>
  );
}

export default function MonthView({
  days,
  sessionsFor,
  proposalsFor,
  setSelectedDate,
  setMode,
  selectedDate,
  currentMonth,
  planningTargetType,
  selectedGroupMembers = [],
  athletes = [],
  sessions = {},
}) {
  const rows = [];

  for (let index = 0; index < days.length; index += 7) {
    rows.push(days.slice(index, index + 7));
  }

  const groupDayAthletesFor = (date) => {
    const key = dateKey(date);

    return selectedGroupMembers
      .map((member) => {
        const athlete = athletes.find((item) => item.id === member.athlete_id);
        const athleteSessions = sessions[member.athlete_id] || [];
        const hasSession = athleteSessions.some((session) => session.date === key);

        if (!athlete || !hasSession) return null;

        return {
          id: athlete.id,
          name: athlete.name || athlete.calendarName || "Athlète",
          color: getColorClass(athlete.color),
        };
      })
      .filter(Boolean);
  };

  const openDay = (date) => {
    setSelectedDate(date);
    setMode("day");
  };

  return (
    <section aria-label="Calendrier mensuel" className="min-w-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Planning du mois</h3>
          <p className="text-sm text-zinc-400">Choisis un jour pour consulter ou programmer ses séances.</p>
        </div>
        <span className="hidden rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300 sm:inline-flex">
          Vue mensuelle
        </span>
      </div>

      <div className="space-y-2 md:hidden">
        {days
          .filter((date) => date.getMonth() === currentMonth)
          .map((date) => {
            const daySessions = sessionsFor(date);
            const dayProposals = proposalsFor(date);
            const groupDayAthletes = groupDayAthletesFor(date);
            const count = planningTargetType === "group"
              ? groupDayAthletes.length
              : daySessions.length + dayProposals.length;

            return (
              <button
                key={dateKey(date)}
                type="button"
                onClick={() => openDay(date)}
                aria-current={sameDay(date, selectedDate) ? "date" : undefined}
                aria-label={`Ouvrir ${dayLabel(date)}${count ? `, ${count} élément${count > 1 ? "s" : ""}` : ", jour libre"}`}
                className={`grid min-h-16 w-full grid-cols-[3.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
                  sameDay(date, selectedDate)
                    ? "border-amber-300/70 bg-amber-400/10"
                    : "border-zinc-700 bg-zinc-800 hover:border-zinc-500 hover:bg-zinc-700"
                }`}
              >
                <span className="flex flex-col items-center rounded-xl bg-zinc-950 px-2 py-2 text-center">
                  <span className="text-xs font-semibold uppercase text-zinc-400">{date.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
                  <span className="text-lg font-bold text-white">{date.getDate()}</span>
                </span>
                <DaySummary
                  date={date}
                  currentMonth={currentMonth}
                  sessions={daySessions}
                  proposals={dayProposals}
                  planningTargetType={planningTargetType}
                  groupDayAthletes={groupDayAthletes}
                  compact
                />
                <span aria-hidden="true" className="text-lg text-zinc-500">›</span>
              </button>
            );
          })}
      </div>

      <div className="hidden min-w-0 md:block">
        <div className="mb-2 grid grid-cols-[52px_repeat(7,minmax(0,1fr))] gap-2 lg:grid-cols-[56px_repeat(7,minmax(0,1fr))]">
          <div aria-hidden="true" />
          {DAYS.map((day) => (
            <div key={day} className="py-2 text-center text-sm font-medium text-zinc-400">
              {day}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {rows.map((weekDays, rowIndex) => {
            const weekDate = weekDays[0];
            const week = weekInfo(weekDate);

            return (
              <div
                key={rowIndex}
                className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] gap-2 lg:grid-cols-[56px_repeat(7,minmax(0,1fr))]"
              >
                <button
                  type="button"
                  onClick={() => setSelectedDate(weekDate)}
                  className="flex min-h-28 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 text-xs font-bold text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:text-sm"
                  aria-label={`Sélectionner la semaine ${week.label}`}
                >
                  {week.label}
                </button>

                {weekDays.map((date, index) => {
                  const isOutsideMonth = date.getMonth() !== currentMonth;
                  const daySessions = sessionsFor(date);
                  const dayProposals = proposalsFor(date);
                  const groupDayAthletes = groupDayAthletesFor(date);
                  const isSelected = sameDay(date, selectedDate);
                  const itemCount = planningTargetType === "group"
                    ? groupDayAthletes.length
                    : daySessions.length + dayProposals.length;

                  return (
                    <button
                      key={`${rowIndex}-${index}`}
                      type="button"
                      onClick={() => openDay(date)}
                      aria-current={isSelected ? "date" : undefined}
                      aria-label={`Ouvrir ${dayLabel(date)}${itemCount ? `, ${itemCount} élément${itemCount > 1 ? "s" : ""}` : ", jour libre"}`}
                      className={`flex min-h-28 flex-col rounded-2xl border p-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
                        isOutsideMonth
                          ? "border-zinc-900 bg-zinc-950 text-zinc-600"
                          : isSelected
                            ? "border-amber-300/70 bg-amber-400/10"
                            : "border-zinc-700 bg-zinc-800 hover:border-zinc-500 hover:bg-zinc-700"
                      }`}
                    >
                      <span className="mb-2 text-sm font-bold">{date.getDate()}</span>
                      <DaySummary
                        date={date}
                        currentMonth={currentMonth}
                        sessions={daySessions}
                        proposals={dayProposals}
                        planningTargetType={planningTargetType}
                        groupDayAthletes={groupDayAthletes}
                      />
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
