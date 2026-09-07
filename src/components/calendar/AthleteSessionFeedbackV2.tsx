"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { Btn, Field, Input, Select, StatusMessage, Textarea } from "@/components/ui/ui";
import { useReliableMutation } from "@/hooks/use-reliable-mutation";
import { feedbackV2Complete, hasSpecificFeedbackRequirement } from "@/lib/trainingUtils";
import type { CalendarFeedback, CalendarFeedbackV2Result, CalendarSession } from "@/services/calendar-sessions";
import { calendarFeedbackV2Service } from "@/services/calendar-sessions-repository";

type Props = {
  session: CalendarSession;
  specificContext?: string;
  updateSession: (updater: (sessions: CalendarSession[]) => CalendarSession[]) => void;
};

const sensationLabels = [
  "Très mauvaises",
  "Mauvaises",
  "Moyennes",
  "Bonnes",
  "Très bonnes",
];

function durationParts(value: string) {
  const text = String(value || "").toLowerCase().replace(/\s/g, "");
  return {
    hours: text.match(/(\d+)h/)?.[1] || "",
    minutes: text.match(/h(\d+)$/)?.[1] || text.match(/(\d+)min/)?.[1] || "",
  };
}

function formatDuration(hours: string, minutes: string) {
  if (hours && minutes) return `${hours}h${minutes}`;
  if (hours) return `${hours}h`;
  if (minutes) return `${minutes}min`;
  return "";
}

function completeFeedback(session: CalendarSession, feedback: CalendarFeedback) {
  return feedbackV2Complete({ ...session, feedback });
}

function ScoreGrid({
  disabled = false,
  label,
  maximum,
  onChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  maximum: number;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-white">{label}</p>
      <div className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-10" role="radiogroup" aria-label={label}>
        {Array.from({ length: maximum }, (_, index) => String(index + 1)).map((score) => {
          const selected = value === score;
          return (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(score)}
              className={`min-h-11 rounded-lg border text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
                selected
                  ? "border-amber-300 bg-amber-400 text-black"
                  : "border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-zinc-500"
              }`}
            >
              {score}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FeedbackSummary({ feedback, onEdit }: { feedback: CalendarFeedback; onEdit: () => void }) {
  return (
    <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-emerald-100">Retour enregistré</p>
          <p className="mt-1 text-sm text-zinc-300">
            {feedback.actualTime || "—"} · RPE {feedback.rpeGlobal || feedback.rpe || "—"}
            {feedback.rpeSpecific ? ` · Spé ${feedback.rpeSpecific}` : ""}
          </p>
        </div>
        <Btn onClick={onEdit}>Corriger mon retour</Btn>
      </div>
    </div>
  );
}

export default function AthleteSessionFeedbackV2({ session, specificContext = "", updateSession }: Props) {
  const [feedback, setFeedback] = useState<CalendarFeedback>(session.feedback);
  const feedbackRef = useRef(feedback);
  const confirmedFeedbackRef = useRef(session.feedback);
  const [editing, setEditing] = useState(!session.feedback.validated);
  const [message, setMessage] = useState("");
  const requiresSpecific = hasSpecificFeedbackRequirement(session);

  const patchSession = (nextFeedback: CalendarFeedback) => {
    updateSession((sessions) => sessions.map((candidate) => (
      candidate.id === session.id ? { ...candidate, feedback: nextFeedback } : candidate
    )));
  };

  const draftMutation = useReliableMutation<{ next: CalendarFeedback }, CalendarFeedbackV2Result>({
    concurrency: "serial" as const,
    key: `athlete-feedback-v2:${session.id}`,
    onMutate: ({ next }) => {
      const previous = confirmedFeedbackRef.current;
      patchSession(next);
      return () => {
        feedbackRef.current = previous;
        setFeedback(previous);
        patchSession(previous);
      };
    },
    onSuccess: (result) => {
      feedbackRef.current = result.feedback;
      confirmedFeedbackRef.current = result.feedback;
      setFeedback(result.feedback);
      patchSession(result.feedback);
    },
    operation: ({ next }, context) => (
      calendarFeedbackV2Service.saveDraft({ feedback: next, workoutId: session.id }, context.signal)
    ),
    retry: { attempts: 2, delayMs: 500, shouldRetry: (error) => error.kind === "network" },
    timeoutMs: 10_000,
    type: "athlete-feedback-v2.draft.save",
  });

  const completionMutation = useReliableMutation<{ next: CalendarFeedback }, CalendarFeedbackV2Result>({
    concurrency: "reject" as const,
    key: `athlete-feedback-v2:${session.id}`,
    onSuccess: (result) => {
      feedbackRef.current = result.feedback;
      confirmedFeedbackRef.current = result.feedback;
      setFeedback(result.feedback);
      patchSession(result.feedback);
      setEditing(false);
      setMessage("Retour enregistré.");
    },
    operation: ({ next }, context) => (
      calendarFeedbackV2Service.complete({
        feedback: next,
        requiresSpecific,
        workoutId: session.id,
      }, context.signal)
    ),
    retry: { attempts: 2, delayMs: 500, shouldRetry: (error) => error.kind === "network" },
    timeoutMs: 10_000,
    type: "athlete-feedback-v2.complete",
  });

  const setLocalFeedback = (next: CalendarFeedback) => {
    feedbackRef.current = next;
    setFeedback(next);
  };

  const saveDraft = (next = feedbackRef.current) => {
    if (session.feedback.validated || draftMutation.pending || completionMutation.pending) return;
    setMessage("");
    void draftMutation.mutate({ next }).then((result) => {
      if (result.state === "error") setMessage("Impossible d’enregistrer le brouillon. Réessaie.");
    });
  };

  const changeAndSave = (field: keyof CalendarFeedback, value: string) => {
    const next = {
      ...feedbackRef.current,
      [field]: value,
      ...(field === "rpeGlobal" ? { rpe: value } : {}),
    };
    setLocalFeedback(next);
    saveDraft(next);
  };

  const updateDuration = (part: "hours" | "minutes", value: string) => {
    const sanitized = value.replace(/\D/g, "");
    const current = durationParts(feedbackRef.current.actualTime);
    setLocalFeedback({
      ...feedbackRef.current,
      actualTime: formatDuration(
        part === "hours" ? sanitized : current.hours,
        part === "minutes" ? sanitized : current.minutes,
      ),
    });
  };

  const complete = () => {
    const next = feedbackRef.current;
    if (draftMutation.pending || completionMutation.pending) return;
    setMessage("");
    void completionMutation.mutate({ next }).then((result) => {
      if (result.state === "error") setMessage("Impossible d’enregistrer ce retour. Vérifie les champs puis réessaie.");
    });
  };

  if (session.nonDone?.validated) {
    return (
      <StatusMessage variant="info">
        Cette séance est indiquée comme non réalisée. Aucun retour de séance n’est attendu.
      </StatusMessage>
    );
  }

  if (session.feedback.validated && !editing) {
    return <FeedbackSummary feedback={feedback} onEdit={() => setEditing(true)} />;
  }

  const duration = durationParts(feedback.actualTime);
  const ready = completeFeedback(session, feedback);
  const pending = draftMutation.pending || completionMutation.pending;

  return (
    <section className="rounded-xl border border-zinc-700/80 bg-zinc-950/60 p-3 sm:p-4" aria-labelledby={`feedback-title-${session.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h5 id={`feedback-title-${session.id}`} className="font-semibold text-white">Séance terminée</h5>
          <p className="mt-0.5 text-xs text-zinc-400">Ton retour sera visible par ton coach une fois enregistré.</p>
        </div>
        {session.feedback.validated && <span className="text-xs font-medium text-amber-200">Correction</span>}
      </div>

      {message && <StatusMessage className="mt-3" variant={message === "Retour enregistré." ? "success" : "error"}>{message}</StatusMessage>}

      <div className="mt-4 grid gap-4">
        <Field label="Durée réalisée">
          <div className="grid max-w-xs grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2">
            <Input aria-label="Heures réalisées" value={duration.hours} onChange={(event: ChangeEvent<HTMLInputElement>) => updateDuration("hours", event.target.value)} onBlur={() => saveDraft()} inputMode="numeric" placeholder="1" disabled={pending} />
            <span className="text-sm text-zinc-400">h</span>
            <Input aria-label="Minutes réalisées" value={duration.minutes} onChange={(event: ChangeEvent<HTMLInputElement>) => updateDuration("minutes", event.target.value)} onBlur={() => saveDraft()} inputMode="numeric" placeholder="30" disabled={pending} />
            <span className="text-sm text-zinc-400">min</span>
          </div>
        </Field>

        <div>
          <ScoreGrid disabled={pending} label="Difficulté globale /10" maximum={10} value={feedback.rpeGlobal || feedback.rpe} onChange={(value) => changeAndSave("rpeGlobal", value)} />
          <p className="mt-1.5 text-xs text-zinc-400">Pense à toute ta séance.</p>
        </div>

        {requiresSpecific && (
          <div className="border-t border-zinc-800 pt-4">
            <ScoreGrid disabled={pending} label="Difficulté de la partie spécifique /10" maximum={10} value={feedback.rpeSpecific} onChange={(value) => changeAndSave("rpeSpecific", value)} />
            <p className="mt-1.5 text-xs text-zinc-400">Pense uniquement aux efforts spécifiques prévus par ton coach. Partie spécifique prévue : {session.expectedSpecificDuration}.{specificContext ? ` ${specificContext}` : ""}</p>
          </div>
        )}

        <div className="border-t border-zinc-800 pt-4">
          <p className="text-sm font-semibold text-white">Sensations</p>
          <p className="mt-1 text-xs text-zinc-400">Comment tu t’es senti pendant la séance, indépendamment de sa difficulté.</p>
          <div className="mt-2 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Sensations pendant la séance">
            {sensationLabels.map((label, index) => {
              const value = String(index + 1);
              const selected = feedback.sensation === value;
              return <button key={label} type="button" role="radio" aria-checked={selected} aria-label={`${value}: ${label}`} disabled={pending} onClick={() => changeAndSave("sensation", value)} className={`min-h-11 rounded-lg border px-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${selected ? "border-emerald-300 bg-emerald-400 text-black" : "border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-zinc-500"}`}>{value}</button>;
            })}
          </div>
          <div className="mt-1.5 grid grid-cols-5 text-center text-[10px] text-zinc-500"><span className="col-span-2 text-left">Très mauvaises</span><span>Moyennes</span><span className="col-span-2 text-right">Très bonnes</span></div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Motivation avant séance /10">
            <Select value={feedback.motivation} onChange={(event: ChangeEvent<HTMLSelectElement>) => changeAndSave("motivation", event.target.value)} disabled={pending}>
              <option value="">Choisir</option>
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}/10</option>)}
            </Select>
          </Field>
          <Field label="Plaisir pris /5">
            <Select value={feedback.pleasure} onChange={(event: ChangeEvent<HTMLSelectElement>) => changeAndSave("pleasure", event.target.value)} disabled={pending}>
              <option value="">Choisir</option>
              {Array.from({ length: 5 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}/5</option>)}
            </Select>
          </Field>
        </div>

        <details className="border-t border-zinc-800 pt-3">
          <summary className="cursor-pointer text-sm font-medium text-zinc-300">Ajouter un commentaire (facultatif)</summary>
          <div className="mt-3">
            <Field label="Commentaire">
              <Textarea value={feedback.comment} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setLocalFeedback({ ...feedbackRef.current, comment: event.target.value })} onBlur={() => saveDraft()} rows={3} placeholder="Fatigue, douleur éventuelle, ressenti…" disabled={pending} />
            </Field>
          </div>
        </details>
      </div>

      <div className="mt-5 flex flex-col gap-2 border-t border-zinc-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-400">{ready ? "Retour complet. Tu peux l’enregistrer." : "Renseigne la durée, les scores et tes sensations."}</p>
        <Btn variant="primary" onClick={complete} disabled={!ready || pending}>{completionMutation.pending ? "Enregistrement…" : session.feedback.validated ? "Enregistrer la correction" : "Enregistrer mon retour"}</Btn>
      </div>
    </section>
  );
}
