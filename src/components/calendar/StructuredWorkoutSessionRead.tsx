"use client";

import { useEffect, useMemo, useState } from "react";

import { Empty, StatusMessage } from "@/components/ui/ui";
import {
  deriveWorkoutMetrics,
  formatWorkoutDurationV2,
  getCompactWorkoutBlocksV2,
  type WorkoutStructureV2,
} from "@/services/workout-structure-v2";
import { createWorkoutStructureV2PersistenceService } from "@/services/workout-structure-v2-persistence";
import { workoutStructureV2Repository } from "@/services/workout-structure-v2-repository";

const service = createWorkoutStructureV2PersistenceService(workoutStructureV2Repository);

type Props = {
  calendarWorkoutId: string;
  onLoaded?: (structure: WorkoutStructureV2) => void;
};

export default function StructuredWorkoutSessionRead({ calendarWorkoutId, onLoaded }: Props) {
  const [document, setDocument] = useState<WorkoutStructureV2 | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let current = true;
    void service.getCalendar(calendarWorkoutId)
      .then((result) => {
        if (!current || !result) return;
        setDocument(result.document);
        onLoaded?.(result.document);
      })
      .catch(() => current && setError(true));
    return () => { current = false; };
  }, [calendarWorkoutId, onLoaded]);

  const blocks = useMemo(() => document ? getCompactWorkoutBlocksV2(document) : [], [document]);
  const metrics = useMemo(() => document ? deriveWorkoutMetrics(document) : null, [document]);

  if (error) return <StatusMessage variant="error">La structure de cette séance n’est pas disponible.</StatusMessage>;
  if (!document) return <p className="text-sm text-zinc-500">Chargement du déroulé structuré…</p>;
  if (!blocks.length) return <Empty text="Cette séance structurée ne contient pas encore d’étape lisible." />;

  return (
    <section className="border-b border-zinc-800 pb-4" aria-label="Déroulé structuré">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Déroulé structuré</p>
      <div className="mt-2 space-y-2">
        {blocks.map((block) => (
          <div key={block.id} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 text-zinc-100">{block.title}</span>
            <span className="shrink-0 text-xs text-zinc-400">{block.detail}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-500">Durée calculée · {metrics ? formatWorkoutDurationV2(metrics.totalDurationSeconds) : "—"}</p>
    </section>
  );
}
