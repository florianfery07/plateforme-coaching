// @ts-nocheck
"use client";

import { useEffect, useState } from "react";

import { Panel } from "@/components/ui/ui";
import { supabase } from "@/lib/supabase";

export default function AthleteTestsReadOnly({ athlete, athleteId, cpData }) {
  const [testHistory, setTestHistory] = useState([]);

  useEffect(() => {
    if (!athleteId) return;

    async function loadTestHistory() {
      const { data, error } = await supabase
        .from("athlete_test_history")
        .select("*")
        .eq("athlete_id", athleteId);

      if (error) {
        setTestHistory([]);
        return;
      }

      const sorted = [...(data || [])].sort((a, b) => {
        const dateA = new Date(a.test_date || a.date || a.archived_at || a.created_at || 0).getTime();
        const dateB = new Date(b.test_date || b.date || b.archived_at || b.created_at || 0).getTime();

        return dateB - dateA;
      });

      setTestHistory(sorted);
    }

    loadTestHistory();
  }, [athleteId]);

  const wattsPerKg =
    cpData?.cp && athlete?.weight
      ? cpData.cp / Number(String(athlete.weight).replace(",", "."))
      : null;

  return (
    <div className="space-y-6">
      <Panel>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-bold">Tests actuels</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Lecture seule des valeurs principales renseignées par ton coach.
            </p>
          </div>

          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-400">
            Lecture seule
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <CompactTestCard
            label="CP"
            value={cpData?.cp ? `${Math.round(cpData.cp)} W` : "—"}
          />
          <CompactTestCard
            label="5 min"
            value={athlete?.power5 ? `${athlete.power5} W` : "—"}
          />
          <CompactTestCard
            label="12 min"
            value={athlete?.power12 ? `${athlete.power12} W` : "—"}
          />
          <CompactTestCard
            label="20 min"
            value={athlete?.power20 ? `${athlete.power20} W` : "—"}
          />
          <CompactTestCard
            label="Poids"
            value={athlete?.weight ? `${athlete.weight} kg` : "—"}
          />
          <CompactTestCard
            label="W/kg"
            value={wattsPerKg ? wattsPerKg.toFixed(2) : "—"}
          />
        </div>
      </Panel>

      <Panel>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-bold">Historique des tests</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Les tests archivés permettent de suivre l’évolution au fil de la saison.
            </p>
          </div>

          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-400">
            {testHistory.length} archive{testHistory.length > 1 ? "s" : ""}
          </span>
        </div>

        {testHistory.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
            Aucun test archivé pour le moment.
          </p>
        ) : (
          <div className="space-y-3">
            {testHistory.map((test) => (
              <div
                key={test.id}
                className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="font-bold text-white">
                    {formatDate(test.test_date || test.date || test.archived_at || test.created_at)}
                  </div>

                  <span className="text-xs text-zinc-500">
                    Test archivé
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-6">
                  <HistoryValue
                    label="CP"
                    value={test.cp || test.critical_power}
                    suffix="W"
                  />
                  <HistoryValue
                    label="5 min"
                    value={test.power5 || test.power_5 || test.power_5min}
                    suffix="W"
                  />
                  <HistoryValue
                    label="12 min"
                    value={test.power12 || test.power_12 || test.power_12min}
                    suffix="W"
                  />
                  <HistoryValue
                    label="20 min"
                    value={test.power20 || test.power_20 || test.power_20min}
                    suffix="W"
                  />
                  <HistoryValue
                    label="Poids"
                    value={test.weight}
                    suffix="kg"
                  />
                  <HistoryValue
                    label="W/kg"
                    value={test.wkg || test.watts_per_kg}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function CompactTestCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function HistoryValue({ label, value, suffix = "" }) {
  const cleanValue =
    value || value === 0 ? `${value}${suffix ? ` ${suffix}` : ""}` : "—";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="mt-1 font-bold text-zinc-200">{cleanValue}</div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "Date non renseignée";

  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}