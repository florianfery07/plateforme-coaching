// @ts-nocheck
"use client";

import { useRef, useState } from "react";

import { sessionStatus, feedbackReady } from "@/lib/trainingUtils";
import { statusLabel, statusStyle } from "@/lib/platformDefaults";
import { isReliableMutationsPilotEnabled } from "@/lib/features/reliable-mutations-pilot";
import { supabase } from "@/lib/supabase";
import { useReliableMutation } from "@/hooks/use-reliable-mutation";
import { calendarFeedbackService } from "@/services/calendar-sessions-repository";

import {
  Btn,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/ui";

import Block from "@/components/calendar/Block";
import RpeHelp from "@/components/calendar/RpeHelp";

export default function Session({
  session,
  cpData,
  updateFeedback,
  updateNonDone,
  updateSession,
  updateCalendarWorkoutField,
  adjustmentPending = false,
  nonDonePending = false,
  isCoach,
}) {
  const status = sessionStatus(session);
  const ready = feedbackReady(session.feedback);
  const isRest =
  session.category?.toLowerCase() === "repos";

  const feedbackPilotEnabled = isReliableMutationsPilotEnabled();
  const adjustmentPilotEnabled = isReliableMutationsPilotEnabled();
  const nonDonePilotEnabled = isReliableMutationsPilotEnabled();
  const [adjustedSpecificDurationDraft, setAdjustedSpecificDurationDraft] = useState(
    session.adjustedSpecificDuration || "",
  );
  const [nonDoneDraft, setNonDoneDraft] = useState(session.nonDone || {});
  const nonDoneSubmittingRef = useRef(false);
  const patch = (fn) =>
    updateSession((items) =>
      items.map((item) => (item.id === session.id ? fn(item) : item))
    );

  const feedbackMutation = useReliableMutation({
    concurrency: "serial",
    key: `calendar-feedback:${session.id}`,
    latestWins: true,
    onMutate: ({ feedback, previousFeedback }) => {
      patch((item) => ({ ...item, feedback }));
      return () => patch((item) => ({ ...item, feedback: previousFeedback }));
    },
    operation: ({ feedback }, context) =>
      calendarFeedbackService.save({ feedback, workoutId: session.id }, context.signal),
    retry: {
      attempts: 2,
      delayMs: 500,
      shouldRetry: (error) => error.kind === "network",
    },
    timeoutMs: 10_000,
    type: "calendar-feedback.save",
  });

  const savePilotFeedback = (field, value) => {
    const previousFeedback = session.feedback;
    const feedback = {
      ...previousFeedback,
      [field]: value,
      ...(field === "rpeGlobal" ? { rpe: value } : {}),
    };

    void feedbackMutation.mutate({ feedback, previousFeedback }).then((result) => {
      if (result.state === "error") {
        alert("Impossible d'enregistrer le retour. Réessaie.");
      }
    });
  };

  const changeFeedback = (field, value) => {
    if (feedbackPilotEnabled && field !== "validated") {
      draftFeedback(field, value);
      return;
    }

    updateFeedback(session.id, field, value);
  };

  const draftFeedback = (field, value) =>
    patch((item) => ({
      ...item,
      feedback: {
        ...item.feedback,
        [field]: value,
        ...(field === "rpeGlobal" ? { rpe: value } : {}),
      },
    }));

  const saveFeedback = (field, value) => {
    if (feedbackPilotEnabled && field !== "validated") {
      savePilotFeedback(field, value);
      return;
    }

    updateFeedback(session.id, field, value);

    if (field === "rpeGlobal") {
      updateFeedback(session.id, "rpe", value);
    }
  };

  const savePilotAdjustment = () => {
    const previousValue = session.adjustedSpecificDuration || "";

    if (
      adjustmentPending ||
      adjustedSpecificDurationDraft === previousValue
    ) {
      return;
    }

    void updateCalendarWorkoutField(
      session.id,
      "adjustedSpecificDuration",
      adjustedSpecificDurationDraft,
    ).then((result) => {
      if (result.state === "success" && result.data) {
        setAdjustedSpecificDurationDraft(
          result.data.adjustedSpecificDuration || "",
        );
      } else if (result.state === "error") {
        setAdjustedSpecificDurationDraft(previousValue);
        alert("Impossible d'enregistrer l'ajustement. Réessaie.");
      }
    });
  };

  function cleanScore(value, max) {
    const text = String(value || "")
      .replace(",", ".")
      .replace(/[^0-9.]/g, "");

    if (!text) return "";

    const parsed = Number(text);

    if (Number.isNaN(parsed)) return "";

    const clamped = Math.max(0, Math.min(max, parsed));

    return String(clamped);
  }

function parseDurationParts(value) {
  const text = String(value || "").toLowerCase().replace(/\s/g, "");

  if (!text) {
    return { hours: "", minutes: "" };
  }

  const hoursMatch = text.match(/(\d+)h/);
  const minutesAfterHourMatch = text.match(/h(\d+)$/);
  const minutesWithMinMatch = text.match(/(\d+)min/);

  if (hoursMatch) {
    return {
      hours: hoursMatch[1],
      minutes:
        minutesAfterHourMatch?.[1] ||
        minutesWithMinMatch?.[1] ||
        "",
    };
  }

  if (minutesWithMinMatch) {
    return {
      hours: "",
      minutes: minutesWithMinMatch[1],
    };
  }

  return {
    hours: text.match(/^\d+$/) ? text : "",
    minutes: "",
  };
}

function formatDurationFromParts(hours, minutes) {
  const cleanHours = String(hours || "").replace(",", ".").trim();
  const cleanMinutes = String(minutes || "").trim();

  if (cleanHours && cleanMinutes) {
    return `${cleanHours}h${cleanMinutes}`;
  }

  if (cleanHours) {
    return `${cleanHours}h`;
  }

  if (cleanMinutes) {
    return `${cleanMinutes}min`;
  }

  return "";
}

function changeActualTimePart(part, value) {
  const cleanValue = String(value || "").replace(/\D/g, "");

  const current = parseDurationParts(session.feedback?.actualTime);

  const nextHours =
    part === "hours" ? cleanValue : current.hours;

  const nextMinutes =
    part === "minutes" ? cleanValue : current.minutes;

  const formatted = formatDurationFromParts(
    nextHours,
    nextMinutes
  );

  draftFeedback("actualTime", formatted);
}
  const changeNonDone = (field, value) => {
    if (nonDonePilotEnabled) {
      setNonDoneDraft((current) => ({ ...current, [field]: value }));
      return;
    }

    updateNonDone(session.id, field, value);
  };
  const visibleNonDone = nonDonePilotEnabled ? nonDoneDraft : session.nonDone;
  const savePilotNonDone = () => {
    const previousNonDone = session.nonDone || {};

    if (nonDonePending || nonDoneSubmittingRef.current) return;

    nonDoneSubmittingRef.current = true;
    void updateNonDone(session.id, "commit", {
      ...nonDoneDraft,
      validated: true,
    }).then((result) => {
      if (result?.state === "success" && result.data) {
        setNonDoneDraft(result.data.nonDone);
        return;
      }

      setNonDoneDraft(previousNonDone);
      alert("Impossible d'enregistrer la justification. Réessaie.");
    }).catch(() => {
      setNonDoneDraft(previousNonDone);
      alert("Impossible d'enregistrer la justification. Réessaie.");
    }).finally(() => {
      nonDoneSubmittingRef.current = false;
    });
  };
   if (isRest) {
  return (
    <article className="rounded-3xl border border-blue-500 bg-blue-950 p-3 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-blue-200">
            Repos
          </div>

          <h4 className="text-xl font-bold sm:text-2xl">
            Repos
          </h4>
        </div>

        {isCoach && (
          <Btn
            onClick={async () => {
              if (
                  !window.confirm(
                  "Supprimer cette séance du calendrier ?"
               )
              ) {
                return;
              }
              await supabase
                .from("calendar_workouts")
                .delete()
                .eq("id", session.id);

              updateSession((items) =>
                items.filter((item) => item.id !== session.id)
              );
            }}
          >
            Retirer
          </Btn>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-zinc-900 p-4 text-zinc-200">
        <p className="font-semibold">
          Journée de récupération.
        </p>

        <p className="mt-3">
          Aucune séance prévue.
        </p>

        <p>
          Aucune action demandée.
        </p>
      </div>
    </article>
  );
}
  return (
    <article className="rounded-3xl border border-zinc-700 bg-zinc-800 p-3 sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between">
        <div>
          <div className="text-sm text-zinc-400">
            {session.subcategory
            ? `${session.category} • ${session.subcategory}`
            : session.category}
          </div>

          <h4 className="text-xl font-bold sm:text-2xl">
            {session.title}
          </h4>

          <p className="text-zinc-300">
            Durée : {session.totalDuration || "—"} • RPE global attendu :{" "}
           {session.expectedRpeGlobal || session.expectedRpe || "—"}
           {session.expectedRpeSpecific ? (
           <>
           {" "}• RPE spécifique attendu : {session.expectedRpeSpecific}
           </>
          ) : null}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`${statusStyle[status]} rounded-xl px-3 py-2 text-sm font-bold`}
          >
            {statusLabel[status]}
          </span>

          {status === "awaitingAction" && (
            <span className="rounded-xl bg-yellow-100 px-3 py-2 text-sm font-bold text-black">
              Retour à compléter
            </span>
          )}

         {isCoach && (
          <Btn
           onClick={async () => {
          if (
            !window.confirm(
            "Supprimer cette séance du calendrier ?"
          )
          ) {
             return;
           } 

            await supabase
              .from("calendar_workouts")
              .delete()
              .eq("id", session.id);

              updateSession((items) =>
                items.filter((item) => item.id !== session.id)
              );
             }}
             >
              Retirer
            </Btn>
           )}
        </div>
      </div>

      <p className="mt-4 rounded-2xl bg-zinc-900 p-4 text-zinc-300">
        {session.description || "Pas de description."}
      </p>

      <div className="mt-4 space-y-3">
        {session.blocks.map((block, index) => (
          <Block key={index} block={block} cpData={cpData} />
        ))}
      </div>
      
    
      <div className="mt-4 rounded-2xl bg-zinc-900 p-3 sm:p-5">
        <div className="mb-3">
          <div className="text-sm font-semibold text-zinc-300">
            Retour athlète après séance
          </div>

          <p className="mt-1 text-xs text-zinc-500">
            Le temps réel, le RPE global, le RPE spécifique, la motivation,
            le plaisir et le commentaire valident la séance.
          </p>
          <RpeHelp />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
  <Field label="Temps réel de roulage">
  <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
    <Input
  value={parseDurationParts(session.feedback?.actualTime).hours}
  onChange={(event) =>
    changeActualTimePart("hours", event.target.value)
  }
  type="text"
  inputMode="numeric"
  placeholder="2"
  onBlur={() =>
  saveFeedback("actualTime", session.feedback?.actualTime || "")
}
/>

    <span className="text-sm font-semibold text-zinc-400">
      h
    </span>

    <Input
  value={parseDurationParts(session.feedback?.actualTime).minutes}
  onChange={(event) =>
    changeActualTimePart("minutes", event.target.value)
  }
  type="text"
  inputMode="numeric"
  onBlur={() =>
  saveFeedback("actualTime", session.feedback?.actualTime || "")
}
/>

    <span className="text-sm font-semibold text-zinc-400">
      min
    </span>
  </div>
</Field>

  <Field label="RPE global ressenti /10">
    <Input
      value={session.feedback?.rpeGlobal || session.feedback?.rpe || ""}
      onChange={(event) =>
        draftFeedback("rpeGlobal", cleanScore(event.target.value, 10))
      }
      onBlur={(event) =>
        saveFeedback("rpeGlobal", cleanScore(event.target.value, 10))
      }
      type="number"
      inputMode="decimal"
      min="0"
      max="10"
      step="0.5"
    />
  </Field>

  <Field label="RPE spécifique ressenti /10">
    <Input
      value={session.feedback?.rpeSpecific || ""}
      onChange={(event) =>
        changeFeedback("rpeSpecific", cleanScore(event.target.value, 10))
      }
      onBlur={feedbackPilotEnabled
        ? (event) => saveFeedback("rpeSpecific", cleanScore(event.target.value, 10))
        : undefined}
      type="number"
      inputMode="decimal"
      min="0"
      max="10"
      step="0.5"
    />
  </Field>

  <Field label="Motivation avant séance /10">
    <Input
      value={session.feedback?.motivation || ""}
      onChange={(event) =>
        changeFeedback("motivation", cleanScore(event.target.value, 10))
      }
      onBlur={feedbackPilotEnabled
        ? (event) => saveFeedback("motivation", cleanScore(event.target.value, 10))
        : undefined}
      type="number"
      inputMode="decimal"
      min="0"
      max="10"
      step="1"
    />
  </Field>

  <Field label="Plaisir pris /5">
    <Input
      value={session.feedback?.pleasure || ""}
      onChange={(event) =>
        changeFeedback("pleasure", cleanScore(event.target.value, 5))
      }
      onBlur={feedbackPilotEnabled
        ? (event) => saveFeedback("pleasure", cleanScore(event.target.value, 5))
        : undefined}
      type="number"
      inputMode="decimal"
      min="0"
      max="5"
      step="1"
    />
  </Field>
</div>

        <div className="mt-4">
          <Field label="Commentaire libre (fatigue, douleur éventuelle, ressenti, etc.)">
            <Textarea
              value={session.feedback?.comment || ""}
              onChange={(event) =>
                draftFeedback("comment", event.target.value)
              }
              onBlur={(event) =>
                saveFeedback("comment", event.target.value)
              }
              autoComplete="off"
              autoCorrect="on"
              rows={8}
              placeholder="Ex : fatigue 6/10, aucune douleur, bonnes sensations..."
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-zinc-400">
            {session.feedback?.validated
              ? "Séance validée et comptabilisée dans la fiche athlète."
              : ready
              ? "Retour complet : tu peux valider la séance réalisée."
              : "Complète tous les champs pour pouvoir valider la séance réalisée."}
          </p>

          <Btn
            variant="primary"
            disabled={!ready || session.feedback?.validated}
            className={
              !ready || session.feedback?.validated
                ? "opacity-40"
                : ""
            }
            onClick={() => changeFeedback("validated", true)}
          >
            Valider séance réalisée
          </Btn>
        </div>
      </div>
      
            {isCoach && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-semibold text-zinc-300">
              Ajustement charge coach
            </div>

            <div>
              Si vide, la durée spécifique prévue est utilisée.
            </div>
          </div>

          <div className="w-full sm:w-48">
            <Field label="Durée spécifique retenue">
              <Input
                value={
                  adjustmentPilotEnabled
                    ? adjustedSpecificDurationDraft
                    : session.adjustedSpecificDuration || ""
                }
                onChange={(event) => {
                  if (adjustmentPilotEnabled) {
                    setAdjustedSpecificDurationDraft(event.target.value);
                    return;
                  }

                  updateCalendarWorkoutField(
                    session.id,
                    "adjustedSpecificDuration",
                    event.target.value
                  );
                }}
                onBlur={adjustmentPilotEnabled ? savePilotAdjustment : undefined}
                disabled={adjustmentPilotEnabled && adjustmentPending}
                type="text"
                inputMode="decimal"
                placeholder={
                  session.expectedSpecificDuration
                    ? `Défaut : ${session.expectedSpecificDuration}`
                    : "Ex : 12 min"
                }
              />
            </Field>
          </div>
        </div>
      )}

      {status === "awaitingAction" && (
        <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
          <div className="mb-3 text-sm font-semibold text-zinc-300">
            Séance non faite
          </div>

          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Raison">
              <Select
                value={visibleNonDone?.reason || ""}
                onChange={(event) =>
                  changeNonDone("reason", event.target.value)
                }
                disabled={nonDonePilotEnabled && nonDonePending}
              >
                <option value="">Choisir</option>

                {[
                  "Malade",
                  "Blessure",
                  "Fatigue",
                  "Repos",
                  "Météo",
                  "Imprévu",
                ].map((reason) => (
                  <option key={reason}>{reason}</option>
                ))}
              </Select>
            </Field>

            <Field label="Fatigue optionnelle">
              <Input
                value={visibleNonDone?.fatigue || ""}
                onChange={(event) =>
                  changeNonDone("fatigue", event.target.value)
                }
                type="text"
                inputMode="decimal"
                disabled={nonDonePilotEnabled && nonDonePending}
              />
            </Field>

            <Field label="Douleur optionnelle">
              <Input
                value={visibleNonDone?.pain || ""}
                onChange={(event) =>
                  changeNonDone("pain", event.target.value)
                }
                type="text"
                inputMode="decimal"
                disabled={nonDonePilotEnabled && nonDonePending}
              />
            </Field>
          </div>

          <Field label="Commentaire optionnel">
            <Textarea
            value={visibleNonDone?.comment || ""}
              onChange={(event) =>
                changeNonDone("comment", event.target.value)
              }
            rows={3}
            disabled={nonDonePilotEnabled && nonDonePending}
            />
          </Field>

          <Btn
            variant="primary"
            className="mt-3"
            onClick={() => {
              if (nonDonePilotEnabled) {
                savePilotNonDone();
                return;
              }

              changeNonDone("validated", true);
            }}
            disabled={nonDonePilotEnabled && nonDonePending}
          >
            Valider séance non faite
          </Btn>
        </div>
      )}

      {status === "notDoneJustified" && (
        <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-300">
          <div className="font-semibold">
            Justification enregistrée :{" "}
            {session.nonDone?.reason}
          </div>

          {session.nonDone?.fatigue && (
            <div className="mt-1 text-zinc-400">
              Fatigue : {session.nonDone.fatigue}
            </div>
          )}

          {session.nonDone?.pain && (
            <div className="mt-1 text-zinc-400">
              Douleur : {session.nonDone.pain}
            </div>
          )}

          {session.nonDone?.comment && (
            <div className="mt-1 text-zinc-400">
              Commentaire : {session.nonDone.comment}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
