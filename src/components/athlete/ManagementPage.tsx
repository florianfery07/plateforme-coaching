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

  return (
    <Panel>
      <h2 className="mb-2 text-2xl font-semibold">
        Ma gestion des athlètes & calendriers
      </h2>

      <p className="mb-5 text-sm text-zinc-400">
        Ajout ou suppression d’athlètes dans un espace séparé.
      </p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
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

        <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
          <h3 className="mb-3 text-lg font-semibold">Supprimer un calendrier</h3>

          <div className="space-y-3">
            {athletes.map((athleteItem) => (
              <div
                key={athleteItem.id}
                className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <b>{athleteItem.name}</b>
                    <div className="text-xs text-zinc-500">
                      {athleteItem.calendarName}
                    </div>
                  </div>

                  <Btn
                    variant="danger"
                    onClick={() => setConfirmDelete(athleteItem.id)}
                    className={athletes.length <= 1 ? "opacity-40" : ""}
                    disabled={athletes.length <= 1}
                  >
                    Supprimer
                  </Btn>
                </div>

                {confirmDelete === athleteItem.id && (
                  <div className="mt-4 rounded-2xl border border-red-500 bg-zinc-950 p-4">
                    <div className="text-sm text-zinc-300">
                      Confirmer la suppression de <b>{athleteItem.name}</b> ?
                      Cette action retirera son calendrier, ses propositions et
                      ses données de séances.
                    </div>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Btn
                        variant="danger"
                        onClick={() => {
                          deleteAthlete(athleteItem.id);
                          setConfirmDelete(null);
                        }}
                      >
                        Confirmer
                      </Btn>

                      <Btn onClick={() => setConfirmDelete(null)}>Annuler</Btn>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}