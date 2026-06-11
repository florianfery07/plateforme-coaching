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
  updateAthlete,
}) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState(
    athletes?.[0]?.id || null
  );

  const activeAthletes = athletes.filter((athlete) => athlete.active !== false);
  const inactiveAthletes = athletes.filter((athlete) => athlete.active === false);

  const selectedAthlete =
    athletes.find((athlete) => athlete.id === selectedAthleteId) ||
    activeAthletes?.[0] ||
    inactiveAthletes?.[0];

  const updateSelectedAthlete = (field, value) => {
    if (!selectedAthlete) return;
    updateAthlete(field, value, selectedAthlete.id);
  };

  const AthleteButton = ({ athleteItem }) => (
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <b>{athleteItem.name}</b>
          <div className="mt-1 text-xs text-zinc-500">
            {athleteItem.calendarName}
          </div>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            athleteItem.active === false
              ? "bg-zinc-700 text-zinc-300"
              : "bg-green-500/20 text-green-300"
          }`}
        >
          {athleteItem.active === false ? "Archivé" : "Actif"}
        </span>
      </div>
    </button>
  );

  return (
    <Panel>
      <h2 className="mb-2 text-2xl font-semibold">
        Paramètres athlètes
      </h2>

      <p className="mb-5 text-sm text-zinc-400">
        Gérez les athlètes, leurs calendriers et leurs réglages individuels.
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
        <div className="space-y-4">
          <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
            <h3 className="mb-3 text-lg font-semibold">
              Athlètes actifs ({activeAthletes.length})
            </h3>

            <div className="space-y-3">
              {activeAthletes.length === 0 && (
                <p className="rounded-2xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
                  Aucun athlète actif.
                </p>
              )}

              {activeAthletes.map((athleteItem) => (
                <AthleteButton
                  key={athleteItem.id}
                  athleteItem={athleteItem}
                />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
            <h3 className="mb-3 text-lg font-semibold">
              Athlètes archivés ({inactiveAthletes.length})
            </h3>

            <div className="space-y-3">
              {inactiveAthletes.length === 0 && (
                <p className="rounded-2xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
                  Aucun athlète archivé.
                </p>
              )}

              {inactiveAthletes.map((athleteItem) => (
                <AthleteButton
                  key={athleteItem.id}
                  athleteItem={athleteItem}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 xl:col-span-2">
          {selectedAthlete && (
            <>
              <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
                <h3 className="mb-4 text-lg font-semibold">
                  Paramètres de {selectedAthlete.name}
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-xs text-zinc-500">
                      Nom de l’athlète
                    </div>
                    <Input
                      value={selectedAthlete.name || ""}
                      onChange={(event) =>
                        updateSelectedAthlete("name", event.target.value)
                      }
                    />
                  </div>

                  <div>
                    <div className="mb-2 text-xs text-zinc-500">
                      Email
                    </div>
                    <Input
                      value={selectedAthlete.email || ""}
                      onChange={(event) =>
                        updateSelectedAthlete("email", event.target.value)
                      }
                    />
                  </div>

                  <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
                    <div className="text-xs text-zinc-500">Calendrier</div>
                    <div className="mt-1 font-semibold">
                      {selectedAthlete.calendarName || "Non renseigné"}
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

                <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold">Athlète actif</div>
                      <p className="mt-1 text-sm text-zinc-400">
                        Si l’athlète est désactivé, il passe dans les athlètes
                        archivés et disparaît de la sélection principale.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedAthlete(
                          "active",
                          selectedAthlete.active === false
                        )
                      }
                      className={`rounded-2xl px-4 py-2 text-sm font-bold ${
                        selectedAthlete.active === false
                          ? "bg-zinc-700 text-zinc-200"
                          : "bg-green-500/20 text-green-300"
                      }`}
                    >
                      {selectedAthlete.active === false ? "Non" : "Oui"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold">
                      Demande de mise à jour des objectifs
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">
                      Envoie une notification à l’athlète pour qu’il mette à jour ses objectifs court, moyen et long terme.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateSelectedAthlete("goalUpdateRequested", true)}
                    className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-zinc-950"
                  >
                    Envoyer
                  </button>
                </div>

                {selectedAthlete.goalUpdateRequested && (
                  <p className="mt-3 text-xs text-amber-300">
                    Une demande est déjà en attente pour cet athlète.
                  </p>
                )}
              </div>
              <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
                <h3 className="mb-3 text-lg font-semibold">
                  Suppression
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