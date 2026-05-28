// @ts-nocheck
"use client";

import { Empty, Field, Input, Panel } from "@/components/ui/ui";
import { zoneWatts } from "@/lib/trainingUtils";

export default function CP({ athlete: a, updateAthlete, cpData }) {
  return (
    <Panel>
      <h2 className="mb-2 text-2xl font-semibold">
        Tests principaux — puissance critique
      </h2>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {[
          ["5 min", "power5"],
          ["12 min", "power12"],
          ["20 min", "power20"],
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

      {cpData ? (
        <>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              ["CP", `${cpData.cp} W`],
              ["W′", `${cpData.wPrime} J`],
              ["W/kg", cpData.wattsPerKg],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-center"
              >
                <div className="text-sm text-zinc-400">{label}</div>
                <div className="text-3xl font-bold">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {cpData.zones.map((zone) => (
              <div
                key={zone.id}
                className="flex justify-between rounded-2xl border border-zinc-700 bg-zinc-800 p-4"
              >
                <span>
                  {zone.id} — {zone.name}
                </span>
                <b>{zoneWatts(zone.id, cpData)}</b>
              </div>
            ))}
          </div>
        </>
      ) : (
        <Empty text="Renseigne les tests pour générer les zones." />
      )}
    </Panel>
  );
}