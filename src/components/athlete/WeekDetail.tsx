// @ts-nocheck
"use client";

import { supabase } from "@/lib/supabase";
import {
  feedbackDone,
  trainingAverage,
  dateKey,
} from "@/lib/trainingUtils";
import {
  defaultCategories,
  defaultSubcategories,
  weekLabels,
} from "@/lib/platformDefaults";

import { Field, Select, Textarea } from "@/components/ui/ui";

import StatCard from "@/components/athlete/StatCard";

export default function WeekDetail({
  week,
  selectedTag,
  tagWeek,
  athleteId,
  activeYear,
  weekNotes,
  setWeekNotes,
  weekPlanning,
  updateWeekPlanning,
  categories = defaultCategories,
  subcategories = defaultSubcategories,
}) {
  const noteKey = `${athleteId}-${activeYear}-${week.week}`;
  const weekNote = weekNotes[noteKey] || "";
  const planningKey = `${athleteId}-${activeYear}-${week.week}`;
  const currentPlanning = weekPlanning?.[planningKey] || {
    goal: selectedTag || "Off",
    category: "",
    subcategory: "",
    status: "planned",
    coachComment: "",
  };

  const details = [
    ["Séances réalisées", week.sessions],
    ["Temps", `${week.time.toFixed(1)} h`],
    [
      "RPE moyen",
      trainingAverage(week.rpeSum, week.sessions),
    ],
    [
      "Motivation moyenne",
      trainingAverage(
        week.motivationSum,
        week.sessions
      ),
    ],
    [
      "Plaisir moyen",
      trainingAverage(
        week.pleasureSum,
        week.sessions
      ),
    ],
  ];

  async function saveWeekNote(value) {
    setWeekNotes((items) => ({
      ...items,
      [noteKey]: value,
    }));

        const { error } = await supabase
  .from("athlete_week_notes")
  .upsert(
    {
      athlete_id: athleteId,
      year: activeYear,
      week: week.week,
      note: value,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "athlete_id,year,week",
    }
  );
    if (error) {
      console.error(
        "Erreur sauvegarde note semaine",
        error
      );

      alert(
        error.message ||
          "Erreur sauvegarde note semaine"
      );
    }
  }

  return (
    <div className="mt-6 rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-2xl font-bold">
            Détail {week.week}
          </h3>

          <p className="text-sm text-zinc-400">
            {week.range} • Résumé de la semaine
            sélectionnée.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Objectif semaine">
            <Select
              value={currentPlanning.goal || selectedTag || "Off"}
              onChange={(event) => {
                const value = event.target.value;
                updateWeekPlanning?.(activeYear, week.week, "goal", value);
                tagWeek(value === "Aucun" ? "Aucun" : value);
              }}
              className="md:w-52"
            >
              {weekLabels.map((row) => (
                <option key={row.name} value={row.name}>
                  {row.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Discipline dominante">
            <Select
              value={currentPlanning.category || ""}
              onChange={(event) =>
                updateWeekPlanning?.(
                  activeYear,
                  week.week,
                  "category",
                  event.target.value
                )
              }
              className="md:w-52"
            >
              <option value="">Toutes</option>
              {categories.map((category) => (
                <option
                  key={category.id || category.name}
                  value={category.name}
                >
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Thème semaine">
            <Select
              value={currentPlanning.subcategory || ""}
              onChange={(event) =>
                updateWeekPlanning?.(
                  activeYear,
                  week.week,
                  "subcategory",
                  event.target.value
                )
              }
              className="md:w-52"
            >
              <option value="">Tous</option>
              {subcategories.map((subcategory) => (
                <option
                  key={subcategory.id || subcategory.name}
                  value={subcategory.name}
                >
                  {subcategory.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Statut">
            <Select
              value={currentPlanning.status || "planned"}
              onChange={(event) =>
                updateWeekPlanning?.(
                  activeYear,
                  week.week,
                  "status",
                  event.target.value
                )
              }
              className="md:w-52"
            >
              <option value="planned">Prévue</option>
              <option value="done">Réalisée</option>
            </Select>
          </Field>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs text-zinc-300">
        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1">
          Objectif : {currentPlanning.goal || selectedTag || "Off"}
        </span>
        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1">
          Discipline : {currentPlanning.category || "Toutes"}
        </span>
        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1">
          Thème : {currentPlanning.subcategory || "Tous"}
        </span>
        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1">
          Statut : {currentPlanning.status === "done" ? "Réalisée" : "Prévue"}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {details.map(([label, value]) => (
          <StatCard
            key={label}
            label={label}
            value={value}
          />
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
        <h4 className="mb-2 font-semibold">
          Idée générale de la semaine
        </h4>

        <p className="mb-3 text-sm text-zinc-400">
          Intention, ressenti, fatigue, progression ou points à retenir pour cette semaine.
        </p>

        <Textarea
          value={weekNote}
          onChange={(event) =>
            saveWeekNote(event.target.value)
          }
          rows={5}
          placeholder="Ex : bonne semaine, fatigue correcte, séance PMA difficile mais bien encaissée..."
        />
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
        <h4 className="mb-3 font-semibold">
          Séances validées comptabilisées
          dans cette semaine
        </h4>

        {week.sessionsList?.length ? (
          <div className="space-y-2">
            {week.sessionsList.map((session) => (
              <div
                key={session.id}
                className="rounded-xl bg-zinc-800 p-3 text-sm"
              >
                <div className="font-semibold">
                  {dateKey(session.date)} —{" "}
                  {session.title}
                </div>

                <div className="text-zinc-400">
                  {feedbackDone(
                    session.feedback
                  ) ? (
                    <>
                      Temps :{" "}
                      {
                        session.feedback
                          .actualTime
                      }{" "}
                      • RPE :{" "}
                      {
                        session.feedback.rpe
                      }{" "}
                      • Motivation :{" "}
                      {
                        session.feedback
                          .motivation
                      }{" "}
                      • Plaisir :{" "}
                      {
                        session.feedback
                          .pleasure
                      }
                    </>
                  ) : (
                    <>
                      Non faite :{" "}
                      {
                        session.nonDone
                          ?.reason
                      }{" "}
                      {session.nonDone
                        ?.fatigue &&
                        `• Fatigue : ${session.nonDone.fatigue}`}{" "}
                      {session.nonDone
                        ?.pain &&
                        `• Douleur : ${session.nonDone.pain}`}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-zinc-500">
            Aucune séance validée sur cette
            semaine.
          </div>
        )}
      </div>
    </div>
  );
}