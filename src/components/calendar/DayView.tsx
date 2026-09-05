// @ts-nocheck
"use client";

import { Btn, Empty } from "@/components/ui/ui";
import Session from "@/components/calendar/Session";
import AthleteProposalForm from "@/components/calendar/AthleteProposalForm";
import Proposal from "@/components/calendar/Proposal";
import { dateKey } from "@/lib/trainingUtils";
import { getColorClass } from "@/lib/colors";

export default function DayView({
  athleteActive,
  selectedDate,
  setMode,
  sessions,
  proposals,
  cpData,
  addRestDay,
  deleteAthleteWorkoutFromGroupDay,
  deleteGroupDayWorkouts,
  updateFeedback,
  updateNonDone,
  updateSession,
  updateCalendarWorkoutField,
  adjustmentPending = false,
  nonDonePending = false,
  restDayPending = false,
  proposalSchedulingPending = false,
  setProposals,
  programProposal,
  addAthleteProposal,
  isCoach,
  planningTargetType,
  selectedGroup,
  selectedGroupMembers = [],
  athletes = [],
  allAthleteSessions = {},
  onBack = undefined,
  backLabel = "Retour mois",
}) {
  const selectedDateKey = dateKey(selectedDate);
  const groupRows = selectedGroupMembers
    .map((member) => {
      const athlete = athletes.find((item) => item.id === member.athlete_id);
      if (!athlete) return null;

      const daySessions = (allAthleteSessions[member.athlete_id] || []).filter(
        (session) => session.date === selectedDateKey
      );

      return {
        athlete,
        sessions: daySessions,
      };
    })
    .filter(Boolean);

  const groupRowsWithSession = groupRows.filter((row) => row.sessions.length);
  const groupRowsFree = groupRows.filter((row) => !row.sessions.length);

  return (
    <section className="space-y-5" aria-labelledby="calendar-day-title">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 sm:p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-300">Planning du jour</p>
          <h3 id="calendar-day-title" className="text-2xl font-bold sm:text-3xl">
            {selectedDate.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h3>

          <p className="text-sm text-zinc-400">
            Séances et propositions du jour.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          {isCoach && planningTargetType === "group" && (
            <Btn
              variant="danger"
              onClick={() => deleteGroupDayWorkouts?.(selectedDate)}
              className="w-full sm:w-auto"
            >
              Retirer toutes les séances du groupe
            </Btn>
          )}

          {isCoach && (
            <Btn
              onClick={() => addRestDay(selectedDate)}
              disabled={restDayPending}
              aria-label="Marquer repos"
              className="w-full sm:w-auto"
            >
              {restDayPending ? "Ajout du repos..." : "Marquer repos"}
            </Btn>
          )}

          <Btn
            onClick={() => {
              if (onBack) {
                onBack();
                return;
              }

              setMode("month");
            }}
            className="w-full sm:w-auto"
          >
            {backLabel}
          </Btn>
        </div>
        </div>
      </div>

      {planningTargetType === "group" && selectedGroup && (
        <>
          <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-semibold">Athlètes avec séance</h4>
              <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">{groupRowsWithSession.length}</span>
            </div>

            {groupRowsWithSession.length ? (
              <div className="space-y-2">
                {groupRowsWithSession.map(({ athlete, sessions }) => (
                  <div
                    key={athlete.id}
                    className="rounded-2xl border border-zinc-700 bg-zinc-900 p-3"
                  >
                    <div className="mb-2 flex items-center gap-2 font-semibold">
                      <span className={`h-3 w-3 rounded-full ${getColorClass(athlete.color)}`} />
                      <span>{athlete.name}</span>
                    </div>

                    <div className="space-y-1">
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <span className="font-semibold text-white">
                                {session.category || "Séance"}
                              </span>
                              {session.subcategory && (
                                <span> · {session.subcategory}</span>
                              )}
                              {session.title && (
                                <span className="text-zinc-500"> · {session.title}</span>
                              )}
                            </div>

                            {isCoach && (
                              <button
                                type="button"
                                onClick={() => deleteAthleteWorkoutFromGroupDay?.(session)}
                                className="min-h-11 rounded-xl border border-red-500/40 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                              >
                                Retirer pour cet athlète
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="Aucun athlète du groupe n’a de séance ce jour-là." />
            )}
          </div>

          <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-semibold">Athlètes libres</h4>
              <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">{groupRowsFree.length}</span>
            </div>

            {groupRowsFree.length ? (
              <div className="flex flex-wrap gap-2">
                {groupRowsFree.map(({ athlete }) => (
                  <div
                    key={athlete.id}
                    className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                  >
                    <span className={`h-3 w-3 rounded-full ${getColorClass(athlete.color)}`} />
                    <span>{athlete.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="Tous les athlètes du groupe ont déjà une séance ce jour-là." />
            )}
          </div>
        </>
      )}

      {planningTargetType !== "group" && (sessions.length ? (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Session
              key={session.id}
              session={session}
              cpData={cpData}
              updateFeedback={updateFeedback}
              updateNonDone={updateNonDone}
              updateSession={updateSession}
              updateCalendarWorkoutField={updateCalendarWorkoutField}
              adjustmentPending={adjustmentPending}
              nonDonePending={nonDonePending}
              isCoach={isCoach}
            />
          ))}
        </div>
      ) : (
        <Empty text="Aucune séance programmée." />
      ))}

      {planningTargetType !== "group" && !isCoach && (
        <AthleteProposalForm
          selectedDate={selectedDate}
          addAthleteProposal={addAthleteProposal}
        />
      )}

      {planningTargetType !== "group" && !!proposals.length && (
        <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold">Propositions de {athleteActive.name}</h4>
            <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">{proposals.length}</span>
          </div>

          <div className="space-y-2">
            {proposals.map((proposal) => (
              <Proposal
                key={proposal.id}
                proposal={proposal}
                setProposals={setProposals}
                programProposal={programProposal}
                programPending={proposalSchedulingPending}
                isCoach={isCoach}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
