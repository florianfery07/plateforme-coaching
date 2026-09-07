"use client";

import { useEffect, useState } from "react";

import { Btn, Field, Input, Select, StatusMessage, Textarea } from "@/components/ui/ui";
import { createWorkoutStructureV2PersistenceService } from "@/services/workout-structure-v2-persistence";
import { workoutStructureV2Repository } from "@/services/workout-structure-v2-repository";

import StructuredWorkoutBuilder, { emptyWorkoutStructureV2 } from "./StructuredWorkoutBuilder";

const service = createWorkoutStructureV2PersistenceService(workoutStructureV2Repository);
const key = () => crypto.randomUUID();
const toRpe = (value: string) => value ? Number(value) : null;
type LibraryWorkout = { id: string; title?: string; category?: string; subcategory?: string; description?: string; expectedRpeGlobal?: number | null; expectedRpeSpecific?: number | null };

export default function StructuredWorkoutLibraryPage({ categories, subcategories, editingWorkout, onSaved, onUseLegacy }: {
  categories: Array<{ id: string; name: string }>;
  subcategories: Array<{ id: string; name: string }>;
  editingWorkout?: LibraryWorkout | null;
  onSaved: () => void;
  onUseLegacy: () => void;
}) {
  const editingId = editingWorkout?.id;
  const [title, setTitle] = useState(editingWorkout?.title ?? ""); const [category, setCategory] = useState(editingWorkout?.category ?? ""); const [subcategory, setSubcategory] = useState(editingWorkout?.subcategory ?? ""); const [description, setDescription] = useState(editingWorkout?.description ?? ""); const [globalRpe, setGlobalRpe] = useState(editingWorkout?.expectedRpeGlobal?.toString() ?? ""); const [specificRpe, setSpecificRpe] = useState(editingWorkout?.expectedRpeSpecific?.toString() ?? ""); const [document, setDocument] = useState(emptyWorkoutStructureV2); const [revision, setRevision] = useState<number | null>(null); const [pending, setPending] = useState(Boolean(editingWorkout)); const [message, setMessage] = useState<string | null>(null); const [legacyOnly, setLegacyOnly] = useState(false);
  const hasSpecific = document.blocks.some((block) => block.kind === "repeat" ? block.steps.some((step) => step.isSpecific) : block.isSpecific);

  useEffect(() => {
    if (!editingId) return;
    let active = true;
    void service.getLibrary(editingId).then((structure) => {
      if (!active) return;
      if (!structure) { setLegacyOnly(true); setMessage("Ce modèle reste au format historique. Son édition utilise le constructeur existant."); return; }
      setDocument(structure.document); setRevision(structure.revision);
    }).catch((error) => active && setMessage(error instanceof Error ? error.message : "La séance ne peut pas être chargée.")).finally(() => active && setPending(false));
    return () => { active = false; };
  }, [editingId]);

  const save = async (duplicate = false) => {
    if (!title.trim() || !category || !document.blocks.length) { setMessage("Renseignez un titre, une discipline et au moins un bloc."); return; }
    setPending(true); setMessage(null);
    try {
      if (editingWorkout && !duplicate) {
        if (revision === null) throw new Error("La révision de la séance n’est pas disponible.");
        const result = await service.saveLibrary({ document, expectedRevision: revision, idempotencyKey: key(), targetId: editingWorkout.id });
        setRevision(result.revision);
        setMessage("Nouvelle révision enregistrée.");
        return;
      }
      await service.createLibrary({ title: duplicate ? `${title} (copie)` : title, category, subcategory, description, expectedRpeGlobal: toRpe(globalRpe), expectedRpeSpecific: hasSpecific ? toRpe(specificRpe) : null, document, idempotencyKey: key() });
      onSaved();
    } catch (error) { setMessage(error instanceof Error ? error.message : "La séance n’a pas pu être enregistrée."); }
    finally { setPending(false); }
  };

  return <section className="space-y-5"><header className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-800 pb-4"><div><p className="text-xs font-semibold uppercase text-zinc-500">Bibliothèque V2</p><h2 className="text-2xl font-semibold">{editingWorkout ? "Modifier une séance structurée" : "Créer une séance structurée"}</h2></div><div className="flex gap-2">{editingWorkout && !legacyOnly && <Btn type="button" onClick={() => void save(true)} disabled={pending}>Dupliquer</Btn>}<Btn variant="primary" onClick={() => void save()} disabled={pending || legacyOnly}>{pending ? "Enregistrement…" : editingWorkout ? "Créer une révision" : "Enregistrer"}</Btn></div></header>{message && <StatusMessage variant={legacyOnly ? "info" : "error"}>{message}</StatusMessage>}{legacyOnly ? <Btn type="button" variant="primary" onClick={onUseLegacy}>Ouvrir le constructeur historique</Btn> : <>{editingWorkout && <p className="text-sm text-zinc-400">Cette révision met à jour uniquement le déroulé structuré. Les métadonnées existantes restent inchangées pendant le pilote.</p>}<div className="grid gap-3 md:grid-cols-2"><Field label="Titre"><Input disabled={Boolean(editingWorkout)} value={title} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)} /></Field><Field label="Discipline"><Select disabled={Boolean(editingWorkout)} value={category} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setCategory(event.target.value)}><option value="">Choisir</option>{categories.map((item) => <option key={item.id}>{item.name}</option>)}</Select></Field><Field label="Thème"><Select disabled={Boolean(editingWorkout)} value={subcategory} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setSubcategory(event.target.value)}><option value="">Aucun</option>{subcategories.map((item) => <option key={item.id}>{item.name}</option>)}</Select></Field><Field label="RPE global attendu"><Select disabled={Boolean(editingWorkout)} value={globalRpe} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setGlobalRpe(event.target.value)}><option value="">Optionnel</option>{[1,2,3,4,5,6,7,8,9,10].map((level) => <option key={level} value={level}>{level}/10</option>)}</Select></Field>{hasSpecific && <Field label="RPE spécifique attendu"><Select disabled={Boolean(editingWorkout)} value={specificRpe} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setSpecificRpe(event.target.value)}><option value="">Optionnel</option>{[1,2,3,4,5,6,7,8,9,10].map((level) => <option key={level} value={level}>{level}/10</option>)}</Select></Field>}<Field label="Consigne générale" className="md:col-span-2"><Textarea disabled={Boolean(editingWorkout)} value={description} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(event.target.value)} rows={3} /></Field></div><StructuredWorkoutBuilder value={document} onChange={setDocument} /></>}</section>;
}
