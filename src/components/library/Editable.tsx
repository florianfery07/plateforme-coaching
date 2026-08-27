// @ts-nocheck
"use client";

import { useState } from "react";

import { Btn, ColorSelect, Input } from "@/components/ui/ui";
import { supabase } from "@/lib/supabase";

export default function Editable({
  title,
  items,
  setItems,
  kind,
  rename,
  removeItem,
  taxonomyPending,
}) {
  const [editing, setEditing] = useState({});

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
      if (renameResult === false) return;
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
  }

  async function confirmRemove(row) {
    await removeItem(kind, row.name);
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
    <div className="rounded-3xl border border-zinc-700 bg-zinc-900 p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-xl font-bold">
          {title}
        </h3>

        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-400">
          {items.length}
        </span>
      </div>

      <div className="space-y-3">
        {items.map((row) => {
          const draft = editing[row.id];
          const isEditing = !!draft;

          return (
            <div
              key={row.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3"
            >
              {!isEditing ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div
                    className={`${row.color} min-w-[180px] rounded-xl px-4 py-3 text-center text-sm font-bold text-white`}
                  >
                    {row.name}
                  </div>

                  <div className="flex gap-2">
                    <Btn
                      variant="primary"
                      onClick={() => startEdit(row)}
                      disabled={taxonomyPending}
                    >
                      Modifier
                    </Btn>

                    <Btn
                      variant="danger"
                      onClick={() => confirmRemove(row)}
                      disabled={taxonomyPending}
                    >
                      Supprimer
                    </Btn>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    value={draft.name}
                    onChange={(event) =>
                      updateDraft(
                        row,
                        "name",
                        event.target.value
                      )
                    }
                  />

                  <ColorSelect
                    value={draft.color}
                    onChange={(event) =>
                      updateDraft(
                        row,
                        "color",
                        event.target.value
                      )
                    }
                  />

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
            </div>
          );
        })}

        {!items.length && (
          <div className="rounded-2xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">
            Aucun élément.
          </div>
        )}
      </div>
    </div>
  );
}
