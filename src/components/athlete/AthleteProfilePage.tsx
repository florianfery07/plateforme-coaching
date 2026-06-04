// @ts-nocheck
"use client";

import {
  Field,
  Input,
  Panel,
  Textarea,
} from "@/components/ui/ui";

export default function AthleteProfilePage({
  athlete,
  updateAthlete,
}) {
  const a = athlete;

  return (
    <>
      <Panel className="h-fit">
        <h2 className="mb-2 text-2xl font-semibold">
          Fiche de {a.name}
        </h2>

        <div className="space-y-4">
          {[
            ["Nom", "name"],
            ["Nom du calendrier", "calendarName"],
            ["Email", "email"],
            ["Âge", "age"],
            ["Taille", "height"],
            ["Poids", "weight"],
          ].map(([label, key]) => (
            <Field key={key} label={label}>
              <Input
                value={a[key]}
                onChange={(event) => updateAthlete(key, event.target.value)}
              />
            </Field>
          ))}
        </div>
      </Panel>

      <Panel>
        <h2 className="mb-4 text-2xl font-semibold">
          Objectifs et contexte
        </h2>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ["Court terme", "shortGoal"],
            ["Moyen terme", "mediumGoal"],
            ["Long terme", "longGoal"],
          ].map(([label, key]) => (
            <Field key={key} label={label}>
              <Textarea
                value={a[key]}
                onChange={(event) => updateAthlete(key, event.target.value)}
                rows={4}
              />
            </Field>
          ))}
        </div>

        <Field label="Contexte">
          <Textarea
            value={a.context}
            onChange={(event) => updateAthlete("context", event.target.value)}
            rows={5}
          />
        </Field>
      </Panel>

      <Panel>
        <h2 className="mb-2 text-2xl font-semibold">
          Invitation individuelle
        </h2>

        <p className="text-sm text-zinc-400">
          Lien prévu : https://myrideplan.vercel.app/?invite={a.inviteToken}
        </p>

        <div className="mt-3 rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-sm">
          <div className="text-zinc-400">Code invitation</div>

          <div className="mt-1 font-mono text-lg font-bold">
            {a.inviteToken}
          </div>
        </div>
      </Panel>
    </>
  );
}