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

    if (name !== row.name) {
      await rename(kind, row.id, name);
    }

    if (draft.color !== row.color) {
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
    const ok = window.confirm(`Supprimer "${row.name}" ?`);

    if (!ok) return;

    await removeItem(kind, row.name);
  }

  return (
    <div className="rounded-3xl border border-zinc-700 bg-zinc-900 p-5">
      <h3 className="mb-4 text-xl font-bold">{title}</h3>

      <div className="space-y-2">
        {items.map((row) => {
          const draft = editing[row.id] || row;

          return (
            <div
              key={row.id}
              className="grid grid-cols-1 gap-2 rounded-2xl bg-zinc-800 p-3 md:grid-cols-5"
            >
              <span
                className={`${draft.color} rounded-xl px-3 py-2 text-center text-sm font-semibold`}
              >
                {draft.name}
              </span>

              <Input
                value={draft.name}
                onChange={(event) =>
                  updateDraft(row, "name", event.target.value)
                }
              />

              <ColorSelect
                value={draft.color}
                onChange={(event) =>
                  updateDraft(row, "color", event.target.value)
                }
              />

              <Btn variant="primary" onClick={() => validateEdit(row)}>
                Valider modification
              </Btn>

              <Btn variant="danger" onClick={() => confirmRemove(row)}>
                Supprimer
              </Btn>
            </div>
          );
        })}
      </div>
    </div>
  );
}