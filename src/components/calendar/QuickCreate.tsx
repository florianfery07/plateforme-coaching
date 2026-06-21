// @ts-nocheck
"use client";

import { Btn, ColorSelect, Input } from "@/components/ui/ui";

function QuickCreateCard({ title, value, setValue, onAdd }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3">
      <div className="mb-2 text-sm font-semibold">{title}</div>

      <div className="flex gap-2">
        <Input
          value={value.name}
          onChange={(event) =>
            setValue({ ...value, name: event.target.value })
          }
          placeholder="Nom"
        />

        <ColorSelect
          value={value.color}
          onChange={(event) =>
            setValue({ ...value, color: event.target.value })
          }
          className="max-w-28"
        />

        <Btn variant="primary" onClick={onAdd}>
          +
        </Btn>
      </div>
    </div>
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
    <div className="mt-8 rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
      <h3 className="mb-3 text-base font-semibold">
        Gestion des disciplines & thèmes
      </h3>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <QuickCreateCard
          title="Ajouter une discipline"
          value={newCat}
          setValue={setNewCat}
          onAdd={() => addItem("cat")}
        />

        <QuickCreateCard
          title="Ajouter un thème"
          value={newSub}
          setValue={setNewSub}
          onAdd={() => addItem("sub")}
        />
      </div>
    </div>
  );
}