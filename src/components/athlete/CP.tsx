// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { Empty, Field, Input, Panel, Select } from "@/components/ui/ui";
import { supabase } from "@/lib/supabase";
import { zoneWatts } from "@/lib/trainingUtils";

export default function CP({ athlete: a, updateAthlete, cpData }) {
  const [testHistory, setTestHistory] = useState([]);
  const currentYear = new Date().getFullYear();
  const [testHistoryYear, setTestHistoryYear] = useState(currentYear);

  const formatDate = (value) => {
    if (!value) return "Date inconnue";
    return new Date(value).toLocaleDateString("fr-FR");
  };

  const testHistoryYears = [
    ...new Set([
      currentYear + 1,
      currentYear,
      currentYear - 1,
      currentYear - 2,
      currentYear - 3,
      currentYear - 4,
      currentYear - 5,
      ...testHistory.map((item) =>
        new Date(item.archived_at).getFullYear()
      ),
    ]),
  ].sort((a, b) => b - a);

  const filteredTestHistory = testHistory.filter(
    (item) =>
      new Date(item.archived_at).getFullYear() === Number(testHistoryYear)
  );

  async function loadTestHistory() {
    if (!a?.id) return;

    const { data, error } = await supabase
      .from("athlete_test_history")
      .select("*")
      .eq("athlete_id", a.id)
      .order("archived_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setTestHistory(data || []);
  }

  useEffect(() => {
    loadTestHistory();
  }, [a?.id]);

  const archiveTest = async () => {
    if (!cpData) return;

    const duplicates = testHistory.filter(
      (item) =>
        String(item.power5 || "") === String(a.power5 || "") &&
        String(item.power12 || "") === String(a.power12 || "") &&
        String(item.power20 || "") === String(a.power20 || "") &&
        String(item.weight || "") === String(a.weight || "")
    );

    if (duplicates.length) {
      const dates = duplicates
        .map((item) => `• ${formatDate(item.archived_at)}`)
        .join("\n");

      const ok = window.confirm(
        `Ce test semble déjà enregistré aux dates suivantes :\n\n${dates}\n\nVoulez-vous quand même l'ajouter ?`
      );

      if (!ok) return;
    }

    const { error } = await supabase
      .from("athlete_test_history")
      .insert({
        athlete_id: a.id,
        power5: a.power5,
        power12: a.power12,
        power20: a.power20,
        weight: a.weight,
        cp: cpData.cp,
        w_prime: cpData.wPrime,
        watts_per_kg: cpData.wattsPerKg,
        zones: cpData.zones,
      });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    await loadTestHistory();
  };

  const deleteArchivedTest = async (testId) => {
    const ok = window.confirm("Supprimer ce test archivé ?");
    if (!ok) return;

    const { error } = await supabase
      .from("athlete_test_history")
      .delete()
      .eq("id", testId);

    if (error) {
      console.error(error);
      alert(error.message || "Erreur suppression test archivé");
      return;
    }

    await loadTestHistory();
  };

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

          <button
            type="button"
            onClick={archiveTest}
            className="mt-5 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-zinc-950"
          >
            Archiver le test
          </button>

          <div className="mt-5 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold">Historique des tests</h3>

              <div className="flex items-center gap-2">
                <Select
                  value={testHistoryYear}
                  onChange={(event) =>
                    setTestHistoryYear(Number(event.target.value))
                  }
                  className="w-32"
                >
                  {testHistoryYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </Select>

                <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300">
                  {filteredTestHistory.length}
                </span>
              </div>
            </div>

            {filteredTestHistory.length === 0 && (
              <p className="text-sm text-zinc-400">
                Aucun test archivé.
              </p>
            )}

            {filteredTestHistory.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold">
                    {formatDate(item.archived_at)}
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteArchivedTest(item.id)}
                    className="rounded-xl border border-red-500/40 px-3 py-1 text-xs font-bold text-red-300"
                  >
                    Supprimer
                  </button>
                </div>

                <div className="mt-2 text-sm text-zinc-300">
                  5 min : {item.power5} W • 12 min : {item.power12} W • 20 min : {item.power20} W • Poids : {item.weight} • CP : {item.cp} W • W/kg : {item.watts_per_kg || "—"}
                </div>
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