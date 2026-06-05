// @ts-nocheck
"use client";

import { Btn, Empty } from "@/components/ui/ui";
import Session from "@/components/calendar/Session";
import AthleteProposalForm from "@/components/calendar/AthleteProposalForm";
import Proposal from "@/components/calendar/Proposal";

export default function DayView({
  athleteActive,
  selectedDate,
  setMode,
  sessions,
  proposals,
  cpData,
  addRestDay,
  updateFeedback,
  updateNonDone,
  updateSession,
  setProposals,
  programProposal,
  addAthleteProposal,
  isCoach,
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-bold">
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

        <div className="flex flex-wrap gap-2">
  {isCoach && (
    <Btn onClick={() => addRestDay(selectedDate)}>
      Marquer repos
    </Btn>
  )}

  <Btn onClick={() => setMode("month")}>
    Retour mois
  </Btn>
</div>
      </div>

      {sessions.length ? (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Session
              key={session.id}
              session={session}
              cpData={cpData}
              updateFeedback={updateFeedback}
              updateNonDone={updateNonDone}
              updateSession={updateSession}
              isCoach={isCoach}
            />
          ))}
        </div>
      ) : (
        <Empty text="Aucune séance programmée." />
      )}

      {!isCoach && (
        <AthleteProposalForm
          selectedDate={selectedDate}
          addAthleteProposal={addAthleteProposal}
        />
      )}

      {!!proposals.length && (
        <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4">
          <h4 className="mb-3 font-semibold">
            Propositions de {athleteActive.name}
          </h4>

          <div className="space-y-2">
            {proposals.map((proposal) => (
              <Proposal
                key={proposal.id}
                proposal={proposal}
                setProposals={setProposals}
                programProposal={programProposal}
                isCoach={isCoach}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}