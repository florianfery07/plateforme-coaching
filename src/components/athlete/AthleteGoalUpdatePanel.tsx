// @ts-nocheck
"use client";

import { useState } from "react";
import { Btn, Panel } from "@/components/ui/ui";

export default function AthleteGoalUpdatePanel({ athlete, validateGoalUpdate }) {
  const [draftGoals, setDraftGoals] = useState({
    shortGoal: athlete?.shortGoal || "",
    mediumGoal: athlete?.mediumGoal || "",
    longGoal: athlete?.longGoal || "",
  });

  function updateDraft(field, value) {
    setDraftGoals((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit() {
    await validateGoalUpdate(draftGoals);
  }

  return (
    <Panel>
      <div className="mb-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
        <h2 className="font-bold text-amber-200">Mise à jour des objectifs demandée</h2>
        <p className="mt-1 text-sm text-zinc-300">
          Ton coach te demande d&apos;actualiser tes objectifs. Remplis les trois champs puis valide.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          ["Court terme (~6 mois)", "shortGoal"],
          ["Moyen terme (1 à 2 ans)", "mediumGoal"],
          ["Long terme (3 à 4 ans)", "longGoal"],
        ].map(([label, key]) => (
          <div key={key}>
            <div className="mb-2 text-sm font-semibold text-zinc-300">{label}</div>
            <textarea
              rows={5}
              value={draftGoals[key]}
              onChange={(e) => updateDraft(key, e.target.value)}
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-white"
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Btn onClick={handleSubmit}>Valider mes objectifs</Btn>
      </div>
    </Panel>
  );
}
