// @ts-nocheck
"use client";

import {
  Btn,
  Field,
  Input,
  Panel,
  Select,
  Textarea,
} from "@/components/ui/ui";
import WorkoutBlock from "@/components/calendar/WorkoutBlock";
import QuickCreate from "@/components/calendar/QuickCreate";
import { repeatBlock, simpleBlock } from "@/lib/platformDefaults";

export default function CreatePage({
  categories,
  subcategories,
  draft,
  editingId,
  updateDraft,
  updateBlock,
  updateRepeat,
  setDraft,
  saveWorkout,
  newCat,
  setNewCat,
  newSub,
  setNewSub,
  addItem,
}) {
  const addSimple = () =>
    setDraft((current) => ({
      ...current,
      blocks: [...current.blocks, simpleBlock(`Bloc ${current.blocks.length + 1}`)],
    }));

  const addRepeat = () =>
    setDraft((current) => ({
      ...current,
      blocks: [
        ...current.blocks,
        repeatBlock(`Bloc répétition ${current.blocks.length + 1}`),
      ],
    }));
  const rpeSelectValue = (value) => {
  if (!value) return "";
  const number = String(value).replace("/10", "");
  return `${number}/10`;
};
  return (
    <Panel>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            Ma création détaillée de séance
          </h2>
          <p className="text-sm text-zinc-400">
            Outil commun : aucune sélection d’athlète ici.
          </p>
        </div>

        <Btn variant="primary" onClick={saveWorkout}>
          {editingId ? "Mettre à jour" : "Enregistrer dans la bibliothèque"}
        </Btn>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field label="discipline">
          <Select
            value={draft.category}
            onChange={(event) => updateDraft("category", event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.id}>{category.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Thème">
          <Select
            value={draft.subcategory}
            onChange={(event) => updateDraft("subcategory", event.target.value)}
          >
            <option value="">Aucun thème</option>

           {subcategories.map((subcategory) => (
           <option key={subcategory.id} value={subcategory.name}>
            {subcategory.name}
            </option>
            ))}
          </Select>
        </Field>

        <Field label="Titre">
          <Input
            value={draft.title}
            onChange={(event) => updateDraft("title", event.target.value)}
          />
        </Field>

        <Field label="Durée totale">
          <Input
            value={draft.totalDuration}
            onChange={(event) => updateDraft("totalDuration", event.target.value)}
          />
        </Field>

        <Field label="RPE global attendu">
  <Select
    value={rpeSelectValue(draft.expectedRpeGlobal || draft.expectedRpe)}
    onChange={(event) => {
      updateDraft("expectedRpeGlobal", event.target.value);
      updateDraft("expectedRpe", event.target.value);
    }}
  >
    <option value="">Choisir</option>
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((number) => (
      <option key={number}>{number}/10</option>
    ))}
  </Select>
</Field>

<Field label="Durée spécifique prévue">
  <Input
    value={draft.expectedSpecificDuration || ""}
    onChange={(event) =>
      updateDraft("expectedSpecificDuration", event.target.value)
    }
    placeholder="Ex : 10 min"
  />
</Field>

<Field label="RPE spécifique attendu">
  <Select
    value={rpeSelectValue(draft.expectedRpeSpecific)}
    onChange={(event) =>
      updateDraft("expectedRpeSpecific", event.target.value)
    }
  >
    <option value="">Choisir</option>
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((number) => (
      <option key={number}>{number}/10</option>
    ))}
  </Select>
</Field>

        <Field label="Description">
          <Textarea
            value={draft.description}
            onChange={(event) => updateDraft("description", event.target.value)}
            rows={4}
          />
        </Field>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">Blocs de séance</h3>

          <div className="flex gap-2">
            <Btn onClick={addSimple}>+ Bloc simple</Btn>
            <Btn onClick={addRepeat}>+ Bloc répétition</Btn>
          </div>
        </div>

        {draft.blocks.map((block, blockIndex) => (
          <WorkoutBlock
            key={blockIndex}
            {...{ block, blockIndex, updateBlock, updateRepeat, setDraft }}
          />
        ))}
      </div>

      <QuickCreate
        {...{ newCat, setNewCat, newSub, setNewSub, addItem }}
      />
    </Panel>
  );
}