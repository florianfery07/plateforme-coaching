"use client";

import { useState } from "react";

import CalendarWeekSummary from "@/components/calendar/CalendarWeekSummary";
import DayView from "@/components/calendar/DayView";
import Proposal from "@/components/calendar/Proposal";
import QuickLibrary from "@/components/calendar/QuickLibrary";
import Session from "@/components/calendar/Session";
import WeekPlanningTool from "@/components/calendar/WeekPlanningTool";
import { Badge, Btn, Empty, Panel } from "@/components/ui/ui";
import { proposalStyle } from "@/lib/proposalUtils";
import { statusLabel, statusStyle } from "@/lib/platformDefaults";
import { addDays, dateKey, sessionStatus, shortDate } from "@/lib/trainingUtils";
import { weekBounds } from "@/components/calendar/calendar-week-utils";

function longDate(date) {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function dayLabel(date) {
  return date.toLocaleDateString("fr-FR", { weekday: "short" });
}

function compactSessionMeta(session) {
  const parts = [session.subcategory || session.category, session.totalDuration].filter(Boolean);
  return parts.join(" · ") || "Séance";
}

function CompactSessionCard({ session, selected, onSelect }) {
  const status = sessionStatus(session);
  const needsFeedback = status === "awaitingAction";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`min-h-16 w-full rounded-xl border p-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
        selected
          ? "border-amber-300 bg-amber-400/10"
          : "border-zinc-700 bg-zinc-950 hover:border-zinc-500 hover:bg-zinc-900"
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-white">{session.title || "Séance"}</span>
          <span className="mt-0.5 block truncate text-xs text-zinc-400">{compactSessionMeta(session)}</span>
        </span>
        <span className={`shrink-0 rounded-md px-1.5 py-1 text-[10px] font-bold ${statusStyle[status]}`}>
          {statusLabel[status]}
        </span>
      </span>
      {needsFeedback && <span className="mt-2 block text-xs font-medium text-amber-200">Retour attendu</span>}
    </button>
  );
}

function CompactProposalCard({ proposal, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`min-h-16 w-full rounded-xl border p-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
        selected
          ? "border-amber-300 bg-amber-400/10"
          : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-semibold text-white">{proposal.title || proposal.type || "Proposition"}</span>
        <span className={`shrink-0 rounded-md px-1.5 py-1 text-[10px] font-bold ${proposalStyle(proposal.status)}`}>
          Proposition
        </span>
      </span>
    </button>
  );
}

function WeekDay({ date, sessions, proposals, selectedDate, activeContext, onSelectDay, onSelectSession, onSelectProposal, onProgram }) {
  const isSelected = dateKey(date) === dateKey(selectedDate);
  const isToday = dateKey(date) === dateKey(new Date());

  return (
    <section className={`min-w-0 rounded-2xl border p-2.5 ${isSelected ? "border-amber-300/70 bg-amber-400/5" : "border-zinc-800 bg-zinc-950/50"}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onSelectDay(date)}
          aria-current={isSelected ? "date" : undefined}
          className="min-h-11 rounded-xl px-2 text-left transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        >
          <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-400">{dayLabel(date)}</span>
          <span className="text-lg font-bold text-white">{date.getDate()}</span>
        </button>
        {isToday && <span className="rounded-full bg-amber-300 px-2 py-1 text-[10px] font-bold text-zinc-950">Aujourd&apos;hui</span>}
      </div>

      <div className="space-y-2">
        {sessions.map((session) => (
          <CompactSessionCard
            key={session.id}
            session={session}
            selected={activeContext.kind === "session" && activeContext.id === session.id}
            onSelect={() => onSelectSession(session, date)}
          />
        ))}
        {proposals.map((proposal) => (
          <CompactProposalCard
            key={proposal.id}
            proposal={proposal}
            selected={activeContext.kind === "proposal" && activeContext.id === proposal.id}
            onSelect={() => onSelectProposal(proposal, date)}
          />
        ))}
        {!sessions.length && !proposals.length && (
          <button
            type="button"
            onClick={() => onProgram(date)}
            className="flex min-h-16 w-full items-center justify-center rounded-xl border border-dashed border-zinc-700 px-3 py-3 text-sm font-semibold text-zinc-400 transition hover:border-zinc-500 hover:bg-zinc-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            Programmer
          </button>
        )}
      </div>
    </section>
  );
}

export default function CoachPilotageWorkspace(props) {
  const {
    activeId,
    activeSessions = [],
    athleteActive,
    cpData,
    selectedDate,
    setSelectedDate,
    sessionsFor,
    proposalsFor,
    planningTargetType,
    selectedGroup,
    selectedGroupMembers = [],
    onCreateSession,
  } = props;
  const [activeContext, setActiveContext] = useState({ kind: "overview", dayKey: dateKey(selectedDate) });
  const [showDayDetails, setShowDayDetails] = useState(false);
  const { info, start, end } = weekBounds(selectedDate);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const selectedDay = days.find((day) => dateKey(day) === activeContext.dayKey) || selectedDate;
  const selectedSession = activeContext.kind === "session"
    ? activeSessions.find((session) => session.id === activeContext.id)
    : null;
  const selectedProposal = activeContext.kind === "proposal"
    ? proposalsFor(selectedDay).find((proposal) => proposal.id === activeContext.id)
    : null;
  const contextIsOpen = activeContext.kind !== "overview" || showDayDetails;

  function selectDay(date, kind = "day") {
    setSelectedDate(date);
    setShowDayDetails(false);
    setActiveContext({ kind, dayKey: dateKey(date) });
  }

  function selectSession(session, date) {
    setSelectedDate(date);
    setShowDayDetails(false);
    setActiveContext({ kind: "session", id: session.id, dayKey: dateKey(date) });
  }

  function selectProposal(proposal, date) {
    setSelectedDate(date);
    setShowDayDetails(false);
    setActiveContext({ kind: "proposal", id: proposal.id, dayKey: dateKey(date) });
  }

  function openLibrary(date = selectedDay) {
    setSelectedDate(date);
    setShowDayDetails(false);
    setActiveContext({ kind: "library", dayKey: dateKey(date) });
  }

  function moveWeek(offset) {
    const nextDate = addDays(start, offset * 7);
    setSelectedDate(nextDate);
    setShowDayDetails(false);
    setActiveContext({ kind: "overview", dayKey: dateKey(nextDate) });
  }

  if (showDayDetails) {
    return (
      <Panel>
        <DayView
          {...props}
          selectedDate={selectedDay}
          sessions={sessionsFor(selectedDay)}
          proposals={proposalsFor(selectedDay)}
          allAthleteSessions={props.sessions}
          onBack={() => setShowDayDetails(false)}
          backLabel="Retour au pilotage"
        />
      </Panel>
    );
  }

  return (
    <section className="space-y-4" aria-labelledby="coach-pilotage-title">
      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-zinc-800 pb-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Espace de programmation</p>
            <h2 id="coach-pilotage-title" className="mt-1 text-2xl font-bold sm:text-3xl">Pilotage</h2>
            <p className="mt-1 text-sm text-zinc-400">{info.label} · {longDate(start)} au {longDate(end)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Btn aria-label="Semaine précédente" onClick={() => moveWeek(-1)} className="min-w-11 px-3"><span aria-hidden="true">&lt;</span></Btn>
            <Btn onClick={() => selectDay(new Date())}>Aujourd&apos;hui</Btn>
            <Btn aria-label="Semaine suivante" onClick={() => moveWeek(1)} className="min-w-11 px-3"><span aria-hidden="true">&gt;</span></Btn>
            <Btn variant="primary" onClick={() => openLibrary(selectedDate)}>Programmer</Btn>
            <Btn onClick={onCreateSession}>Créer une séance</Btn>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <Badge className="bg-white text-black">Programmée</Badge>
          <Badge className="bg-yellow-400 text-black">Retour attendu</Badge>
          <Badge className="bg-emerald-500 text-white">Réalisée</Badge>
          <Badge className="bg-blue-500 text-white">Repos</Badge>
          <Badge className="bg-zinc-700 text-white">Non faite justifiée</Badge>
        </div>

        {planningTargetType === "group" && (
          <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100" role="status">
            <span className="font-semibold">Ciblage de programmation : </span>
            {selectedGroup ? `${selectedGroup.name} (${selectedGroupMembers.length} membre${selectedGroupMembers.length > 1 ? "s" : ""})` : "choisir un groupe"}.
            <span className="block mt-1 text-amber-100/80">Le calendrier conserve la lecture de {athleteActive?.calendarName || "l’athlète actif"}; aucune vue groupe agrégée n’est fabriquée ici.</span>
          </div>
        )}
      </Panel>

      <div className={contextIsOpen ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]" : "space-y-4"}>
        <Panel className="min-w-0">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-bold">Semaine de {athleteActive?.name || "l’athlète"}</h3>
              <p className="text-sm text-zinc-400">Sélectionne une séance pour ses détails, ou un jour pour programmer.</p>
            </div>
            <button
              type="button"
              onClick={() => selectDay(selectedDate)}
              className="min-h-11 rounded-xl border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            >
              {shortDate(selectedDate)} sélectionné
            </button>
          </div>

          <div className="space-y-3 lg:hidden" aria-label="Jours de la semaine">
            {days.map((date) => (
              <WeekDay
                key={dateKey(date)}
                date={date}
                sessions={sessionsFor(date)}
                proposals={proposalsFor(date)}
                selectedDate={selectedDate}
                activeContext={activeContext}
                onSelectDay={selectDay}
                onSelectSession={selectSession}
                onSelectProposal={selectProposal}
                onProgram={openLibrary}
              />
            ))}
          </div>
          <div className="hidden min-w-0 gap-2 lg:grid lg:grid-cols-7" aria-label="Semaine de programmation">
            {days.map((date) => (
              <WeekDay
                key={dateKey(date)}
                date={date}
                sessions={sessionsFor(date)}
                proposals={proposalsFor(date)}
                selectedDate={selectedDate}
                activeContext={activeContext}
                onSelectDay={selectDay}
                onSelectSession={selectSession}
                onSelectProposal={selectProposal}
                onProgram={openLibrary}
              />
            ))}
          </div>
        </Panel>

        {contextIsOpen && (
          <aside className="min-w-0 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto" aria-label="Contexte de programmation">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => { setShowDayDetails(false); setActiveContext({ kind: "overview", dayKey: dateKey(selectedDate) }); }}
                className="min-h-11 rounded-xl border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
              >
                Fermer le contexte
              </button>
            </div>

            {activeContext.kind === "library" && <QuickLibrary {...props} selectedDate={selectedDay} />}

            {activeContext.kind === "session" && selectedSession && (
              <Session
                session={selectedSession}
                cpData={cpData}
                updateFeedback={props.updateFeedback}
                updateNonDone={props.updateNonDone}
                updateSession={props.updateSession}
                updateCalendarWorkoutField={props.updateCalendarWorkoutField}
                adjustmentPending={props.adjustmentPending}
                nonDonePending={props.nonDonePending}
                isCoach
              />
            )}

            {activeContext.kind === "proposal" && selectedProposal && (
              <Proposal
                proposal={selectedProposal}
                setProposals={props.setProposals}
                programProposal={props.programProposal}
                programPending={props.proposalSchedulingPending}
                isCoach
              />
            )}

            {activeContext.kind === "day" && (
              <Panel>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Jour sélectionné</p>
                <h3 className="mt-1 text-xl font-bold">{longDate(selectedDay)}</h3>
                <p className="mt-1 text-sm text-zinc-400">{sessionsFor(selectedDay).length} séance{sessionsFor(selectedDay).length > 1 ? "s" : ""} · {proposalsFor(selectedDay).length} proposition{proposalsFor(selectedDay).length > 1 ? "s" : ""}</p>
                <div className="mt-4 grid gap-2">
                  <Btn variant="primary" onClick={() => openLibrary(selectedDay)}>Programmer depuis la bibliothèque</Btn>
                  <Btn onClick={() => props.addRestDay(selectedDay)} disabled={props.restDayPending}>Marquer repos</Btn>
                  <Btn onClick={() => setShowDayDetails(true)}>Voir le détail du jour</Btn>
                </div>
              </Panel>
            )}

            {activeContext.kind === "session" && !selectedSession && <Empty text="Cette séance n’est plus disponible." />}
            {activeContext.kind === "proposal" && !selectedProposal && <Empty text="Cette proposition n’est plus disponible." />}
          </aside>
        )}
      </div>

      <CalendarWeekSummary sessions={activeSessions} selectedDate={selectedDate} className="" />
      <WeekPlanningTool
        activeId={activeId}
        sessions={activeSessions}
        selectedDate={selectedDate}
        subcategories={props.subcategories}
        weekPlanning={props.weekPlanning}
        updateWeekPlanning={props.updateWeekPlanning}
        weekNotes={props.weekNotes}
        setWeekNotes={props.setWeekNotes}
        updateWeekNote={props.updateWeekNote}
        className=""
      />
    </section>
  );
}
