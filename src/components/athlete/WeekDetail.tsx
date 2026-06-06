// @ts-nocheck
"use client";

import { supabase } from "@/lib/supabase";
import {
  feedbackDone,
  trainingAverage,
  dateKey,
} from "@/lib/trainingUtils";
import { weekLabels } from "@/lib/platformDefaults";

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
}) {
  const noteKey = `${athleteId}-${activeYear}-${week.week}`;
  const weekNote = weekNotes[noteKey] || "";

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

        const { error: deleteError } = await supabase
      .from("athlete_week_notes")
      .delete()
      .eq("athlete_id", athleteId)
      .eq("year", activeYear)
      .eq("week", week.week);

    if (deleteError) {
      console.error(
        "Erreur suppression ancienne note semaine",
        deleteError
      );

      alert(
        deleteError.message ||
          "Erreur suppression ancienne note semaine"
      );

      return;
    }

    const { error } = await supabase
      .from("athlete_week_notes")
      .insert({
        athlete_id: athleteId,
        year: activeYear,
        week: week.week,
        note: value,
        updated_at: new Date().toISOString(),
      });

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

        <Field label="Couleur / type de semaine">
          <Select
            value={selectedTag}
            onChange={async (event) => {
              const value = event.target.value;

              tagWeek(value);

              if (value === "Aucun") {
                await supabase
                  .from("athlete_week_colors")
                  .delete()
                  .eq("athlete_id", athleteId)
                  .eq("year", activeYear)
                  .eq("week", week.week);

                return;
              }

              await supabase
                .from("athlete_week_colors")
                .upsert(
                  {
                    athlete_id: athleteId,
                    year: activeYear,
                    week: week.week,
                    color_name: value,
                  },
                  {
                    onConflict:
                      "athlete_id,year,week",
                  }
                );
            }}
            className="md:w-52"
          >
            {weekLabels.map((row) => (
              <option
                key={row.name}
                value={row.name}
              >
                {row.name}
              </option>
            ))}
          </Select>
        </Field>
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
          Note de fin de semaine
        </h4>

        <p className="mb-3 text-sm text-zinc-400">
          Ressenti, fatigue, progression,
          points à retenir ou ajustements pour
          la suite.
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