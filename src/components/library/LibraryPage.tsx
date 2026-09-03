// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  Btn,
  Empty,
  Field,
  Input,
  Panel,
  StatusMessage,
} from "@/components/ui/ui";

import FilterSelects from "@/components/calendar/FilterSelects";
import Editable from "@/components/library/Editable";
import { getColorClass } from "@/lib/colors";

export default function LibraryPage({
  categories,
  setCategories,
  subcategories,
  setSubcategories,
  filter,
  setFilter,
  filteredLibrary,
  editWorkout,
  setLibrary,
  library,
  rename,
  removeItem,
  taxonomyPending,
}) {
  const [workoutToDelete, setWorkoutToDelete] = useState(null);
  const [deletingWorkoutId, setDeletingWorkoutId] = useState(null);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState(null);

  async function deleteWorkout(workout) {
    if (deletingWorkoutId) return;

    setDeletingWorkoutId(workout.id);
    try {
      const { error } = await supabase
        .from("workout_library")
        .delete()
        .eq("id", workout.id);

      if (error) {
        setFeedback({ variant: "error", message: "La séance n’a pas pu être supprimée. Réessaie." });
        return;
      }

      setLibrary(
        library.filter((row) => row.id !== workout.id)
      );
      setWorkoutToDelete(null);
      setFeedback({ variant: "success", message: "La séance a été supprimée de la bibliothèque." });
    } finally {
      setDeletingWorkoutId(null);
    }
  }

  const searchedLibrary = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr-FR");
    if (!query) return filteredLibrary;

    return filteredLibrary.filter((workout) =>
      [workout.title, workout.category, workout.subcategory, workout.description]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("fr-FR").includes(query)),
    );
  }, [filteredLibrary, search]);

  const sortedLibrary = [...searchedLibrary].sort((a, b) => {
    const durationA = a.totalDuration || "999h";
    const durationB = b.totalDuration || "999h";

    const toMinutes = (value) => {
      const text = String(value).toLowerCase();
      const hours = Number(text.match(/(\d+)h/)?.[1] || 0);
      const minutes = Number(text.match(/h(\d+)/)?.[1] || text.match(/(\d+)min/)?.[1] || 0);
      return hours * 60 + minutes;
    };

    return toMinutes(durationA) - toMinutes(durationB);
  });

  const colorForCategory = (name) => {
    const item = categories.find(
      (row) => row.name?.trim().toLowerCase() === name?.trim().toLowerCase()
    );

    return getColorClass(item?.color);
  };

  const colorForSubcategory = (name) => {
    const item = subcategories.find(
      (row) => row.name?.trim().toLowerCase() === name?.trim().toLowerCase()
    );

    return getColorClass(item?.color);
  };

  return (
    <Panel>
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">
          Bibliothèque de séances
        </h2>

        <p className="text-sm text-zinc-400">
          Crée, filtre et organise tes séances types.
        </p>
      </div>

      <div className="mb-6 rounded-3xl border border-zinc-700 bg-zinc-800 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              Séances enregistrées
            </h3>

            <p className="text-sm text-zinc-400">
              {sortedLibrary.length} séance{sortedLibrary.length > 1 ? "s" : ""} affichée{sortedLibrary.length > 1 ? "s" : ""} sur {library.length}.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-3xl">
            <Field label="Rechercher une séance">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Titre, discipline ou thème"
                type="search"
              />
            </Field>
            <FilterSelects
              {...{
                categories,
                subcategories,
                filter,
                setFilter,
              }}
            />
          </div>
        </div>

        {feedback && (
          <StatusMessage variant={feedback.variant} className="mb-4">
            <div className="flex items-start justify-between gap-3">
              <span>{feedback.message}</span>
              <button type="button" aria-label="Fermer le message" onClick={() => setFeedback(null)} className="min-h-8 min-w-8 rounded-lg text-lg leading-none transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">×</button>
            </div>
          </StatusMessage>
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {!sortedLibrary.length && (
            <div className="lg:col-span-2 xl:col-span-3">
              <Empty text={search ? "Aucune séance ne correspond à cette recherche." : "Aucune séance ne correspond aux filtres actuels."} />
            </div>
          )}

          {sortedLibrary.map((workout) => (
            <div
              key={workout.id}
              className="flex flex-col justify-between rounded-2xl border border-zinc-700 bg-zinc-900 p-4"
            >
              <div>
                <div className="mb-2 flex flex-wrap gap-2 text-xs">
                  {workout.category && (
                    <span className={`rounded-full px-2 py-1 font-semibold text-white ${colorForCategory(workout.category)}`}>
                      {workout.category}
                    </span>
                  )}

                  {workout.subcategory && (
                    <span className={`rounded-full px-2 py-1 font-semibold text-white ${colorForSubcategory(workout.subcategory)}`}>
                      {workout.subcategory}
                    </span>
                  )}
                </div>

                <h4 className="line-clamp-2 text-base font-bold text-white">
                  {workout.title || "Séance sans titre"}
                </h4>

                <p className="mt-2 text-sm text-zinc-400">
                  {workout.totalDuration || "Durée libre"} •{" "}
                  {workout.blocks?.length || 0} bloc(s)
                </p>

                {(workout.expectedRpeGlobal ||
                  workout.expectedRpeSpecific ||
                  workout.expectedSpecificDuration) && (
                  <p className="mt-2 text-xs text-zinc-500">
                    RPE global : {workout.expectedRpeGlobal || workout.expectedRpe || "—"}
                    {" "}• Spé : {workout.expectedRpeSpecific || "—"}
                    {" "}• Durée spé : {workout.expectedSpecificDuration || "—"}
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Btn
                  variant="primary"
                  className="flex-1 py-2 text-sm"
                  onClick={() => editWorkout(workout)}
                >
                  Modifier
                </Btn>

                <Btn
                  variant="danger"
                  className="flex-1 py-2 text-sm"
                  onClick={() => setWorkoutToDelete(workout)}
                >
                  Supprimer
                </Btn>

                {workoutToDelete?.id === workout.id && (
                  <div
                    role="region"
                    aria-labelledby={`delete-workout-${workout.id}`}
                    className="mt-2 basis-full rounded-2xl border border-red-400/60 bg-zinc-950 p-4"
                  >
                    <p id={`delete-workout-${workout.id}`} className="text-sm font-semibold text-white">
                      Supprimer définitivement « {workout.title || "cette séance"} » ?
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Cette action retire la séance de la bibliothèque.
                    </p>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Btn
                        variant="danger"
                        onClick={() => deleteWorkout(workout)}
                        disabled={deletingWorkoutId === workout.id}
                      >
                        {deletingWorkoutId === workout.id ? "Suppression..." : "Supprimer définitivement"}
                      </Btn>
                      <Btn onClick={() => setWorkoutToDelete(null)} disabled={deletingWorkoutId === workout.id}>
                        Annuler
                      </Btn>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <details className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4 sm:p-5">
        <summary className="cursor-pointer text-lg font-semibold">
          Gérer les disciplines et thèmes
        </summary>

        <p className="mt-2 text-sm text-zinc-400">
          Les couleurs servent aux graphiques de répartition dans les statistiques annuelles.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Editable
            title="Disciplines"
            items={categories}
            setItems={setCategories}
            kind="category"
            workouts={library}
            {...{ rename, removeItem, taxonomyPending }}
          />

          <Editable
            title="Thèmes"
            items={subcategories}
            setItems={setSubcategories}
            kind="subcategory"
            workouts={library}
            {...{ rename, removeItem, taxonomyPending }}
          />
        </div>
      </details>
    </Panel>
  );
}
