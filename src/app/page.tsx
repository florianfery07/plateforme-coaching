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
  const filteredLibrary = library.filter((workout) => {
  const categoryOk = !filter.category || workout.category === filter.category;
  const subcategoryOk = !filter.subcategory || workout.subcategory === filter.subcategory;

  return categoryOk && subcategoryOk;
});
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
        rpe: cleanRpe(updatedFeedback.rpeGlobal || updatedFeedback.rpe),
        rpe_global: cleanRpe(updatedFeedback.rpeGlobal || updatedFeedback.rpe),
        rpe_specific: cleanRpe(updatedFeedback.rpeSpecific),
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
    .update({
      completed: true,
      non_done: false,
    })
    .eq("id", sessionId);

  await loadAllData();
}
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
    {view === "calendar" && <CalendarPageOld {...{ athleteActive, mode, setMode, year, setYear, month, setMonth, selectedDate, setSelectedDate, days, sessionsFor, proposalsFor, categories, subcategories, filter, setFilter, filteredLibrary, cpData, importWorkout, addRestDay, updateFeedback, updateNonDone, updateSession, updateCalendarWorkoutField, setProposals, programProposal, addAthleteProposal, isCoach }} />}
    {isCoach && view === "create" && <CreatePage {...{ categories, subcategories, draft, editingId, updateDraft, updateBlock, updateRepeat, setDraft, saveWorkout, newCat, setNewCat, newSub, setNewSub, addItem }} />}
    {isCoach && view === "library" && <LibraryPage {...{ categories, setCategories, subcategories, setSubcategories, filter, setFilter, filteredLibrary, editWorkout, setLibrary, library, rename, removeItem }} />}
    {isCoach && view === "athlete" && <AthletePage {...{ athleteActive, activeId, calendarYear: year, updateAthlete, cpData, stats, training, activeSessions, weekColors, setWeekColors, weekNotes, setWeekNotes }} />}
    {isCoach && view === "management" && <ManagementPage {...{ athletes, newAthlete, setNewAthlete, addAthlete, deleteAthlete }} />}
    {auth?.role === "coach" && <DevChecks />}
  </div></div>;
}

function DevChecks() {
  const future = calendarSession(defaultLibrary[0], addDays(new Date(), 2));
  const awaiting = calendarSession(defaultLibrary[0], new Date());

  const readyOnly = {
    ...awaiting,
    expectedSpecificDuration: "20min",
    feedback: {
      ...awaiting.feedback,
      actualTime: "1h30",
      rpeGlobal: "7",
      rpeSpecific: "9",
      motivation: "8",
      pleasure: "4",
      comment: "RAS",
    },
  };

  const completed = {
    ...readyOnly,
    feedback: {
      ...readyOnly.feedback,
      validated: true,
    },
  };

  const adjustedCompleted = {
    ...completed,
    adjustedSpecificDuration: "10min",
  };

  const noNegativeBonus = {
    ...completed,
    feedback: {
      ...completed.feedback,
      rpeGlobal: "8",
      rpeSpecific: "5",
    },
  };

  const rest = {
    ...awaiting,
    category: "Repos",
  };

  const justified = {
    ...awaiting,
    nonDone: {
      validated: true,
      reason: "Malade",
    },
  };

  const checks = [
    ["CP", Boolean(criticalPower(420, 360, 330, 70)?.cp)],
    ["Zone 7", criticalPower(420, 360, 330, 70)?.zones.length === 7],
    ["Temps converti", durationHours("1h30") === 1.5],
    ["Calendrier", monthDays(2026, 0).length >= 31],
    ["Proposition blanche", proposalStyle("Programmée") === "bg-white text-black"],

    ["Futur blanc", sessionStatus(future) === "planned"],
    ["Repos", sessionStatus(rest) === "rest"],
    ["Retour incomplet jaune", sessionStatus(awaiting) === "awaitingAction"],
    ["Feedback double RPE prêt", feedbackReady(readyOnly.feedback) === true],
    ["Retour complet non validé jaune", sessionStatus(readyOnly) === "awaitingAction"],
    ["Retour validé vert", sessionStatus(completed) === "done"],
    ["Non faite gris", sessionStatus(justified) === "notDoneJustified"],

    ["Charge globale double RPE", sessionLoadParts(completed).globalLoad === 73.5],
    ["Bonus spécifique prévu", Math.round(sessionLoadParts(completed).specificBonus) === 11],
    ["Charge avec ajustement spécifique", Math.round(sessionLoadParts(adjustedCompleted).specificBonus) === 5],
    ["Bonus jamais négatif", sessionLoadParts(noNegativeBonus).specificBonus === 0],

    ["Stats semaines réelles", [52, 53].includes(trainingStats([completed], new Date().getFullYear()).weeks.length)],
    ["Années stats", availableYears([completed], 2029).includes(2029)],
    ["Années futures", availableYears([], 2045).includes(2045)],
    ["Stats temps", trainingStats([completed], new Date().getFullYear()).totals.time === 1.5],
    ["Stats synchronisées", trainingStats([completed], weekInfo(completed.date).year).done === 1],
    ["Stats calendrier 2029", trainingStats([{ ...completed, date: "2029-02-20" }], 2029).done === 1],
    ["Stats semaine 8", trainingStats([{ ...completed, date: "2029-02-20" }], 2029).weeks.find((week) => week.week === "S8")?.sessions === 1],
    ["Détail semaine complet", trainingStats([{ ...completed, date: "2029-04-18" }], 2029).weeks.find((week) => week.week === weekInfo("2029-04-18").label)?.time === 1.5],
    ["Liste séances semaine", trainingStats([{ ...completed, date: "2029-04-18" }], 2029).weeks.find((week) => week.week === weekInfo("2029-04-18").label)?.sessionsList?.length === 1],

    ["Couleurs semaines", weekLabels.length >= 8],
    ["Date locale", dateKey(new Date(2026, 0, 1)) === "2026-01-01"],
    ["Parse date locale", parseLocalDate("2029-02-20").getMonth() === 1],
    ["Semaine ISO", weekInfo(new Date(2026, 0, 1)).label === "S1"],
    ["Clé couleur athlete", `${"athlete-1"}-${2026}-${"S1"}` === "athlete-1-2026-S1"],
    ["Dates semaines réelles", trainingStats([completed], 2026).weeks[0].range === "29/12 - 04/01"],
    ["Semaine calendrier", weekInfo(new Date("2029-02-20")).label === "S8"],
    ["21 mai semaine 21", weekInfoForYear("2026-05-21", 2026).label === "S21"],
    ["21 mai dans plage", findWeekForDate("2026-05-21", 2026).range === "18/05 - 24/05"],
    ["Semaine 20 mai", trainingStats([{ ...completed, date: "2026-05-11" }], 2026).weeks.find((week) => week.week === "S20")?.sessions === 1],
    ["Temps semaine 20", trainingStats([{ ...completed, date: "2026-05-11" }], 2026).weeks.find((week) => week.week === "S20")?.time === 1.5],
    ["Liste semaine 20", trainingStats([{ ...completed, date: "2026-05-11" }], 2026).weeks.find((week) => week.week === "S20")?.sessionsList?.[0]?.id === completed.id],
    ["21 mai compté S21", trainingStats([{ ...completed, date: "2026-05-21" }], 2026).weeks.find((week) => week.week === "S21")?.sessions === 1],
    ["21 mai pas S20", trainingStats([{ ...completed, date: "2026-05-21" }], 2026).weeks.find((week) => week.week === "S20")?.sessions === 0],

    ["Token invitation", athlete("test", "Test").inviteToken === "invite-test"],
    ["Proposition session", proposalToSession({ id: "p1", type: "Course", title: "Test", date: "2026-05-21", message: "OK" }).sourceProposalId === "p1"],
  ];

  return (
    <Panel className="text-sm text-zinc-400">
      <b className="text-white">Tests intégrés</b>
      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
        {checks.map(([label, ok]) => (
          <div key={label}>
            {label} : {ok ? "OK" : "Erreur"}
          </div>
        ))}
      </div>
    </Panel>
  );
}