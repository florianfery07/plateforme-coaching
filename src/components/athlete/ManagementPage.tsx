// @ts-nocheck
"use client";

import { useState } from "react";

import { Btn, Input, Panel } from "@/components/ui/ui";

export default function ManagementPage({
  athletes,
  newAthlete,
  setNewAthlete,
  addAthlete,
  deleteAthlete,
}) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState(
    athletes?.[0]?.id || null
  );

  const selectedAthlete =
    athletes.find((athlete) => athlete.id === selectedAthleteId) ||
    athletes?.[0];

  return (
    <Panel>
      <h2 className="mb-2 text-2xl font-semibold">
        Paramètres athlètes
      </h2>

      <p className="mb-5 text-sm text-zinc-400">
        Gérez les athlètes, leurs calendriers et les futurs réglages individuels.
      </p>

      <div className="mb-6 rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
        <h3 className="mb-3 text-lg font-semibold">Ajouter un athlète</h3>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={newAthlete}
            onChange={(event) => setNewAthlete(event.target.value)}
            placeholder="Nom de l’athlète"
          />

          <Btn variant="primary" onClick={addAthlete}>
            + Ajouter
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
          <h3 className="mb-3 text-lg font-semibold">
            Liste des athlètes
          </h3>

          <div className="space-y-3">
            {athletes.map((athleteItem) => (
              <button
                key={athleteItem.id}
                type="button"
                onClick={() => {
                  setSelectedAthleteId(athleteItem.id);
                  setConfirmDelete(null);
                }}
                className={`w-full rounded-2xl border p-4 text-left ${
                  selectedAthlete?.id === athleteItem.id
                    ? "border-white bg-zinc-950"
                    : "border-zinc-700 bg-zinc-900"
                }`}
              >
                <b>{athleteItem.name}</b>

                <div className="mt-1 text-xs text-zinc-500">
                  {athleteItem.calendarName}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 xl:col-span-2">
          {selectedAthlete && (
            <>
              <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
                <h3 className="mb-3 text-lg font-semibold">
                  Paramètres de {selectedAthlete.name}
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
                    <div className="text-xs text-zinc-500">Nom</div>
                    <div className="mt-1 font-semibold">
                      {selectedAthlete.name || "Non renseigné"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
                    <div className="text-xs text-zinc-500">Calendrier</div>
                    <div className="mt-1 font-semibold">
                      {selectedAthlete.calendarName || "Non renseigné"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
                    <div className="text-xs text-zinc-500">Email</div>
                    <div className="mt-1 font-semibold">
                      {selectedAthlete.email || "Non renseigné"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
                    <div className="text-xs text-zinc-500">Compte athlète</div>
                    <div className="mt-1 font-semibold">
                      {selectedAthlete.user_id ? "Compte lié" : "Non lié"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
                <h3 className="mb-3 text-lg font-semibold">
                  Fonctionnalités individuelles
                </h3>

                <p className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-400">
                  Zone prévue pour activer ou désactiver plus tard certaines
                  fonctionnalités selon l’athlète : propositions de séance,
                  feedback RPE, motivation, plaisir, statistiques visibles,
                  suivi hebdo, etc.
                </p>
              </div>

              <div className="rounded-3xl border border-red-500/40 bg-zinc-900 p-5">
                <h3 className="mb-3 text-lg font-semibold text-red-300">
                  Zone danger
                </h3>

                <Btn
                  variant="danger"
                  onClick={() => setConfirmDelete(selectedAthlete.id)}
                  className={athletes.length <= 1 ? "opacity-40" : ""}
                  disabled={athletes.length <= 1}
                >
                  Supprimer cet athlète
                </Btn>

                {confirmDelete === selectedAthlete.id && (
                  <div className="mt-4 rounded-2xl border border-red-500 bg-zinc-950 p-4">
                    <div className="text-sm text-zinc-300">
                      Confirmer la suppression de <b>{selectedAthlete.name}</b> ?
                      Cette action retirera son calendrier, ses propositions et
                      ses données de séances.
                    </div>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Btn
                        variant="danger"
                        onClick={() => {
                          deleteAthlete(selectedAthlete.id);
                          setConfirmDelete(null);
                        }}
                      >
                        Confirmer
                      </Btn>

                      <Btn onClick={() => setConfirmDelete(null)}>
                        Annuler
                      </Btn>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}