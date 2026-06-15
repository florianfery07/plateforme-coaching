// @ts-nocheck
"use client";

import {
  addDays,
  avg,
  criticalPower,
  dateKey,
  dayStart,
  durationHours,
  feedbackDone,
  feedbackReady,
  findWeekForDate,
  monthDays,
  parseLocalDate,
  sessionLoadParts,
  sessionStatus,
  trainingAverage,
  trainingStats,
  weekInfo,
  weekInfoForYear,
  weekLabel,
  weekObject,
  weekRange,
  weekStart,
  weeksInYear,
  weeksOfYear,
} from "@/lib/trainingUtils";
import {
  athlete,
  blankFeedback,
  blankNonDone,
  blankWorkout,
  CALENDAR_YEARS,
  COLORS,
  DAYS,
  defaultAthletes,
  defaultCategories,
  defaultLibrary,
  defaultSubcategories,
  MONTHS,
  statusLabel,
  statusStyle,
  weekLabels,
  ZONES,
} from "@/lib/platformDefaults";
import { supabase } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Btn,
  Empty,
  Panel,
  Select,
} from "@/components/ui/ui";
import AuthPage from "@/components/auth/AuthPage";

import Header from "@/components/layout/Header";
import { proposalStyle } from "@/lib/proposalUtils";
import AthleteSelector from "@/components/athlete/AthleteSelector";
import Proposal from "@/components/calendar/Proposal";
import AthleteProposalForm from "@/components/calendar/AthleteProposalForm";
import Block from "@/components/calendar/Block";
import CalendarPageOld from "@/components/calendar/CalendarPageOld";
import StatCard from "@/components/athlete/StatCard";
import WeeklyLoadChart from "@/components/athlete/WeeklyLoadChart";
import WeekPicker from "@/components/athlete/WeekPicker";
import WeekDetail from "@/components/athlete/WeekDetail";
import ManagementPage from "@/components/athlete/ManagementPage";
import CreatePage from "@/components/library/CreatePage";
import LibraryPage from "@/components/library/LibraryPage";
import AthletePage from "@/components/athlete/AthletePage";
import DevChecks from "@/components/dev/DevChecks";

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
export default function CoachingPlatformMockup() {
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
  const [newCat, setNewCat] = useState({ name: "", color: "bg-blue-500" });
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
  const [auth, setAuth] = useState(null);

async function loadAllData() {
  const { data: athletesData, error: athletesError } = await supabase
    .from("athletes")
    .select("*")
    .order("created_at", { ascending: true });

  if (athletesError) {
    console.error("Erreur chargement athlètes", athletesError);
    return;
  }

  const loadedAthletes = athletesData?.length
  ? athletesData.map((row) => ({
      ...athlete(
        row.id,
        row.name,
        row.weight || "",
        row.power5 || "",
        row.power12 || "",
        row.power20 || ""
      ),
      email: row.email || "",
      age: row.age || "",
      height: row.height || "",
      sport: row.sport || "Vélo",
      shortGoal: row.short_goal || "",
      mediumGoal: row.medium_goal || "",
      longGoal: row.long_goal || "",
      context: row.context || "",
      goalUpdateRequested: Boolean(row.goal_update_requested),
      user_id: row.user_id || "",
      active: row.active !== false,
    }))
  : [];

  const { data: workoutsData, error: workoutsError } = await supabase
    .from("calendar_workouts")
    .select(`
      *,
      workout_feedbacks (*)
    `);

  if (workoutsError) {
    console.error("Erreur chargement séances", workoutsError);
    return;
  }

  const grouped = Object.fromEntries(
    loadedAthletes.map((row) => [row.id, []])
  );

  workoutsData?.forEach((row) => {
    const feedback = Array.isArray(row.workout_feedbacks)
      ? row.workout_feedbacks[0]
      : row.workout_feedbacks;

    if (!grouped[row.athlete_id]) grouped[row.athlete_id] = [];

    grouped[row.athlete_id].push({
      id: row.id,
      athleteSeenAt: row.athlete_seen_at || null,
      category: row.workout_type || "Séance",
      subcategory: row.subcategory || "",
      title: row.title || "Séance",
      totalDuration: row.duration || "",
      expectedRpe: row.expected_rpe_global || row.expected_rpe || "",
      expectedRpeGlobal: row.expected_rpe_global || row.expected_rpe || "",
      expectedSpecificDuration: row.expected_specific_duration || "",
      adjustedSpecificDuration: row.adjusted_specific_duration || "",
      expectedRpeSpecific: row.expected_rpe_specific || "",
      description: row.description || "",
      date: row.date,
      blocks: row.blocks || [],
      feedback: {
        ...blankFeedback(),
        actualTime: feedback?.real_duration || "",
        rpe: feedback?.rpe_global ? String(feedback.rpe_global) : feedback?.rpe ? String(feedback.rpe) : "",
        rpeGlobal: feedback?.rpe_global ? String(feedback.rpe_global) : feedback?.rpe ? String(feedback.rpe) : "",
        rpeSpecific: feedback?.rpe_specific ? String(feedback.rpe_specific) : "",
        motivation: feedback?.motivation ? String(feedback.motivation) : "",
        pleasure: feedback?.pleasure ? String(feedback.pleasure) : "",
        comment: feedback?.comment || "",
        validated: Boolean(row.completed),
      },
      nonDone: {
  ...blankNonDone(),
  validated: Boolean(row.non_done),
  reason: row.non_done_reason || "",
  fatigue: row.non_done_fatigue || "",
  pain: row.non_done_pain || "",
  comment: row.non_done_comment || "",
},
    });
  });

  setAthletes(loadedAthletes);
  if (loadedAthletes.length && !loadedAthletes.some((row) => row.id === activeId)) {
    setActiveId(loadedAthletes[0].id);
  }
  setSessions(grouped);

const { data: libraryData, error: libraryError } = await supabase
  .from("workout_library")
  .select("*")
  .order("created_at", { ascending: false });

if (libraryError) {
  console.error("Erreur chargement bibliothèque", libraryError);
  return;
}

if (libraryData) {
  setLibrary(
    libraryData.map((row) => ({
      id: row.id,
      category: row.category || "Route",
      subcategory: row.subcategory || "",
      title: row.title || "",
      totalDuration: row.total_duration || "",
      expectedRpe: row.expected_rpe_global || row.expected_rpe || "",
      expectedRpeGlobal: row.expected_rpe_global || row.expected_rpe || "",
      expectedSpecificDuration: row.expected_specific_duration || "",
      expectedRpeSpecific: row.expected_rpe_specific || "",
      description: row.description || "",
      blocks: row.blocks || [],
    }))
  );
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
const { data: proposalData } = await supabase
  .from("athlete_proposals")
  .select("*")
  .order("created_at", { ascending: false });

if (proposalData) {
  setProposals(
    proposalData
      .filter((row) => !["Refusée", "Programmée"].includes(row.status))
      .map((row) => ({
        id: row.id,
        athleteId: row.athlete_id,
        date: row.date,
        type: row.type,
        title: row.title,
        message: row.message,
        status: row.status || "À traiter",
      }))
  );
}
const { data: weekColorData } = await supabase
  .from("athlete_week_colors")
  .select("*");

if (weekColorData) {
  setWeekColors(
    Object.fromEntries(
      weekColorData.map((row) => [
        `${row.athlete_id}-${row.year}-${row.week}`,
        row.color_name,
      ])
    )
  );
}
const { data: weekNoteData } = await supabase
  .from("athlete_week_notes")
  .select("*");

if (weekNoteData) {
  setWeekNotes(
    Object.fromEntries(
      weekNoteData.map((row) => [
        `${row.athlete_id}-${row.year}-${row.week}`,
        row.note || "",
      ])
    )
  );
}
const { data: weekPlanningData } = await supabase
  .from("athlete_week_planning")
  .select("*");

if (weekPlanningData) {
  setWeekPlanning(
    Object.fromEntries(
      weekPlanningData.map((row) => [
        `${row.athlete_id}-${row.year}-${row.week}`,
        {
          goal: row.goal || "Off",
          category: row.category || "",
          subcategory: row.subcategory || "",
          status: row.status || "planned",
          coachComment: row.coach_comment || "",
        },
      ])
    )
  );
}
}

useEffect(() => {
  loadAllData();
}, []);

useEffect(() => {
  async function restoreSession() {
    const { data } = await supabase.auth.getSession();

    if (!data.session?.user) return;

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

      setAuth({
        role: "athlete",
        athleteId: athlete.id,
      });
      return;
    }

    setAuth({ role: "coach" });
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
  const isCoach = auth?.role === "coach";
  const visibleAthletes = athletes.filter((row) => row.active !== false);
  const athleteActive =
  athletes.find((row) => row.id === activeId) ||
  athletes[0] ||
  defaultAthletes[0];
  const cpData = criticalPower(athleteActive?.power5, athleteActive?.power12, athleteActive?.power20, athleteActive?.weight);
  const days = useMemo(() => monthDays(year, month), [year, month]);
  const activeSessions = sessions[activeId] || [];
  const activeProposals = proposals.filter((proposal) => proposal.athleteId === activeId);
  const filteredLibrary = library.filter((workout) => {
  const categoryOk = !filter.category || workout.category === filter.category;
  const subcategoryOk = !filter.subcategory || workout.subcategory === filter.subcategory;

  return categoryOk && subcategoryOk;
});
  const done = activeSessions.filter((session) => feedbackDone(session.feedback));
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

  let { data: athlete, error: athleteError } = await supabase
    .from("athletes")
    .select("*")
    .eq("user_id", data.user.id)
    .maybeSingle();

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
  const athleteToLink = athletes.find(
    (row) => row.inviteToken === inviteToken
  );

    if (athleteToLink?.user_id) {
    return {
      ok: false,
      message: "Invitation déjà utilisée.",
    };
  }

  if (!athleteToLink) {
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
  async function deleteAthlete(athleteId) {
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
  async function importWorkout(workout, date = selectedDate) {
  const session = calendarSession(workout, date);

  const { data, error } = await supabase
    .from("calendar_workouts")
    .insert({
      athlete_id: activeId,
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
    })
    .select()
    .single();

  if (error) {
    console.error("Erreur sauvegarde séance calendrier", error);
    return;
  }

 await loadAllData();

setMode("day");
setView("calendar");
}
async function addRestDay(date = selectedDate) {
  const { error } = await supabase
    .from("calendar_workouts")
    .insert({
      athlete_id: activeId,
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
    });

  if (error) {
    console.error("Erreur ajout repos", error);
    return;
  }

  await loadAllData();

  setMode("day");
  setView("calendar");
}
  async function updateCalendarWorkoutField(sessionId, field, value) {
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
    setNewCat({ name: "", color: "bg-blue-500" });
  } else {
    setSubcategories((items) => [...items, inserted]);
    setNewSub({ name: "", color: "bg-yellow-500" });
  }
}

async function rename(kind, oldName, newName) {
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

  const sessionsFor = (date) => activeSessions.filter((session) => session.date === dateKey(date));
  const proposalsFor = (date) => activeProposals.filter((proposal) => proposal.date === dateKey(date));
 const programProposal = async (proposal) => {
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

  if (!auth) return <AuthPage athletes={athletes} loginCoach={loginCoach} loginAthlete={loginAthlete} acceptInvite={acceptInvite} />;

  return <div className="min-h-screen bg-zinc-950 p-3 text-white sm:p-4 lg:p-6"><div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
    <Header view={view} setView={setView} auth={auth} logout={logout} />
    <AthleteSelector visible={isCoach && ["calendar", "athlete", "management"].includes(view)} athletes={visibleAthletes} activeId={activeId} setActiveId={setActiveId} />
    {view === "calendar" && <CalendarPageOld {...{ athleteActive, activeId, mode, setMode, year, setYear, month, setMonth, selectedDate, setSelectedDate, days, activeSessions, sessionsFor, proposalsFor, categories, subcategories, filter, setFilter, filteredLibrary, cpData, importWorkout, addRestDay, updateFeedback, updateNonDone, updateSession, updateCalendarWorkoutField, setProposals, programProposal, addAthleteProposal, isCoach, weekPlanning, updateWeekPlanning, weekNotes, updateWeekNote, updateAthlete }} />}
    {isCoach && view === "create" && <CreatePage {...{ categories, subcategories, draft, editingId, updateDraft, updateBlock, updateRepeat, setDraft, saveWorkout, newCat, setNewCat, newSub, setNewSub, addItem }} />}
    {isCoach && view === "library" && <LibraryPage {...{ categories, setCategories, subcategories, setSubcategories, filter, setFilter, filteredLibrary, editWorkout, setLibrary, library, rename, removeItem }} />}
    {isCoach && view === "athlete" && <AthletePage {...{ athleteActive, activeId, calendarYear: year, updateAthlete, cpData, stats, training, activeSessions, weekColors, setWeekColors, weekNotes, setWeekNotes, weekPlanning, updateWeekPlanning, categories, subcategories }} />}
    {isCoach && view === "management" && <ManagementPage {...{ athletes, newAthlete, setNewAthlete, addAthlete, deleteAthlete, updateAthlete }} />}
    {auth?.role === "coach" && <DevChecks />}
  </div></div>;
}
