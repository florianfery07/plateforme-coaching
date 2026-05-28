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
  return (
    <Panel>
      <h2 className="mb-2 text-2xl font-semibold">
        Ma bibliothèque générale de séances
      </h2>

      <p className="mb-5 text-sm text-zinc-400">
        Ici, pas de sélection d’athlète : seulement mes séances et mes réglages.
      </p>

      <div className="mb-6 rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold">
              Mes séances créées
            </h3>

            <p className="text-sm text-zinc-400">
              Filtre par catégorie et sous-partie.
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {!filteredLibrary.length && (
            <Empty text="Aucune séance." />
          )}

          {filteredLibrary.map((workout) => (
            <div
              key={workout.id}
              className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4"
            >
              <h4 className="text-lg font-bold">
                {workout.title}
              </h4>

              <p className="text-sm text-zinc-400">
                {workout.totalDuration || "Durée libre"} •{" "}
                {workout.blocks.length} bloc(s)
              </p>

              <div className="mt-4 flex gap-2">
                <Btn
                  variant="primary"
                  className="flex-1"
                  onClick={() => editWorkout(workout)}
                >
                  Modifier
                </Btn>

                <Btn
                  variant="danger"
                  className="flex-1"
                  onClick={async () => {
                    await supabase
                      .from("workout_library")
                      .delete()
                      .eq("id", workout.id);

                    setLibrary(
                      library.filter((row) => row.id !== workout.id)
                    );
                  }}
                >
                  Supprimer
                </Btn>
              </div>
            </div>
          ))}
        </div>
      </div>

      <details className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
        <summary className="cursor-pointer text-xl font-semibold">
          Gérer les catégories et sous-parties
        </summary>

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