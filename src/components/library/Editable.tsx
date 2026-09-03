// @ts-nocheck
"use client";

import { useState } from "react";

import { Badge, Btn, ColorSelect, Empty, Field, Input, StatusMessage } from "@/components/ui/ui";
import { supabase } from "@/lib/supabase";

export default function Editable({
  title,
  items,
  setItems,
  kind,
  rename,
  removeItem,
  taxonomyPending,
  workouts = [],
}) {
  const [editing, setEditing] = useState({});
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [feedback, setFeedback] = useState(null);

  function updateDraft(row, field, value) {
    setEditing((current) => ({
      ...current,
      [row.id]: {
        name: current[row.id]?.name ?? row.name,
        color: current[row.id]?.color ?? row.color,
        [field]: value,
      },
    }));
  }

  async function validateEdit(row) {
    const draft = editing[row.id] || row;
    const name = draft.name.trim();

    if (!name) return;

    let renameResult;
    if (name !== row.name) {
      renameResult = await rename(kind, row.id, name, draft.color);
      if (renameResult === false) {
        setFeedback({ variant: "error", message: "La modification n’a pas pu être enregistrée." });
        return;
      }
    }

    if (draft.color !== row.color && !renameResult?.colorHandled) {
      const table =
        kind === "category"
          ? "workout_categories"
          : "workout_subcategories";

      await supabase
        .from(table)
        .update({ color: draft.color })
        .eq("id", row.id);
    }

    setItems((current) =>
      current.map((itemRow) =>
        itemRow.id === row.id
          ? { ...itemRow, name, color: draft.color }
          : itemRow
      )
    );

    setEditing((current) => {
      const copy = { ...current };
      delete copy[row.id];
      return copy;
    });
    setFeedback({ variant: "success", message: `${title.slice(0, -1)} mis à jour.` });
  }

  function relatedWorkoutCount(row) {
    const field = kind === "category" ? "category" : "subcategory";
    return workouts.filter((workout) => workout[field] === row.name).length;
  }

  async function confirmRemove() {
    if (!pendingRemoval) return;

    const result = await removeItem(kind, pendingRemoval.name, true);
    if (result === false) {
      setFeedback({ variant: "error", message: "La suppression n’a pas pu être effectuée." });
      return;
    }

    setFeedback({ variant: "success", message: `${pendingRemoval.name} a été supprimé.` });
    setPendingRemoval(null);
  }

  function startEdit(row) {
    setEditing((current) => ({
      ...current,
      [row.id]: {
        name: row.name,
        color: row.color,
      },
    }));
  }

  function cancelEdit(id) {
    setEditing((current) => {
      const copy = { ...current };
      delete copy[id];
      return copy;
    });
  }

  return (
    <section aria-labelledby={`${kind}-taxonomy-title`} className="rounded-3xl border border-zinc-700 bg-zinc-900 p-4 sm:p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Structuration</p>
          <h3 id={`${kind}-taxonomy-title`} className="mt-1 text-xl font-bold">{title}</h3>
          <p className="mt-1 text-sm text-zinc-400">Utilisés pour organiser la bibliothèque et les analyses.</p>
        </div>
        <Badge className="bg-zinc-800 text-zinc-300">{items.length} élément{items.length > 1 ? "s" : ""}</Badge>
      </div>

      {feedback && (
        <StatusMessage variant={feedback.variant} className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <span>{feedback.message}</span>
            <button type="button" aria-label="Fermer le message" onClick={() => setFeedback(null)} className="min-h-7 min-w-7 rounded-lg text-current transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">×</button>
          </div>
        </StatusMessage>
      )}

      <div className="space-y-3">
        {items.map((row) => {
          const draft = editing[row.id];
          const isEditing = !!draft;

          return (
            <article key={row.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 sm:p-4">
              {!isEditing ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`${row.color} rounded-full px-3 py-1 text-xs font-bold text-white`}>{title.slice(0, -1)}</span>
                      <p className="truncate font-bold text-white">{row.name}</p>
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">{relatedWorkoutCount(row) ? `${relatedWorkoutCount(row)} séance${relatedWorkoutCount(row) > 1 ? "s" : ""} liée${relatedWorkoutCount(row) > 1 ? "s" : ""}.` : "Aucune séance liée."}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <Btn
                      variant="primary"
                      onClick={() => startEdit(row)}
                      disabled={taxonomyPending}
                    >
                      Modifier
                    </Btn>

                    <Btn
                      variant="danger"
                      onClick={() => setPendingRemoval(row)}
                      disabled={taxonomyPending}
                    >
                      Supprimer
                    </Btn>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 border-t border-zinc-800 pt-4">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                    <Field label="Nom"><Input aria-label={`Nom de ${row.name}`} value={draft.name} onChange={(event) => updateDraft(row, "name", event.target.value)} /></Field>
                    <Field label="Couleur"><ColorSelect value={draft.color} onChange={(event) => updateDraft(row, "color", event.target.value)} /></Field>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Btn
                      variant="primary"
                      onClick={() =>
                        validateEdit(row)
                      }
                      disabled={taxonomyPending}
                    >
                      Valider
                    </Btn>

                    <Btn
                      onClick={() =>
                        cancelEdit(row.id)
                      }
                      disabled={taxonomyPending}
                    >
                      Annuler
                    </Btn>
                  </div>
                </div>
              )}
              {pendingRemoval?.id === row.id && (
                <div role="region" aria-labelledby={`remove-${kind}-${row.id}`} className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 p-4">
                  <p id={`remove-${kind}-${row.id}`} className="font-semibold text-red-50">Supprimer « {row.name} » ?</p>
                  <p className="mt-1 text-sm text-red-100">{relatedWorkoutCount(row) ? `${relatedWorkoutCount(row)} séance${relatedWorkoutCount(row) > 1 ? "s" : ""} liée${relatedWorkoutCount(row) > 1 ? "s" : ""} seront également retirées de la bibliothèque.` : "Aucune séance de la bibliothèque ne sera retirée."}</p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row"><Btn variant="danger" onClick={confirmRemove} disabled={taxonomyPending}>Supprimer définitivement</Btn><Btn onClick={() => setPendingRemoval(null)} disabled={taxonomyPending}>Annuler</Btn></div>
                </div>
              )}
            </article>
          );
        })}

        {!items.length && (
          <Empty text={`Aucun élément dans ${title.toLowerCase()}.`} />
        )}
      </div>
    </section>
  );
}
