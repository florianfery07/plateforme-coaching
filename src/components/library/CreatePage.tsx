// @ts-nocheck
"use client";

import { useState } from "react";

import {
  Btn,
  Field,
  Input,
  Panel,
  Select,
  StatusMessage,
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
  savePending = false,
}) {
  const [validationMessage, setValidationMessage] = useState("");

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

  const parseDurationParts = (value) => {
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
  };

  const formatDurationFromParts = (hours, minutes) => {
    const cleanHours = String(hours || "").replace(/\D/g, "");
    const cleanMinutes = String(minutes || "").replace(/\D/g, "");

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
  };

  const updateTotalDurationPart = (part, value) => {
    const current = parseDurationParts(draft.totalDuration);
    const cleanValue = String(value || "").replace(/\D/g, "");

    const nextHours = part === "hours" ? cleanValue : current.hours;
    const nextMinutes = part === "minutes" ? cleanValue : current.minutes;

    updateDraft(
      "totalDuration",
      formatDurationFromParts(nextHours, nextMinutes)
    );
  };

  const updateSpecificDurationPart = (part, value) => {
    const current = parseDurationParts(draft.expectedSpecificDuration);
    const cleanValue = String(value || "").replace(/\D/g, "");

    const nextHours = part === "hours" ? cleanValue : current.hours;
    const nextMinutes = part === "minutes" ? cleanValue : current.minutes;

    updateDraft(
      "expectedSpecificDuration",
      formatDurationFromParts(nextHours, nextMinutes)
    );
  };

  const handleSave = () => {
    if (!draft.category) {
      setValidationMessage("Choisis une discipline avant d’enregistrer la séance.");
      return;
    }

    if (!draft.title.trim()) {
      setValidationMessage("Donne un titre à la séance avant de l’enregistrer.");
      return;
    }

    setValidationMessage("");
    saveWorkout();
  };

  return (
    <Panel>
      <div className="mb-6 flex flex-col gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Bibliothèque</p>
          <h2 className="mt-1 text-2xl font-semibold">{editingId ? "Modifier la séance" : "Créer une séance"}</h2>
          <p className="mt-1 text-sm text-zinc-400">La séance sera disponible dans la bibliothèque, sans être affectée à un athlète.</p>
        </div>

        <Btn variant="primary" onClick={handleSave} disabled={savePending} className="w-full md:w-auto">
          {editingId ? "Mettre à jour" : "Enregistrer dans la bibliothèque"}
        </Btn>
      </div>

      {validationMessage && <StatusMessage variant="error" className="mb-6">{validationMessage}</StatusMessage>}

      <section aria-labelledby="workout-basics-title" className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 sm:p-5">
        <div className="mb-4">
          <h3 id="workout-basics-title" className="text-lg font-semibold">Informations de la séance</h3>
          <p className="mt-1 text-sm text-zinc-400">Commence par définir le contenu général et l’intensité attendue.</p>
        </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field label="Discipline">
          <Select
            value={draft.category || ""}
            onChange={(event) => updateDraft("category", event.target.value)}
          >
            <option value="">Choisir une discipline</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
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

        <Field label="Durée totale prévue">
          <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
            <Input
              value={parseDurationParts(draft.totalDuration).hours}
              onChange={(event) =>
                updateTotalDurationPart("hours", event.target.value)
              }
              type="text"
              inputMode="numeric"
              placeholder="1"
              aria-label="Heures de la durée totale prévue"
            />

            <span className="text-sm font-semibold text-zinc-400">
              h
            </span>

            <Input
              value={parseDurationParts(draft.totalDuration).minutes}
              onChange={(event) =>
                updateTotalDurationPart("minutes", event.target.value)
              }
              type="text"
              inputMode="numeric"
              placeholder="30"
              aria-label="Minutes de la durée totale prévue"
            />

            <span className="text-sm font-semibold text-zinc-400">
              min
            </span>
          </div>
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
  <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
    <Input
      value={parseDurationParts(draft.expectedSpecificDuration).hours}
      onChange={(event) =>
        updateSpecificDurationPart("hours", event.target.value)
      }
      type="text"
      inputMode="numeric"
      placeholder="0"
      aria-label="Heures de la durée spécifique prévue"
    />

    <span className="text-sm font-semibold text-zinc-400">
      h
    </span>

    <Input
      value={parseDurationParts(draft.expectedSpecificDuration).minutes}
      onChange={(event) =>
        updateSpecificDurationPart("minutes", event.target.value)
      }
      type="text"
      inputMode="numeric"
      placeholder="10"
      aria-label="Minutes de la durée spécifique prévue"
    />

    <span className="text-sm font-semibold text-zinc-400">
      min
    </span>
  </div>
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

        <Field label="Description et consignes générales" className="lg:col-span-3">
          <Textarea
            value={draft.description}
            onChange={(event) => updateDraft("description", event.target.value)}
            rows={4}
          />
        </Field>
      </div>
      </section>

      <section aria-labelledby="workout-blocks-title" className="space-y-4">
        <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 id="workout-blocks-title" className="text-xl font-semibold">Déroulé de la séance</h3>
            <p className="mt-1 text-sm text-zinc-400">{draft.blocks.length} bloc{draft.blocks.length > 1 ? "s" : ""}. Organise-les dans l’ordre du déroulé.</p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Btn onClick={addSimple}>Ajouter un bloc simple</Btn>
            <Btn onClick={addRepeat}>Ajouter un bloc répétition</Btn>
          </div>
        </div>

        <div className="space-y-4" aria-live="polite">
        {draft.blocks.map((block, blockIndex) => (
          <WorkoutBlock
            key={blockIndex}
            {...{ block, blockIndex, updateBlock, updateRepeat, setDraft }}
          />
        ))}
        </div>
      </section>

      <QuickCreate
        {...{ newCat, setNewCat, newSub, setNewSub, addItem }}
      />
    </Panel>
  );
}
