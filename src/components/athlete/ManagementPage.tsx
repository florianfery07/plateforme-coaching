// @ts-nocheck
"use client";

import { useState } from "react";
import { Badge, Btn, Empty, Field, Input, Panel, StatusMessage } from "@/components/ui/ui";
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
  const [groupFeedback, setGroupFeedback] = useState(null);
  const managementTabs = ["athletes", "groups"];
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

  async function createGroup() {
    setGroupFeedback(null);
    let result = false;
    try {
      result = await addAthleteGroup();
    } catch {
      result = false;
    }
    setGroupFeedback(
      result === false
        ? { variant: "error", message: "Le groupe n’a pas pu être créé. Réessayez." }
        : { variant: "success", message: "Le groupe a été créé." },
    );
  }

  async function persistGroupName(groupId, name) {
    let result = false;
    try {
      result = await renameAthleteGroup(groupId, name);
    } catch {
      result = false;
    }
    if (result === false && String(name || "").trim()) {
      setGroupFeedback({ variant: "error", message: "Le nom du groupe n’a pas pu être enregistré." });
    }
  }

  async function confirmGroupDeletion(groupId) {
    if (groupDeleteSubmitting === groupId) return;

    setGroupDeleteSubmitting(groupId);
    let result = false;
    try {
      result = await deleteAthleteGroup(groupId, true);
    } catch {
      result = false;
    }
    if (result === false) {
      setGroupFeedback({ variant: "error", message: "Le groupe n’a pas pu être supprimé. Réessayez." });
    } else {
      setGroupFeedback({ variant: "success", message: "Le groupe a été supprimé." });
      setConfirmGroupDelete(null);
    }
    setGroupDeleteSubmitting(null);
  }

  async function updateGroupMember(groupId, athleteId, checked) {
    let result = false;
    try {
      result = await toggleAthleteGroupMember(groupId, athleteId, checked);
    } catch {
      result = false;
    }
    if (result === false) {
      setGroupFeedback({ variant: "error", message: "Le membre du groupe n’a pas pu être mis à jour." });
    }
  }

  const moveManagementTab = (event, tab) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

    event.preventDefault();
    const currentIndex = managementTabs.indexOf(tab);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
      ? managementTabs.length - 1
      : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + managementTabs.length) % managementTabs.length;
    const nextTab = managementTabs[nextIndex];

    setManagementTab(nextTab);
    document.getElementById(`management-tab-${nextTab}`)?.focus();
  };

  return (
    <Panel className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Espace coach</p>
          <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">Gestion des athlètes</h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">Organisez les accès, calendriers et groupes sans perdre le contexte de chaque athlète.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center sm:flex sm:flex-wrap">
          <Badge className="bg-emerald-500/15 text-emerald-200">{activeAthletes.length} actif{activeAthletes.length > 1 ? "s" : ""}</Badge>
          <Badge className="bg-zinc-800 text-zinc-300">{inactiveAthletes.length} archivé{inactiveAthletes.length > 1 ? "s" : ""}</Badge>
          <Badge className="bg-sky-500/15 text-sky-100">{athleteGroups.length} groupe{athleteGroups.length > 1 ? "s" : ""}</Badge>
        </div>
      </div>

      <div role="tablist" aria-label="Gestion des athlètes" className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 p-1">
        <button
          type="button"
          role="tab"
          id="management-tab-athletes"
          aria-controls="management-panel-athletes"
          aria-selected={managementTab === "athletes"}
          onClick={() => setManagementTab("athletes")}
          onKeyDown={(event) => moveManagementTab(event, "athletes")}
          className={`min-h-11 flex-1 rounded-xl px-4 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
            managementTab === "athletes"
              ? "bg-white text-zinc-950"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Athlètes
        </button>

        <button
          type="button"
          role="tab"
          id="management-tab-groups"
          aria-controls="management-panel-groups"
          aria-selected={managementTab === "groups"}
          onClick={() => setManagementTab("groups")}
          onKeyDown={(event) => moveManagementTab(event, "groups")}
          className={`min-h-11 flex-1 rounded-xl px-4 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
            managementTab === "groups"
              ? "bg-white text-zinc-950"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Groupes
        </button>
      </div>

      {managementTab === "athletes" && (
        <div role="tabpanel" id="management-panel-athletes" aria-labelledby="management-tab-athletes">
          <form onSubmit={(event) => { event.preventDefault(); addAthlete(); }} className="mb-6 rounded-3xl border border-zinc-700 bg-zinc-800 p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-lg font-semibold">Ajouter un athlète</h3><p className="mt-1 text-sm text-zinc-400">Créez un calendrier individuel, puis complétez sa fiche depuis l’espace athlète.</p></div><Badge className="w-fit bg-zinc-900 text-zinc-300">Nouveau calendrier</Badge></div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1"><Field label="Nom de l’athlète">
              <Input
                value={newAthlete}
                onChange={(event) => setNewAthlete(event.target.value)}
                placeholder="Nom de l’athlète"
              />
              </Field></div>
              <Btn variant="primary" type="submit" disabled={!String(newAthlete || "").trim()}>Ajouter l’athlète</Btn>
            </div>
          </form>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="space-y-4">
              <AthleteList title="Athlètes actifs" athletes={activeAthletes} selectedAthlete={selectedAthlete} setSelectedAthleteId={setSelectedAthleteId} setConfirmDelete={setConfirmDelete} />
              <AthleteList title="Athlètes archivés" athletes={inactiveAthletes} selectedAthlete={selectedAthlete} setSelectedAthleteId={setSelectedAthleteId} setConfirmDelete={setConfirmDelete} />
            </div>

            <div className="space-y-4 xl:col-span-2">
              {selectedAthlete && (
                <>
                  <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4 sm:p-5">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Athlète sélectionné</p><h3 className="mt-1 text-xl font-semibold">{selectedAthlete.name}</h3></div><Badge className={selectedAthlete.active === false ? "bg-zinc-700 text-zinc-200" : "bg-emerald-500/15 text-emerald-200"}>{selectedAthlete.active === false ? "Archivé" : "Actif"}</Badge></div>

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
                            aria-pressed={selectedAthlete.color === color}
                            className={`min-h-11 min-w-11 rounded-full border-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${getColorClass(color)} ${
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
                          className={`min-h-11 rounded-2xl px-4 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
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
                        aria-pressed={Boolean(selectedAthlete.goalUpdateRequested)}
                        className={`min-h-11 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
                          selectedAthlete.goalUpdateRequested
                            ? "rounded-2xl border border-amber-500/40 px-4 py-2 text-sm font-bold text-amber-300"
                            : "rounded-2xl bg-white px-4 py-2 text-sm font-bold text-zinc-950"
                        }`}
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
                      <div role="region" aria-labelledby="athlete-delete-confirmation" className="mt-4 rounded-2xl border border-red-500 bg-zinc-950 p-4">
                        <div id="athlete-delete-confirmation" className="text-sm text-zinc-300">
                          {athleteLifecycleV2Enabled
                            ? <>Archiver <b>{selectedAthlete.name}</b> ? Ses données seront conservées.</>
                            : <>Confirmer la suppression de <b>{selectedAthlete.name}</b> ?</>}
                        </div>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <Btn
                            variant="danger"
                            onClick={() => {
                              if (!athleteLifecycleV2Enabled) {
                                deleteAthlete(selectedAthlete.id, true);
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
        </div>
      )}

      {managementTab === "groups" && (
        <div role="tabpanel" id="management-panel-groups" aria-labelledby="management-tab-groups" className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4 sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Planification collective</p><h3 className="mt-1 text-xl font-semibold">Groupes d’athlètes</h3><p className="mt-1 text-sm text-zinc-400">Préparez les séances collectives, stages et catégories d’entraînement.</p></div>
            <Badge className="w-fit bg-zinc-900 text-zinc-300">{athleteGroups.length} groupe{athleteGroups.length > 1 ? "s" : ""}</Badge>
          </div>

          <form onSubmit={(event) => { event.preventDefault(); void createGroup(); }} className="mb-5 rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-semibold">Créer un groupe</h4><p className="mt-1 text-sm text-zinc-400">Donnez un nom explicite pour le retrouver rapidement dans le calendrier.</p></div><Badge className="bg-zinc-800 text-zinc-300">Organisation</Badge></div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1"><Field label="Nom du groupe">
              <Input
                value={newGroupName || ""}
                onChange={(event) => setNewGroupName(event.target.value)}
                placeholder="Ex : Cadets, Stage VTT, Groupe route"
              />
              </Field></div>
              <Btn
                variant="primary"
                type="submit"
                disabled={athleteGroupCreatePending || !String(newGroupName || "").trim()}
                className={
                  athleteGroupCreatePending || !String(newGroupName || "").trim()
                    ? "opacity-40"
                    : ""
                }
              >
                Créer le groupe
              </Btn>
            </div>
          </form>

          {groupFeedback && (
            <StatusMessage variant={groupFeedback.variant} className="mb-5">
              <div className="flex items-start justify-between gap-3">
                <span>{groupFeedback.message}</span>
                <button type="button" aria-label="Fermer le message" onClick={() => setGroupFeedback(null)} className="min-h-7 min-w-7 rounded-lg text-current transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">×</button>
              </div>
            </StatusMessage>
          )}

          {athleteGroups.length === 0 && <Empty text="Aucun groupe créé pour le moment. Créez le premier groupe pour préparer une séance collective." />}

          <div className="space-y-3">
            {athleteGroups.map((group) => {
              const groupMembers = athleteGroupMembers.filter(
                (member) => member.group_id === group.id
              );
              const memberCount = groupMembers.length;

              return (
                <div
                  key={group.id}
                  className="rounded-2xl border border-zinc-700 bg-zinc-900 p-3 sm:p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <Field label="Nom du groupe"><Input aria-label={`Nom du groupe ${group.name || "sans nom"}`} value={group.name || ""} onChange={(event) => void persistGroupName(group.id, event.target.value)} onBlur={(event) => void persistGroupName(group.id, event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></Field>
                      <p className="mt-2 text-sm text-zinc-400">{memberCount ? `${memberCount} athlète${memberCount > 1 ? "s" : ""} dans ce groupe.` : "Aucun membre pour le moment."}</p>
                    </div>

                    <div className="flex shrink-0 flex-row items-center justify-between gap-2 sm:flex-col sm:items-end">
  <Badge className="bg-zinc-800 text-zinc-300">{memberCount} membre{memberCount > 1 ? "s" : ""}</Badge>
  <Btn variant="danger" onClick={() => setConfirmGroupDelete(group.id)}>Supprimer</Btn>
</div>
                  </div>

                  {confirmGroupDelete === group.id && (
  <div role="region" aria-labelledby={`group-delete-confirmation-${group.id}`} className="mt-4 rounded-2xl border border-red-500 bg-zinc-950 p-4">
    <div id={`group-delete-confirmation-${group.id}`} className="text-sm text-zinc-300">
      Confirmer la suppression du groupe <b>{group.name}</b> ?
    </div>
    <p className="mt-1 text-xs text-zinc-500">
      Les séances déjà programmées ne seront pas supprimées. Seul le groupe et ses membres seront retirés.
    </p>
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <Btn
        variant="danger"
        onClick={() => void confirmGroupDeletion(group.id)}
        disabled={groupDeleteSubmitting === group.id}
      >
        {groupDeleteSubmitting === group.id
          ? "Suppression..."
          : "Supprimer le groupe"}
      </Btn>
      <Btn onClick={() => setConfirmGroupDelete(null)}>Annuler</Btn>
    </div>
  </div>
)}

                    <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-950 p-3 sm:p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><div className="font-semibold">Membres du groupe</div><p className="mt-1 text-sm text-zinc-400">Sélectionnez les athlètes qui participeront aux séances collectives.</p></div><Badge className="bg-zinc-800 text-zinc-300">{memberCount} sélectionné{memberCount > 1 ? "s" : ""}</Badge></div>

                    {activeAthletes.length === 0 && <Empty text="Aucun athlète actif disponible pour ce groupe." />}

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
                            className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-amber-400 ${
                              checked
                                ? "border-white bg-zinc-900 text-white"
                                : "border-zinc-700 bg-zinc-900/60 text-zinc-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                void updateGroupMember(
                                  group.id,
                                  athlete.id,
                                  event.target.checked
                                )
                              }
                              disabled={membershipPending}
                              className="h-5 w-5 accent-white"
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
    <section aria-label={title} className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4">
      <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">{title}</h3><Badge className="bg-zinc-900 text-zinc-300">{athletes.length}</Badge></div>
      <div className="space-y-3">
        {athletes.length === 0 && <Empty text="Aucun athlète dans cette liste." />}

        {athletes.map((athleteItem) => (
          <button
            key={athleteItem.id}
            type="button"
            onClick={() => {
              setSelectedAthleteId(athleteItem.id);
              setConfirmDelete(null);
            }}
            aria-pressed={selectedAthlete?.id === athleteItem.id}
            className={`min-h-11 w-full rounded-2xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
              selectedAthlete?.id === athleteItem.id
                ? "border-white bg-zinc-950"
                : "border-zinc-700 bg-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 shrink-0 rounded-full ${getColorClass(athleteItem.color)}`} />
                <div className="min-w-0">
                  <b className="block truncate">{athleteItem.name}</b>
                  <div className="mt-1 text-xs text-zinc-500">{athleteItem.calendarName}</div>
                </div>
              </div>
              <Badge className={`shrink-0 ${
                athleteItem.active === false
                  ? "bg-zinc-700 text-zinc-300"
                  : "bg-green-500/20 text-green-300"
              }`}>
                {athleteItem.active === false ? "Archivé" : "Actif"}
              </Badge>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function FieldInput({ label, value, onChange }) {
  const id = `athlete-field-${label.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs text-zinc-500">{label}</label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
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
