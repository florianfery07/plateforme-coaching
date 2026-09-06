"use client";

import { useEffect, useMemo, useState } from "react";

import DayView from "@/components/calendar/DayView";
import Proposal from "@/components/calendar/Proposal";
import QuickLibrary from "@/components/calendar/QuickLibrary";
import Session from "@/components/calendar/Session";
import { monthBounds, moveMonthDate, overlapCycleLanes, timelineDayPosition, timelineSpan } from "@/components/calendar/pilotage-month-utils";
import { Badge, Btn, Empty, Field, Input, Panel, Select, StatusMessage, Textarea } from "@/components/ui/ui";
import { useReliableMutation } from "@/hooks/use-reliable-mutation";
import { DAYS, statusLabel } from "@/lib/platformDefaults";
import { createTypedSupabaseClient } from "@/lib/supabase-typed";
import { dateKey, sessionStatus, weekInfo } from "@/lib/trainingUtils";
import { createPilotageTimelineService, createPilotageTimelineSupabaseRepository } from "@/services/pilotage-timeline";

const cycleStyles = {
  blue: "border-sky-300/50 bg-sky-400/20 text-sky-100",
  cyan: "border-cyan-300/50 bg-cyan-400/20 text-cyan-100",
  emerald: "border-emerald-300/50 bg-emerald-400/20 text-emerald-100",
  orange: "border-orange-300/50 bg-orange-400/20 text-orange-100",
  rose: "border-rose-300/50 bg-rose-400/20 text-rose-100",
  violet: "border-violet-300/50 bg-violet-400/20 text-violet-100",
};

const cycleColorNames = {
  blue: "Bleu",
  cyan: "Cyan",
  emerald: "Émeraude",
  orange: "Orange",
  rose: "Rose",
  violet: "Violet",
};

const typeAccent = {
  "course à pied": "border-l-rose-400",
  "cyclo-cross": "border-l-orange-400",
  "home-trainer": "border-l-violet-400",
  "préparation physique": "border-l-zinc-300",
  "repos": "border-l-sky-300",
  route: "border-l-blue-400",
  vtt: "border-l-emerald-400",
};

function safeMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isoDate(date) {
  return dateKey(date);
}

function longDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function shortDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function compactDate(date) {
  return date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function milestoneTiming(value) {
  const today = new Date();
  const target = new Date(`${value}T12:00:00`);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const days = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000);

  if (days < 0) return `Terminé depuis ${Math.abs(days)} j`;
  return `J-${days}`;
}

function typeClass(session) {
  return typeAccent[String(session.category || "").toLowerCase()] || "border-l-zinc-500";
}

function statusText(session) {
  const status = sessionStatus(session);
  return { label: statusLabel[status], status };
}

function CycleLaneTimeline({ cycles, end, onSelect, selectedId, start }) {
  const lanes = overlapCycleLanes(cycles, start, end);
  const days = timelineSpan(start, end);

  if (!lanes.length) {
    return <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 p-3 text-sm text-zinc-400">Aucun cycle sur cette période. Ajoutez-en un pour rendre l’intention du mois visible.</div>;
  }

  return (
    <section aria-labelledby="pilotage-cycles-title" className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/35 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="pilotage-cycles-title" className="font-bold text-white">Cycles et phases</h3>
          <p className="text-xs text-zinc-400">Chaque ligne accueille les périodes qui se chevauchent.</p>
        </div>
        <Badge className="bg-zinc-800 text-zinc-200">{lanes.length} cycle{lanes.length > 1 ? "s" : ""}</Badge>
      </div>
      <div className="space-y-1.5 md:hidden" aria-label="Liste des cycles du mois">
        {lanes.map((cycle) => {
          const selected = cycle.id === selectedId;
          return (
            <button
              key={cycle.id}
              type="button"
              onClick={() => onSelect(cycle)}
              aria-pressed={selected}
              className={`grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-2.5 py-2 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:min-h-10 sm:py-1.5 ${cycleStyles[cycle.colorKey]} ${selected ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-zinc-950" : "hover:brightness-125"}`}
            >
              <span className="min-w-0 truncate text-sm font-bold">{cycle.name}</span>
              <span className="text-xs text-current/80">{shortDate(cycle.startsOn)} - {shortDate(cycle.endsOn)}</span>
            </button>
          );
        })}
      </div>
      <div
        className="hidden min-w-[42rem] gap-1.5 md:grid"
        style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${Math.max(...lanes.map((cycle) => cycle.lane)) + 1}, minmax(2.25rem, auto))` }}
      >
        {lanes.map((cycle) => {
          const column = timelineDayPosition(new Date(`${cycle.visibleStart}T12:00:00`), start);
          const span = timelineSpan(new Date(`${cycle.visibleStart}T12:00:00`), new Date(`${cycle.visibleEnd}T12:00:00`));
          const selected = cycle.id === selectedId;
          return (
            <button
              key={cycle.id}
              type="button"
              onClick={() => onSelect(cycle)}
              aria-pressed={selected}
              style={{ gridColumn: `${column} / span ${span}`, gridRow: cycle.lane + 1 }}
              className={`min-h-9 truncate rounded-md border px-2 text-left text-[11px] font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${cycleStyles[cycle.colorKey]} ${selected ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-zinc-950" : "hover:brightness-125"}`}
              title={`${cycle.name} · ${longDate(cycle.startsOn)} au ${longDate(cycle.endsOn)}`}
            >
              {cycle.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SessionMarker({ onSelect, session, selected }) {
  const { label, status } = statusText(session);
  const compactStatus = {
    awaitingAction: "Retour",
    done: "Fait",
    notDoneJustified: "Non faite",
    planned: "Prévue",
    rest: "Repos",
  }[status];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex min-h-8 w-full items-center gap-1.5 rounded-md border-l-2 bg-zinc-900/60 px-1.5 text-left text-[11px] font-semibold text-zinc-100 transition hover:bg-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${typeClass(session)} ${selected ? "ring-1 ring-amber-300" : ""}`}
      title={`${session.title || "Séance"} · ${label}`}
    >
      <span className="min-w-0 flex-1 truncate">{session.title || "Séance"}</span>
      <span className="shrink-0 text-[9px] font-bold text-zinc-300" aria-label={label}>{compactStatus}</span>
    </button>
  );
}

function MilestoneMarker({ milestone, onSelect, selected }) {
  const label = milestone.kind === "competition" ? "Compétition" : "Objectif";
  return (
    <button
      type="button"
      onClick={() => onSelect(milestone)}
      aria-pressed={selected}
      className={`flex min-h-8 w-full items-center gap-1.5 rounded-md border-l-2 px-1.5 text-left text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${milestone.kind === "competition" ? "border-rose-300 bg-rose-400/10 text-rose-100" : "border-violet-300 bg-violet-400/10 text-violet-100"} ${selected ? "ring-1 ring-amber-300" : "hover:brightness-125"}`}
    >
      <span aria-hidden="true">{milestone.kind === "competition" ? "⚑" : "◎"}</span>
      <span className="min-w-0 flex-1 truncate">{milestone.title}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

function MonthDay({ date, currentMonth, milestones, onOpenDay, onSelectMilestone, onSelectSession, selectedContext, sessions }) {
  const dayKey = isoDate(date);
  const inCurrentMonth = date.getMonth() === currentMonth;
  const isToday = dayKey === isoDate(new Date());
  const visibleSessions = sessions.slice(0, 3);
  const overflow = sessions.length - visibleSessions.length;

  return (
    <article className={`min-h-32 rounded-lg border p-1.5 ${inCurrentMonth ? "border-zinc-800/80 bg-zinc-950/35" : "border-zinc-900 bg-zinc-950/20 text-zinc-600"}`}>
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => onOpenDay(date)}
          aria-current={selectedContext.kind === "day" && selectedContext.dayKey === dayKey ? "date" : undefined}
          className={`min-h-8 rounded-md px-1.5 text-sm font-bold transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${isToday ? "bg-amber-300 text-zinc-950" : ""}`}
          aria-label={`Ouvrir le ${compactDate(date)}`}
        >
          {date.getDate()}
        </button>
        {date.getDay() === 1 && <span className="text-[10px] font-semibold text-zinc-500">{weekInfo(date).label}</span>}
      </div>
      <div className="space-y-1">
        {milestones.map((milestone) => (
          <MilestoneMarker key={milestone.id} milestone={milestone} onSelect={onSelectMilestone} selected={selectedContext.kind === "milestone" && selectedContext.id === milestone.id} />
        ))}
        {visibleSessions.map((session) => (
          <SessionMarker key={session.id} session={session} onSelect={() => onSelectSession(session, date)} selected={selectedContext.kind === "session" && selectedContext.id === session.id} />
        ))}
        {overflow > 0 && <button type="button" onClick={() => onOpenDay(date)} className="min-h-8 w-full rounded-md px-1 text-left text-[11px] font-bold text-zinc-400 transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">+{overflow} séance{overflow > 1 ? "s" : ""}</button>}
        {!milestones.length && !sessions.length && inCurrentMonth && <button type="button" onClick={() => onOpenDay(date)} className="min-h-8 w-full rounded-md px-1 text-left text-[11px] text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">Planifier</button>}
      </div>
    </article>
  );
}

function CycleForm({ cycle, currentGoal, onCancel, onSubmit, pending }) {
  const [draft, setDraft] = useState(() => ({
    colorKey: cycle?.colorKey || "blue",
    endsOn: cycle?.endsOn || "",
    goalVersionId: cycle?.goalVersionId || "",
    intent: cycle?.intent || "",
    name: cycle?.name || "",
    startsOn: cycle?.startsOn || "",
  }));
  const [error, setError] = useState("");

  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    setError("");
    onSubmit({ ...draft, cycleId: cycle?.id, expectedRevision: cycle?.revision }).catch((cause) => setError(safeMessage(cause, "Impossible d’enregistrer le cycle.")));
  };

  return (
    <form onSubmit={submit} className="space-y-3" aria-label={cycle ? "Modifier le cycle" : "Ajouter un cycle"}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-sky-200">Cycle temporel</p><h3 className="mt-1 text-xl font-bold">{cycle ? "Modifier le cycle" : "Ajouter un cycle"}</h3></div><Btn type="button" onClick={onCancel}>Fermer</Btn></div>
      {error && <StatusMessage variant="error">{error}</StatusMessage>}
      <Field label="Nom du cycle"><Input required value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="Préparation générale" /></Field>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Début"><Input required type="date" value={draft.startsOn} onChange={(event) => update("startsOn", event.target.value)} /></Field><Field label="Fin"><Input required type="date" value={draft.endsOn} onChange={(event) => update("endsOn", event.target.value)} /></Field></div>
      <Field label="Couleur du cycle"><Select value={draft.colorKey} onChange={(event) => update("colorKey", event.target.value)}>{Object.entries(cycleColorNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></Field>
      <Field label="Intention coach (facultatif)"><Textarea rows={3} value={draft.intent} onChange={(event) => update("intent", event.target.value)} placeholder="Ce que doit produire cette phase." /></Field>
      {currentGoal && <label className="flex min-h-11 items-start gap-2 rounded-xl border border-zinc-700 bg-zinc-950/50 p-3 text-sm text-zinc-200"><input type="checkbox" checked={draft.goalVersionId === currentGoal.versionId} onChange={(event) => update("goalVersionId", event.target.checked ? currentGoal.versionId : "")} className="mt-1 h-4 w-4 accent-amber-300" /><span>Associer à l’objectif V2 courant : {currentGoal.shortGoal || currentGoal.mediumGoal || currentGoal.longGoal || "Objectif validé"}</span></label>}
      <div className="flex justify-end"><Btn type="submit" variant="primary" disabled={pending}>{pending ? "Enregistrement..." : cycle ? "Enregistrer le cycle" : "Ajouter le cycle"}</Btn></div>
    </form>
  );
}

function MilestoneForm({ currentGoal, milestone, onCancel, onSubmit, pending }) {
  const [draft, setDraft] = useState(() => ({
    details: milestone?.details || "",
    goalVersionId: milestone?.goalVersionId || (milestone?.kind === "goal" ? currentGoal?.versionId || "" : ""),
    kind: milestone?.kind || "competition",
    scheduledFor: milestone?.scheduledFor || "",
    title: milestone?.title || "",
  }));
  const [error, setError] = useState("");
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    setError("");
    onSubmit({ ...draft, goalVersionId: draft.kind === "goal" ? draft.goalVersionId : null, milestoneId: milestone?.id, expectedRevision: milestone?.revision }).catch((cause) => setError(safeMessage(cause, "Impossible d’enregistrer le jalon.")));
  };

  return (
    <form onSubmit={submit} className="space-y-3" aria-label={milestone ? "Modifier le jalon" : "Ajouter un jalon"}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-violet-200">Jalon daté</p><h3 className="mt-1 text-xl font-bold">{milestone ? "Modifier le jalon" : "Ajouter un jalon"}</h3></div><Btn type="button" onClick={onCancel}>Fermer</Btn></div>
      {error && <StatusMessage variant="error">{error}</StatusMessage>}
      <Field label="Type"><Select value={draft.kind} onChange={(event) => update("kind", event.target.value)}><option value="competition">Compétition / événement</option><option value="goal" disabled={!currentGoal}>Objectif V2 {currentGoal ? "accepté" : "indisponible"}</option></Select></Field>
      <Field label="Titre"><Input required value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder={draft.kind === "goal" ? "France CX" : "Manche Coupe de France"} /></Field>
      <Field label="Date"><Input required type="date" value={draft.scheduledFor} onChange={(event) => update("scheduledFor", event.target.value)} /></Field>
      {draft.kind === "goal" && currentGoal && <p className="rounded-xl border border-violet-300/30 bg-violet-400/10 p-3 text-sm text-violet-100">Référence Goals V2 : {currentGoal.shortGoal || currentGoal.mediumGoal || currentGoal.longGoal || "Objectif validé"}.</p>}
      <Field label="Détail (facultatif)"><Textarea rows={3} value={draft.details} onChange={(event) => update("details", event.target.value)} placeholder="Ce qui rend ce jalon important." /></Field>
      <div className="flex justify-end"><Btn type="submit" variant="primary" disabled={pending}>{pending ? "Enregistrement..." : milestone ? "Enregistrer le jalon" : "Ajouter le jalon"}</Btn></div>
    </form>
  );
}

function ContextPanel({ activeContext, addRestDay, currentGoal, cycle, milestone, onArchiveCycle, onArchiveMilestone, onClose, onEditCycle, onEditMilestone, onOpenLibrary, onShowDayDetails, props, selectedDay, selectedSession }) {
  const selectedProposal = activeContext.kind === "proposal" ? props.proposalsFor(selectedDay).find((proposal) => proposal.id === activeContext.id) : null;
  return (
    <aside className="min-w-0 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto" aria-label="Contexte de pilotage">
      <div className="mb-2 flex justify-end"><Btn onClick={onClose}>Fermer le contexte</Btn></div>
      {activeContext.kind === "library" && <QuickLibrary {...props} selectedDate={selectedDay} />}
      {activeContext.kind === "session" && selectedSession && <Session session={selectedSession} cpData={props.cpData} updateFeedback={props.updateFeedback} updateNonDone={props.updateNonDone} updateSession={props.updateSession} updateCalendarWorkoutField={props.updateCalendarWorkoutField} adjustmentPending={props.adjustmentPending} nonDonePending={props.nonDonePending} isCoach />}
      {activeContext.kind === "proposal" && selectedProposal && <Proposal proposal={selectedProposal} setProposals={props.setProposals} programProposal={props.programProposal} programPending={props.proposalSchedulingPending} isCoach />}
      {activeContext.kind === "day" && <Panel><p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Jour sélectionné</p><h3 className="mt-1 text-xl font-bold">{longDate(isoDate(selectedDay))}</h3><p className="mt-1 text-sm text-zinc-400">{props.sessionsFor(selectedDay).length} séance{props.sessionsFor(selectedDay).length > 1 ? "s" : ""} · {props.proposalsFor(selectedDay).length} proposition{props.proposalsFor(selectedDay).length > 1 ? "s" : ""}</p><div className="mt-4 grid gap-2"><Btn variant="primary" onClick={() => onOpenLibrary(selectedDay)}>Programmer depuis la bibliothèque</Btn><Btn onClick={() => addRestDay(selectedDay)} disabled={props.restDayPending}>Marquer repos</Btn><Btn onClick={onShowDayDetails}>Voir le détail du jour</Btn></div></Panel>}
      {activeContext.kind === "cycle" && cycle && <Panel><p className="text-xs font-semibold uppercase tracking-wide text-sky-200">Cycle</p><div className="mt-1 flex flex-wrap items-center justify-between gap-2"><h3 className="text-xl font-bold">{cycle.name}</h3><Badge className={cycleStyles[cycle.colorKey]}>{cycleColorNames[cycle.colorKey]}</Badge></div><p className="mt-2 text-sm text-zinc-400">{longDate(cycle.startsOn)} au {longDate(cycle.endsOn)}</p>{cycle.intent && <p className="mt-4 border-l-2 border-sky-300/60 py-1 pl-3 text-sm leading-6 text-zinc-200">{cycle.intent}</p>}{cycle.goalVersionId && <p className="mt-3 text-sm text-violet-100">Objectif V2 associé</p>}<div className="mt-4 grid gap-2"><Btn variant="primary" onClick={() => onEditCycle(cycle)}>Modifier le cycle</Btn><Btn variant="danger" onClick={() => onArchiveCycle(cycle)}>Archiver le cycle</Btn></div></Panel>}
      {activeContext.kind === "milestone" && milestone && <Panel><p className="text-xs font-semibold uppercase tracking-wide text-violet-200">{milestone.kind === "competition" ? "Compétition" : "Objectif daté"}</p><h3 className="mt-1 text-xl font-bold">{milestone.title}</h3><div className="mt-2 flex flex-wrap items-center gap-2"><p className="text-sm text-zinc-400">{longDate(milestone.scheduledFor)}</p><Badge className="border border-violet-300/40 bg-violet-400/10 text-violet-100">{milestoneTiming(milestone.scheduledFor)}</Badge></div>{milestone.details && <p className="mt-4 border-l-2 border-violet-300/60 py-1 pl-3 text-sm leading-6 text-zinc-200">{milestone.details}</p>}{milestone.goalSummary && <div className="mt-4 space-y-1.5 border-l-2 border-violet-300/60 py-1 pl-3 text-sm text-violet-100"><p className="font-bold">Objectif V2 validé</p>{[["Court terme", milestone.goalSummary.shortGoal], ["Moyen terme", milestone.goalSummary.mediumGoal], ["Long terme", milestone.goalSummary.longGoal]].filter(([, value]) => value).map(([label, value]) => <p key={label}><span className="text-violet-200/70">{label} :</span> {value}</p>)}</div>}{!milestone.goalSummary && milestone.kind === "goal" && currentGoal && <p className="mt-3 text-sm text-violet-100">L’objectif V2 lié n’est plus disponible dans ce contexte.</p>}<div className="mt-4 grid gap-2"><Btn variant="primary" onClick={() => onEditMilestone(milestone)}>Modifier le jalon</Btn><Btn variant="danger" onClick={() => onArchiveMilestone(milestone)}>Archiver le jalon</Btn></div></Panel>}
      {activeContext.kind === "session" && !selectedSession && <Empty text="Cette séance n’est plus disponible." />}
      {activeContext.kind === "proposal" && !selectedProposal && <Empty text="Cette proposition n’est plus disponible." />}
    </aside>
  );
}

export default function CoachPilotageMonth(props) {
  const { activeId, activeSessions = [], athleteActive, goalsV2State, onCreateSession, onShowWeek, planningTargetType, selectedDate, selectedGroup, selectedGroupMembers = [], setSelectedDate } = props;
  const [activeContext, setActiveContext] = useState({ kind: "overview", dayKey: isoDate(selectedDate) });
  const [composer, setComposer] = useState(null);
  const [showDayDetails, setShowDayDetails] = useState(false);
  const [timeline, setTimeline] = useState({ cycles: [], legacyAthleteId: activeId || "", milestones: [] });
  const [timelineError, setTimelineError] = useState("");
  const { days, end, month, start } = monthBounds(selectedDate);
  const rangeStart = isoDate(start);
  const rangeEnd = isoDate(end);
  const service = useMemo(() => createPilotageTimelineService(createPilotageTimelineSupabaseRepository(createTypedSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))), []);
  const selectedDay = new Date(`${activeContext.dayKey || isoDate(selectedDate)}T12:00:00`);
  const selectedSession = activeContext.kind === "session" ? activeSessions.find((session) => session.id === activeContext.id) : null;
  const selectedCycle = activeContext.kind === "cycle" ? timeline.cycles.find((cycle) => cycle.id === activeContext.id) : null;
  const selectedMilestone = activeContext.kind === "milestone" ? timeline.milestones.find((milestone) => milestone.id === activeContext.id) : null;
  const contextIsOpen = activeContext.kind !== "overview" || composer || showDayDetails;

  async function reloadTimeline() {
    if (!activeId) return;
    try {
      const data = await service.get(activeId, rangeStart, rangeEnd);
      setTimeline(data);
      setTimelineError("");
    } catch (cause) {
      setTimeline({ cycles: [], legacyAthleteId: activeId, milestones: [] });
      setTimelineError(safeMessage(cause, "Impossible de charger le pilotage temporel."));
    }
  }

  useEffect(() => {
    let active = true;

    if (!activeId) return () => { active = false; };

    void service.get(activeId, rangeStart, rangeEnd).then(
      (data) => {
        if (!active) return;
        setTimeline(data);
        setTimelineError("");
      },
      (cause) => {
        if (!active) return;
        setTimeline({ cycles: [], legacyAthleteId: activeId, milestones: [] });
        setTimelineError(safeMessage(cause, "Impossible de charger le pilotage temporel."));
      },
    );

    return () => { active = false; };
  }, [activeId, rangeEnd, rangeStart, service]);

  const cycleMutation = useReliableMutation({
    concurrency: "reject",
    key: `pilotage-timeline-cycle:${activeId || "none"}`,
    operation: async (input) => {
      const result = await service.saveCycle(input);
      if (result.kind === "error") throw new Error(result.message);
      return result;
    },
    type: "pilotage-timeline.cycle.save",
  });
  const milestoneMutation = useReliableMutation({
    concurrency: "reject",
    key: `pilotage-timeline-milestone:${activeId || "none"}`,
    operation: async (input) => {
      const result = await service.saveMilestone(input);
      if (result.kind === "error") throw new Error(result.message);
      return result;
    },
    type: "pilotage-timeline.milestone.save",
  });
  const archiveMutation = useReliableMutation({
    concurrency: "reject",
    key: `pilotage-timeline-archive:${activeId || "none"}`,
    operation: async ({ id, kind }) => {
      const result = kind === "cycle" ? await service.archiveCycle(id) : await service.archiveMilestone(id);
      if (result.kind === "error") throw new Error(result.message);
      return result;
    },
    type: "pilotage-timeline.archive",
  });

  const selectDay = (date, kind = "day") => {
    setSelectedDate(date);
    setShowDayDetails(false);
    setComposer(null);
    setActiveContext({ kind, dayKey: isoDate(date) });
  };
  const selectSession = (session, date) => {
    setSelectedDate(date);
    setShowDayDetails(false);
    setComposer(null);
    setActiveContext({ kind: "session", id: session.id, dayKey: isoDate(date) });
  };
  const selectMilestone = (milestone) => {
    setComposer(null);
    setActiveContext({ kind: "milestone", id: milestone.id, dayKey: milestone.scheduledFor });
  };
  const selectCycle = (cycle) => {
    setComposer(null);
    setActiveContext({ kind: "cycle", id: cycle.id, dayKey: cycle.startsOn });
  };
  const openLibrary = (date = selectedDay) => {
    setSelectedDate(date);
    setShowDayDetails(false);
    setComposer(null);
    setActiveContext({ kind: "library", dayKey: isoDate(date) });
  };
  const closeContext = () => {
    setComposer(null);
    setShowDayDetails(false);
    setActiveContext({ kind: "overview", dayKey: isoDate(selectedDate) });
  };
  const submitCycle = async (draft) => {
    const result = await cycleMutation.mutate({
      ...draft,
      goalVersionId: draft.goalVersionId || null,
      idempotencyKey: draft.cycleId ? null : crypto.randomUUID(),
      legacyAthleteId: activeId,
    });
    if (result.state !== "success") throw result.error || new Error("Impossible d’enregistrer le cycle.");
    await reloadTimeline();
    setComposer(null);
  };
  const submitMilestone = async (draft) => {
    const result = await milestoneMutation.mutate({
      ...draft,
      idempotencyKey: draft.milestoneId ? null : crypto.randomUUID(),
      legacyAthleteId: activeId,
    });
    if (result.state !== "success") throw result.error || new Error("Impossible d’enregistrer le jalon.");
    await reloadTimeline();
    setComposer(null);
  };
  const archive = async (item, kind) => {
    const result = await archiveMutation.mutate({ id: item.id, kind });
    if (result.state !== "success") {
      setTimelineError("Impossible d’archiver cet élément de pilotage. Réessayez ou actualisez la page.");
      return;
    }
    setActiveContext({ kind: "overview", dayKey: isoDate(selectedDate) });
    await reloadTimeline();
  };

  if (showDayDetails) {
    return <Panel><DayView {...props} selectedDate={selectedDay} sessions={props.sessionsFor(selectedDay)} proposals={props.proposalsFor(selectedDay)} allAthleteSessions={props.sessions} onBack={() => setShowDayDetails(false)} backLabel="Retour au pilotage mensuel" /></Panel>;
  }

  const milestonesByDay = timeline.milestones.reduce((items, milestone) => ({ ...items, [milestone.scheduledFor]: [...(items[milestone.scheduledFor] || []), milestone] }), {});
  const weeks = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));

  return (
    <section className="space-y-6" aria-labelledby="coach-pilotage-title">
      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-zinc-800/80 pb-3 xl:flex-row xl:items-end xl:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Espace de programmation</p><h2 id="coach-pilotage-title" className="mt-1 text-2xl font-bold sm:text-3xl">Pilotage</h2><p className="mt-1 text-sm text-zinc-400">Lecture moyen terme de {athleteActive?.name || "l’athlète"} · les dates guident la planification.</p></div>
          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap"><Btn aria-label="Mois précédent" onClick={() => { setSelectedDate(moveMonthDate(selectedDate, -1)); closeContext(); }} className="min-w-11 px-3"><span aria-hidden="true">&lt;</span></Btn><Btn onClick={() => { setSelectedDate(new Date()); closeContext(); }}>Aujourd&apos;hui</Btn><Btn aria-label="Mois suivant" onClick={() => { setSelectedDate(moveMonthDate(selectedDate, 1)); closeContext(); }} className="min-w-11 px-3"><span aria-hidden="true">&gt;</span></Btn><Btn variant="primary" onClick={() => openLibrary(selectedDate)}>Programmer</Btn><Btn onClick={onCreateSession}>Créer une séance</Btn></div>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-xl font-bold">{start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h3><p className="text-sm text-zinc-400">Les numéros de semaine complètent les dates, sans les remplacer.</p></div><div role="tablist" aria-label="Vue Pilotage" className="grid grid-cols-2 gap-1 rounded-lg border border-zinc-800 bg-zinc-950/50 p-0.5 sm:inline-flex"><button type="button" role="tab" aria-selected={false} onClick={onShowWeek} className="min-h-11 rounded-md px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:min-h-10 sm:py-1.5">Semaine</button><button type="button" role="tab" aria-selected className="min-h-11 rounded-md bg-white px-3 py-2 text-sm font-semibold text-black sm:min-h-10 sm:py-1.5">Mois</button></div></div>
        {planningTargetType === "group" && <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100" role="status"><span className="font-semibold">Ciblage de programmation : </span>{selectedGroup ? `${selectedGroup.name} (${selectedGroupMembers.length} membre${selectedGroupMembers.length > 1 ? "s" : ""})` : "choisir un groupe"}.<span className="mt-1 block text-amber-100/80">La vue mois reste celle de {athleteActive?.calendarName || "l’athlète actif"}; elle ne construit aucun calendrier groupe agrégé.</span></div>}
      </Panel>

      <div className={contextIsOpen ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]" : "space-y-6"}>
        <Panel className="min-w-0">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-lg font-bold">Structure du mois</h3><p className="text-sm text-zinc-400">Cycles, objectifs et densité de séances sans dupliquer la vue semaine.</p></div><div className="flex flex-wrap gap-1.5"><Btn onClick={() => { setComposer({ kind: "cycle" }); setActiveContext({ kind: "overview", dayKey: isoDate(selectedDate) }); }}>Ajouter un cycle</Btn><Btn onClick={() => { setComposer({ kind: "milestone" }); setActiveContext({ kind: "overview", dayKey: isoDate(selectedDate) }); }}>Ajouter un jalon</Btn></div></div>
          {timelineError && <StatusMessage variant="error" className="mb-4">{timelineError}</StatusMessage>}
          <CycleLaneTimeline cycles={timeline.cycles} start={start} end={end} onSelect={selectCycle} selectedId={selectedCycle?.id} />
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs"><Badge className="border border-sky-300/50 bg-sky-400/20 text-sky-100">Couleur = cycle</Badge><Badge className="border border-violet-300/50 bg-violet-400/10 text-violet-100">◎ Objectif</Badge><Badge className="border border-rose-300/50 bg-rose-400/10 text-rose-100">⚑ Compétition</Badge><Badge className="border border-zinc-700 bg-zinc-950 text-zinc-200">Bordure = type de séance</Badge><Badge className="border border-zinc-700 bg-zinc-950 text-zinc-200">Code court = état</Badge></div>
          <div className="mt-4 space-y-1.5 md:hidden" aria-label="Liste mensuelle adaptée au mobile">{days.filter((date) => date.getMonth() === month).map((date) => { const key = isoDate(date); const sessions = props.sessionsFor(date); const milestones = milestonesByDay[key] || []; return <button key={key} type="button" onClick={() => selectDay(date)} className="grid min-h-14 w-full grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/35 p-2.5 text-left transition hover:border-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"><span className="rounded-md bg-zinc-900 px-1.5 py-1.5 text-center"><span className="block text-[10px] font-semibold uppercase text-zinc-500">{date.toLocaleDateString("fr-FR", { weekday: "short" })}</span><span className="text-base font-bold">{date.getDate()}</span></span><span className="min-w-0"><span className="block truncate text-sm font-bold">{milestones[0]?.title || sessions[0]?.title || "Jour libre"}</span><span className="block truncate text-xs text-zinc-400">{milestones.length} jalon{milestones.length > 1 ? "s" : ""} · {sessions.length} séance{sessions.length > 1 ? "s" : ""}</span></span><span aria-hidden="true" className="text-zinc-500">›</span></button>; })}</div>
          <div className="mt-5 hidden min-w-0 md:block"><div className="mb-2 grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] gap-2"><div aria-hidden="true" />{DAYS.map((day) => <div key={day} className="py-1 text-center text-xs font-semibold text-zinc-400">{day}</div>)}</div><div className="space-y-2">{weeks.map((weekDays) => <div key={isoDate(weekDays[0])} className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] gap-2"><div className="flex items-center justify-center text-[10px] font-semibold text-zinc-500">{weekInfo(weekDays[0]).label}</div>{weekDays.map((date) => <MonthDay key={isoDate(date)} date={date} currentMonth={month} milestones={milestonesByDay[isoDate(date)] || []} onOpenDay={selectDay} onSelectMilestone={selectMilestone} onSelectSession={selectSession} selectedContext={activeContext} sessions={props.sessionsFor(date)} />)}</div>)}</div></div>
        </Panel>
        {contextIsOpen && <div className="min-w-0">{composer?.kind === "cycle" ? <Panel><CycleForm cycle={composer.cycle} currentGoal={goalsV2State?.current} onCancel={closeContext} onSubmit={submitCycle} pending={cycleMutation.pending} /></Panel> : composer?.kind === "milestone" ? <Panel><MilestoneForm milestone={composer.milestone} currentGoal={goalsV2State?.current} onCancel={closeContext} onSubmit={submitMilestone} pending={milestoneMutation.pending} /></Panel> : <ContextPanel activeContext={activeContext} addRestDay={props.addRestDay} currentGoal={goalsV2State?.current} cycle={selectedCycle} milestone={selectedMilestone} onArchiveCycle={(cycle) => archive(cycle, "cycle")} onArchiveMilestone={(milestone) => archive(milestone, "milestone")} onClose={closeContext} onEditCycle={(cycle) => setComposer({ kind: "cycle", cycle })} onEditMilestone={(milestone) => setComposer({ kind: "milestone", milestone })} onOpenLibrary={openLibrary} onShowDayDetails={() => setShowDayDetails(true)} props={props} selectedDay={selectedDay} selectedSession={selectedSession} />}</div>}
      </div>
    </section>
  );
}
