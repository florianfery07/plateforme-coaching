// @ts-nocheck
"use client";

import { useEffect, useState } from "react";

import {
  Field,
  Input,
  Panel,
  Select,
  Textarea,
} from "@/components/ui/ui";

import CP from "@/components/athlete/CP";
import { supabase } from "@/lib/supabase";

export default function AthleteProfilePage({
  athlete,
  updateAthlete,
  cpData,
}) {
  const a = athlete;

  const [openSections, setOpenSections] = useState({
    observations: true,
    goals: false,
    tests: false,
    info: false,
  });

  const [openObservations, setOpenObservations] = useState({});
  const [observations, setObservations] = useState([]);
  const [goalHistory, setGoalHistory] = useState([]);
  const currentYear = new Date().getFullYear();
  const [goalHistoryYear, setGoalHistoryYear] = useState(currentYear);

  const toggleSection = (key) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleObservation = (id) => {
    setOpenObservations((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  useEffect(() => {
    if (!a?.id) return;

    async function loadObservations() {
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

    loadObservations();
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
    loadGoalHistory();
  }, [a?.id]);

  const formatDate = (value) => {
    if (!value) return "Jamais";
    return new Date(value).toLocaleDateString("fr-FR");
  };

  const goalHistoryYears = [
    ...new Set([
      currentYear + 1,
      currentYear,
      currentYear - 1,
      currentYear - 2,
      currentYear - 3,
      currentYear - 4,
      currentYear - 5,
      ...goalHistory.map((item) =>
        new Date(item.created_at).getFullYear()
      ),
    ]),
  ].sort((a, b) => b - a);

  const filteredGoalHistory = goalHistory.filter(
    (item) =>
      new Date(item.created_at).getFullYear() === Number(goalHistoryYear)
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
      alert(error.message || "Erreur archivage objectifs");
      return;
    }

    const { error: requestError } = await supabase
      .from("athletes")
      .update({ goal_update_requested: false })
      .eq("id", a.id);

    if (requestError) {
      console.error("Erreur validation demande objectifs", requestError);
      alert(requestError.message || "Erreur validation demande objectifs");
      return;
    }

    await updateAthlete("goalUpdateRequested", false, a.id);
    a.goalUpdateRequested = false;
    await loadGoalHistory();
  };

  const deleteGoalHistory = async (historyId) => {
    const ok = window.confirm("Supprimer cette version d’objectifs archivée ?");
    if (!ok) return;

    const { error } = await supabase
      .from("athlete_goal_history")
      .delete()
      .eq("id", historyId);

    if (error) {
      console.error("Erreur suppression historique objectifs", error);
      alert(error.message || "Erreur suppression historique objectifs");
      return;
    }

    await loadGoalHistory();
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
      return;
    }

    setObservations((prev) => [data, ...prev]);
    setOpenObservations((prev) => ({
      ...prev,
      [data.id]: true,
    }));
  };

  const updateObservation = async (id, key, value) => {
    const now = new Date().toISOString();

    setObservations((prev) =>
      prev.map((obs) =>
        obs.id === id
          ? {
              ...obs,
              [key]: value,
              updated_at: now,
            }
          : obs
      )
    );

    const { error } = await supabase
      .from("athlete_observations")
      .update({
        [key]: value,
        updated_at: now,
      })
      .eq("id", id);

    if (error) {
      console.error("Erreur modification observation coach", error);
    }
  };

  const deleteObservation = async (id) => {
    const ok = window.confirm("Supprimer cette observation ?");
    if (!ok) return;

    const { error } = await supabase
      .from("athlete_observations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erreur suppression observation coach", error);
      return;
    }

    setObservations((prev) => prev.filter((obs) => obs.id !== id));
    setOpenObservations((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const SectionHeader = ({ sectionKey, title, count }) => (
    <button
      type="button"
      onClick={() => toggleSection(sectionKey)}
      className="mb-4 flex w-full items-center justify-between text-left"
    >
      <h2 className="text-2xl font-semibold">
        {title}
        {typeof count === "number" && (
          <span className="ml-2 text-base text-zinc-400">
            ({count})
          </span>
        )}
      </h2>

      <span className="text-sm font-bold text-zinc-400">
        {openSections[sectionKey] ? "▼" : "▶"}
      </span>
    </button>
  );

  return (
    <>
      <Panel>
        <SectionHeader
          sectionKey="observations"
          title="Tendances observées"
          count={observations.length}
        />

        {openSections.observations && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={addObservation}
              className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-zinc-950"
            >
              + Ajouter une observation
            </button>

            {observations.length === 0 && (
              <p className="rounded-2xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
                Aucune observation pour le moment.
              </p>
            )}

            {observations.map((obs) => {
              const isOpen = Boolean(openObservations[obs.id]);

              return (
                <div
                  key={obs.id}
                  className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4"
                >
                  <button
                    type="button"
                    onClick={() => toggleObservation(obs.id)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <div className="font-bold">
                        {obs.title || "Observation sans titre"}
                      </div>

                      <p className="mt-1 text-xs text-zinc-500">
                        Dernière modification : {formatDate(obs.updated_at)}
                      </p>
                    </div>

                    <span className="text-sm font-bold text-zinc-400">
                      {isOpen ? "▼" : "▶"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="mt-4 space-y-3">
                      <Input
                        value={obs.title}
                        onChange={(event) =>
                          updateObservation(obs.id, "title", event.target.value)
                        }
                        placeholder="Titre de l’observation"
                      />

                      <Textarea
                        value={obs.content}
                        onChange={(event) =>
                          updateObservation(obs.id, "content", event.target.value)
                        }
                        placeholder="Exemple : supporte très bien les blocs de charge, mais baisse vite en motivation quand la récupération est trop courte..."
                        rows={4}
                      />

                      <button
                        type="button"
                        onClick={() => deleteObservation(obs.id)}
                        className="rounded-xl border border-red-500/40 px-3 py-2 text-xs font-bold text-red-300"
                      >
                        Supprimer cette observation
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel>
        <SectionHeader sectionKey="goals" title="Objectifs coach et contexte" />

        {openSections.goals && (
          <>
            {a.goalUpdateRequested && (
              <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
                <div className="font-bold text-amber-200">
                  Mise à jour des objectifs demandée
                </div>

                <p className="mt-1 text-sm text-amber-100/80">
                  Ton coach te demande de mettre à jour tes objectifs sportifs : court terme, moyen terme et long terme.
                </p>

                <button
                  type="button"
                  onClick={validateGoalUpdate}
                  className="mt-3 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-zinc-950"
                >
                  J’ai terminé la mise à jour
                </button>
              </div>
            )}

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                ["Objectif coach court terme — saison à venir (~6 mois)", "shortGoal"],
["Objectif coach moyen terme — 1 à 2 ans", "mediumGoal"],
["Objectif coach long terme — 3 à 4 ans", "longGoal"],
              ].map(([label, key]) => (
                <Field key={key} label={label}>
                  <Textarea
                    value={a[key]}
                    onChange={(event) => updateAthlete(key, event.target.value)}
                    rows={4}
                  />
                </Field>
              ))}
            </div>

            <Field label="Contexte">
              <Textarea
                value={a.context}
                onChange={(event) => updateAthlete("context", event.target.value)}
                rows={5}
              />
            </Field>

            <div className="mt-5 rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    Objectifs envoyés par l’athlète
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Versions archivées lorsque l’athlète répond à une demande de mise à jour.
                  </p>
                </div>

                <div className="flex items-center gap-2">
  <Select
    value={goalHistoryYear}
    onChange={(event) =>
      setGoalHistoryYear(Number(event.target.value))
    }
    className="w-32"
  >
    {goalHistoryYears.map((year) => (
      <option key={year} value={year}>
        {year}
      </option>
    ))}
  </Select>

  <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300">
    {filteredGoalHistory.length}
  </span>
</div>
              </div>

              <div className="space-y-3">
                {filteredGoalHistory.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
                    Aucun objectif envoyé par l’athlète pour le moment.
                  </p>
                )}

                {filteredGoalHistory.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-sm font-bold text-zinc-300">
                        Objectifs envoyés le {formatDate(item.created_at)}
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteGoalHistory(item.id)}
                        className="rounded-xl border border-red-500/40 px-3 py-1 text-xs font-bold text-red-300"
                      >
                        Supprimer
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                      <div>
                        <div className="mb-1 text-zinc-500">Court terme</div>
                        <div>{item.short_goal || "—"}</div>
                      </div>

                      <div>
                        <div className="mb-1 text-zinc-500">Moyen terme</div>
                        <div>{item.medium_goal || "—"}</div>
                      </div>

                      <div>
                        <div className="mb-1 text-zinc-500">Long terme</div>
                        <div>{item.long_goal || "—"}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Panel>

      <Panel>
        <SectionHeader sectionKey="tests" title="Tests principaux" />

        {openSections.tests && (
          <CP
            athlete={a}
            updateAthlete={updateAthlete}
            cpData={cpData}
          />
        )}
      </Panel>

      <Panel className="h-fit">
        <SectionHeader sectionKey="info" title="Informations générales" />

        {openSections.info && (
          <>
            <h3 className="mb-4 text-xl font-semibold">
              Fiche de {a.name}
            </h3>

            <div className="space-y-4">
              {[
                ["Nom", "name"],
                ["Nom du calendrier", "calendarName"],
                ["Email", "email"],
                ["Âge", "age"],
                ["Taille", "height"],
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

            <div className="mt-6 rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
              <h3 className="mb-2 text-lg font-semibold">
                Invitation individuelle
              </h3>

              <p className="text-sm text-zinc-400">
                Lien prévu : https://myrideplan.vercel.app/?invite={a.inviteToken}
              </p>

              <div className="mt-3 rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-sm">
                <div className="text-zinc-400">Code invitation</div>

                <div className="mt-1 font-mono text-lg font-bold">
                  {a.inviteToken}
                </div>
              </div>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}