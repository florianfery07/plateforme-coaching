// @ts-nocheck

import { DAYS, statusStyle } from "@/lib/platformDefaults";
import {
  sessionStatus,
  weekInfo,
} from "@/lib/trainingUtils";
import { proposalStyle } from "@/lib/proposalUtils";

export default function MonthView({
  days,
  sessionsFor,
  proposalsFor,
  setSelectedDate,
  setMode,
  currentMonth,
}) {
  const rows = [];

  for (let index = 0; index < days.length; index += 7) {
    rows.push(days.slice(index, index + 7));
  }

  return (
    <div>
      <div className="mb-2 grid grid-cols-[44px_repeat(7,minmax(0,1fr))] gap-1 sm:grid-cols-[56px_repeat(7,minmax(0,1fr))] sm:gap-2">
        <div />

        {DAYS.map((day) => (
          <div key={day} className="py-2 text-center text-sm text-zinc-400">
            {day}
          </div>
        ))}
      </div>

      <div className="space-y-1 sm:space-y-2">
        {rows.map((weekDays, rowIndex) => {
          const weekDate = weekDays[0];
          const week = weekInfo(weekDate);

          return (
            <div
              key={rowIndex}
              className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] gap-1 sm:grid-cols-[56px_repeat(7,minmax(0,1fr))] sm:gap-2"
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(weekDate);
                }}
                className="flex min-h-20 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-zinc-300 hover:bg-zinc-800 sm:min-h-28 sm:rounded-2xl sm:text-sm"
                title={`Sélectionner ${week.label}`}
              >
                {week.label}
              </button>

              {weekDays.map((date, index) => {
                const isOutsideMonth = date.getMonth() !== currentMonth;
                const daySessions = sessionsFor(date);
                const dayProposals = proposalsFor(date);

                return (
                  <button
                    key={`${rowIndex}-${index}`}
                    onClick={() => {
                      setSelectedDate(date);
                      setMode("day");
                    }}
                    className={`min-h-20 rounded-xl border p-1 text-left sm:min-h-28 sm:rounded-2xl sm:p-2 ${
                      isOutsideMonth
                        ? "border-zinc-800 bg-zinc-950 text-zinc-600"
                        : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                    }`}
                  >
                    <div className="text-xs font-bold sm:text-sm">
                      {date.getDate()}
                    </div>

                    <div className="mt-2 space-y-1">
                      {daySessions.slice(0, 2).map((session) => (
                        <div
                          key={session.id}
                          className={`${
                            session.category?.toLowerCase() === "repos"
                              ? "bg-blue-500 text-white"
                              : statusStyle[sessionStatus(session)]
                          } truncate rounded-md px-1 py-1 text-[10px] sm:rounded-lg sm:px-2 sm:text-xs`}
                        >
                          {session.title}
                        </div>
                      ))}

                      {dayProposals.slice(0, 2).map((proposal) => (
                        <div
                          key={proposal.id}
                          className={`${proposalStyle(proposal.status)} truncate rounded-md px-1 py-1 text-[10px] sm:rounded-lg sm:px-2 sm:text-xs`}
                        >
                          {proposal.title || proposal.type}
                        </div>
                      ))}

                      {!daySessions.length && !dayProposals.length && (
                        <div className="mt-4 text-xs text-zinc-500">
                          Cliquer pour importer
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}