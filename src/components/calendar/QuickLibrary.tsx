// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { Btn, Empty } from "@/components/ui/ui";
import FilterSelects from "@/components/calendar/FilterSelects";
import { getColorClass } from "@/lib/colors";
import { isFeatureEnabled } from "@/lib/features";
import { useReliableMutation } from "@/hooks/use-reliable-mutation";
import { createTypedSupabaseClient } from "@/lib/supabase-typed";
import {
  createGroupSessionService,
  createGroupSessionSupabaseRepository,
  createLegacyGroupBridgeService,
  createLegacyGroupBridgeSupabaseRepository,
} from "@/services/groups-v2";

function localDateKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function QuickLibrary({
  categories,
  subcategories,
  filter,
  setFilter,
  filteredLibrary,
  importWorkout,
  planningTargetType,
  selectedGroup,
  selectedGroupMembers = [],
  athletes = [],
  selectedDate,
}) {
  const [pendingWorkout, setPendingWorkout] = useState(null);
  const [selectedAthleteIds, setSelectedAthleteIds] = useState([]);
  const groupsPilotEnabled = isFeatureEnabled("groupsV2") && isFeatureEnabled("accessControlV2");
  const pilotMutation = useReliableMutation({
    key: "groups-v2-pilot-schedule",
    concurrency: "reject",
    type: "groups-v2-pilot-schedule",
    operation: async (workout) => {
      const client = createTypedSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const bridge = createLegacyGroupBridgeService(createLegacyGroupBridgeSupabaseRepository(client));
      const mapping = await bridge.resolve(selectedGroup.id);
      if (mapping.kind === "error") return { kind: "legacy_fallback" };
      const service = createGroupSessionService(createGroupSessionSupabaseRepository(client));
      const result = await service.create({
        organizationId: mapping.organizationId,
        participantMembershipIds: mapping.athleteMembershipIds,
        scheduledFor: localDateKey(selectedDate),
        title: workout.title,
        workoutType: workout.category || "",
        subcategory: workout.subcategory || "",
        description: workout.description || "",
        duration: workout.totalDuration || "",
        expectedRpe: workout.expectedRpe || "",
        expectedRpeGlobal: workout.expectedRpeGlobal ?? null,
        expectedSpecificDuration: workout.expectedSpecificDuration || "",
        expectedRpeSpecific: workout.expectedRpeSpecific ?? null,
        blocks: workout.blocks || [],
      });
      if (result.kind === "error") throw { kind: result.error };
      return { kind: "success", ...result.operation, participantCount: mapping.athleteMembershipIds.length };
    },
  });

  const groupAthletes = useMemo(
    () =>
      selectedGroupMembers
        .map((member) => athletes.find((athlete) => athlete.id === member.athlete_id))
        .filter(Boolean),
    [selectedGroupMembers, athletes]
  );

  const openGroupImport = (workout) => {
    if (!selectedGroup) {
      alert("Choisis un groupe avant d’importer une séance collective.");
      return;
    }

    if (!groupAthletes.length) {
      alert("Ce groupe ne contient aucun athlète.");
      return;
    }

    setPendingWorkout(workout);
    setSelectedAthleteIds(groupAthletes.map((athlete) => athlete.id));
  };

  const toggleAthlete = (athleteId) => {
    setSelectedAthleteIds((items) =>
      items.includes(athleteId)
        ? items.filter((id) => id !== athleteId)
        : [...items, athleteId]
    );
  };

  const confirmGroupImport = async () => {
    if (!pendingWorkout) return;

    if (!selectedAthleteIds.length) {
      alert("Sélectionne au moins un athlète du groupe.");
      return;
    }

    if (groupsPilotEnabled) {
      const result = await pilotMutation.mutate(pendingWorkout);
      if (result.state === "success" && result.data?.kind === "legacy_fallback") {
        importWorkout(pendingWorkout, undefined, selectedAthleteIds);
      }
    } else {
      importWorkout(pendingWorkout, undefined, selectedAthleteIds);
    }
    setPendingWorkout(null);
    setSelectedAthleteIds([]);
  };

  const sortedLibrary = [...filteredLibrary].sort((a, b) => {
    const toMinutes = (value) => {
      const text = String(value || "").toLowerCase();
      const hours = Number(text.match(/(\d+)h/)?.[1] || 0);
      const minutes = Number(text.match(/h(\d+)/)?.[1] || text.match(/(\d+)min/)?.[1] || 0);
      return hours * 60 + minutes;
    };

    return toMinutes(a.totalDuration) - toMinutes(b.totalDuration);
  });

  return (
    <aside className="h-fit rounded-3xl border border-zinc-800 bg-zinc-900 p-3 shadow-xl sm:p-5">
      <h2 className="mb-2 text-xl font-semibold">Bibliothèque rapide</h2>

      <p className="mb-4 text-sm text-zinc-400">
        Importer une séance sur le jour sélectionné.
      </p>

      <FilterSelects {...{ categories, subcategories, filter, setFilter }} />

      {pendingWorkout && planningTargetType === "group" && (
        <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-950 p-4">
          <div className="mb-3">
            <h3 className="font-bold">Ajouter au groupe</h3>
            <p className="mt-1 text-sm text-zinc-400">
              {groupsPilotEnabled ? `Pilote Groups V2 : tous les membres validés du groupe recevront ${pendingWorkout.title}.` : `Choisis les athlètes qui recevront : ${pendingWorkout.title}`}
            </p>
          </div>

          {!groupsPilotEnabled && <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedAthleteIds(groupAthletes.map((athlete) => athlete.id))}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800"
            >
              Tout sélectionner
            </button>

            <button
              type="button"
              onClick={() => setSelectedAthleteIds([])}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-400 hover:bg-zinc-800"
            >
              Tout retirer
            </button>
          </div>}

          {!groupsPilotEnabled && <div className="space-y-2">
            {groupAthletes.map((athlete) => {
              const checked = selectedAthleteIds.includes(athlete.id);

              return (
                <button
                  key={athlete.id}
                  type="button"
                  onClick={() => toggleAthlete(athlete.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${
                    checked
                      ? "border-white bg-zinc-900"
                      : "border-zinc-700 bg-zinc-950"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${getColorClass(athlete.color)}`} />
                    <span className="font-semibold">{athlete.name}</span>
                  </span>
                  <span className="text-sm font-bold text-zinc-400">
                    {checked ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Btn variant="primary" onClick={confirmGroupImport} disabled={pilotMutation.pending} className="flex-1">
              {pilotMutation.pending ? "Programmation..." : groupsPilotEnabled ? "Programmer le groupe (V2)" : `Programmer pour ${selectedAthleteIds.length}/${groupAthletes.length}`}
            </Btn>
            <Btn
              onClick={() => {
                setPendingWorkout(null);
                setSelectedAthleteIds([]);
              }}
              className="flex-1"
            >
              Annuler
            </Btn>
          </div>
          {pilotMutation.state === "success" && <p className="mt-3 text-sm text-emerald-400">Séance V2 programmée pour {pilotMutation.lastSuccess?.participantCount} participant(s).</p>}
          {pilotMutation.error && <p className="mt-3 text-sm text-red-400">{pilotMutation.error.message}</p>}
        </div>
      )}

      <div className="space-y-3">
        {!filteredLibrary.length && <Empty text="Aucune séance." />}

        {sortedLibrary.map((workout) => (
          <div
            key={workout.id}
            className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4"
          >
            <h3 className="font-bold">{workout.title}</h3>

            <p className="text-sm text-zinc-400">
              {workout.totalDuration || "Durée libre"} • {workout.blocks.length}{" "}
              bloc(s)
            </p>
            <Btn
              variant="primary"
              onClick={() =>
                planningTargetType === "group"
                  ? openGroupImport(workout)
                  : importWorkout(workout)
              }
              className="mt-3 w-full"
            >
              Importer ce jour
            </Btn>
          </div>
        ))}
      </div>
    </aside>
  );
}
