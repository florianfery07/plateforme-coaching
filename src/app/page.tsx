// @ts-nocheck
"use client";

import {
  avg,
  criticalPower,
  dateKey,
  durationHours,
  feedbackDone,
  monthDays,
  parseLocalDate,
  trainingStats,
} from "@/lib/trainingUtils";
import {
  athlete,
  blankFeedback,
  blankNonDone,
  blankWorkout,
  CALENDAR_YEARS,
  defaultAthletes,
  defaultCategories,
  defaultLibrary,
  defaultSubcategories,
} from "@/lib/platformDefaults";
import { getColorClass } from "@/lib/colors";
import { loadAccessControlV2Context, type AccessContextRpcClient } from "@/lib/access";
import { isFeatureEnabled } from "@/lib/features";
import { isReliableMutationsPilotEnabled } from "@/lib/features/reliable-mutations-pilot";
import { supabase } from "@/lib/supabase";
import { createTypedSupabaseClient } from "@/lib/supabase-typed";
import { createAthleteInviteService, createAthleteInviteSupabaseRepository } from "@/services/athlete-invites";
import { createAthleteLifecycleService, shouldUseAthleteLifecycleV2 } from "@/services/athlete-lifecycle";
import { createGoalsV2Service, goalsV2Repository, shouldUseGoalsV2 } from "@/services/goals-v2";
import { calendarSessionsForDate, loadCalendarSessions } from "@/services/calendar-sessions";
import { calendarSessionService, calendarSessionsRepository } from "@/services/calendar-sessions-repository";
import {
  calendarProposalsForAthlete,
  calendarProposalsForDate,
  loadCalendarProposals,
} from "@/services/calendar-proposals";
import {
  calendarProposalSchedulingService,
  calendarProposalsRepository,
} from "@/services/calendar-proposals-repository";
import { loadWeeklyPlanning } from "@/services/weekly-planning";
import { weeklyPlanningRepository } from "@/services/weekly-planning-repository";
import { loadWeeklyColors } from "@/services/weekly-colors";
import { weeklyColorsRepository } from "@/services/weekly-colors-repository";
import { loadWeekNotes, supabaseWeekNoteRepository } from "@/services/week-notes";
import { filterWorkoutLibrary, loadWorkoutLibrary } from "@/services/workout-library";
import {
  workoutLibraryRepository,
  workoutLibraryService,
  workoutTaxonomyService,
} from "@/services/workout-library-repository";
import { useReliableMutation } from "@/hooks/use-reliable-mutation";
import { createAthletesRepository, loadLegacyAthleteDirectory } from "@/services/athletes";
import { reportPilotReadDiagnostic } from "@/features/auth-athletes/pilot-read-controller";
import { loadPilotAuthAthleteRead } from "@/features/auth-athletes/pilot-read-service";
import { useEffect, useMemo, useRef, useState } from "react";
import AuthPage from "@/components/auth/AuthPage";

import Header from "@/components/layout/Header";
import {
  createAthleteGroup,
  loadAthleteGroups,
  removeAthleteGroup,
  setAthleteGroupMember,
  updateAthleteGroupName,
} from "@/lib/api/groups";
import AthleteSelector from "@/components/athlete/AthleteSelector";
import CalendarPageOld from "@/components/calendar/CalendarPageOld";
import ManagementPage from "@/components/athlete/ManagementPage";
import CreatePage from "@/components/library/CreatePage";
import LibraryPage from "@/components/library/LibraryPage";
import AthletePage from "@/components/athlete/AthletePage";
import AthleteStatsPage from "@/components/athlete/AthleteStatsPage";
import AthleteGoalUpdatePanel from "@/components/athlete/AthleteGoalUpdatePanel";
import { AthleteGoalsV2Panel } from "@/components/athlete/AthleteGoalsV2Panel";
import DevChecks from "@/components/dev/DevChecks";
import {
  deleteAthleteWorkoutFromGroupDay as deleteAthleteWorkoutFromGroupDayApi,
  deleteGroupDayWorkouts as deleteGroupDayWorkoutsApi,
} from "@/lib/api/RroupCalendar";

function id(prefix = "id") { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function calendarSession(workout, date) {
  return {
    ...workout,
    id: id("session"),
    date: dateKey(date),
    feedback: blankFeedback(),
    nonDone: blankNonDone()
  };
}
function proposalToSession(proposal) {
  return {
    id: id("session-proposal"),
    sourceProposalId: proposal.id,
    category: "Proposition athlète",
    subcategory: proposal.type,
    title: proposal.title || proposal.type,
    totalDuration: "",
    expectedRpe: "",
    description: proposal.message || "Proposition validée par le coach.",
    date: proposal.date,
    blocks: [],
    feedback: blankFeedback(),
    nonDone: blankNonDone()
  };
}
function availableYears(sessions, preferredYear = new Date().getFullYear()) { const currentYear = new Date().getFullYear(); const years = new Set([currentYear - 5, currentYear, currentYear + 25, Number(preferredYear)]); CALENDAR_YEARS.forEach((year) => years.add(year)); sessions.forEach((session) => years.add(parseLocalDate(session.date).getFullYear())); return [...years].sort((a, b) => b - a); }
const goalsV2Service = createGoalsV2Service(goalsV2Repository);
export default function CoachingPlatformMockup() {
  async function deleteAthleteWorkoutFromGroupDay(referenceSession) {
  const ok = window.confirm("Retirer cette séance uniquement pour cet athlète ?");
  if (!ok) return;

  if (calendarGroupDeletePilotEnabled) {
    const result = await calendarGroupMemberDeleteMutation.mutate({
      workoutIds: [referenceSession?.id],
    });

    if (result.state === "success" && result.data) {
      setSessions((items) => Object.fromEntries(
        Object.entries(items).map(([athleteId, athleteSessions]) => [
          athleteId,
          athleteSessions.filter((session) => session.id !== referenceSession.id),
        ]),
      ));
      return result;
    }

    if (result.state === "error") {
      alert("Impossible de retirer cette séance. Réessaie.");
    }

    return result;
  }

  const result = await deleteAthleteWorkoutFromGroupDayApi(referenceSession);

  if (!result.success) {
    alert(result.error || "Erreur suppression séance athlète");
    return;
  }

  await loadAllData();
}

async function deleteGroupDayWorkouts(date = selectedDate) {
  const ok = window.confirm(
    "Retirer toutes les séances de tous les athlètes du groupe pour cette journée ?"
  );
  if (!ok) return;

  if (calendarGroupDeletePilotEnabled) {
    const workoutIds = selectedGroupAthleteIds.flatMap((athleteId) =>
      (sessions[athleteId] || [])
        .filter((session) => session.date === dateKey(date))
        .map((session) => session.id),
    );
    const result = await calendarGroupDayDeleteMutation.mutate({ workoutIds });

    if (result.state === "success" && result.data) {
      const workoutIdsToRemove = new Set(result.data);
      setSessions((items) => Object.fromEntries(
        Object.entries(items).map(([athleteId, athleteSessions]) => [
          athleteId,
          athleteSessions.filter((session) => !workoutIdsToRemove.has(session.id)),
        ]),
      ));
      return result;
    }

    if (result.state === "error") {
      alert("Impossible de retirer les séances du groupe. Réessaie.");
    }

    return result;
  }

  const result = await deleteGroupDayWorkoutsApi({
    date: dateKey(date),
    groupAthleteIds: selectedGroupAthleteIds,
    sessionsByAthlete: sessions,
  });

  if (!result.success) {
    alert(result.error || "Erreur suppression séances groupe");
    return;
  }

  await loadAllData();
}
  const now = new Date();
  const [view, setView] = useState("calendar");
  const [mode, setMode] = useState("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(now);
  const [athletes, setAthletes] = useState(defaultAthletes);
  const [activeId, setActiveId] = useState("athlete-1");
  const [newAthlete, setNewAthlete] = useState("");
  const [categories, setCategories] = useState(defaultCategories);
  const [subcategories, setSubcategories] = useState(defaultSubcategories);
  const [newCat, setNewCat] = useState({ name: "", color: getColorClass() });
  const [newSub, setNewSub] = useState({ name: "", color: "bg-yellow-500" });
  const [filter, setFilter] = useState({ category: "", subcategory: "" });
  const [library, setLibrary] = useState(defaultLibrary);
  const [draft, setDraft] = useState(blankWorkout());
  const [editingId, setEditingId] = useState(null);
  const [sessions, setSessions] = useState({ "athlete-1": [], "athlete-2": [], "athlete-3": [] });
  const [proposals, setProposals] = useState([{ id: "proposal-1", athleteId: "athlete-1", type: "Course à ajouter", date: dateKey(now), title: "XCO régional", message: "J’aimerais l’ajouter au calendrier.", status: "À traiter" }]);
  const [weekColors, setWeekColors] = useState({});
  const [weekNotes, setWeekNotes] = useState({});
  const [weekPlanning, setWeekPlanning] = useState({});
const [athleteGroups, setAthleteGroups] = useState([]);
const [athleteGroupMembers, setAthleteGroupMembers] = useState([]);
const [athleteGroupMemberPendingKeys, setAthleteGroupMemberPendingKeys] = useState([]);
const [newGroupName, setNewGroupName] = useState("");
const [planningTargetType, setPlanningTargetType] = useState("athlete");
	const [selectedGroupId, setSelectedGroupId] = useState("");
	const [auth, setAuth] = useState(null);
	const [athleteLifecycleV2Enabled, setAthleteLifecycleV2Enabled] = useState(false);
	const [athleteGoalsV2Enabled, setAthleteGoalsV2Enabled] = useState(false);
	const [athleteGoalsV2State, setAthleteGoalsV2State] = useState(null);
	const [athleteLifecyclePendingAthleteId, setAthleteLifecyclePendingAthleteId] = useState(null);
	const athleteLifecycleLocksRef = useRef(new Set());
	const athleteGroupMemberLocksRef = useRef(new Set());
  const workoutLibraryPilotEnabled = isReliableMutationsPilotEnabled();
  const workoutTaxonomyPilotEnabled = isReliableMutationsPilotEnabled();
  const calendarSessionImportPilotEnabled = isReliableMutationsPilotEnabled();
  const calendarSessionAdjustmentPilotEnabled = isReliableMutationsPilotEnabled();
  const calendarRestDayPilotEnabled = isReliableMutationsPilotEnabled();
  const calendarSessionNonDonePilotEnabled = isReliableMutationsPilotEnabled();
  const calendarGroupDeletePilotEnabled = isReliableMutationsPilotEnabled();
  const calendarProposalSchedulingPilotEnabled = isReliableMutationsPilotEnabled();
  const athleteGroupMemberPilotEnabled = isReliableMutationsPilotEnabled();
  const athleteGroupCreatePilotEnabled = isReliableMutationsPilotEnabled();
  const athleteGroupDeletePilotEnabled = isReliableMutationsPilotEnabled();
  const workoutLibrarySaveMutation = useReliableMutation({
    concurrency: "reject",
    key: `workout-library:${editingId || "new"}`,
    operation: ({ workout, workoutId }, context) =>
      workoutLibraryService.save({ workout, workoutId }, context.signal),
    retry: {
      attempts: 2,
      delayMs: 500,
      shouldRetry: (error) => error.kind === "network",
    },
    timeoutMs: 10_000,
    type: "workout-library.save",
  });
  const workoutTaxonomyRenameMutation = useReliableMutation({
    concurrency: "reject",
    key: "workout-taxonomy.rename",
    operation: ({ color, kind, name, taxonomyId }, context) =>
      workoutTaxonomyService.rename({ color, kind, name, taxonomyId }, context.signal),
    retry: {
      attempts: 2,
      delayMs: 500,
      shouldRetry: (error) => error.kind === "network",
    },
    timeoutMs: 10_000,
    type: "workout-taxonomy.rename",
  });
  const workoutTaxonomyDeleteMutation = useReliableMutation({
    concurrency: "reject",
    key: "workout-taxonomy.delete",
    operation: ({ kind, name }, context) =>
      workoutTaxonomyService.delete({ kind, name }, context.signal),
    retry: {
      attempts: 2,
      delayMs: 500,
      shouldRetry: (error) => error.kind === "network",
    },
    timeoutMs: 10_000,
    type: "workout-taxonomy.delete",
  });
  const calendarSessionImportMutation = useReliableMutation({
    concurrency: "reject",
    key: `calendar-session-import:${activeId}:${dateKey(selectedDate)}`,
    operation: ({ athleteId, session }, context) =>
      calendarSessionService.create({ athleteId, session }, context.signal),
    type: "calendar-session.import",
  });
  const calendarSessionAdjustmentMutation = useReliableMutation({
    concurrency: "reject",
    key: "calendar-session-adjustment",
    operation: ({ adjustedSpecificDuration, workoutId }, context) =>
      calendarSessionService.saveAdjustment({
        adjustedSpecificDuration,
        workoutId,
      }, context.signal),
    type: "calendar-session.adjustment.save",
  });
  const calendarRestDayMutation = useReliableMutation({
    concurrency: "reject",
    key: `calendar-rest-day:${activeId}:${dateKey(selectedDate)}`,
    operation: ({ athleteId, date }, context) =>
      calendarSessionService.createRestDay({ athleteId, date }, context.signal),
    type: "calendar-session.rest-day.create",
  });
  const calendarSessionNonDoneMutation = useReliableMutation({
    concurrency: "reject",
    key: "calendar-session-non-done",
    operation: ({ nonDone, workoutId }, context) =>
      calendarSessionService.saveNonDone({ nonDone, workoutId }, context.signal),
    type: "calendar-session.non-done.save",
  });
  const calendarGroupMemberDeleteMutation = useReliableMutation({
    concurrency: "reject",
    key: "calendar-session.group-member.delete",
    operation: ({ workoutIds }, context) =>
      calendarSessionService.remove({ workoutIds }, context.signal),
    retry: {
      attempts: 2,
      delayMs: 500,
      shouldRetry: (error) => error.kind === "network",
    },
    timeoutMs: 10_000,
    type: "calendar-session.group-member.delete",
  });
  const calendarGroupDayDeleteMutation = useReliableMutation({
    concurrency: "reject",
    key: "calendar-session.group-day.delete",
    operation: ({ workoutIds }, context) =>
      calendarSessionService.remove({ workoutIds }, context.signal),
    retry: {
      attempts: 2,
      delayMs: 500,
      shouldRetry: (error) => error.kind === "network",
    },
    timeoutMs: 10_000,
    type: "calendar-session.group-day.delete",
  });
  const calendarProposalSchedulingMutation = useReliableMutation({
    concurrency: "reject",
    key: "calendar-proposal.schedule",
    operation: ({ proposalId }, context) =>
      calendarProposalSchedulingService.schedule(proposalId, context.signal),
    retry: {
      attempts: 2,
      delayMs: 500,
      shouldRetry: (error) => error.kind === "network",
    },
    timeoutMs: 10_000,
    type: "calendar-proposal.schedule",
  });
  const athleteGroupMemberMutation = useReliableMutation({
    concurrency: "parallel",
    key: "athlete-group-member",
    onMutate: ({ athleteId, checked, groupId }) => {
      setAthleteGroupMembers((current) => {
        const exists = current.some(
          (member) => member.group_id === groupId && member.athlete_id === athleteId,
        );

        if (checked) {
          return exists ? current : [...current, { athlete_id: athleteId, group_id: groupId }];
        }

        return current.filter(
          (member) => member.group_id !== groupId || member.athlete_id !== athleteId,
        );
      });

      return () => {
        setAthleteGroupMembers((current) => {
          const exists = current.some(
            (member) => member.group_id === groupId && member.athlete_id === athleteId,
          );

          if (checked) {
            return current.filter(
              (member) => member.group_id !== groupId || member.athlete_id !== athleteId,
            );
          }

          return exists ? current : [...current, { athlete_id: athleteId, group_id: groupId }];
        });
      };
    },
    operation: ({ athleteId, checked, groupId }) =>
      setAthleteGroupMember(groupId, athleteId, checked),
    type: "athlete-group-member.save",
  });
  const athleteGroupCreateMutation = useReliableMutation({
    concurrency: "reject",
    key: "athlete-group.create",
    operation: ({ name }) => createAthleteGroup(name),
    type: "athlete-group.create",
  });
  const athleteGroupDeleteMutation = useReliableMutation({
    concurrency: "reject",
    key: "athlete-group.delete",
    operation: ({ groupId }) => removeAthleteGroup(groupId),
    type: "athlete-group.delete",
  });
  const athleteGoalsV2Mutation = useReliableMutation({
    concurrency: "reject",
    key: `athlete-goals-v2:${activeId || "none"}`,
    operation: (input) => {
      switch (input.action) {
        case "open":
          return goalsV2Service.open(input);
        case "cancel":
          return goalsV2Service.cancel(input.requestId);
        case "accept":
          return goalsV2Service.accept(input.requestId, input.reviewNote);
        case "requestChanges":
          return goalsV2Service.requestChanges(input);
        case "submit":
          return goalsV2Service.submit(input);
      }
    },
    retry: {
      attempts: 2,
      delayMs: 500,
      shouldRetry: (error) => error.kind === "network",
    },
    timeoutMs: 10_000,
    type: "athlete-goals.workflow",
  });

async function loadAllData() {
  const athleteDirectoryResult = await loadLegacyAthleteDirectory(
    createAthletesRepository(supabase),
  );

  if (athleteDirectoryResult.kind === "error") {
    console.error("Erreur chargement athlètes", athleteDirectoryResult.error);
    return;
  }

  const loadedAthletes = athleteDirectoryResult.athletes;

  const calendarSessionsResult = await loadCalendarSessions(
    calendarSessionsRepository,
    loadedAthletes.map((row) => row.id),
  );

  if (calendarSessionsResult.kind === "error") {
    console.error("Erreur chargement séances", calendarSessionsResult.error);
    return;
  }

  setAthletes(loadedAthletes);
  if (loadedAthletes.length && !loadedAthletes.some((row) => row.id === activeId)) {
    setActiveId(loadedAthletes[0].id);
  }
  setSessions(calendarSessionsResult.sessions);

const workoutLibraryResult = await loadWorkoutLibrary(workoutLibraryRepository);

if (workoutLibraryResult.kind === "error") {
  console.error("Erreur chargement bibliothèque", workoutLibraryResult.error);
  return;
}

if (workoutLibraryResult.library) {
  setLibrary(workoutLibraryResult.library);
}

const { data: categoryData } = await supabase
  .from("workout_categories")
  .select("*")
  .order("created_at", { ascending: true });

if (categoryData?.length) {
  setCategories(categoryData);
}

const { data: subcategoryData } = await supabase
  .from("workout_subcategories")
  .select("*")
  .order("created_at", { ascending: true });

if (subcategoryData?.length) {
  setSubcategories(subcategoryData);
}
const calendarProposalsResult = await loadCalendarProposals(
  calendarProposalsRepository,
);

if (calendarProposalsResult.kind === "success") {
  setProposals(calendarProposalsResult.proposals);
}
const weeklyColorsResult = await loadWeeklyColors(weeklyColorsRepository);

if (weeklyColorsResult.kind === "success") {
  setWeekColors(weeklyColorsResult.colors);
}
const weekNotesResult = await loadWeekNotes(supabaseWeekNoteRepository);

if (weekNotesResult.kind === "success") {
  setWeekNotes(weekNotesResult.notes);
}
const weeklyPlanningResult = await loadWeeklyPlanning(weeklyPlanningRepository);

if (weeklyPlanningResult.kind === "success") {
  setWeekPlanning(weeklyPlanningResult.planning);
}
try {
  const groupsResult = await loadAthleteGroups();
  setAthleteGroups(groupsResult.groups);
  setAthleteGroupMembers(groupsResult.members);
} catch (error) {
  console.error("Erreur chargement groupes", error);
}
}

useEffect(() => {
  loadAllData();
}, []);

useEffect(() => {
  async function restoreSession() {
    const { data } = await supabase.auth.getSession();

    if (!data.session?.user) return;

    async function resolvePilotAuth(legacyAuth) {
      const featureEnabled = isFeatureEnabled("accessControlV2");

      if (!featureEnabled) {
        return legacyAuth;
      }

      const decision = await loadPilotAuthAthleteRead(
        supabase,
        legacyAuth,
        data.session.user.id,
        featureEnabled,
      );
      reportPilotReadDiagnostic(decision);

      return decision.auth || legacyAuth;
    }

    const { data: athlete } = await supabase
      .from("athletes")
      .select("*")
      .eq("user_id", data.session.user.id)
      .maybeSingle();

    if (athlete) {
      if (athlete.active === false) {
        console.error("Ce compte athlète est archivé.");
        await supabase.auth.signOut();
        setAuth(null);
        return;
      }

      setAuth(await resolvePilotAuth({
        role: "athlete",
        athleteId: athlete.id,
      }));
      return;
    }

    setAuth(await resolvePilotAuth({ role: "coach" }));
await loadAllData();
  }

  restoreSession();
}, []);

useEffect(() => {
  if (auth?.role === "athlete") {
    setActiveId(auth.athleteId);
    setView("calendar");
    setMode("month");
    setSelectedDate(new Date());
  }
}, [auth]);

const athleteLifecycleFeatureEnabled = isFeatureEnabled("accessControlV2")
  && isFeatureEnabled("athleteLifecycleV2");
const athleteGoalsV2FeatureEnabled = isFeatureEnabled("accessControlV2")
  && isFeatureEnabled("athleteGoalsV2");
const athleteLifecyclePilotEnabled = athleteLifecycleFeatureEnabled
  && auth?.role === "coach"
  && athleteLifecycleV2Enabled;

useEffect(() => {
  let active = true;

  if (!athleteLifecycleFeatureEnabled || auth?.role !== "coach") {
    return () => { active = false; };
  }

  void (async () => {
    const client = createTypedSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const context = await loadAccessControlV2Context(
      client as unknown as AccessContextRpcClient,
      true,
    );
    if (active) {
      setAthleteLifecycleV2Enabled(shouldUseAthleteLifecycleV2(context, true));
    }
  })();

  return () => { active = false; };
}, [athleteLifecycleFeatureEnabled, auth?.role]);

useEffect(() => {
  let active = true;

  if (!athleteGoalsV2FeatureEnabled || !auth) {
    return () => { active = false; };
  }

  void (async () => {
    const client = createTypedSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const context = await loadAccessControlV2Context(
      client as unknown as AccessContextRpcClient,
      true,
    );
    if (active) {
      setAthleteGoalsV2Enabled(shouldUseGoalsV2(context, true));
    }
  })();

  return () => { active = false; };
}, [athleteGoalsV2FeatureEnabled, auth]);
  const isCoach = auth?.role === "coach";
  const visibleAthletes = athletes.filter((row) => row.active !== false);
  const athleteActive =
  athletes.find((row) => row.id === activeId) ||
  athletes[0] ||
  defaultAthletes[0];
  const athleteGoalsV2PilotEnabled = athleteGoalsV2FeatureEnabled && athleteGoalsV2Enabled;
  const athleteGoalsV2TargetEnabled = athleteGoalsV2PilotEnabled
    && athleteGoalsV2State?.legacyAthleteId === athleteActive?.id;
  useEffect(() => {
    let active = true;

    if (!athleteGoalsV2PilotEnabled || !athleteActive?.id) {
      return () => { active = false; };
    }

    void goalsV2Service.getState(athleteActive.id)
      .then((state) => {
        if (active) setAthleteGoalsV2State(state);
      })
      .catch(() => {
        if (active) setAthleteGoalsV2State(null);
      });

    return () => { active = false; };
  }, [athleteGoalsV2PilotEnabled, athleteActive?.id]);
  const cpData = criticalPower(athleteActive?.power5, athleteActive?.power12, athleteActive?.power20, athleteActive?.weight);
  const days = useMemo(() => monthDays(year, month), [year, month]);
  const activeSessions = sessions[activeId] || [];
  const activeProposals = calendarProposalsForAthlete(proposals, activeId);
  const selectedGroup = athleteGroups.find((group) => group.id === selectedGroupId);
  const selectedGroupMembers = athleteGroupMembers.filter(
    (member) => member.group_id === selectedGroupId
  );
  const selectedGroupAthleteIds = selectedGroupMembers.map((member) => member.athlete_id);
  const filteredLibrary = filterWorkoutLibrary(library, filter);
  const done = activeSessions.filter((session) => feedbackDone(session.feedback));
  const notDone = activeSessions.filter((session) => session.nonDone?.validated);
  const plannedDurationHours = activeSessions.reduce(
    (total, session) => total + durationHours(session.totalDuration),
    0
  );
  const completedDurationHours = done.reduce(
    (total, session) => total + durationHours(session.feedback?.actualTime),
    0
  );
  const stats = { planned: activeSessions.length, completed: done.length, rpe: avg(done, "rpe"), motivation: avg(done, "motivation"), pleasure: avg(done, "pleasure") };
  const training = trainingStats(activeSessions, year);

  const updateAthlete = async (field, value, athleteId = activeId) => {
  setAthletes((items) =>
    items.map((a) =>
      a.id !== athleteId
        ? a
        : field === "name"
        ? {
            ...a,
            name: value,
            calendarName: `Calendrier de ${value || "l’athlète"}`
          }
        : {
            ...a,
            [field]: value
          }
    )
  );

  const fieldMap = {
    shortGoal: "short_goal",
    mediumGoal: "medium_goal",
    longGoal: "long_goal",
    goalUpdateRequested: "goal_update_requested",
  };

  const supabaseField = fieldMap[field] || field;

  const updates = {
    [supabaseField]: value
  };

  const { error } = await supabase
    .from("athletes")
    .update(updates)
    .eq("id", athleteId);

  if (error) {
    console.error("Erreur sauvegarde athlète", error);
  }
};
  const updateSession = (fn) => setSessions((items) => ({ ...items, [activeId]: fn(items[activeId] || []) }));
  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const updateBlock = (index, field, value) => setDraft((current) => ({ ...current, blocks: current.blocks.map((block, blockIndex) => blockIndex === index ? { ...block, [field]: value } : block) }));
  const updateRepeat = (blockIndex, repeatIndex, field, value) => setDraft((current) => ({ ...current, blocks: current.blocks.map((block, index) => index === blockIndex ? { ...block, repeatItems: block.repeatItems.map((repeat, rIndex) => rIndex === repeatIndex ? { ...repeat, [field]: value } : repeat) } : block) }));

  async function addAthlete() {
  const name = newAthlete.trim();
  if (!name) return;

  const { data, error } = await supabase
    .from("athletes")
    .insert({
      name,
      sport: "Vélo",
      weight: "",
    })
    .select()
    .single();

  if (error) {
    console.error("Erreur ajout athlète", error);
    return;
  }

  const newItem = athlete(data.id, data.name);
  setAthletes((items) => [...items, newItem]);
  setSessions((items) => ({ ...items, [newItem.id]: [] }));
  setActiveId(newItem.id);
  setNewAthlete("");
}

async function addAthleteGroup() {
  if (athleteGroupCreatePilotEnabled) {
    const result = await athleteGroupCreateMutation.mutate({ name: newGroupName });

    if (result.state === "success" && result.data) {
      setAthleteGroups((current) => [...current, result.data]);
      setNewGroupName("");
      return result;
    }

    if (result.state === "error") {
      alert("Impossible de créer ce groupe. Réessaie.");
    }

    return result;
  }

  try {
    await createAthleteGroup(newGroupName);
    setNewGroupName("");
    await loadAllData();
  } catch (error) {
    console.error("Erreur ajout groupe complète", JSON.stringify(error, null, 2));
    console.error(error);
    alert(
      error?.message ||
        JSON.stringify(error, null, 2) ||
        "Erreur ajout groupe"
    );
  }
}

async function renameAthleteGroup(groupId, name) {
  const cleanName = String(name || "").trim();
  if (!cleanName) return;

  setAthleteGroups((items) =>
    items.map((group) =>
      group.id === groupId ? { ...group, name: cleanName } : group
    )
  );

  try {
    await updateAthleteGroupName(groupId, cleanName);
  } catch (error) {
    console.error("Erreur renommage groupe", error);
    alert(error.message || "Erreur renommage groupe");
    await loadAllData();
  }
}

async function deleteAthleteGroup(groupId) {
  const ok = window.confirm("Supprimer ce groupe ? Les athlètes ne seront pas supprimés.");
  if (!ok) return;

  if (athleteGroupDeletePilotEnabled) {
    const result = await athleteGroupDeleteMutation.mutate({ groupId });

    if (result.state === "success" && result.data) {
      setAthleteGroups((items) => items.filter((group) => group.id !== groupId));
      setAthleteGroupMembers((items) =>
        items.filter((member) => member.group_id !== groupId),
      );
      return result;
    }

    if (result.state === "error") {
      alert("Impossible de supprimer ce groupe. Réessaie.");
    }

    return result;
  }

  try {
    await removeAthleteGroup(groupId);
    await loadAllData();
  } catch (error) {
    console.error("Erreur suppression groupe", error);
    alert(error.message || "Erreur suppression groupe");
  }
}

async function toggleAthleteGroupMember(groupId, athleteId, checked) {
  if (athleteGroupMemberPilotEnabled) {
    const membershipKey = `${groupId}:${athleteId}`;

    if (athleteGroupMemberLocksRef.current.has(membershipKey)) return;

    athleteGroupMemberLocksRef.current.add(membershipKey);
    setAthleteGroupMemberPendingKeys((current) => [...current, membershipKey]);

    try {
      const result = await athleteGroupMemberMutation.mutate({
        athleteId,
        checked,
        groupId,
      });

      if (result.state === "error") {
        alert("Impossible de modifier ce membre du groupe. Réessaie.");
      }
    } catch {
      alert("Impossible de modifier ce membre du groupe. Réessaie.");
    } finally {
      athleteGroupMemberLocksRef.current.delete(membershipKey);
      setAthleteGroupMemberPendingKeys((current) =>
        current.filter((key) => key !== membershipKey),
      );
    }

    return;
  }

  try {
    await setAthleteGroupMember(groupId, athleteId, checked);
    await loadAllData();
  } catch (error) {
    console.error("Erreur modification membre groupe", error);
    alert(error.message || "Erreur modification membre groupe");
  }
}

async function loginCoach(email, password) {
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error || !data.user) {
    console.error("Erreur connexion coach", error);
    return false;
  }

  const { data: athleteByUserId } = await supabase
    .from("athletes")
    .select("id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const { data: athleteByEmail } = await supabase
    .from("athletes")
    .select("id")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (athleteByUserId || athleteByEmail) {
    await supabase.auth.signOut();
    console.error("Ce compte est un compte athlète, pas coach.");
    return false;
  }

  setAuth({ role: "coach" });
  await loadAllData();
  return true;
}

async function loginAthlete(email, password) {
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error || !data.user) {
    console.error("Erreur connexion athlète", error);
    return false;
  }

  const { data: initialAthlete, error: athleteError } = await supabase
    .from("athletes")
    .select("*")
    .eq("user_id", data.user.id)
    .maybeSingle();
  let athlete = initialAthlete;

  if (athleteError) {
    console.error("Erreur récupération athlète", athleteError);
    await supabase.auth.signOut();
    return false;
  }

  if (!athlete) {
    const { data: athleteByEmail, error: emailError } = await supabase
      .from("athletes")
      .select("*")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (emailError) {
      console.error("Erreur récupération athlète par email", emailError);
      await supabase.auth.signOut();
      return false;
    }

    if (athleteByEmail) {
      const { error: linkError } = await supabase
        .from("athletes")
        .update({
          user_id: data.user.id,
          email: cleanEmail,
        })
        .eq("id", athleteByEmail.id);

      if (linkError) {
        console.error("Erreur liaison athlète par email", linkError);
        await supabase.auth.signOut();
        return false;
      }

      athlete = {
        ...athleteByEmail,
        user_id: data.user.id,
        email: cleanEmail,
      };
    }
  }

  if (!athlete) {
    console.error("Aucun athlète lié à ce compte");
    await supabase.auth.signOut();
    return false;
  }

  if (athlete.active === false) {
    console.error("Votre compte a été archivé. Contactez votre entraîneur pour le réactiver.");
    await supabase.auth.signOut();
    return false;
  }

  setAuth({
    role: "athlete",
    athleteId: athlete.id,
  });

  setActiveId(athlete.id);
  setView("calendar");

  await loadAllData();

  return true;
}
async function acceptInvite(inviteToken, email, password) {
  const isV2Invite = /^v2i_[0-9a-f]{64}$/.test(inviteToken || "");
  const v2InviteEnabled = isV2Invite
    && isFeatureEnabled("accessControlV2")
    && isFeatureEnabled("athleteInvitesV2");
  if (isV2Invite && !v2InviteEnabled) {
    return { ok: false, message: "Ce pilote d’invitation sécurisée n’est pas disponible." };
  }
  const athleteToLink = isV2Invite
    ? undefined
    : athletes.find((row) => row.inviteToken === inviteToken);

  if (!v2InviteEnabled && athleteToLink?.user_id) {
    return {
      ok: false,
      message: "Invitation déjà utilisée.",
    };
  }

  if (!v2InviteEnabled && !athleteToLink) {
    return {
      ok: false,
      message: "Invitation introuvable ou invalide.",
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return {
      ok: false,
      message: error.message || "Erreur création compte athlète.",
    };
  }

  if (!data.user) {
    return {
      ok: false,
      message: "Compte créé, mais utilisateur non récupéré.",
    };
  }

  if (v2InviteEnabled) {
    if (!data.session) {
      return { ok: false, message: "Compte créé. Confirmez votre email puis reconnectez-vous avec le même lien." };
    }
    const service = createAthleteInviteService(createAthleteInviteSupabaseRepository(
      createTypedSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    ));
    const consumption = await service.consume(inviteToken);
    if (consumption.kind === "error") {
      await supabase.auth.signOut();
      return { ok: false, message: consumption.message };
    }
    setAuth({ role: "athlete", athleteId: consumption.legacyAthleteId });
    setActiveId(consumption.legacyAthleteId);
    setView("calendar");
    await loadAllData();
    return { ok: true, message: "Compte athlète créé et lié." };
  }

  const { error: updateError } = await supabase.rpc(
  "link_athlete_invite",
  {
    athlete_id: athleteToLink.id,
    athlete_email: email.trim().toLowerCase(),
    auth_user_id: data.user.id,
  }
);

  if (updateError) {
    return {
      ok: false,
      message: updateError.message || "Erreur liaison athlète.",
    };
  }

  setAuth({
    role: "athlete",
    athleteId: athleteToLink.id,
  });

  setActiveId(athleteToLink.id);
  setView("calendar");

  await loadAllData();

  return {
    ok: true,
    message: "Compte athlète créé et lié.",
  };
}

async function logout() {
  await supabase.auth.signOut();
  setAuth(null);
  setView("calendar");
}
  async function runAthleteLifecycleV2(athleteId, operation) {
  if (athleteLifecycleLocksRef.current.has(athleteId)) return false;

  athleteLifecycleLocksRef.current.add(athleteId);
  setAthleteLifecyclePendingAthleteId(athleteId);

  try {
    const client = createTypedSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const service = createAthleteLifecycleService(client);
    const result = operation === "archive"
      ? await service.archive(athleteId)
      : await service.restore(athleteId);

    if (result.kind === "error") {
      alert(result.message);
      return false;
    }

    await loadAllData();
    return true;
  } finally {
    athleteLifecycleLocksRef.current.delete(athleteId);
    setAthleteLifecyclePendingAthleteId(null);
  }
}

async function setAthleteActive(athleteId, nextActive) {
  if (athleteLifecyclePilotEnabled) {
    return runAthleteLifecycleV2(athleteId, nextActive ? "restore" : "archive");
  }

  await updateAthlete("active", nextActive, athleteId);
  return true;
}

  async function deleteAthlete(athleteId) {
  if (athleteLifecyclePilotEnabled) {
    return runAthleteLifecycleV2(athleteId, "archive");
  }

  if (athletes.length <= 1) return;

  const ok = window.confirm(
    "Supprimer cet athlète ? Toutes ses séances, propositions, notes et couleurs de semaines seront supprimées."
  );

  if (!ok) return;

  const { data: workoutsToDelete, error: workoutsFetchError } = await supabase
    .from("calendar_workouts")
    .select("id")
    .eq("athlete_id", athleteId);

  if (workoutsFetchError) {
    console.error("Erreur récupération séances avant suppression", workoutsFetchError);
    alert(workoutsFetchError.message || "Erreur récupération séances");
    return;
  }

  const workoutIds = (workoutsToDelete || []).map((row) => row.id);

  if (workoutIds.length) {
    const { error: feedbackDeleteError } = await supabase
      .from("workout_feedbacks")
      .delete()
      .in("workout_id", workoutIds);

    if (feedbackDeleteError) {
      console.error("Erreur suppression feedbacks", feedbackDeleteError);
      alert(feedbackDeleteError.message || "Erreur suppression feedbacks");
      return;
    }
  }

  const tablesToClean = [
    ["calendar_workouts", "athlete_id"],
    ["athlete_proposals", "athlete_id"],
    ["athlete_week_colors", "athlete_id"],
    ["athlete_week_notes", "athlete_id"],
    ["athlete_week_planning", "athlete_id"],
    ["athlete_observations", "athlete_id"],
    ["athlete_goal_history", "athlete_id"],
    ["athlete_test_history", "athlete_id"],
    ["athlete_group_members", "athlete_id"],
  ];

  for (const [table, column] of tablesToClean) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq(column, athleteId);

    if (error) {
      console.error(`Erreur suppression ${table}`, error);
      alert(error.message || `Erreur suppression ${table}`);
      return;
    }
  }

  const { error: athleteDeleteError } = await supabase
    .from("athletes")
    .delete()
    .eq("id", athleteId);

  if (athleteDeleteError) {
    console.error("Erreur suppression athlète", athleteDeleteError);
    alert(athleteDeleteError.message || "Erreur suppression athlète");
    return;
  }

  const next = athletes.filter((row) => row.id !== athleteId);

  setAthletes(next);
  setSessions((items) => {
    const copy = { ...items };
    delete copy[athleteId];
    return copy;
  });
  setProposals((items) =>
    items.filter((proposal) => proposal.athleteId !== athleteId)
  );
  setWeekColors((items) =>
    Object.fromEntries(
      Object.entries(items).filter(([key]) => !key.startsWith(`${athleteId}-`))
    )
  );
  setWeekNotes((items) =>
    Object.fromEntries(
      Object.entries(items).filter(([key]) => !key.startsWith(`${athleteId}-`))
    )
  );

  if (activeId === athleteId && next.length) {
    setActiveId(next[0].id);
  }

  await loadAllData();
} 
function cleanRpe(value) {
  const match = String(value || "").replace(",", ".").match(/[0-9.]+/);
  return match ? Number(match[0]) : null;
}
  async function saveWorkout() {
  if (!draft.category) {
  alert("Choisis une discipline avant d'enregistrer.");
  return;
}
  if (!draft.title.trim()) return;

  const workoutData = {
  category: draft.category,
  subcategory: draft.subcategory,
  title: draft.title,
  total_duration: draft.totalDuration,
  expected_rpe: cleanRpe(draft.expectedRpeGlobal || draft.expectedRpe),
  expected_rpe_global: cleanRpe(draft.expectedRpeGlobal || draft.expectedRpe),
  expected_specific_duration: draft.expectedSpecificDuration || "",
  expected_rpe_specific: cleanRpe(draft.expectedRpeSpecific),
  description: draft.description,
  blocks: draft.blocks,
};

  console.log("SAVE_WORKOUT", workoutData);

  if (workoutLibraryPilotEnabled) {
    const result = await workoutLibrarySaveMutation.mutate({
      workout: draft,
      workoutId: editingId || undefined,
    });

    if (result.state === "success" && result.data) {
      setLibrary((items) =>
        editingId
          ? items.map((workout) =>
              workout.id === result.data.id ? result.data : workout,
            )
          : [result.data, ...items],
      );
      setDraft(blankWorkout());
      setEditingId(null);
      setView("library");
    } else if (result.state === "error") {
      alert("Impossible d'enregistrer cette séance. Réessaie.");
    }

    return;
  }

  if (editingId) {
    const { error } = await supabase
      .from("workout_library")
      .update(workoutData)
      .eq("id", editingId);

    if (error) {
      console.error("Erreur update séance bibliothèque", error);
      return;
    }
  } else {
    const { error } = await supabase
      .from("workout_library")
      .insert(workoutData);

    if (error) {
      console.error("Erreur ajout séance bibliothèque", error);
alert(JSON.stringify(error, null, 2));
      return;
    }
  }

  await loadAllData();

  setDraft(blankWorkout());
  setEditingId(null);
  setView("library");
}
  function editWorkout(workout) { setDraft(workout); setEditingId(workout.id); setView("create"); }
  async function importWorkout(workout, date = selectedDate, selectedAthleteIds = null) {
  const session = calendarSession(workout, date);
  const targetAthleteIds =
    planningTargetType === "group"
  ? selectedAthleteIds || selectedGroupAthleteIds
  : [activeId];

  if (planningTargetType === "group") {
    if (!selectedGroupId) {
      alert("Choisis un groupe avant de programmer une séance collective.");
      return;
    }

    if (!targetAthleteIds.length) {
      alert("Ce groupe ne contient aucun athlète.");
      return;
    }
  }

  if (calendarSessionImportPilotEnabled && planningTargetType !== "group") {
    const targetAthleteId = activeId;
    const result = await calendarSessionImportMutation.mutate({
      athleteId: targetAthleteId,
      session,
    });

    if (result.state === "success" && result.data) {
      setSessions((items) => ({
        ...items,
        [targetAthleteId]: [...(items[targetAthleteId] || []), result.data],
      }));
      setMode("day");
      setView("calendar");
    } else if (result.state === "error") {
      alert("Impossible de programmer cette séance. Réessaie.");
    }

    return;
  }

  const payload = targetAthleteIds.map((athleteId) => ({
    athlete_id: athleteId,
    date: session.date,
    workout_type: session.category,
    subcategory: session.subcategory,
    title: session.title,
    duration: session.totalDuration,
    expected_rpe: cleanRpe(session.expectedRpeGlobal || session.expectedRpe),
    expected_rpe_global: cleanRpe(session.expectedRpeGlobal || session.expectedRpe),
    expected_specific_duration: session.expectedSpecificDuration || "",
    adjusted_specific_duration: "",
    expected_rpe_specific: cleanRpe(session.expectedRpeSpecific),
    description: session.description,
    blocks: session.blocks,
    athlete_seen_at: null,
    completed: false,
  }));

  const { error } = await supabase
    .from("calendar_workouts")
    .insert(payload);

  if (error) {
    console.error("Erreur sauvegarde séance calendrier", error);
    return;
  }

 await loadAllData();

setMode("day");
setView("calendar");
}

async function addRestDay(date = selectedDate) {
  const targetAthleteIds =
  planningTargetType === "group" ? selectedGroupAthleteIds : [activeId];

  if (planningTargetType === "group") {
    if (!selectedGroupId) {
      alert("Choisis un groupe avant de programmer un repos collectif.");
      return;
    }

    if (!targetAthleteIds.length) {
      alert("Ce groupe ne contient aucun athlète.");
      return;
    }
  }

  if (calendarRestDayPilotEnabled && planningTargetType !== "group") {
    const targetAthleteId = activeId;
    const result = await calendarRestDayMutation.mutate({
      athleteId: targetAthleteId,
      date: dateKey(date),
    });

    if (result.state === "success" && result.data) {
      setSessions((items) => ({
        ...items,
        [targetAthleteId]: [...(items[targetAthleteId] || []), result.data],
      }));
      setMode("day");
      setView("calendar");
    } else if (result.state === "error") {
      alert("Impossible d'ajouter ce jour de repos. Réessaie.");
    }

    return result;
  }

  const payload = targetAthleteIds.map((athleteId) => ({
    athlete_id: athleteId,
    date: dateKey(date),
    workout_type: "Repos",
    subcategory: "",
    title: "Repos",
    duration: "",
    expected_rpe: "",
    description: "Journée de récupération.",
    blocks: [],
    completed: true,
    non_done: false,
  }));

  const { error } = await supabase
    .from("calendar_workouts")
    .insert(payload);

  if (error) {
    console.error("Erreur ajout repos", error);
    return;
  }

  await loadAllData();

  setMode("day");
  setView("calendar");
}
  async function updateCalendarWorkoutField(sessionId, field, value) {
  if (
    calendarSessionAdjustmentPilotEnabled &&
    field === "adjustedSpecificDuration"
  ) {
    const targetAthleteId = activeId;
    const result = await calendarSessionAdjustmentMutation.mutate({
      adjustedSpecificDuration: value,
      workoutId: sessionId,
    });

    if (result.state === "success" && result.data) {
      setSessions((items) => ({
        ...items,
        [targetAthleteId]: (items[targetAthleteId] || []).map((item) =>
          item.id === sessionId
            ? {
              ...item,
              adjustedSpecificDuration: result.data.adjustedSpecificDuration,
            }
            : item,
        ),
      }));
    }

    return result;
  }

  updateSession((items) =>
    items.map((item) =>
      item.id === sessionId
        ? { ...item, [field]: value }
        : item
    )
  );

  const fieldMap = {
    adjustedSpecificDuration: "adjusted_specific_duration",
  };

  const supabaseField = fieldMap[field] || field;

  const { error } = await supabase
    .from("calendar_workouts")
    .update({
      [supabaseField]: value || null,
    })
    .eq("id", sessionId);

  if (error) {
  console.error("Erreur sauvegarde ajustement séance", error);
  return;
}

await loadAllData();
}
  async function updateFeedback(sessionId, field, value) {
    const session = activeSessions.find((item) => item.id === sessionId);

    if (!session) {
      console.error("Séance introuvable pour sauvegarde feedback", {
        sessionId,
        activeId,
        activeSessions,
      });
      alert("Erreur : séance introuvable. Recharge la page puis réessaie.");
      return;
    }

    const updatedFeedback = {
      ...session.feedback,
      [field]: value,
      validated:
        field === "validated"
          ? value
          : session.feedback?.validated || false,
    };

    updateSession((items) =>
      items.map((item) =>
        item.id === sessionId
          ? { ...item, feedback: updatedFeedback }
          : item
      )
    );

    const feedbackPayload = {
      workout_id: sessionId,
      rpe: cleanRpe(updatedFeedback.rpeGlobal || updatedFeedback.rpe),
      rpe_global: cleanRpe(updatedFeedback.rpeGlobal || updatedFeedback.rpe),
      rpe_specific: cleanRpe(updatedFeedback.rpeSpecific),
      motivation: updatedFeedback.motivation ? Number(updatedFeedback.motivation) : null,
      pleasure: updatedFeedback.pleasure ? Number(updatedFeedback.pleasure) : null,
      comment: updatedFeedback.comment || "",
      real_duration: updatedFeedback.actualTime || "",
    };

    const { error: feedbackError } = await supabase
      .from("workout_feedbacks")
      .upsert(feedbackPayload, { onConflict: "workout_id" });

    if (feedbackError) {
      console.error("Erreur sauvegarde feedback", {
        feedbackError,
        feedbackPayload,
      });
      alert(feedbackError.message || "Erreur sauvegarde du retour athlète.");
      await loadAllData();
      return;
    }

    if (field === "validated" && value === true) {
      const { error: completedError } = await supabase
        .from("calendar_workouts")
        .update({
          completed: true,
          non_done: false,
        })
        .eq("id", sessionId);

      if (completedError) {
        console.error("Erreur validation séance réalisée", {
          completedError,
          sessionId,
        });
        alert(completedError.message || "Erreur validation de la séance réalisée.");
        await loadAllData();
        return;
      }
    }

    await loadAllData();
  }
  async function updateNonDone(sessionId, field, value) {
  if (calendarSessionNonDonePilotEnabled && field === "commit") {
    const targetAthleteId = activeId;
    const result = await calendarSessionNonDoneMutation.mutate({
      nonDone: value,
      workoutId: sessionId,
    });

    if (result.state === "success" && result.data) {
      setSessions((items) => ({
        ...items,
        [targetAthleteId]: (items[targetAthleteId] || []).map((item) =>
          item.id === sessionId
            ? { ...item, nonDone: result.data.nonDone }
            : item,
        ),
      }));
    }

    return result;
  }

  const session = activeSessions.find((item) => item.id === sessionId);
  if (!session) return;

  const updatedNonDone = {
    ...session.nonDone,
    [field]: value,
  };

  updateSession((items) =>
    items.map((item) =>
      item.id === sessionId
        ? { ...item, nonDone: updatedNonDone }
        : item
    )
  );

  const { error } = await supabase
    .from("calendar_workouts")
    .update({
      non_done: updatedNonDone.validated || false,
      non_done_reason: updatedNonDone.reason || "",
      non_done_fatigue: updatedNonDone.fatigue || "",
      non_done_pain: updatedNonDone.pain || "",
      non_done_comment: updatedNonDone.comment || "",
    })
    .eq("id", sessionId);

  if (error) {
    console.error("Erreur sauvegarde séance non faite", error);
  }
}
  async function addItem(kind) {
  const isCategory = kind === "cat";
  const data = isCategory ? newCat : newSub;
  const name = data.name.trim();

  if (!name) return;

  const table = isCategory
    ? "workout_categories"
    : "workout_subcategories";

  const { data: inserted, error } = await supabase
    .from(table)
    .insert({
      name,
      color: data.color,
    })
    .select()
    .single();

  if (error) {
    console.error(
      "Erreur ajout catégorie",
      JSON.stringify(error, null, 2)
    );
    return;
  }

  if (isCategory) {
    setCategories((items) => [...items, inserted]);
    setNewCat({ name: "", color: getColorClass() });
  } else {
    setSubcategories((items) => [...items, inserted]);
    setNewSub({ name: "", color: "bg-yellow-500" });
  }
}

async function rename(kind, oldName, newName, newColor) {
  const name = newName.trim();

  if (!name) return;

  const isCategory = kind === "category";

  const table = isCategory
    ? "workout_categories"
    : "workout_subcategories";

  const currentItem = (isCategory ? categories : subcategories).find(
    (row) => row.id === oldName
  );

  const previousName = currentItem?.name;

  if (!previousName || previousName === name) return;

  if (workoutTaxonomyPilotEnabled) {
    const result = await workoutTaxonomyRenameMutation.mutate({
      color: newColor,
      kind: isCategory ? "category" : "subcategory",
      name,
      taxonomyId: oldName,
    });

    if (result.state !== "success" || !result.data) {
      if (result.state === "error") {
        alert("Impossible de renommer cet élément. Réessaie.");
      }
      return false;
    }

    const updateTaxonomy = (items) =>
      items.map((item) =>
        item.id === result.data.taxonomyId
          ? { ...item, color: result.data.color ?? item.color, name: result.data.name }
          : item,
      );
    const libraryField = isCategory ? "category" : "subcategory";

    if (isCategory) {
      setCategories(updateTaxonomy);
    } else {
      setSubcategories(updateTaxonomy);
    }
    setLibrary((items) =>
      items.map((workout) =>
        workout[libraryField] === previousName
          ? { ...workout, [libraryField]: result.data.name }
          : workout,
      ),
    );
    setFilter((current) =>
      isCategory
        ? { ...current, category: result.data.name }
        : { ...current, subcategory: result.data.name },
    );

    return { colorHandled: true };
  }

  const { error } = await supabase
    .from(table)
    .update({ name })
    .eq("id", oldName);

  if (error) {
    console.error("Erreur renommage catégorie", error);
    return;
  }

  const libraryField = isCategory ? "category" : "subcategory";

  const { error: libraryError } = await supabase
    .from("workout_library")
    .update({ [libraryField]: name })
    .eq(libraryField, previousName);

  if (libraryError) {
    console.error("Erreur mise à jour séances bibliothèque", libraryError);
    return;
  }

  setFilter((current) =>
    isCategory
      ? {
          ...current,
          category: name,
        }
      : {
          ...current,
          subcategory: name,
        }
  );

  await loadAllData();
}

async function removeItem(kind, name) {
  const isCategory = kind === "category";

  const label = isCategory ? "catégorie" : "sous-partie";
  const workoutField = isCategory ? "category" : "subcategory";
  const table = isCategory
    ? "workout_categories"
    : "workout_subcategories";

  const linkedWorkouts = library.filter(
    (workout) => workout[workoutField] === name
  );

  const ok = window.confirm(
    linkedWorkouts.length
      ? `Supprimer cette ${label} supprimera aussi ${linkedWorkouts.length} séance(s) de la bibliothèque. Continuer ?`
      : `Supprimer cette ${label} ?`
  );

  if (!ok) return;

  if (workoutTaxonomyPilotEnabled) {
    const result = await workoutTaxonomyDeleteMutation.mutate({
      kind: isCategory ? "category" : "subcategory",
      name,
    });

    if (result.state !== "success" || !result.data) {
      if (result.state === "error") {
        alert("Impossible de supprimer cet élément. Réessaie.");
      }
      return false;
    }

    const updateTaxonomy = (items) => items.filter((item) => item.name !== name);

    if (isCategory) {
      setCategories(updateTaxonomy);
    } else {
      setSubcategories(updateTaxonomy);
    }
    setLibrary((items) =>
      items.filter((workout) => workout[workoutField] !== name),
    );
    setFilter((current) =>
      isCategory
        ? { ...current, category: "", subcategory: "" }
        : { ...current, subcategory: "" },
    );

    return true;
  }

  if (linkedWorkouts.length) {
    const { error: libraryError } = await supabase
      .from("workout_library")
      .delete()
      .eq(workoutField, name);

    if (libraryError) {
      console.error("Erreur suppression séances liées", libraryError);
      return;
    }
  }

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("name", name);

  if (error) {
    console.error("Erreur suppression catégorie", error);
    return;
  }

  setFilter((current) =>
    isCategory
      ? {
          ...current,
          category: "",
          subcategory: "",
        }
      : {
          ...current,
          subcategory: "",
        }
  );

  await loadAllData();
}
 async function updateWeekPlanning(year, week, field, value) {
  const key = `${activeId}-${year}-${week}`;

  const current = weekPlanning[key] || {
    goal: "Off",
    category: "",
    subcategory: "",
    status: "planned",
  };

  const next = {
    ...current,
    [field]: value,
  };

  setWeekPlanning((items) => ({
    ...items,
    [key]: next,
  }));

  const { error } = await supabase
    .from("athlete_week_planning")
    .upsert(
      {
        athlete_id: activeId,
        year,
        week,
        goal: next.goal || "Off",
        category: next.category || "",
        subcategory: next.subcategory || "",
        status: next.status || "planned",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "athlete_id,year,week",
      }
    );

  if (error) {
    console.error("Erreur sauvegarde planification semaine", error);
    alert(error.message || "Erreur sauvegarde planification semaine");
  }
}
async function updateWeekNote(year, week, value) {
  const key = `${activeId}-${year}-${week}`;

  setWeekNotes((items) => ({
    ...items,
    [key]: value,
  }));

  const { error } = await supabase
    .from("athlete_week_notes")
    .upsert(
      {
        athlete_id: activeId,
        year,
        week,
        note: value,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "athlete_id,year,week",
      }
    );

  if (error) {
    console.error("Erreur sauvegarde note semaine", error);
    alert(error.message || "Erreur sauvegarde note semaine");
  }
}

  const sessionsFor = (date) => calendarSessionsForDate(activeSessions, dateKey(date));
  const proposalsFor = (date) => calendarProposalsForDate(activeProposals, dateKey(date));
 const programProposal = async (proposal) => {
  if (calendarProposalSchedulingPilotEnabled) {
    const result = await calendarProposalSchedulingMutation.mutate({
      proposalId: proposal.id,
    });

    if (result.state === "success" && result.data) {
      setSessions((items) => ({
        ...items,
        [result.data.athleteId]: (items[result.data.athleteId] || []).some(
          (session) => session.id === result.data.session.id,
        )
          ? items[result.data.athleteId]
          : [...(items[result.data.athleteId] || []), result.data.session],
      }));
      setProposals((items) =>
        items.map((item) =>
          item.id === result.data.proposalId
            ? { ...item, status: result.data.status }
            : item,
        ),
      );
    } else if (result.state === "error") {
      alert("Impossible de programmer cette proposition. Réessaie.");
    }

    return;
  }

  const alreadyExists = activeSessions.some(
    (session) => session.sourceProposalId === proposal.id
  );

  if (!alreadyExists) {
    const proposalType = String(proposal.type || "").trim();
    const normalizedType = proposalType.toLowerCase();

    console.log("PROGRAM_PROPOSAL", {
      proposal,
      proposalType,
      normalizedType,
    });

    const isRestRequest =
      normalizedType.includes("indisponibilité") ||
      normalizedType.includes("repos");

    if (isRestRequest) {
      const { error: insertRestError } = await supabase
        .from("calendar_workouts")
        .insert({
          athlete_id: proposal.athleteId,
          date: proposal.date,
          workout_type: "Repos",
          subcategory: "",
          title: "Repos",
          duration: "",
          expected_rpe: null,
          expected_rpe_global: null,
          expected_specific_duration: "",
          expected_rpe_specific: null,
          description: proposal.message || "Repos demandé par l’athlète.",
          blocks: [],
          athlete_seen_at: null,
          completed: true,
          non_done: false,
        });

      if (insertRestError) {
        console.error("Erreur création repos depuis proposition", insertRestError);
        alert(insertRestError.message || "Erreur création repos depuis proposition");
        return;
      }
    } else {
      const session = proposalToSession(proposal);

      const { error: insertProposalError } = await supabase
        .from("calendar_workouts")
        .insert({
          athlete_id: proposal.athleteId,
          date: proposal.date,
          workout_type: session.category,
          subcategory: session.subcategory || "",
          title: session.title,
          duration: session.totalDuration,
          expected_rpe: null,
          expected_rpe_global: null,
          expected_specific_duration: "",
          expected_rpe_specific: null,
          description: session.description || "",
          blocks: [],
          athlete_seen_at: null,
          completed: false,
        });

      if (insertProposalError) {
        console.error("Erreur création séance depuis proposition", insertProposalError);
        alert(insertProposalError.message || "Erreur création séance depuis proposition");
        return;
      }
    }
  }

  const { error } = await supabase
    .from("athlete_proposals")
    .update({ status: "Programmée" })
    .eq("id", proposal.id);

  if (error) {
    console.error("Erreur programmation proposition", error);
    alert(error.message || "Erreur programmation proposition");
    return;
  }

  await loadAllData();
};
  const addAthleteProposal = async (proposal) => {
  const proposalAthleteId = auth?.role === "athlete" ? auth.athleteId : activeId;

  const { data, error } = await supabase
    .from("athlete_proposals")
    .insert({
      athlete_id: proposalAthleteId,
      date: dateKey(selectedDate),
      status: "À traiter",
      type: proposal.type,
      title: proposal.title,
      message: proposal.message,
    })
    .select()
    .single();

  if (error) {
    console.error("Erreur ajout proposition", error);
    return;
  }

  setProposals((items) => [
    ...items,
    {
      id: data.id,
      athleteId: data.athlete_id,
      date: data.date,
      type: data.type,
      title: data.title,
      message: data.message,
      status: data.status,
    },
  ]);
};

async function validateAthleteGoalUpdate(goalValues) {
  if (auth?.role !== "athlete" || !athleteActive?.id) return;

  const shortGoal = goalValues?.shortGoal ?? athleteActive.shortGoal ?? "";
  const mediumGoal = goalValues?.mediumGoal ?? athleteActive.mediumGoal ?? "";
  const longGoal = goalValues?.longGoal ?? athleteActive.longGoal ?? "";

  const { error: historyError } = await supabase
    .from("athlete_goal_history")
    .insert({
      athlete_id: athleteActive.id,
      short_goal: shortGoal,
      medium_goal: mediumGoal,
      long_goal: longGoal,
      created_at: new Date().toISOString(),
    });

  if (historyError) {
    console.error("Erreur archivage objectifs athlète", historyError);
    alert(historyError.message || "Erreur lors de l’envoi des objectifs.");
    return;
  }

  await updateAthlete("goalUpdateRequested", false, athleteActive.id);
  await loadAllData();

  alert("Objectifs envoyés au coach.");
}

async function refreshAthleteGoalsV2(athleteId = athleteActive?.id) {
  if (!athleteId) return;
  const state = await goalsV2Service.getState(athleteId);
  if (athleteId === athleteActive?.id) {
    setAthleteGoalsV2State(state);
  }
}

async function runAthleteGoalsV2Mutation(input) {
  if (!athleteGoalsV2TargetEnabled || !athleteActive?.id) {
    throw new Error("Les objectifs V2 ne sont pas disponibles pour cet athlète.");
  }

  const result = await athleteGoalsV2Mutation.mutate(input);
  if (result.state === "success") {
    await refreshAthleteGoalsV2(athleteActive.id);
    return;
  }

  // A response can be lost after PostgreSQL has committed. Re-read only this
  // athlete's projection before surfacing the safe client error.
  try {
    await refreshAthleteGoalsV2(athleteActive.id);
  } catch {
    // The mutation error below remains the user-facing source of truth.
  }

  if (result.state === "superseded") return;
  throw new Error("La modification des objectifs a échoué. Réessayez.");
}

async function openAthleteGoalRequestV2() {
  if (auth?.role !== "coach") throw new Error("Vous n’êtes pas autorisé à modifier ces objectifs.");
  await runAthleteGoalsV2Mutation({
    action: "open",
    legacyAthleteId: athleteActive.id,
    idempotencyKey: crypto.randomUUID(),
  });
}

async function cancelAthleteGoalRequestV2(requestId) {
  if (auth?.role !== "coach") throw new Error("Vous n’êtes pas autorisé à modifier ces objectifs.");
  await runAthleteGoalsV2Mutation({ action: "cancel", requestId });
}

async function acceptAthleteGoalRequestV2(requestId, reviewNote) {
  if (auth?.role !== "coach") throw new Error("Vous n’êtes pas autorisé à modifier ces objectifs.");
  await runAthleteGoalsV2Mutation({ action: "accept", requestId, reviewNote: reviewNote || null });
}

async function requestAthleteGoalChangesV2(requestId, reviewNote) {
  if (auth?.role !== "coach") throw new Error("Vous n’êtes pas autorisé à modifier ces objectifs.");
  await runAthleteGoalsV2Mutation({ action: "requestChanges", requestId, reviewNote });
}

async function submitAthleteGoalsV2(requestId, goalValues) {
  if (auth?.role !== "athlete") throw new Error("Vous n’êtes pas autorisé à modifier ces objectifs.");
  await runAthleteGoalsV2Mutation({
    action: "submit",
    requestId,
    shortGoal: goalValues.shortGoal,
    mediumGoal: goalValues.mediumGoal,
    longGoal: goalValues.longGoal,
    idempotencyKey: crypto.randomUUID(),
  });
}

  if (!auth) return <AuthPage athletes={athletes} loginCoach={loginCoach} loginAthlete={loginAthlete} acceptInvite={acceptInvite} />;

  return <div className="min-h-screen bg-zinc-950 p-3 text-white sm:p-4 lg:p-6"><div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
    <Header view={view} setView={setView} auth={auth} logout={logout} />
    <AthleteSelector visible={isCoach && ["calendar", "athlete", "management"].includes(view)} athletes={visibleAthletes} activeId={activeId} setActiveId={setActiveId} planningTargetType={planningTargetType} setPlanningTargetType={setPlanningTargetType} athleteGroups={athleteGroups} selectedGroupId={selectedGroupId} setSelectedGroupId={setSelectedGroupId} />
    {auth?.role === "athlete" && athleteGoalsV2TargetEnabled && (
      <AthleteGoalsV2Panel state={athleteGoalsV2State} onSubmit={submitAthleteGoalsV2} />
    )}
    {auth?.role === "athlete" && !athleteGoalsV2TargetEnabled && athleteActive?.goalUpdateRequested && (
      <AthleteGoalUpdatePanel
        athlete={athleteActive}
        updateAthlete={updateAthlete}
        validateGoalUpdate={validateAthleteGoalUpdate}
      />
    )}
    {view === "calendar" && <CalendarPageOld {...{ athleteActive, activeId, mode, setMode, year, setYear, month, setMonth, selectedDate, setSelectedDate, days, activeSessions, sessionsFor, proposalsFor, categories, subcategories, filter, setFilter, filteredLibrary, cpData, importWorkout, importPending: calendarSessionImportPilotEnabled && calendarSessionImportMutation.pending, adjustmentPending: calendarSessionAdjustmentPilotEnabled && calendarSessionAdjustmentMutation.pending, restDayPending: calendarRestDayPilotEnabled && calendarRestDayMutation.pending, nonDonePending: calendarSessionNonDonePilotEnabled && calendarSessionNonDoneMutation.pending, proposalSchedulingPending: calendarProposalSchedulingPilotEnabled && calendarProposalSchedulingMutation.pending, addRestDay, deleteAthleteWorkoutFromGroupDay, deleteGroupDayWorkouts, updateFeedback, updateNonDone, updateSession, updateCalendarWorkoutField, setProposals, programProposal, addAthleteProposal, isCoach, weekPlanning, updateWeekPlanning, weekNotes, setWeekNotes, updateWeekNote, updateAthlete, athleteGroups, athleteGroupMembers, planningTargetType, setPlanningTargetType, selectedGroupId, setSelectedGroupId, selectedGroup, selectedGroupMembers, athletes, sessions, athleteGoalsV2Enabled: athleteGoalsV2TargetEnabled }} />}
   {auth?.role === "athlete" && view === "athleteStats" && (
  <AthleteStatsPage
    athlete={athleteActive}
    activeId={activeId}
    calendarYear={year}
    cpData={cpData}
    stats={stats}
    training={training}
    activeSessions={activeSessions}
    weekColors={weekColors}
    setWeekColors={setWeekColors}
    weekNotes={weekNotes}
    setWeekNotes={setWeekNotes}
    categories={categories}
    subcategories={subcategories}
  />
)}
    {isCoach && view === "create" && <CreatePage {...{ categories, subcategories, draft, editingId, updateDraft, updateBlock, updateRepeat, setDraft, saveWorkout, newCat, setNewCat, newSub, setNewSub, addItem, savePending: workoutLibraryPilotEnabled && workoutLibrarySaveMutation.pending }} />}
    {isCoach && view === "library" && <LibraryPage {...{ categories, setCategories, subcategories, setSubcategories, filter, setFilter, filteredLibrary, editWorkout, setLibrary, library, rename, removeItem, taxonomyPending: workoutTaxonomyPilotEnabled && (workoutTaxonomyRenameMutation.pending || workoutTaxonomyDeleteMutation.pending) }} />}
    {isCoach && view === "athlete" && <AthletePage {...{ athleteActive, activeId, calendarYear: year, updateAthlete, cpData, stats, training, activeSessions, weekColors, setWeekColors, weekNotes, setWeekNotes, weekPlanning, updateWeekPlanning, categories, subcategories, goalsV2Enabled: athleteGoalsV2TargetEnabled, goalsV2State: athleteGoalsV2State, openGoalRequestV2: openAthleteGoalRequestV2, cancelGoalRequestV2: cancelAthleteGoalRequestV2, acceptGoalRequestV2: acceptAthleteGoalRequestV2, requestGoalChangesV2: requestAthleteGoalChangesV2 }} />}
    {isCoach && view === "management" && <ManagementPage {...{ athletes, newAthlete, setNewAthlete, addAthlete, deleteAthlete, updateAthlete, setAthleteActive, athleteLifecycleV2Enabled: athleteLifecyclePilotEnabled, athleteLifecyclePendingAthleteId, athleteGroups, athleteGroupMembers, athleteGroupMemberPilotEnabled, athleteGroupMemberPendingKeys, athleteGroupCreatePending: athleteGroupCreatePilotEnabled && athleteGroupCreateMutation.pending, athleteGroupDeletePilotEnabled, newGroupName, setNewGroupName, addAthleteGroup, renameAthleteGroup, deleteAthleteGroup, toggleAthleteGroupMember }} />}
    {auth?.role === "coach" && <DevChecks />}
  </div></div>;
}
