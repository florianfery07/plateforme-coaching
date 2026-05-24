// @ts-nocheck

import { DAYS, statusStyle } from "@/lib/platformDefaults";
import { dateKey, sessionStatus } from "@/lib/trainingUtils";
import { proposalStyle } from "@/lib/proposalUtils";

export default function MonthView({
  days,
  sessionsFor,
  proposalsFor,
  setSelectedDate,
  setMode,
}) {
  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">
        {DAYS.map((day) => (
          <div key={day} className="py-2 text-center text-sm text-zinc-400">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((date, index) => {
          const daySessions = date ? sessionsFor(date) : [];
          const dayProposals = date ? proposalsFor(date) : [];

          return (
            <button
              key={index}
              onClick={() => {
                if (date) {
                  setSelectedDate(date);
                  setMode("day");
                }
              }}
              className={`min-h-20 rounded-xl border p-1 text-left sm:min-h-28 sm:rounded-2xl sm:p-2 ${
                date
                  ? "border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                  : "border-transparent"
              }`}
            >
              {date && (
                <>
                  <div className="text-xs font-bold sm:text-sm">
                    {date.getDate()}
                  </div>

                  <div className="mt-2 space-y-1">
                    {daySessions.slice(0, 2).map((session) => (
                      <div
                        key={session.id}
                        className={`${statusStyle[sessionStatus(session)]} truncate rounded-md px-1 py-1 text-[10px] sm:rounded-lg sm:px-2 sm:text-xs`}
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
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}