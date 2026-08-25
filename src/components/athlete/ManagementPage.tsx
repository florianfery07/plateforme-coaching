// @ts-nocheck
"use client";

import { useState } from "react";
import { Btn, Input, Panel } from "@/components/ui/ui";
import { APP_COLORS, getColorClass } from "@/lib/colors";

export default function ManagementPage({
  athletes,
  newAthlete,
  setNewAthlete,
  addAthlete,
  deleteAthlete,
  updateAthlete,
  setAthleteActive,
  athleteLifecycleV2Enabled = false,
  athleteLifecyclePendingAthleteId = null,

  athleteGroups = [],
  athleteGroupMembers = [],
  athleteGroupMemberPilotEnabled = false,
  athleteGroupMemberPendingKeys = [],
  athleteGroupCreatePending = false,
  athleteGroupDeletePilotEnabled = false,
  newGroupName,
  setNewGroupName,
  addAthleteGroup,
  renameAthleteGroup,
  deleteAthleteGroup,
  toggleAthleteGroupMember,
}) {
 const [confirmDelete, setConfirmDelete] = useState(null);
const [archivePending, setArchivePending] = useState(false);
const [confirmGroupDelete, setConfirmGroupDelete] = useState(null);
const [groupDeleteSubmitting, setGroupDeleteSubmitting] = useState(null);
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

                    <div className="mt-5 rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
                      <div className="mb-3">
                        <div className="font-semibold">Couleur de l’athlète</div>
                        <p className="mt-1 text-sm text-zinc-400">
                          Cette couleur servira dans les calendriers de groupe pour repérer rapidement chaque athlète.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {APP_COLORS.map(([label, color]) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => updateSelectedAthlete("color", color)}
                            className={`h-9 w-9 rounded-full border-2 ${getColorClass(color)} ${
                              selectedAthlete.color === color
                                ? "border-white ring-2 ring-white/40"
                                : "border-zinc-700"
                            }`}
                            title={label}
                            aria-label={`Choisir la couleur ${label}`}
                          />
                        ))}
                      </div>
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
                          onClick={() => setAthleteActive
                            ? setAthleteActive(selectedAthlete.id, selectedAthlete.active === false)
                            : updateSelectedAthlete("active", selectedAthlete.active === false)}
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
                    <h3 className="mb-3 text-lg font-semibold">{athleteLifecycleV2Enabled ? "Archivage" : "Suppression"}</h3>
                    <Btn
                      variant="danger"
                      onClick={() => setConfirmDelete(selectedAthlete.id)}
                      className={athletes.length <= 1 ? "opacity-40" : ""}
                      disabled={athletes.length <= 1}
                    >
                      {athleteLifecycleV2Enabled ? "Archiver cet athlète" : "Supprimer cet athlète"}
                    </Btn>

                    {confirmDelete === selectedAthlete.id && (
                      <div className="mt-4 rounded-2xl border border-red-500 bg-zinc-950 p-4">
                        <div className="text-sm text-zinc-300">
                          {athleteLifecycleV2Enabled
                            ? <>Archiver <b>{selectedAthlete.name}</b> ? Ses données seront conservées.</>
                            : <>Confirmer la suppression de <b>{selectedAthlete.name}</b> ?</>}
                        </div>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <Btn
                            variant="danger"
                            onClick={() => {
                              if (!athleteLifecycleV2Enabled) {
                                deleteAthlete(selectedAthlete.id);
                                setConfirmDelete(null);
                                return;
                              }
                              if (archivePending) return;
                              setArchivePending(true);
                              void deleteAthlete(selectedAthlete.id).then(
                                () => setConfirmDelete(null),
                                () => undefined,
                              ).finally(() => setArchivePending(false));
                            }}
                            disabled={athleteLifecycleV2Enabled && (archivePending || athleteLifecyclePendingAthleteId === selectedAthlete.id)}
                          >
                            {athleteLifecycleV2Enabled
                              ? archivePending || athleteLifecyclePendingAthleteId === selectedAthlete.id ? "Archivage..." : "Archiver"
                              : "Supprimer définitivement"}
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
                disabled={athleteGroupCreatePending || !String(newGroupName || "").trim()}
                className={
                  athleteGroupCreatePending || !String(newGroupName || "").trim()
                    ? "opacity-40"
                    : ""
                }
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
              const groupMembers = athleteGroupMembers.filter(
                (member) => member.group_id === group.id
              );
              const memberCount = groupMembers.length;

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

                    <div className="flex shrink-0 flex-col items-end gap-2">
  <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300">
    Groupe
  </span>
  <button
    type="button"
    onClick={() => setConfirmGroupDelete(group.id)}
    className="rounded-xl border border-red-500/40 px-3 py-1 text-xs font-bold text-red-300 hover:bg-red-500/10"
  >
    Supprimer
  </button>
</div>
                  </div>

                  {confirmGroupDelete === group.id && (
  <div className="mt-4 rounded-2xl border border-red-500 bg-zinc-950 p-4">
    <div className="text-sm text-zinc-300">
      Confirmer la suppression du groupe <b>{group.name}</b> ?
    </div>
    <p className="mt-1 text-xs text-zinc-500">
      Les séances déjà programmées ne seront pas supprimées. Seul le groupe et ses membres seront retirés.
    </p>
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <Btn
        variant="danger"
        onClick={() => {
          if (!athleteGroupDeletePilotEnabled) {
            deleteAthleteGroup(group.id);
            setConfirmGroupDelete(null);
            return;
          }

          if (groupDeleteSubmitting === group.id) return;

          setGroupDeleteSubmitting(group.id);
          void deleteAthleteGroup(group.id).then(
            () => setConfirmGroupDelete(null),
            () => undefined,
          ).finally(() => setGroupDeleteSubmitting(null));
        }}
        disabled={athleteGroupDeletePilotEnabled && groupDeleteSubmitting === group.id}
      >
        {athleteGroupDeletePilotEnabled && groupDeleteSubmitting === group.id
          ? "Suppression..."
          : "Supprimer le groupe"}
      </Btn>
      <Btn onClick={() => setConfirmGroupDelete(null)}>Annuler</Btn>
    </div>
  </div>
)}

                  <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-950 p-4">
                    <div className="mb-3 font-semibold">Membres du groupe</div>

                    {activeAthletes.length === 0 && (
                      <p className="text-sm text-zinc-400">
                        Aucun athlète actif disponible.
                      </p>
                    )}

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {activeAthletes.map((athlete) => {
                        const checked = groupMembers.some(
                          (member) => member.athlete_id === athlete.id
                        );
                        const membershipPending =
                          athleteGroupMemberPilotEnabled &&
                          athleteGroupMemberPendingKeys.includes(
                            `${group.id}:${athlete.id}`
                          );

                        return (
                          <label
                            key={athlete.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm ${
                              checked
                                ? "border-white bg-zinc-900 text-white"
                                : "border-zinc-700 bg-zinc-900/60 text-zinc-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                toggleAthleteGroupMember(
                                  group.id,
                                  athlete.id,
                                  event.target.checked
                                )
                              }
                              disabled={membershipPending}
                              className="h-4 w-4 accent-white"
                            />
                            <span className="font-medium">{athlete.name}</span>
                          </label>
                        );
                      })}
                    </div>
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
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 shrink-0 rounded-full ${getColorClass(athleteItem.color)}`} />
                <div>
                  <b>{athleteItem.name}</b>
                  <div className="mt-1 text-xs text-zinc-500">{athleteItem.calendarName}</div>
                </div>
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
