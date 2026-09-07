"use client";

import { feedbackV2Status } from "@/lib/trainingUtils";
import type { CalendarSession } from "@/services/calendar-sessions";

const labels = {
  complete: "Retour complet",
  incomplete: "Retour incomplet",
  missing: "Retour manquant",
  nonDone: "Non réalisée",
  rest: "Repos",
  scheduled: "Programmée",
};

export function feedbackCompactLabel(session: CalendarSession) {
  const status = feedbackV2Status(session);
  if (status === "complete") {
    const feedback = session.feedback;
    return `✓ ${feedback.actualTime || "—"} · RPE ${feedback.rpeGlobal || feedback.rpe || "—"}${feedback.rpeSpecific ? ` · Spé ${feedback.rpeSpecific}` : ""}`;
  }
  return status === "incomplete" ? "◐ Retour incomplet" : status === "missing" ? "! Retour manquant" : labels[status];
}

export default function CoachSessionFeedbackV2({ session }: { session: CalendarSession }) {
  const status = feedbackV2Status(session);
  const feedback = session.feedback;
  const hasStructuredSensations = Boolean(feedback.sensation);

  if (status !== "complete" && status !== "incomplete" && status !== "missing") {
    return <p className="text-sm text-zinc-400">{labels[status]}</p>;
  }

  return (
    <section className="border-t border-zinc-800 pt-4" aria-label="Retour athlète">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Retour athlète</p>
      <p className={`mt-1 text-sm font-semibold ${status === "complete" ? "text-emerald-200" : status === "incomplete" ? "text-amber-200" : "text-rose-200"}`}>{labels[status]}</p>
      {status === "missing" ? <p className="mt-2 text-sm text-zinc-400">Aucun retour n’a encore été commencé.</p> : (
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div><p className="text-xs text-zinc-500">Réalisé</p><p className="mt-0.5 text-zinc-100">{feedback.actualTime || "—"} · RPE {feedback.rpeGlobal || feedback.rpe || "—"}{feedback.rpeSpecific ? ` · Spé ${feedback.rpeSpecific}` : ""}</p></div>
          <div><p className="text-xs text-zinc-500">Ressenti</p><p className="mt-0.5 text-zinc-100">{hasStructuredSensations ? `Sensations ${feedback.sensation}/5 · ` : ""}Motivation {feedback.motivation || "—"}/10 · Plaisir {feedback.pleasure || "—"}/5</p></div>
          {feedback.comment && <div className="sm:col-span-2"><p className="text-xs text-zinc-500">Commentaire</p><p className="mt-0.5 whitespace-pre-wrap text-zinc-200">{feedback.comment}</p></div>}
          {hasStructuredSensations && feedback.updatedAt && <p className="sm:col-span-2 text-xs text-zinc-500">Dernière modification : {new Date(feedback.updatedAt).toLocaleString("fr-FR")}</p>}
        </div>
      )}
    </section>
  );
}
