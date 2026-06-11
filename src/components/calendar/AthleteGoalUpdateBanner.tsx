

// @ts-nocheck
"use client";

import { Btn } from "@/components/ui/ui";

export default function AthleteGoalUpdateBanner({
  athlete,
  updateAthlete,
}) {
  if (!athlete?.goalUpdateRequested) {
    return null;
  }

  return (
    <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="font-semibold text-amber-200">
        Mise à jour des objectifs demandée
      </div>

      <p className="mt-2 text-sm text-amber-100">
        Ton coach te demande de mettre à jour tes objectifs court terme (3 mois),
        moyen terme (1 an) et long terme (3 ans).
      </p>

      <Btn
        className="mt-3"
        onClick={() =>
          updateAthlete("goalUpdateRequested", false)
        }
      >
        J’ai terminé la mise à jour
      </Btn>
    </div>
  );
}