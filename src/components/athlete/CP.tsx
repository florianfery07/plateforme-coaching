// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { Btn, Empty, Field, Input, Panel, Select, StatusMessage } from "@/components/ui/ui";
import { supabase } from "@/lib/supabase";
import { zoneWatts } from "@/lib/trainingUtils";

export default function CP({ athlete: a, updateAthlete, cpData }) {
  const [testHistory, setTestHistory] = useState([]);
  const currentYear = new Date().getFullYear();
  const [testHistoryYear, setTestHistoryYear] = useState(currentYear);
  const [feedback, setFeedback] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

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

  const archiveTest = async (confirmed = false) => {
    if (!cpData) return;

    const duplicates = testHistory.filter(
      (item) =>
        String(item.power5 || "") === String(a.power5 || "") &&
        String(item.power12 || "") === String(a.power12 || "") &&
        String(item.power20 || "") === String(a.power20 || "") &&
        String(item.weight || "") === String(a.weight || "")
    );

    if (duplicates.length && !confirmed) {
      setPendingAction({ type: "duplicate", count: duplicates.length });
      return;
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
      setFeedback({ variant: "error", message: "Le test ne peut pas être archivé pour le moment." });
      return;
    }

    setPendingAction(null);
    await loadTestHistory();
    setFeedback({ variant: "success", message: "Le test a été ajouté à l’historique." });
  };

  const deleteArchivedTest = async (testId) => {
    const { error } = await supabase
      .from("athlete_test_history")
      .delete()
      .eq("id", testId);

    if (error) {
      console.error(error);
      setFeedback({ variant: "error", message: "Le test archivé ne peut pas être supprimé pour le moment." });
      return;
    }

    setPendingAction(null);
    await loadTestHistory();
    setFeedback({ variant: "success", message: "Le test archivé a été supprimé." });
  };

  return (
    <Panel>
      <div className="mb-5 flex flex-col gap-3 border-b border-zinc-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Suivi de performance</p>
          <h2 className="mt-1 text-2xl font-semibold">Tests principaux</h2>
          <p className="mt-1 text-sm text-zinc-400">Puissance critique, zones d’entraînement et historique de référence.</p>
        </div>
        {cpData && <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200">Zones calculées</span>}
      </div>

      {feedback && <StatusMessage variant={feedback.variant} className="mb-5"><div className="flex items-start justify-between gap-3"><span>{feedback.message}</span><button type="button" aria-label="Fermer le message" onClick={() => setFeedback(null)} className="min-h-7 min-w-7 rounded-lg transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">×</button></div></StatusMessage>}

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
                className="rounded-2xl border border-zinc-700 bg-zinc-950/50 p-4 text-center"
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

          <Btn variant="primary" onClick={archiveTest} className="mt-5">
            Archiver le test
          </Btn>

          {pendingAction?.type === "duplicate" && (
            <div role="region" aria-label="Confirmation d’ajout d’un test similaire" className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-100">Un test aux valeurs identiques existe déjà {pendingAction.count > 1 ? `${pendingAction.count} fois` : "dans l’historique"}. Voulez-vous l’archiver tout de même ?</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row"><Btn variant="primary" onClick={() => archiveTest(true)}>Archiver quand même</Btn><Btn onClick={() => setPendingAction(null)}>Annuler</Btn></div>
            </div>
          )}

          <div className="mt-5 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold">Historique des tests</h3>

              <div className="flex items-end gap-2">
                <Field label="Année">
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
                </Field>

                <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300">
                  {filteredTestHistory.length}
                </span>
              </div>
            </div>

            {filteredTestHistory.length === 0 && (
              <Empty text="Aucun test archivé pour cette année." />
            )}

            {filteredTestHistory.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><div className="font-bold">{formatDate(item.archived_at)}</div><p className="mt-1 text-xs text-zinc-500">Test archivé</p></div>
                  <Btn variant="danger" onClick={() => setPendingAction({ type: "delete", id: item.id })}>Supprimer</Btn>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 xl:grid-cols-6">
                  {[["5 min", `${item.power5} W`], ["12 min", `${item.power12} W`], ["20 min", `${item.power20} W`], ["Poids", item.weight], ["CP", `${item.cp} W`], ["W/kg", item.watts_per_kg || "—"]].map(([label, value]) => <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"><div className="text-xs text-zinc-500">{label}</div><div className="mt-1 font-bold text-zinc-100">{value || "—"}</div></div>)}
                </div>
                {pendingAction?.type === "delete" && pendingAction.id === item.id && <div role="region" aria-label="Confirmation de suppression du test" className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 p-4"><p className="text-sm text-red-50">Supprimer définitivement ce test archivé ?</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Btn variant="danger" onClick={() => deleteArchivedTest(item.id)}>Supprimer le test</Btn><Btn onClick={() => setPendingAction(null)}>Annuler</Btn></div></div>}
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
