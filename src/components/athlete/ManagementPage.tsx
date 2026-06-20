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

  athleteGroups = [],
  athleteGroupMembers = [],
  newGroupName,
  setNewGroupName,
  addAthleteGroup,
  renameAthleteGroup,
  deleteAthleteGroup,
  toggleAthleteGroupMember,
}) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [managementTab, setManagementTab] = useState("athletes");
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

  return (
    <Panel>
      <h2 className="mb-2 text-2xl font-semibold">Paramètres athlètes</h2>
      <p className="mb-5 text-sm text-zinc-400">
        Gérez les athlètes, leurs calendriers, leurs groupes et leurs réglages individuels.
      </p>

      <div className="mb-6 flex gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 p-1">
        <button
          type="button"
          onClick={() => setManagementTab("athletes")}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold ${
            managementTab === "athletes"
              ? "bg-white text-zinc-950"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Athlètes
        </button>

        <button
          type="button"
          onClick={() => setManagementTab("groups")}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold ${
            managementTab === "groups"
              ? "bg-white text-zinc-950"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Groupes
        </button>
      </div>

      {managementTab === "athletes" && (
        <>
          <div className="mb-6 rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
            <h3 className="mb-3 text-lg font-semibold">Ajouter un athlète</h3>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={newAthlete}
                onChange={(event) => setNewAthlete(event.target.value)}
                placeholder="Nom de l’athlète"
              />
              <Btn variant="primary" onClick={addAthlete}>+ Ajouter</Btn>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="space-y-4">
              <AthleteList title="Athlètes actifs" athletes={activeAthletes} selectedAthlete={selectedAthlete} setSelectedAthleteId={setSelectedAthleteId} setConfirmDelete={setConfirmDelete} />
              <AthleteList title="Athlètes archivés" athletes={inactiveAthletes} selectedAthlete={selectedAthlete} setSelectedAthleteId={setSelectedAthleteId} setConfirmDelete={setConfirmDelete} />
            </div>

            <div className="space-y-4 xl:col-span-2">
              {selectedAthlete && (
                <>
                  <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
                    <h3 className="mb-4 text-lg font-semibold">
                      Paramètres de {selectedAthlete.name}
                    </h3>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FieldInput label="Nom de l’athlète" value={selectedAthlete.name || ""} onChange={(value) => updateSelectedAthlete("name", value)} />
                      <FieldInput label="Email" value={selectedAthlete.email || ""} onChange={(value) => updateSelectedAthlete("email", value)} />

                      <InfoCard label="Calendrier" value={selectedAthlete.calendarName || "Non renseigné"} />
                      <InfoCard label="Compte athlète" value={selectedAthlete.user_id ? "Compte lié" : "Non lié"} />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
                    <h3 className="mb-3 text-lg font-semibold">Fonctionnalités individuelles</h3>
                    <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold">Statut de l’athlète</div>
                          <p className="mt-1 text-sm text-zinc-400">
                            Actif : accès autorisé. Archivé : l’athlète disparaît de la sélection principale et sa connexion est bloquée.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => updateSelectedAthlete("active", selectedAthlete.active === false)}
                          className={`rounded-2xl px-4 py-2 text-sm font-bold ${
                            selectedAthlete.active === false
                              ? "bg-zinc-700 text-zinc-200"
                              : "bg-green-500/20 text-green-300"
                          }`}
                        >
                          {selectedAthlete.active === false ? "Archivé" : "Actif"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold">Demande de mise à jour des objectifs</div>
                        <p className="mt-1 text-sm text-zinc-400">
                          Envoie une notification à l’athlète pour qu’il mette à jour ses objectifs court, moyen et long terme.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedAthlete(
                            "goalUpdateRequested",
                            !selectedAthlete.goalUpdateRequested
                          )
                        }
                        className={
                          selectedAthlete.goalUpdateRequested
                            ? "rounded-2xl border border-amber-500/40 px-4 py-2 text-sm font-bold text-amber-300"
                            : "rounded-2xl bg-white px-4 py-2 text-sm font-bold text-zinc-950"
                        }
                      >
                        {selectedAthlete.goalUpdateRequested ? "Annuler la demande" : "Envoyer"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
                    <h3 className="mb-3 text-lg font-semibold">Suppression</h3>
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
                        </div>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <Btn
                            variant="danger"
                            onClick={() => {
                              deleteAthlete(selectedAthlete.id);
                              setConfirmDelete(null);
                            }}
                          >
                            Supprimer définitivement
                          </Btn>
                          <Btn onClick={() => setConfirmDelete(null)}>Annuler</Btn>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {managementTab === "groups" && (
        <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Groupes d’athlètes</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Créez des groupes pour préparer ensuite des séances collectives, des stages ou des entraînements par catégorie.
            </p>
          </div>

          <div className="mb-5 rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
            <h4 className="mb-3 font-semibold">Créer un groupe</h4>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={newGroupName || ""}
                onChange={(event) => setNewGroupName(event.target.value)}
                placeholder="Ex : Cadets, Stage VTT, Groupe route"
              />
              <Btn
                variant="primary"
                onClick={() => {
                  addAthleteGroup();
                }}
                disabled={!String(newGroupName || "").trim()}
                className={!String(newGroupName || "").trim() ? "opacity-40" : ""}
              >
                + Créer
              </Btn>
            </div>
          </div>

          {athleteGroups.length === 0 && (
            <p className="rounded-2xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
              Aucun groupe créé pour le moment.
            </p>
          )}

          <div className="space-y-3">
            {athleteGroups.map((group) => {
              const memberCount = athleteGroupMembers.filter(
                (member) => member.group_id === group.id
              ).length;

              return (
                <div
                  key={group.id}
                  className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 text-xs text-zinc-500">Nom du groupe</div>
                      <Input
                        value={group.name || ""}
                        onChange={(event) => renameAthleteGroup(group.id, event.target.value)}
                        onBlur={(event) => renameAthleteGroup(group.id, event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.currentTarget.blur();
                          }
                        }}
                      />
                      <div className="mt-2 text-xs text-zinc-500">
                        {memberCount} athlète{memberCount > 1 ? "s" : ""} dans ce groupe
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300">
                      Groupe
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );
}

function AthleteList({ title, athletes, selectedAthlete, setSelectedAthleteId, setConfirmDelete }) {
  return (
    <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
      <h3 className="mb-3 text-lg font-semibold">
        {title} ({athletes.length})
      </h3>
      <div className="space-y-3">
        {athletes.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
            Aucun athlète.
          </p>
        )}

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
            <div className="flex items-center justify-between gap-3">
              <div>
                <b>{athleteItem.name}</b>
                <div className="mt-1 text-xs text-zinc-500">{athleteItem.calendarName}</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                athleteItem.active === false
                  ? "bg-zinc-700 text-zinc-300"
                  : "bg-green-500/20 text-green-300"
              }`}>
                {athleteItem.active === false ? "Archivé" : "Actif"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FieldInput({ label, value, onChange }) {
  return (
    <div>
      <div className="mb-2 text-xs text-zinc-500">{label}</div>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}