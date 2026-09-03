"use client";

import { useRef, useState, type ChangeEvent } from "react";

import type { GoalHistoryItem, GoalRequestStatus, GoalState } from "@/services/goals-v2";
import { Badge, Btn, Field, Panel, StatusMessage, Textarea } from "@/components/ui/ui";

type GoalDraft = {
  longGoal: string;
  mediumGoal: string;
  shortGoal: string;
};

type CoachGoalsV2PanelProps = {
  onAccept: (requestId: string, reviewNote: string) => Promise<void>;
  onCancel: (requestId: string) => Promise<void>;
  onOpen: () => Promise<void>;
  onRequestChanges: (requestId: string, reviewNote: string) => Promise<void>;
  state: GoalState;
};

type AthleteGoalsV2PanelProps = {
  onSubmit: (requestId: string, draft: GoalDraft) => Promise<void>;
  state: GoalState;
};

function message(error: unknown): string {
  return error instanceof Error ? error.message : "La modification des objectifs a échoué.";
}

function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

function GoalValues({ item }: { item: Pick<GoalHistoryItem, "shortGoal" | "mediumGoal" | "longGoal"> }) {
  return (
    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
      {[
        ["Court terme", item.shortGoal],
        ["Moyen terme", item.mediumGoal],
        ["Long terme", item.longGoal],
      ].map(([label, value]) => (
        <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          <div className="mb-1 text-xs text-zinc-500">{label}</div>
          <div className="text-zinc-100">{value || "—"}</div>
        </div>
      ))}
    </div>
  );
}

function GoalHistory({ history }: { history: GoalHistoryItem[] }) {
  return (
    <section aria-labelledby="goals-v2-history" className="mt-5 border-t border-zinc-800 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="goals-v2-history" className="text-lg font-semibold">Historique immuable</h3><p className="mt-1 text-sm text-zinc-400">Chaque version est conservée, avec sa décision de revue.</p></div><Badge className="bg-zinc-800 text-zinc-300">{history.length} version{history.length > 1 ? "s" : ""}</Badge></div>
      <div className="mt-4 space-y-3">
        {history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">Aucune version V2 pour le moment.</p>
        ) : history.map((item) => (
          <article key={item.versionId} className="rounded-2xl border border-zinc-700 bg-zinc-950/40 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
              <span>Version {item.revisionNumber} · {formatDate(item.submittedAt)}</span>
              <Badge className={item.reviewOutcome === "accepted" ? "bg-emerald-500/15 text-emerald-200" : item.reviewOutcome === "changes_requested" ? "bg-amber-500/15 text-amber-100" : "bg-zinc-800 text-zinc-300"}>{item.reviewOutcome === "accepted" ? "Validée" : item.reviewOutcome === "changes_requested" ? "Modifications demandées" : "En attente"}</Badge>
            </div>
            <GoalValues item={item} />
            {item.reviewNote && <p className="mt-3 text-sm text-amber-100">Retour coach : {item.reviewNote}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function requestPresentation(status: Exclude<GoalRequestStatus, "accepted" | "cancelled">) {
  const presentations = {
    requested: { action: "Action athlète", description: "La demande est ouverte : l’athlète doit maintenant proposer ses objectifs.", label: "Demande envoyée" },
    submitted: { action: "Action coach", description: "Une version est disponible. Acceptez-la ou demandez des modifications.", label: "À valider" },
    changes_requested: { action: "Action athlète", description: "Le coach a demandé une nouvelle version des objectifs.", label: "Modifications demandées" },
  } as const;

  return presentations[status as keyof typeof presentations];
}

function useSingleAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lockRef = useRef(false);

  async function run(action: () => Promise<void>) {
    if (lockRef.current) return;
    lockRef.current = true;
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(message(cause));
    } finally {
      lockRef.current = false;
      setPending(false);
    }
  }

  return { error, pending, run };
}

export function CoachGoalsV2Panel({ state, onOpen, onCancel, onAccept, onRequestChanges }: CoachGoalsV2PanelProps) {
  const [reviewNote, setReviewNote] = useState("");
  const action = useSingleAction();
  const request = state.openRequest;

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-200">Pilote sécurisé</p>
          <h2 className="mt-1 text-2xl font-semibold">Objectifs V2</h2>
          <p className="mt-1 text-sm text-zinc-400">L’objectif courant ne change qu’après votre validation explicite.</p>
        </div>
        {!request && <Btn disabled={action.pending} onClick={() => action.run(onOpen)}>{action.pending ? "Création..." : "Demander une mise à jour"}</Btn>}
      </div>

      {action.error && <StatusMessage variant="error" className="mt-4">{action.error}</StatusMessage>}

      {state.current && (
        <section aria-labelledby="current-goal-v2" className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="mb-3 flex items-center justify-between gap-3"><div id="current-goal-v2" className="font-semibold text-emerald-100">Objectif actuellement validé</div><Badge className="bg-emerald-500/20 text-emerald-100">Courant</Badge></div>
          <GoalValues item={state.current} />
        </section>
      )}

      {request && (
        <OpenGoalRequest requestState={requestPresentation(request.status)}>
          {request.reviewNote && <p className="mt-2 text-sm text-amber-100">Retour : {request.reviewNote}</p>}
          {request.latestVersion && <div className="mt-4"><GoalValues item={request.latestVersion} /></div>}
          {request.status === "submitted" && (
            <div className="mt-4 space-y-3">
              <Field label="Retour au sportif (obligatoire pour demander des modifications)">
                <Textarea value={reviewNote} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setReviewNote(event.target.value)} rows={3} />
              </Field>
              <div className="flex flex-wrap gap-3">
                <Btn disabled={action.pending} onClick={() => action.run(() => onAccept(request.requestId, reviewNote))}>{action.pending ? "Validation..." : "Accepter cette version"}</Btn>
                <Btn variant="secondary" disabled={action.pending} onClick={() => action.run(() => onRequestChanges(request.requestId, reviewNote))}>Demander des modifications</Btn>
              </div>
            </div>
          )}
          <Btn variant="danger" disabled={action.pending} onClick={() => action.run(() => onCancel(request.requestId))} className="mt-4">Annuler la demande</Btn>
        </OpenGoalRequest>
      )}

      <GoalHistory history={state.history} />
    </Panel>
  );
}

function OpenGoalRequest({ children, requestState }: { children: React.ReactNode; requestState: ReturnType<typeof requestPresentation> }) {
  return (
    <section aria-labelledby="open-goal-request" className="mt-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-200">{requestState.action}</p><h3 id="open-goal-request" className="mt-1 font-bold text-amber-100">{requestState.label}</h3><p className="mt-1 text-sm text-amber-100">{requestState.description}</p></div><Badge className="w-fit bg-amber-500/15 text-amber-100">En cours</Badge></div>
      {children}
    </section>
  );
}

function AthleteGoalSubmissionForm({ request, onSubmit }: { onSubmit: AthleteGoalsV2PanelProps["onSubmit"]; request: NonNullable<GoalState["openRequest"]> }) {
  const [draft, setDraft] = useState<GoalDraft>(() => ({
    shortGoal: request.latestVersion?.shortGoal ?? "",
    mediumGoal: request.latestVersion?.mediumGoal ?? "",
    longGoal: request.latestVersion?.longGoal ?? "",
  }));
  const action = useSingleAction();

  function update(field: keyof GoalDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return <div className="mt-4">
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
      <h3 className="font-bold text-amber-100">{request.status === "changes_requested" ? "Modifications demandées" : "Mise à jour des objectifs demandée"}</h3>
      <p className="mt-1 text-sm text-amber-100">{request.reviewNote || "Renseignez vos objectifs puis envoyez votre proposition au coach."}</p>
    </div>
    {action.error && <p role="alert" className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">{action.error}</p>}
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      {[["Court terme (~6 mois)", "shortGoal"], ["Moyen terme (1 à 2 ans)", "mediumGoal"], ["Long terme (3 à 4 ans)", "longGoal"]].map(([label, field]) => (
        <Field key={field} label={label}>
          <Textarea rows={5} value={draft[field as keyof GoalDraft]} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => update(field as keyof GoalDraft, event.target.value)} />
        </Field>
      ))}
    </div>
    <div className="mt-5 flex justify-end"><Btn disabled={action.pending} onClick={() => action.run(() => onSubmit(request.requestId, draft))}>{action.pending ? "Envoi..." : "Envoyer mes objectifs"}</Btn></div>
  </div>;
}

export function AthleteGoalsV2Panel({ state, onSubmit }: AthleteGoalsV2PanelProps) {
  const request = state.openRequest;
  return (
    <Panel>
      <h2 className="text-2xl font-semibold">Objectifs V2</h2>
      {!request && <p className="mt-3 text-sm text-zinc-400">Aucune demande de mise à jour n’est en attente.</p>}
      {request?.status === "submitted" && <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">Vos objectifs ont été envoyés et attendent la validation du coach.</p>}
      {(request?.status === "requested" || request?.status === "changes_requested") && <AthleteGoalSubmissionForm key={`${request.requestId}:${request.latestVersion?.versionId ?? "initial"}`} request={request} onSubmit={onSubmit} />}
      {state.current && <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4"><div className="mb-3 font-semibold text-emerald-100">Objectif actuellement validé</div><GoalValues item={state.current} /></div>}
      <GoalHistory history={state.history} />
    </Panel>
  );
}
