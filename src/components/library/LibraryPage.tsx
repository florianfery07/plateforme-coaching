// @ts-nocheck
"use client";

import { supabase } from "@/lib/supabase";

import {
  Btn,
  Empty,
  Panel,
} from "@/components/ui/ui";

import FilterSelects from "@/components/calendar/FilterSelects";
import Editable from "@/components/library/Editable";

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
}) {
  async function deleteWorkout(workout) {
    const ok = window.confirm(
      `Supprimer définitivement "${workout.title}" de la bibliothèque ?`
    );

    if (!ok) return;

    await supabase
      .from("workout_library")
      .delete()
      .eq("id", workout.id);

    setLibrary(
      library.filter((row) => row.id !== workout.id)
    );
  }

  const sortedLibrary = [...filteredLibrary].sort((a, b) => {
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
              {filteredLibrary.length} séance(s) affichée(s).
            </p>
          </div>

          <FilterSelects
            {...{
              categories,
              subcategories,
              filter,
              setFilter,
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {!filteredLibrary.length && (
            <Empty text="Aucune séance." />
          )}

          {sortedLibrary.map((workout) => (
            <div
              key={workout.id}
              className="flex flex-col justify-between rounded-2xl border border-zinc-700 bg-zinc-900 p-4"
            >
              <div>
                <div className="mb-2 flex flex-wrap gap-2 text-xs">
                  {workout.category && (
                    <span className="rounded-full bg-zinc-800 px-2 py-1 font-semibold text-zinc-300">
                      {workout.category}
                    </span>
                  )}

                  {workout.subcategory && (
                    <span className="rounded-full bg-zinc-800 px-2 py-1 text-zinc-400">
                      {workout.subcategory}
                    </span>
                  )}
                </div>

                <h4 className="line-clamp-2 text-base font-bold">
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

              <div className="mt-4 flex gap-2">
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
                  onClick={() => deleteWorkout(workout)}
                >
                  Supprimer
                </Btn>
              </div>
            </div>
          ))}
        </div>
      </div>

      <details className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4 sm:p-5">
        <summary className="cursor-pointer text-lg font-semibold">
          Gérer les catégories et sous-parties
        </summary>

        <p className="mt-2 text-sm text-zinc-400">
          Les couleurs servent aux graphiques de répartition dans les statistiques annuelles.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Editable
            title="Catégories"
            items={categories}
            setItems={setCategories}
            kind="category"
            {...{ rename, removeItem }}
          />

          <Editable
            title="Sous-parties"
            items={subcategories}
            setItems={setSubcategories}
            kind="subcategory"
            {...{ rename, removeItem }}
          />
        </div>
      </details>
    </Panel>
  );
}