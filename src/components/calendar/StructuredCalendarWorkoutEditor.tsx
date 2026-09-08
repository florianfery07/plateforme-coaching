"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import StructuredWorkoutBuilder, { emptyWorkoutStructureV2 } from "@/components/library/StructuredWorkoutBuilder";
import { Btn, Field, Input, Select, StatusMessage, Textarea } from "@/components/ui/ui";
import { createWorkoutStructureV2PersistenceService } from "@/services/workout-structure-v2-persistence";
import { workoutStructureV2Repository } from "@/services/workout-structure-v2-repository";
import type { WorkoutStructureV2 } from "@/services/workout-structure-v2";

const service = createWorkoutStructureV2PersistenceService(workoutStructureV2Repository);
const toRpe = (value: string) => value ? Number(value) : null;

export type StructuredCalendarEditorWorkout = {
  category: string;
  description: string;
  expectedRpeGlobal: string | number;
  expectedRpeSpecific: string | number;
  id: string;
  structuredWorkoutV2: boolean;
  subcategory: string;
  title: string;
};

type Props = {
  athleteId: string;
  categories: Array<{ id: string; name: string }>;
  date: string;
  onCancel: () => void;
  groupTarget?: { organizationId: string; participantMembershipIds: string[] } | null;
  onSaved: (result: { calendarWorkout?: unknown; calendarWorkoutId?: string; groupSession?: unknown; groupSessionId?: string }) => void;
  subcategories: Array<{ id: string; name: string }>;
  workout?: StructuredCalendarEditorWorkout | null;
};

export default function StructuredCalendarWorkoutEditor({ athleteId, categories, date, groupTarget, onCancel, onSaved, subcategories, workout }: Props) {
  const [title, setTitle] = useState(workout?.title ?? "");
  const [category, setCategory] = useState(workout?.category ?? "");
  const [subcategory, setSubcategory] = useState(workout?.subcategory ?? "");
  const [description, setDescription] = useState(workout?.description ?? "");
  const [globalRpe, setGlobalRpe] = useState(String(workout?.expectedRpeGlobal ?? ""));
  const [specificRpe, setSpecificRpe] = useState(String(workout?.expectedRpeSpecific ?? ""));
  const [document, setDocument] = useState<WorkoutStructureV2>(emptyWorkoutStructureV2);
  const [revision, setRevision] = useState<number | null>(null);
  const [pending, setPending] = useState(Boolean(workout));
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!workout) return;
    let current = true;
    void service.getCalendar(workout.id)
      .then((result) => {
        if (!current || !result) throw new Error("La séance structurée n’est plus disponible.");
        setDocument(result.document);
        setRevision(result.revision);
      })
      .catch((error) => current && setMessage(error instanceof Error ? error.message : "La séance ne peut pas être chargée."))
      .finally(() => current && setPending(false));
    return () => { current = false; };
  }, [workout]);

  const hasSpecific = useMemo(() => document.blocks.some((block) => block.kind === "repeat" ? block.steps.some((step) => step.isSpecific) : block.isSpecific), [document]);

  const save = async () => {
    if (!title.trim() || !category || !document.blocks.length) {
      setMessage("Renseignez un titre, une discipline et au moins un bloc.");
      return;
    }
    setPending(true); setMessage("");
    try {
      const common = {
        category, description, document, expectedRpeGlobal: toRpe(globalRpe),
        expectedRpeSpecific: hasSpecific ? toRpe(specificRpe) : null, idempotencyKey: crypto.randomUUID(), subcategory, title,
      };
      const result = workout
        ? await service.updateCalendar({ ...common, calendarWorkoutId: workout.id, expectedRevision: revision ?? 0 })
        : groupTarget
          ? await service.createGroup({ ...common, ...groupTarget, libraryWorkoutId: null, scheduledFor: date })
          : await service.createCalendar({ ...common, athleteId, date, libraryWorkoutId: null });
      onSaved(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "La séance n’a pas pu être enregistrée.");
    } finally { setPending(false); }
  };

  return (
    <section className="space-y-4" aria-label={workout ? "Modifier la séance structurée" : "Créer une séance structurée"}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-amber-300">{groupTarget ? "Séance groupe V2" : "Séance calendrier V2"}</p><h3 className="mt-1 text-xl font-semibold">{workout ? "Modifier la séance" : "Créer une séance"}</h3></div>
        <div className="flex gap-2"><Btn type="button" onClick={onCancel}>Annuler</Btn><Btn variant="primary" type="button" onClick={() => void save()} disabled={pending}>{pending ? "Enregistrement…" : workout ? "Enregistrer" : "Programmer"}</Btn></div>
      </header>
      {message && <StatusMessage variant="error">{message}</StatusMessage>}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Titre"><Input value={title} onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)} disabled={pending} /></Field>
        <Field label="Discipline"><Select value={category} onChange={(event: ChangeEvent<HTMLSelectElement>) => setCategory(event.target.value)} disabled={pending}><option value="">Choisir</option>{categories.map((item) => <option key={item.id}>{item.name}</option>)}</Select></Field>
        <Field label="Thème"><Select value={subcategory} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSubcategory(event.target.value)} disabled={pending}><option value="">Aucun</option>{subcategories.map((item) => <option key={item.id}>{item.name}</option>)}</Select></Field>
        <Field label="RPE global attendu"><Select value={globalRpe} onChange={(event: ChangeEvent<HTMLSelectElement>) => setGlobalRpe(event.target.value)} disabled={pending}><option value="">Optionnel</option>{[1,2,3,4,5,6,7,8,9,10].map((value) => <option key={value} value={value}>{value}/10</option>)}</Select></Field>
        {hasSpecific && <Field label="RPE spécifique attendu"><Select value={specificRpe} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSpecificRpe(event.target.value)} disabled={pending}><option value="">Optionnel</option>{[1,2,3,4,5,6,7,8,9,10].map((value) => <option key={value} value={value}>{value}/10</option>)}</Select></Field>}
        <Field label="Consignes coach" className="md:col-span-2"><Textarea value={description} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDescription(event.target.value)} rows={3} disabled={pending} /></Field>
      </div>
      <StructuredWorkoutBuilder value={document} onChange={setDocument} />
    </section>
  );
}
