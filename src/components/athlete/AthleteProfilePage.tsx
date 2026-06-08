// @ts-nocheck
"use client";

import { useEffect, useState } from "react";

import {
  Field,
  Input,
  Panel,
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

  const [observations, setObservations] = useState([]);

  const toggleSection = (key) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
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

  const formatDate = (value) => {
    if (!value) return "Jamais";
    return new Date(value).toLocaleDateString("fr-FR");
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
          <div className="space-y-4">
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

            {observations.map((obs) => (
              <div
                key={obs.id}
                className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <Input
                      value={obs.title}
                      onChange={(event) =>
                        updateObservation(obs.id, "title", event.target.value)
                      }
                      placeholder="Titre de l’observation"
                    />

                    <p className="mt-2 text-xs text-zinc-500">
                      Dernière modification : {formatDate(obs.updated_at)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteObservation(obs.id)}
                    className="rounded-xl border border-red-500/40 px-3 py-2 text-xs font-bold text-red-300"
                  >
                    Supprimer
                  </button>
                </div>

                <Textarea
                  value={obs.content}
                  onChange={(event) =>
                    updateObservation(obs.id, "content", event.target.value)
                  }
                  placeholder="Exemple : supporte très bien les blocs de charge, mais baisse vite en motivation quand la récupération est trop courte..."
                  rows={4}
                />
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <SectionHeader sectionKey="goals" title="Objectifs et contexte" />

        {openSections.goals && (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                ["Court terme", "shortGoal"],
                ["Moyen terme", "mediumGoal"],
                ["Long terme", "longGoal"],
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