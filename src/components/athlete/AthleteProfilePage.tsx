// @ts-nocheck
"use client";

import { useEffect, useState } from "react";

import {
  Badge,
  Btn,
  Empty,
  Field,
  Input,
  Panel,
  Select,
  StatusMessage,
  Textarea,
} from "@/components/ui/ui";

import CP from "@/components/athlete/CP";
import { CoachGoalsV2Panel } from "@/components/athlete/AthleteGoalsV2Panel";
import AthleteInviteV2Panel from "@/components/athlete/AthleteInviteV2Panel";
import { supabase } from "@/lib/supabase";

const sectionLabels = {
  observations: "Observations coach",
  goals: "Objectifs et contexte",
  tests: "Tests principaux",
  info: "Informations et accès",
};

function formatDate(value) {
  if (!value) return "Jamais";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function ProfileSectionHeader({ count, isOpen, onToggle, sectionKey, subtitle }) {
  const title = sectionLabels[sectionKey];

  return (
    <button
      type="button"
      aria-controls={`athlete-profile-${sectionKey}`}
      aria-expanded={isOpen}
      onClick={onToggle}
      className="flex min-h-11 w-full items-center justify-between gap-4 rounded-2xl px-1 py-2 text-left transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
    >
      <span className="min-w-0">
        <span id={`athlete-profile-heading-${sectionKey}`} className="flex flex-wrap items-center gap-2 text-xl font-semibold sm:text-2xl">
          {title}
          {typeof count === "number" && <Badge className="bg-zinc-800 text-zinc-300">{count}</Badge>}
        </span>
        {subtitle && <span className="mt-1 block text-sm text-zinc-400">{subtitle}</span>}
      </span>
      <span aria-hidden="true" className="shrink-0 text-lg text-zinc-400">
        {isOpen ? "−" : "+"}
      </span>
    </button>
  );
}

function Confirmation({ actionLabel, children, onCancel, onConfirm }) {
  return (
    <div role="region" aria-label={`Confirmation : ${actionLabel}`} className="mt-3 rounded-2xl border border-red-400/40 bg-red-500/10 p-4">
      <p className="text-sm text-red-50">{children}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Btn variant="danger" onClick={onConfirm}>{actionLabel}</Btn>
        <Btn onClick={onCancel}>Annuler</Btn>
      </div>
    </div>
  );
}

export default function AthleteProfilePage({
  athlete,
  updateAthlete,
  cpData,
  goalsV2Enabled = false,
  goalsV2State,
  openGoalRequestV2,
  cancelGoalRequestV2,
  acceptGoalRequestV2,
  requestGoalChangesV2,
}) {
  const a = athlete;
  const [openSections, setOpenSections] = useState({
    observations: true,
    goals: true,
    tests: false,
    info: false,
  });
  const [openObservations, setOpenObservations] = useState({});
  const [observations, setObservations] = useState([]);
  const [goalHistory, setGoalHistory] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const currentYear = new Date().getFullYear();
  const [goalHistoryYear, setGoalHistoryYear] = useState(currentYear);

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleObservation = (id) => {
    setOpenObservations((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const publishFeedback = (variant, message) => setFeedback({ variant, message });

  async function loadObservations() {
    if (!a?.id) return;

    const { data, error } = await supabase
      .from("athlete_observations")
      .select("*")
      .eq("athlete_id", a.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement observations coach", error);
      return;
    }

    setObservations(data || []);
  }

  useEffect(() => {
    void loadObservations();
  }, [a?.id]);

  async function loadGoalHistory() {
    if (!a?.id) return;

    const { data, error } = await supabase
      .from("athlete_goal_history")
      .select("*")
      .eq("athlete_id", a.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement historique objectifs", error);
      return;
    }

    setGoalHistory(data || []);
  }

  useEffect(() => {
    void loadGoalHistory();
  }, [a?.id]);

  const goalHistoryYears = [
    ...new Set([
      currentYear + 1,
      currentYear,
      currentYear - 1,
      currentYear - 2,
      currentYear - 3,
      currentYear - 4,
      currentYear - 5,
      ...goalHistory.map((item) => new Date(item.created_at).getFullYear()),
    ]),
  ].sort((left, right) => right - left);
  const filteredGoalHistory = goalHistory.filter(
    (item) => new Date(item.created_at).getFullYear() === Number(goalHistoryYear),
  );

  const validateGoalUpdate = async () => {
    if (!a?.id) return;

    const { error } = await supabase
      .from("athlete_goal_history")
      .insert({
        athlete_id: a.id,
        short_goal: a.shortGoal || "",
        medium_goal: a.mediumGoal || "",
        long_goal: a.longGoal || "",
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Erreur archivage objectifs", error);
      publishFeedback("error", "Les objectifs n’ont pas pu être archivés.");
      return;
    }

    const { error: requestError } = await supabase
      .from("athletes")
      .update({ goal_update_requested: false })
      .eq("id", a.id);

    if (requestError) {
      console.error("Erreur validation demande objectifs", requestError);
      publishFeedback("error", "La demande de mise à jour ne peut pas être validée pour le moment.");
      return;
    }

    await updateAthlete("goalUpdateRequested", false, a.id);
    a.goalUpdateRequested = false;
    await loadGoalHistory();
    publishFeedback("success", "La demande de mise à jour a été validée.");
  };

  const deleteGoalHistory = async (historyId) => {
    const { error } = await supabase
      .from("athlete_goal_history")
      .delete()
      .eq("id", historyId);

    if (error) {
      console.error("Erreur suppression historique objectifs", error);
      publishFeedback("error", "Cette version d’objectifs ne peut pas être supprimée pour le moment.");
      return;
    }

    setPendingConfirmation(null);
    await loadGoalHistory();
    publishFeedback("success", "La version d’objectifs a été supprimée.");
  };

  const addObservation = async () => {
    if (!a?.id) return;

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("athlete_observations")
      .insert({
        athlete_id: a.id,
        title: "Nouvelle observation",
        content: "",
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur ajout observation coach", error);
      publishFeedback("error", "L’observation ne peut pas être créée pour le moment.");
      return;
    }

    setObservations((prev) => [data, ...prev]);
    setOpenObservations((prev) => ({ ...prev, [data.id]: true }));
    publishFeedback("success", "Une nouvelle observation est prête à être renseignée.");
  };

  const updateObservation = async (id, key, value) => {
    const now = new Date().toISOString();
    setObservations((prev) => prev.map((obs) => (
      obs.id === id ? { ...obs, [key]: value, updated_at: now } : obs
    )));

    const { error } = await supabase
      .from("athlete_observations")
      .update({ [key]: value, updated_at: now })
      .eq("id", id);

    if (error) {
      console.error("Erreur modification observation coach", error);
      publishFeedback("error", "La modification de l’observation n’a pas été enregistrée.");
    }
  };

  const deleteObservation = async (id) => {
    const { error } = await supabase
      .from("athlete_observations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erreur suppression observation coach", error);
      publishFeedback("error", "L’observation ne peut pas être supprimée pour le moment.");
      return;
    }

    setObservations((prev) => prev.filter((obs) => obs.id !== id));
    setOpenObservations((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPendingConfirmation(null);
    publishFeedback("success", "L’observation a été supprimée.");
  };

  const confirmation = pendingConfirmation;

  return (
    <div className="space-y-6">
      <Panel className="overflow-hidden border-zinc-700 bg-[linear-gradient(135deg,rgba(39,39,42,1),rgba(24,24,27,1))]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Fiche athlète</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-normal text-white sm:text-4xl">{a.name || "Athlète sans nom"}</h1>
              <Badge className={a.active === false ? "bg-zinc-700 text-zinc-200" : "bg-emerald-500/15 text-emerald-200"}>
                {a.active === false ? "Archivé" : "Actif"}
              </Badge>
              {goalsV2Enabled && <Badge className="bg-sky-500/15 text-sky-100">Objectifs V2</Badge>}
            </div>
            <p className="mt-2 text-sm text-zinc-400">{a.calendarName || "Calendrier non renseigné"}{a.email ? ` · ${a.email}` : ""}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap">
            <SummaryItem label="Objectifs" value={goalsV2State?.current ? "Validés" : a.goalUpdateRequested ? "Action attendue" : "À suivre"} />
            <SummaryItem label="Observations" value={observations.length} />
            <SummaryItem label="Tests" value={cpData ? "Renseignés" : "À renseigner"} />
          </div>
        </div>
      </Panel>

      {feedback && (
        <StatusMessage variant={feedback.variant}>
          <div className="flex items-start justify-between gap-3">
            <span>{feedback.message}</span>
            <button type="button" aria-label="Fermer le message" onClick={() => setFeedback(null)} className="min-h-7 min-w-7 rounded-lg text-current transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">×</button>
          </div>
        </StatusMessage>
      )}

      <Panel>
        <ProfileSectionHeader
          sectionKey="observations"
          count={observations.length}
          isOpen={openSections.observations}
          onToggle={() => toggleSection("observations")}
          subtitle="Notes de suivi visibles et modifiables par le coach."
        />
        {openSections.observations && (
          <div id="athlete-profile-observations" className="mt-4 space-y-3">
            <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-400">Conservez les éléments utiles au suivi quotidien, sans masquer les informations importantes.</p>
              <Btn variant="primary" onClick={addObservation} className="shrink-0">Ajouter une observation</Btn>
            </div>
            {observations.length === 0 ? (
              <Empty text="Aucune observation pour le moment. Ajoutez une note de suivi quand elle apporte un contexte utile." />
            ) : observations.map((obs) => {
              const isOpen = Boolean(openObservations[obs.id]);
              return (
                <article key={obs.id} className="rounded-2xl border border-zinc-700 bg-zinc-950/40 p-3 sm:p-4">
                  <button
                    type="button"
                    aria-controls={`observation-${obs.id}`}
                    aria-expanded={isOpen}
                    onClick={() => toggleObservation(obs.id)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-white">{obs.title || "Observation sans titre"}</span>
                      <span className="mt-1 block text-xs text-zinc-500">Dernière modification : {formatDate(obs.updated_at)}</span>
                    </span>
                    <span aria-hidden="true" className="text-lg text-zinc-400">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && (
                    <div id={`observation-${obs.id}`} className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
                      <Field label="Titre de l’observation"><Input value={obs.title} onChange={(event) => updateObservation(obs.id, "title", event.target.value)} placeholder="Titre de l’observation" /></Field>
                      <Field label="Contenu de l’observation"><Textarea value={obs.content} onChange={(event) => updateObservation(obs.id, "content", event.target.value)} placeholder="Exemple : supporte très bien les blocs de charge..." rows={5} /></Field>
                      {confirmation?.kind === "observation" && confirmation.id === obs.id ? (
                        <Confirmation actionLabel="Supprimer l’observation" onCancel={() => setPendingConfirmation(null)} onConfirm={() => deleteObservation(obs.id)}>Cette action supprimera définitivement l’observation coach.</Confirmation>
                      ) : (
                        <Btn variant="danger" onClick={() => setPendingConfirmation({ kind: "observation", id: obs.id })}>Supprimer l’observation</Btn>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      {goalsV2Enabled && goalsV2State ? (
        <CoachGoalsV2Panel state={goalsV2State} onOpen={openGoalRequestV2} onCancel={cancelGoalRequestV2} onAccept={acceptGoalRequestV2} onRequestChanges={requestGoalChangesV2} />
      ) : (
        <Panel>
          <ProfileSectionHeader sectionKey="goals" isOpen={openSections.goals} onToggle={() => toggleSection("goals")} subtitle="Objectifs actuels, contexte de saison et versions archivées." />
          {openSections.goals && (
            <div id="athlete-profile-goals" className="mt-4 space-y-5">
              {a.goalUpdateRequested && (
                <StatusMessage variant="info" className="border-amber-500/40 bg-amber-500/10 text-amber-100">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span><strong>Action attendue :</strong> l’athlète doit actualiser ses objectifs avant validation.</span>
                    <Btn variant="primary" onClick={validateGoalUpdate}>Valider la mise à jour</Btn>
                  </div>
                </StatusMessage>
              )}
              <div className="grid gap-4 lg:grid-cols-3">
                {[
                  ["Court terme", "shortGoal", "Saison à venir (~6 mois)"],
                  ["Moyen terme", "mediumGoal", "1 à 2 ans"],
                  ["Long terme", "longGoal", "3 à 4 ans"],
                ].map(([label, key, hint]) => (
                  <Field key={key} label={`${label} · ${hint}`}><Textarea value={a[key]} onChange={(event) => updateAthlete(key, event.target.value)} rows={5} /></Field>
                ))}
              </div>
              <Field label="Contexte coach"><Textarea value={a.context} onChange={(event) => updateAthlete("context", event.target.value)} rows={5} /></Field>
              <section aria-labelledby="legacy-goal-history" className="border-t border-zinc-800 pt-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div><h3 id="legacy-goal-history" className="text-lg font-semibold">Historique des objectifs</h3><p className="mt-1 text-sm text-zinc-400">Versions envoyées par l’athlète dans le parcours legacy.</p></div>
                  <div className="flex items-center gap-2"><Field label="Année"><Select value={goalHistoryYear} onChange={(event) => setGoalHistoryYear(Number(event.target.value))} className="w-28">{goalHistoryYears.map((year) => <option key={year} value={year}>{year}</option>)}</Select></Field><Badge className="mb-0.5 bg-zinc-800 text-zinc-300">{filteredGoalHistory.length}</Badge></div>
                </div>
                <div className="mt-4 space-y-3">
                  {filteredGoalHistory.length === 0 ? <Empty text="Aucun objectif envoyé par l’athlète cette année." /> : filteredGoalHistory.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-zinc-700 bg-zinc-950/40 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">Objectifs envoyés le {formatDate(item.created_at)}</p><p className="mt-1 text-xs text-zinc-500">Version legacy archivée</p></div><Btn variant="danger" onClick={() => setPendingConfirmation({ kind: "goal-history", id: item.id })}>Supprimer</Btn></div>
                      <GoalSummary item={item} className="mt-4" />
                      {confirmation?.kind === "goal-history" && confirmation.id === item.id && <Confirmation actionLabel="Supprimer cette version" onCancel={() => setPendingConfirmation(null)} onConfirm={() => deleteGoalHistory(item.id)}>Cette action supprimera cette version historique legacy.</Confirmation>}
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </Panel>
      )}

      <section aria-labelledby="athlete-profile-heading-tests" className="space-y-3">
        <ProfileSectionHeader sectionKey="tests" isOpen={openSections.tests} onToggle={() => toggleSection("tests")} subtitle="Puissance critique, zones et historique de tests." />
        {openSections.tests && <div id="athlete-profile-tests"><CP athlete={a} updateAthlete={updateAthlete} cpData={cpData} /></div>}
      </section>

      <Panel>
        <ProfileSectionHeader sectionKey="info" isOpen={openSections.info} onToggle={() => toggleSection("info")} subtitle="Coordonnées, calendrier et accès individuel." />
        {openSections.info && (
          <div id="athlete-profile-info" className="mt-4 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[["Nom", "name"], ["Nom du calendrier", "calendarName"], ["Email", "email"], ["Âge", "age"], ["Taille", "height"], ["Poids", "weight"]].map(([label, key]) => <Field key={key} label={label}><Input value={a[key]} onChange={(event) => updateAthlete(key, event.target.value)} /></Field>)}
            </div>
            <section aria-labelledby="legacy-invitation" className="rounded-2xl border border-zinc-700 bg-zinc-950/40 p-4"><h3 id="legacy-invitation" className="text-lg font-semibold">Invitation individuelle legacy</h3><p className="mt-1 text-sm text-zinc-400">Code nécessaire au parcours legacy existant.</p><div className="mt-3 break-all rounded-xl border border-zinc-700 bg-zinc-900 p-3 font-mono text-sm font-bold text-white">{a.inviteToken || "Non renseigné"}</div></section>
            <AthleteInviteV2Panel athleteId={a.id} />
          </div>
        )}
      </Panel>
    </div>
  );
}

function GoalSummary({ item, className = "" }) {
  return (
    <div className={`grid gap-3 text-sm md:grid-cols-3 ${className}`}>
      {[["Court terme", item.short_goal], ["Moyen terme", item.medium_goal], ["Long terme", item.long_goal]].map(([label, value]) => <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3"><div className="text-xs text-zinc-500">{label}</div><div className="mt-1 text-zinc-100">{value || "—"}</div></div>)}
    </div>
  );
}

function SummaryItem({ label, value }) {
  return <div className="rounded-xl border border-zinc-700 bg-zinc-950/50 px-3 py-2"><div className="text-xs text-zinc-500">{label}</div><div className="mt-0.5 font-bold text-zinc-100">{value}</div></div>;
}
