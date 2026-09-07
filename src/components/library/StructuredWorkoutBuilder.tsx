"use client";

import { useMemo, type ChangeEvent } from "react";

import { Btn, Field, Input, Select, StatusMessage } from "@/components/ui/ui";
import { ZONES } from "@/lib/platformDefaults";
import {
  deriveWorkoutMetrics,
  formatWorkoutDurationV2,
  getCompactWorkoutBlocksV2,
  validateWorkoutStructureV2,
  type AtomicStepKindV2,
  type AtomicStepV2,
  type WorkoutBlockV2,
  type WorkoutStructureV2,
  type WorkoutZoneV2,
} from "@/services/workout-structure-v2";

const kinds: Array<{ value: AtomicStepKindV2; label: string }> = [
  { value: "warmup", label: "Échauffement" }, { value: "effort", label: "Effort" }, { value: "recovery", label: "Récupération" }, { value: "transition", label: "Transition" }, { value: "cooldown", label: "Retour au calme" }, { value: "free", label: "Libre" },
];

const makeStep = (kind: AtomicStepKindV2 = "effort"): AtomicStepV2 => ({ durationSeconds: 300, id: crypto.randomUUID(), isSpecific: false, kind });

function cloneBlock(block: WorkoutBlockV2): WorkoutBlockV2 {
  return block.kind === "repeat"
    ? { ...block, id: crypto.randomUUID(), steps: block.steps.map((step) => ({ ...step, id: crypto.randomUUID() })) }
    : { ...block, id: crypto.randomUUID() };
}

export function emptyWorkoutStructureV2(): WorkoutStructureV2 { return { blocks: [], schemaVersion: 1 }; }

export default function StructuredWorkoutBuilder({ value, onChange }: { value: WorkoutStructureV2; onChange: (value: WorkoutStructureV2) => void }) {
  const validation = useMemo(() => validateWorkoutStructureV2(value), [value]);
  const metrics = useMemo(() => value.blocks.length && validation.valid ? deriveWorkoutMetrics(value) : { specificDurationSeconds: 0, totalDurationSeconds: 0 }, [validation.valid, value]);
  const update = (blocks: WorkoutBlockV2[]) => onChange({ ...value, blocks });
  const replace = (index: number, block: WorkoutBlockV2) => update(value.blocks.map((item, itemIndex) => itemIndex === index ? block : item));
  const move = (from: number, to: number) => { if (to < 0 || to >= value.blocks.length) return; const blocks = [...value.blocks]; const [item] = blocks.splice(from, 1); blocks.splice(to, 0, item); update(blocks); };
  const renderStep = (step: AtomicStepV2, save: (next: AtomicStepV2) => void, label: string, canRemove: boolean) => <div key={step.id} className="grid items-end gap-2 border-t border-zinc-800 py-3 sm:grid-cols-[minmax(7rem,1fr)_6rem_6rem_auto_auto]">
    <Field label={label}><Select value={step.kind} onChange={(event: ChangeEvent<HTMLSelectElement>) => save({ ...step, kind: event.target.value as AtomicStepKindV2 })}>{kinds.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</Select></Field>
    <Field label="Secondes"><Input type="number" min="1" value={step.durationSeconds} onChange={(event: ChangeEvent<HTMLInputElement>) => save({ ...step, durationSeconds: Math.max(1, Number(event.target.value)) })} /></Field>
    <Field label="Zone"><Select value={step.intensity?.zone || ""} onChange={(event: ChangeEvent<HTMLSelectElement>) => save({ ...step, intensity: event.target.value ? { ...step.intensity, zone: event.target.value as WorkoutZoneV2 } : undefined })}><option value="">Libre</option>{ZONES.map((zone) => <option key={zone}>{zone}</option>)}</Select></Field>
    <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={step.isSpecific} onChange={(event) => save({ ...step, isSpecific: event.target.checked })} /> Partie spécifique</label>
    <Btn type="button" aria-label={`Supprimer ${label}`} disabled={!canRemove} onClick={() => save({ ...step, durationSeconds: 0 })}>×</Btn>
    <details className="sm:col-span-5"><summary className="cursor-pointer text-xs text-zinc-400">Cible avancée (CP / RPE)</summary><div className="mt-2 grid gap-2 sm:grid-cols-3"><Field label="CP min %"><Input type="number" min="1" max="300" value={step.intensity?.powerPercentCp?.min ?? ""} onChange={(event: ChangeEvent<HTMLInputElement>) => { const min = Number(event.target.value); const max = step.intensity?.powerPercentCp?.max ?? min; save({ ...step, intensity: Number.isFinite(min) && min > 0 ? { ...step.intensity, powerPercentCp: { min, max: Math.max(min, max) } } : step.intensity?.zone ? { zone: step.intensity.zone } : undefined }); }} /></Field><Field label="CP max %"><Input type="number" min="1" max="300" value={step.intensity?.powerPercentCp?.max ?? ""} onChange={(event: ChangeEvent<HTMLInputElement>) => { const max = Number(event.target.value); const min = step.intensity?.powerPercentCp?.min ?? max; save({ ...step, intensity: Number.isFinite(max) && max > 0 ? { ...step.intensity, powerPercentCp: { min: Math.min(min, max), max } } : step.intensity?.zone ? { zone: step.intensity.zone } : undefined }); }} /></Field><Field label="RPE cible"><Select value={step.intensity?.targetRpe?.toString() ?? ""} onChange={(event: ChangeEvent<HTMLSelectElement>) => save({ ...step, intensity: event.target.value ? { ...step.intensity, targetRpe: Number(event.target.value) } : step.intensity?.zone || step.intensity?.powerPercentCp ? { ...step.intensity, targetRpe: undefined } : undefined })}><option value="">Aucun</option>{[1,2,3,4,5,6,7,8,9,10].map((level) => <option key={level} value={level}>{level}/10</option>)}</Select></Field></div></details>
  </div>;

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]"><section aria-label="Éditeur de structure" className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">Déroulé structuré</h3><p className="text-sm text-zinc-400">Durées et partie spécifique calculées automatiquement.</p></div><div className="flex gap-2"><Btn type="button" onClick={() => update([...value.blocks, makeStep("warmup")])}>+ Bloc</Btn><Btn type="button" onClick={() => update([...value.blocks, { id: crypto.randomUUID(), kind: "repeat", repetitions: 4, steps: [makeStep("effort"), makeStep("recovery")] }])}>+ Répétition</Btn></div></div>{!validation.valid && value.blocks.length > 0 && <StatusMessage variant="error">La structure doit contenir des étapes valides avec une durée positive.</StatusMessage>}{value.blocks.map((block, index) => <div key={block.id} className="border-y border-zinc-800 py-2"><div className="flex items-center gap-2"><span className="text-xs text-zinc-500">{index + 1}</span><div className="ml-auto flex gap-1"><Btn type="button" aria-label="Monter le bloc" onClick={() => move(index, index - 1)}>↑</Btn><Btn type="button" aria-label="Descendre le bloc" onClick={() => move(index, index + 1)}>↓</Btn><Btn type="button" aria-label="Dupliquer le bloc" onClick={() => update([...value.blocks.slice(0, index + 1), cloneBlock(block), ...value.blocks.slice(index + 1)])}>Dupliquer</Btn><Btn type="button" aria-label="Supprimer le bloc" onClick={() => update(value.blocks.filter((_, itemIndex) => itemIndex !== index))}>×</Btn></div></div>{block.kind === "repeat" ? <><div className="grid gap-2 sm:grid-cols-[1fr_7rem]"><Field label="Répétitions"><Input type="number" min="1" max="100" value={block.repetitions} onChange={(event: ChangeEvent<HTMLInputElement>) => replace(index, { ...block, repetitions: Math.max(1, Number(event.target.value)) })} /></Field><div className="self-end text-sm font-semibold">{block.repetitions} ×</div></div>{block.steps.map((step, stepIndex) => renderStep(step, (next) => next.durationSeconds ? replace(index, { ...block, steps: block.steps.map((item, itemIndex) => itemIndex === stepIndex ? next : item) }) : replace(index, { ...block, steps: block.steps.filter((_, itemIndex) => itemIndex !== stepIndex) }), `Étape ${stepIndex + 1}`, block.steps.length > 1))}<Btn type="button" onClick={() => replace(index, { ...block, steps: [...block.steps, makeStep()] })}>+ Étape</Btn></> : renderStep(block, (next) => next.durationSeconds ? replace(index, next) : update(value.blocks.filter((_, itemIndex) => itemIndex !== index)), "Bloc", true)}</div>)}</section><aside className="space-y-3 border-l border-zinc-800 pl-0 xl:pl-5"><h3 className="font-semibold">Prévisualisation athlète</h3><p className="text-sm text-zinc-400">{value.blocks.length && validation.valid ? getCompactWorkoutBlocksV2(value).map((block) => `${block.title} ${block.detail}`).join(" · ") : "Ajoute un premier bloc."}</p><div className="border-t border-zinc-800 pt-3 text-sm"><div>Durée totale <strong>{metrics.totalDurationSeconds ? formatWorkoutDurationV2(metrics.totalDurationSeconds) : "—"}</strong></div><div>Spécifique <strong>{metrics.specificDurationSeconds ? formatWorkoutDurationV2(metrics.specificDurationSeconds) : "Aucune"}</strong></div></div></aside></div>;
}
