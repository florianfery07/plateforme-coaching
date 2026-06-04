// @ts-nocheck
"use client";

import { sessionStatus, feedbackReady } from "@/lib/trainingUtils";
import { statusLabel, statusStyle } from "@/lib/platformDefaults";
import { supabase } from "@/lib/supabase";

import {
  Btn,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/ui";

import Block from "@/components/calendar/Block";

export default function Session({
  session,
  cpData,
  updateFeedback,
  updateNonDone,
  updateSession,
  isCoach,
}) {
  const status = sessionStatus(session);
  const ready = feedbackReady(session.feedback);
  const isRest = session.category === "Repos";

  const changeFeedback = (field, value) =>
    updateFeedback(session.id, field, value);

  const changeNonDone = (field, value) =>
    updateNonDone(session.id, field, value);

  const patch = (fn) =>
    updateSession((items) =>
      items.map((item) => (item.id === session.id ? fn(item) : item))
    );
   if (isRest) {
  return (
    <article className="rounded-3xl border border-blue-500 bg-blue-950 p-3 sm:p-5">
      <div>
        <div className="text-sm text-blue-200">
          Repos
        </div>

        <h4 className="text-xl font-bold sm:text-2xl">
          Repos
        </h4>
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
            Durée : {session.totalDuration || "—"} • RPE attendu :{" "}
            {session.expectedRpe || "—"}
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
            Le temps réel de roulage, le RPE, la motivation,
            le plaisir et le commentaire valident la séance.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <Field label="Temps réel de roulage">
            <Input
              value={session.feedback?.actualTime || ""}
              onChange={(event) =>
                changeFeedback("actualTime", event.target.value)
              }
              placeholder="Ex : 1h25"
            />
          </Field>

          <Field label="RPE ressenti /10">
            <Input
              value={session.feedback?.rpe || ""}
              onChange={(event) =>
                changeFeedback("rpe", event.target.value)
              }
              placeholder="Ex : 7"
            />
          </Field>

          <Field label="Motivation avant séance /10">
            <Input
              value={session.feedback?.motivation || ""}
              onChange={(event) =>
                changeFeedback("motivation", event.target.value)
              }
              placeholder="Ex : 8"
            />
          </Field>

          <Field label="Plaisir pris /5">
            <Input
              value={session.feedback?.pleasure || ""}
              onChange={(event) =>
                changeFeedback("pleasure", event.target.value)
              }
              placeholder="Ex : 4"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Commentaire libre (fatigue, douleur éventuelle, ressenti, etc.)">
            <Textarea
              value={session.feedback?.comment || ""}
              onChange={(event) =>
                changeFeedback("comment", event.target.value)
              }
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

      {status === "awaitingAction" && (
        <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
          <div className="mb-3 text-sm font-semibold text-zinc-300">
            Séance non faite
          </div>

          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Raison">
              <Select
                value={session.nonDone?.reason || ""}
                onChange={(event) =>
                  changeNonDone("reason", event.target.value)
                }
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
                value={session.nonDone?.fatigue || ""}
                onChange={(event) =>
                  changeNonDone("fatigue", event.target.value)
                }
              />
            </Field>

            <Field label="Douleur optionnelle">
              <Input
                value={session.nonDone?.pain || ""}
                onChange={(event) =>
                  changeNonDone("pain", event.target.value)
                }
              />
            </Field>
          </div>

          <Field label="Commentaire optionnel">
            <Textarea
              value={session.nonDone?.comment || ""}
              onChange={(event) =>
                changeNonDone("comment", event.target.value)
              }
              rows={3}
            />
          </Field>

          <Btn
            variant="primary"
            className="mt-3"
            onClick={() => changeNonDone("validated", true)}
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