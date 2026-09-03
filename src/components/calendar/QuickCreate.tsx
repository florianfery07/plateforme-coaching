// @ts-nocheck
"use client";

import { Btn, ColorSelect, Field, Input } from "@/components/ui/ui";

function QuickCreateCard({ title, actionLabel, value, setValue, onAdd }) {
  return (
    <section className="rounded-2xl border border-zinc-700 bg-zinc-900 p-3 sm:p-4">
      <div className="mb-3 text-sm font-semibold">{title}</div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-end">
        <Field label="Nom">
          <Input
            value={value.name}
            onChange={(event) =>
              setValue({ ...value, name: event.target.value })
            }
            placeholder="Nom"
          />
        </Field>

        <Field label="Couleur">
          <ColorSelect
            value={value.color}
            onChange={(event) =>
              setValue({ ...value, color: event.target.value })
            }
          />
        </Field>

        <Btn variant="primary" onClick={onAdd} aria-label={title}>
          {actionLabel}
        </Btn>
      </div>
    </section>
  );
}

export default function QuickCreate({
  newCat,
  setNewCat,
  newSub,
  setNewSub,
  addItem,
}) {
  return (
    <section aria-labelledby="quick-taxonomy-title" className="mt-8 rounded-3xl border border-zinc-700 bg-zinc-800 p-4 sm:p-5">
      <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Bibliothèque</p><h3 id="quick-taxonomy-title" className="mt-1 text-lg font-semibold">Ajouter une discipline ou un thème</h3><p className="mt-1 text-sm text-zinc-400">Ces éléments seront disponibles lors de la création et du filtrage des séances.</p></div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <QuickCreateCard
          title="Ajouter une discipline"
          actionLabel="Ajouter"
          value={newCat}
          setValue={setNewCat}
          onAdd={() => addItem("cat")}
        />

        <QuickCreateCard
          title="Ajouter un thème"
          actionLabel="Ajouter"
          value={newSub}
          setValue={setNewSub}
          onAdd={() => addItem("sub")}
        />
      </div>
    </section>
  );
}
