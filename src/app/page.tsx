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
  repeatBlock,
  simpleBlock,
  statusLabel,
  statusStyle,
  weekLabels,
  ZONES,
} from "@/lib/platformDefaults";
import { supabase } from "@/lib/supabase";
import { useEffect, useMemo } from "react";
import {
  Badge,
  Btn,
  ColorSelect,
  Empty,
  Field,
  Input,
  Panel,
  Select,
  Textarea,
} from "@/components/ui/ui";
import AuthPage from "@/components/auth/AuthPage";

import Header from "@/components/layout/Header";
import { proposalStyle } from "@/lib/proposalUtils";
import AthleteSelector from "@/components/athlete/AthleteSelector";
import Proposal from "@/components/calendar/Proposal";
import AthleteProposalForm from "@/components/calendar/AthleteProposalForm";
import FilterSelects from "@/components/calendar/FilterSelects";
import Block from "@/components/calendar/Block";
import WorkoutBlock from "@/components/calendar/WorkoutBlock";
import QuickCreate from "@/components/calendar/QuickCreate";
import CalendarPageOld from "@/components/calendar/CalendarPageOld";
import StatCard from "@/components/athlete/StatCard";
import WeeklyLoadChart from "@/components/athlete/WeeklyLoadChart";
import WeekPicker from "@/components/athlete/WeekPicker";
import WeekDetail from "@/components/athlete/WeekDetail";
import Stats from "@/components/athlete/Stats";
import CP from "@/components/athlete/CP";
import Editable from "@/components/library/Editable";

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
  const [filter, setFilter] = useState({ category: "Route", subcategory: "Endurance" });
  const [library, setLibrary] = useState(defaultLibrary);
  const [draft, setDraft] = useState(blankWorkout());
  const [editingId, setEditingId] = useState(null);
  const [sessions, setSessions] = useState({ "athlete-1": [], "athlete-2": [], "athlete-3": [] });
  const [proposals, setProposals] = useState([{ id: "proposal-1", athleteId: "athlete-1", type: "Course à ajouter", date: dateKey(now), title: "XCO régional", message: "J’aimerais l’ajouter au calendrier.", status: "À traiter" }]);
  const [weekColors, setWeekColors] = useState({});
const [weekNotes, setWeekNotes] = useState({});
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
user_id: row.user_id || "",
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
      category: row.workout_type || "Séance",
      subcategory: "",
      title: row.title || "Séance",
      totalDuration: row.duration || "",
      expectedRpe: row.expected_rpe || "",
      description: row.description || "",
      date: row.date,
      blocks: row.blocks || [],
      feedback: {
        ...blankFeedback(),
        actualTime: feedback?.real_duration || "",
        rpe: feedback?.rpe ? String(feedback.rpe) : "",
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
      subcategory: row.subcategory || "Endurance",
      title: row.title || "",
      totalDuration: row.total_duration || "",
      expectedRpe: row.expected_rpe || "",
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
      .filter((row) => row.status !== "Refusée")
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
      setAuth({
        role: "athlete",
        athleteId: athlete.id,
      });
      return;
    }

    await supabase.auth.signOut();
    setAuth(null);
  }

  restoreSession();
}, []);

useEffect(() => {
  if (auth?.role === "athlete") {
    setActiveId(auth.athleteId);
    setView("calendar");
  }
}, [auth]);
  const isCoach = auth?.role === "coach";
  const athleteActive =
  athletes.find((row) => row.id === activeId) ||
  athletes[0] ||
  defaultAthletes[0];
  const cpData = criticalPower(athleteActive?.power5, athleteActive?.power12, athleteActive?.power20, athleteActive?.weight);
  const days = useMemo(() => monthDays(year, month), [year, month]);
  const activeSessions = sessions[activeId] || [];
  const activeProposals = proposals.filter((proposal) => proposal.athleteId === activeId);
  const filteredLibrary = library.filter((workout) => workout.category === filter.category && workout.subcategory === filter.subcategory);
  const done = activeSessions.filter((session) => feedbackDone(session.feedback));
  const stats = { planned: activeSessions.length, completed: done.length, rpe: avg(done, "rpe"), motivation: avg(done, "motivation"), pleasure: avg(done, "pleasure") };
  const training = trainingStats(activeSessions, year);

  const updateAthlete = async (field, value) => {
  setAthletes((items) =>
    items.map((a) =>
      a.id !== activeId
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
  };

  const supabaseField = fieldMap[field] || field;

  const updates = {
    [supabaseField]: value
  };

  const { error } = await supabase
    .from("athletes")
    .update(updates)
    .eq("id", activeId);

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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    console.error("Erreur connexion coach", error);
    return false;
  }

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (athlete) {
    await supabase.auth.signOut();
    console.error("Ce compte est un compte athlète, pas coach.");
    return false;
  }

  setAuth({ role: "coach" });
  await loadAllData();
  return true;
}

async function loginAthlete(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    console.error("Erreur connexion athlète", error);
    return false;
  }

  const { data: athlete, error: athleteError } = await supabase
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
    console.error("Aucun athlète lié à ce compte");
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

  const { error: updateError } = await supabase
    .from("athletes")
    .update({
      user_id: data.user.id,
      email,
    })
    .eq("id", athleteToLink.id);

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
  async function saveWorkout() {
  if (!draft.title.trim()) return;

  const workoutData = {
    category: draft.category,
    subcategory: draft.subcategory,
    title: draft.title,
    total_duration: draft.totalDuration,
    expected_rpe: draft.expectedRpe,
    description: draft.description,
    blocks: draft.blocks,
  };

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
      title: session.title,
      duration: session.totalDuration,
      expected_rpe: session.expectedRpe,
      description: session.description,
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
  async function updateFeedback(sessionId, field, value) {
  const session = activeSessions.find((item) => item.id === sessionId);
  if (!session) return;

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

  const { error } = await supabase
    .from("workout_feedbacks")
    .upsert(
      {
        workout_id: sessionId,
        rpe: updatedFeedback.rpe ? Number(updatedFeedback.rpe) : null,
        motivation: updatedFeedback.motivation ? Number(updatedFeedback.motivation) : null,
        pleasure: updatedFeedback.pleasure ? Number(updatedFeedback.pleasure) : null,
        comment: updatedFeedback.comment || "",
        real_duration: updatedFeedback.actualTime || "",
      },
      { onConflict: "workout_id" }
    );

  if (error) {
    console.error("Erreur sauvegarde feedback", error);
  }
if (field === "validated" && value === true) {
  await supabase
    .from("calendar_workouts")
    .update({ completed: true })
    .eq("id", sessionId);
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
  if (!name || name === oldName) return;

  const isCategory = kind === "category";
  const table = isCategory
    ? "workout_categories"
    : "workout_subcategories";

  const { error } = await supabase
    .from(table)
    .update({ name })
    .eq("id", oldName);

  if (error) {
    console.error("Erreur renommage catégorie", error);
    return;
  }

  const setter = isCategory ? setCategories : setSubcategories;

  setter((items) =>
    items.map((row) => (row.name === oldName ? { ...row, name } : row))
  );

  setLibrary((items) =>
    items.map((workout) =>
      workout[kind] === oldName ? { ...workout, [kind]: name } : workout
    )
  );
}
  async function removeItem(kind, name) {
const isCategory = kind === "category";
const table = isCategory
  ? "workout_categories"
  : "workout_subcategories";

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("name", name);

  if (error) {
    console.error("Erreur suppression catégorie", error);
    return;
  }

  const setter = isCategory ? setCategories : setSubcategories;
  setter((items) => items.filter((row) => row.name !== name));

  setLibrary((items) => items.filter((workout) => workout[kind] !== name));
}

  const sessionsFor = (date) => activeSessions.filter((session) => session.date === dateKey(date));
  const proposalsFor = (date) => activeProposals.filter((proposal) => proposal.date === dateKey(date));
 const programProposal = async (proposal) => {
  const alreadyExists = activeSessions.some(
    (session) => session.sourceProposalId === proposal.id
  );

  if (!alreadyExists) {
    const session = proposalToSession(proposal);

    await supabase.from("calendar_workouts").insert({
      athlete_id: proposal.athleteId,
      date: proposal.date,
      workout_type: session.category,
      title: session.title,
      duration: session.totalDuration,
      completed: false,
    });
  }

  const { error } = await supabase
    .from("athlete_proposals")
    .update({ status: "Programmée" })
    .eq("id", proposal.id);

  if (error) {
    console.error("Erreur programmation proposition", error);
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
    <AthleteSelector visible={isCoach && ["calendar", "athlete", "management"].includes(view)} athletes={athletes} activeId={activeId} setActiveId={setActiveId} />
    {view === "calendar" && <CalendarPageOld {...{ athleteActive, mode, setMode, year, setYear, month, setMonth, selectedDate, setSelectedDate, days, sessionsFor, proposalsFor, categories, subcategories, filter, setFilter, filteredLibrary, cpData, importWorkout, updateFeedback, updateNonDone, updateSession, setProposals, programProposal, addAthleteProposal, isCoach }} />}
    {isCoach && view === "create" && <CreatePage {...{ categories, subcategories, draft, editingId, updateDraft, updateBlock, updateRepeat, setDraft, saveWorkout, newCat, setNewCat, newSub, setNewSub, addItem }} />}
    {isCoach && view === "library" && <LibraryPage {...{ categories, setCategories, subcategories, setSubcategories, filter, setFilter, filteredLibrary, editWorkout, setLibrary, library, rename, removeItem }} />}
    {isCoach && view === "athlete" && <AthletePage {...{ athleteActive, activeId, calendarYear: year, updateAthlete, cpData, stats, training, activeSessions, weekColors, setWeekColors, weekNotes, setWeekNotes }} />}
    {isCoach && view === "management" && <ManagementPage {...{ athletes, newAthlete, setNewAthlete, addAthlete, deleteAthlete }} />}
    {auth?.role === "coach" && <DevChecks />}
  </div></div>;
}


function CreatePage({ categories, subcategories, draft, editingId, updateDraft, updateBlock, updateRepeat, setDraft, saveWorkout, newCat, setNewCat, newSub, setNewSub, addItem }) { const addSimple = () => setDraft((current) => ({ ...current, blocks: [...current.blocks, simpleBlock(`Bloc ${current.blocks.length + 1}`)] })); const addRepeat = () => setDraft((current) => ({ ...current, blocks: [...current.blocks, repeatBlock(`Bloc répétition ${current.blocks.length + 1}`)] })); return <Panel><div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-2xl font-semibold">Ma création détaillée de séance</h2><p className="text-sm text-zinc-400">Outil commun : aucune sélection d’athlète ici.</p></div><Btn variant="primary" onClick={saveWorkout}>{editingId ? "Mettre à jour" : "Enregistrer dans la bibliothèque"}</Btn></div><div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"><Field label="Catégorie / discipline"><Select value={draft.category} onChange={(event) => updateDraft("category", event.target.value)}>{categories.map((category) => <option key={category.id}>{category.name}</option>)}</Select></Field><Field label="Sous-partie / contenu"><Select value={draft.subcategory} onChange={(event) => updateDraft("subcategory", event.target.value)}>{subcategories.map((subcategory) => <option key={subcategory.id}>{subcategory.name}</option>)}</Select></Field><Field label="Titre"><Input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} /></Field><Field label="Durée totale"><Input value={draft.totalDuration} onChange={(event) => updateDraft("totalDuration", event.target.value)} /></Field><Field label="RPE attendu"><Select value={draft.expectedRpe} onChange={(event) => updateDraft("expectedRpe", event.target.value)}><option value="">Choisir</option>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((number) => <option key={number}>{number}/10</option>)}</Select></Field><Field label="Description"><Textarea value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} rows={4} /></Field></div><div className="space-y-4"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-semibold">Blocs de séance</h3><div className="flex gap-2"><Btn onClick={addSimple}>+ Bloc simple</Btn><Btn onClick={addRepeat}>+ Bloc répétition</Btn></div></div>{draft.blocks.map((block, blockIndex) => <WorkoutBlock key={blockIndex} {...{ block, blockIndex, updateBlock, updateRepeat, setDraft }} />)}</div><QuickCreate {...{ newCat, setNewCat, newSub, setNewSub, addItem }} /></Panel>; }
function LibraryPage({ categories, setCategories, subcategories, setSubcategories, filter, setFilter, filteredLibrary, editWorkout, setLibrary, library, rename, removeItem }) { return <Panel><h2 className="mb-2 text-2xl font-semibold">Ma bibliothèque générale de séances</h2><p className="mb-5 text-sm text-zinc-400">Ici, pas de sélection d’athlète : seulement mes séances et mes réglages.</p><div className="mb-6 rounded-3xl border border-zinc-700 bg-zinc-800 p-5"><div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h3 className="text-xl font-semibold">Mes séances créées</h3><p className="text-sm text-zinc-400">Filtre par catégorie et sous-partie.</p></div><FilterSelects {...{ categories, subcategories, filter, setFilter }} /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">{!filteredLibrary.length && <Empty text="Aucune séance." />}{filteredLibrary.map((workout) => <div key={workout.id} className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4"><h4 className="text-lg font-bold">{workout.title}</h4><p className="text-sm text-zinc-400">{workout.totalDuration || "Durée libre"} • {workout.blocks.length} bloc(s)</p><div className="mt-4 flex gap-2"><Btn variant="primary" className="flex-1" onClick={() => editWorkout(workout)}>Modifier</Btn><Btn
  variant="danger"
  className="flex-1"
  onClick={async () => {
    await supabase
      .from("workout_library")
      .delete()
      .eq("id", workout.id);

    setLibrary(library.filter((row) => row.id !== workout.id));
  }}
>
  Supprimer
</Btn></div></div>)}</div></div><details className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5"><summary className="cursor-pointer text-xl font-semibold">Gérer les catégories et sous-parties</summary><div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2"><Editable title="Catégories" items={categories} setItems={setCategories} kind="category" {...{ rename, removeItem }} /><Editable title="Sous-parties" items={subcategories} setItems={setSubcategories} kind="subcategory" {...{ rename, removeItem }} /></div></details></Panel>; }

function AthletePage({ athleteActive, activeId, calendarYear, updateAthlete, cpData, stats, training, activeSessions, weekColors, setWeekColors, weekNotes, setWeekNotes }) {
  const a = athleteActive;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Panel className="h-fit">
        <h2 className="mb-2 text-2xl font-semibold">Fiche de {a.name}</h2>

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
      </Panel>

      <section className="space-y-6 xl:col-span-2">
        <Panel>
          <h2 className="mb-4 text-2xl font-semibold">Objectifs et contexte</h2>

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
        </Panel>

        <Stats
  stats={stats}
  training={training}
  sessions={activeSessions}
  athleteId={activeId}
  calendarYear={calendarYear}
  weekColors={weekColors}
  setWeekColors={setWeekColors}
  weekNotes={weekNotes}
  setWeekNotes={setWeekNotes}
/>

        <CP athlete={a} updateAthlete={updateAthlete} cpData={cpData} />

        <Panel>
          <h2 className="mb-2 text-2xl font-semibold">Invitation individuelle</h2>

          <p className="text-sm text-zinc-400">
            Lien prévu : https://myrideplan.vercel.app/?invite={a.inviteToken}
          </p>

          <div className="mt-3 rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-sm">
            <div className="text-zinc-400">Code invitation</div>

            <div className="mt-1 font-mono text-lg font-bold">
              {a.inviteToken}
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function ManagementPage({ athletes, newAthlete, setNewAthlete, addAthlete, deleteAthlete }) { const [confirmDelete, setConfirmDelete] = useState(null); return <Panel><h2 className="mb-2 text-2xl font-semibold">Ma gestion des athlètes & calendriers</h2><p className="mb-5 text-sm text-zinc-400">Ajout ou suppression d’athlètes dans un espace séparé.</p><div className="grid grid-cols-1 gap-4 xl:grid-cols-2"><div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5"><h3 className="mb-3 text-lg font-semibold">Ajouter un athlète</h3><div className="flex flex-col gap-3 sm:flex-row"><Input value={newAthlete} onChange={(event) => setNewAthlete(event.target.value)} placeholder="Nom de l’athlète" /><Btn variant="primary" onClick={addAthlete}>+ Ajouter</Btn></div></div><div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5"><h3 className="mb-3 text-lg font-semibold">Supprimer un calendrier</h3><div className="space-y-3">{athletes.map((athleteItem) => <div key={athleteItem.id} className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4"><div className="flex items-center justify-between gap-3"><div><b>{athleteItem.name}</b><div className="text-xs text-zinc-500">{athleteItem.calendarName}</div></div><Btn variant="danger" onClick={() => setConfirmDelete(athleteItem.id)} className={athletes.length <= 1 ? "opacity-40" : ""} disabled={athletes.length <= 1}>Supprimer</Btn></div>{confirmDelete === athleteItem.id && <div className="mt-4 rounded-2xl border border-red-500 bg-zinc-950 p-4"><div className="text-sm text-zinc-300">Confirmer la suppression de <b>{athleteItem.name}</b> ? Cette action retirera son calendrier, ses propositions et ses données de séances.</div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Btn variant="danger" onClick={() => { deleteAthlete(athleteItem.id); setConfirmDelete(null); }}>Confirmer</Btn><Btn onClick={() => setConfirmDelete(null)}>Annuler</Btn></div></div>}</div>)}</div></div></div></Panel>; }
function DevChecks() { const future = calendarSession(defaultLibrary[0], addDays(new Date(), 2)); const awaiting = calendarSession(defaultLibrary[0], new Date()); const readyOnly = { ...awaiting, feedback: { ...awaiting.feedback, actualTime: "1h30", rpe: "7", motivation: "8", pleasure: "4", comment: "RAS" } }; const completed = { ...readyOnly, feedback: { ...readyOnly.feedback, validated: true } }; const justified = { ...awaiting, nonDone: { validated: true, reason: "Malade" } }; const checks = [["CP", Boolean(criticalPower(420, 360, 330, 70)?.cp)], ["Zone 7", criticalPower(420, 360, 330, 70)?.zones.length === 7], ["Temps converti", durationHours("1h30") === 1.5], ["Calendrier", monthDays(2026, 0).length >= 31], ["Proposition blanche", proposalStyle("Programmée") === "bg-white text-black"], ["Futur blanc", sessionStatus(future) === "planned"], ["Retour incomplet jaune", sessionStatus(awaiting) === "awaitingAction"], ["Retour complet non validé jaune", sessionStatus(readyOnly) === "awaitingAction"], ["Retour validé vert", sessionStatus(completed) === "done"], ["Non faite gris", sessionStatus(justified) === "notDoneJustified"], ["Stats semaines réelles", [52, 53].includes(trainingStats([completed], new Date().getFullYear()).weeks.length)], ["Années stats", availableYears([completed], 2029).includes(2029)], ["Années futures", availableYears([], 2045).includes(2045)], ["Stats temps", trainingStats([completed], new Date().getFullYear()).totals.time === 1.5], ["Stats synchronisées", trainingStats([completed], weekInfo(completed.date).year).done === 1], ["Stats calendrier 2029", trainingStats([{ ...completed, date: "2029-02-20" }], 2029).done === 1], ["Stats semaine 8", trainingStats([{ ...completed, date: "2029-02-20" }], 2029).weeks.find((week) => week.week === "S8")?.sessions === 1], ["Détail semaine complet", trainingStats([{ ...completed, date: "2029-04-18" }], 2029).weeks.find((week) => week.week === weekInfo("2029-04-18").label)?.time === 1.5], ["Liste séances semaine", trainingStats([{ ...completed, date: "2029-04-18" }], 2029).weeks.find((week) => week.week === weekInfo("2029-04-18").label)?.sessionsList?.length === 1], ["Couleurs semaines", weekLabels.length >= 8], ["Date locale", dateKey(new Date(2026, 0, 1)) === "2026-01-01"], ["Parse date locale", parseLocalDate("2029-02-20").getMonth() === 1], ["Semaine ISO", weekInfo(new Date(2026, 0, 1)).label === "S1"], ["Clé couleur athlete", `${"athlete-1"}-${2026}-${"S1"}` === "athlete-1-2026-S1"], ["Dates semaines réelles", trainingStats([completed], 2026).weeks[0].range === "29/12 - 04/01"], ["Semaine calendrier", weekInfo(new Date("2029-02-20")).label === "S8"], ["21 mai semaine 21", weekInfoForYear("2026-05-21", 2026).label === "S21"], ["21 mai dans plage", findWeekForDate("2026-05-21", 2026).range === "18/05 - 24/05"], ["Semaine 20 mai", trainingStats([{ ...completed, date: "2026-05-11" }], 2026).weeks.find((week) => week.week === "S20")?.sessions === 1], ["Temps semaine 20", trainingStats([{ ...completed, date: "2026-05-11" }], 2026).weeks.find((week) => week.week === "S20")?.time === 1.5], ["Liste semaine 20", trainingStats([{ ...completed, date: "2026-05-11" }], 2026).weeks.find((week) => week.week === "S20")?.sessionsList?.[0]?.id === completed.id], ["RPE semaine 20", trainingAverage(trainingStats([{ ...completed, date: "2026-05-11" }], 2026).weeks.find((week) => week.week === "S20")?.rpeSum, 1) === "7.0"], ["21 mai compté S21", trainingStats([{ ...completed, date: "2026-05-21" }], 2026).weeks.find((week) => week.week === "S21")?.sessions === 1], ["21 mai pas S20", trainingStats([{ ...completed, date: "2026-05-21" }], 2026).weeks.find((week) => week.week === "S20")?.sessions === 0], ["Token invitation", athlete("test", "Test").inviteToken === "invite-test"], ["Proposition session", proposalToSession({ id: "p1", type: "Course", title: "Test", date: "2026-05-21", message: "OK" }).sourceProposalId === "p1"]]; return <Panel className="text-sm text-zinc-400"><b className="text-white">Tests intégrés</b><div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">{checks.map(([label, ok]) => <div key={label}>{label} : {ok ? "OK" : "Erreur"}</div>)}</div></Panel>; }
