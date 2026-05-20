// @ts-nocheck
"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const ZONES = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6", "Z7"];
const COLORS = [["Bleu", "bg-blue-500"], ["Vert", "bg-emerald-500"], ["Orange", "bg-orange-500"], ["Violet", "bg-purple-500"], ["Rose", "bg-rose-500"], ["Rouge", "bg-red-500"], ["Jaune", "bg-yellow-500"], ["Cyan", "bg-cyan-500"], ["Gris", "bg-zinc-500"]];
const CALENDAR_YEARS = Array.from({ length: 31 }, (_, index) => new Date().getFullYear() - 5 + index);

function id(prefix = "id") { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function item(id: string, name: string, color: string) {
  return { id, name, color };
}
function parseLocalDate(value) { if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate()); const match = String(value || "").match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/); return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value); }
function dayStart(date) { const copy = parseLocalDate(date); copy.setHours(0, 0, 0, 0); return copy; }
function dateKey(date) { if (!date) return ""; const d = parseLocalDate(date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function addDays(date, days) { const copy = parseLocalDate(date); copy.setDate(copy.getDate() + days); return copy; }
function athlete(id, name, weight = "", power5 = "", power12 = "", power20 = "") { return { id, name, calendarName: `Calendrier de ${name}`, inviteToken: `invite-${id}`, email: "", age: "", height: "", weight, sport: "Vélo", shortGoal: "", mediumGoal: "", longGoal: "", context: "", power5, power12, power20 }; }
function simpleBlock(name = "", duration = "", zone = "Z2", instruction = "") { return { type: "simple", name, duration, zone, instruction, repeatItems: [] }; }
function repeatBlock(name = "Bloc répétition") { return { type: "repeat", name, duration: "5 x (4 min / 3 min)", zone: "Z4", instruction: "", repeatItems: [{ name: "Effort", duration: "4 min", zone: "Z5", instruction: "Tenir la puissance cible." }, { name: "Récupération", duration: "3 min", zone: "Z1", instruction: "Pédalage souple." }] }; }
function blankWorkout() { return { category: "Route", subcategory: "Endurance", title: "", totalDuration: "", expectedRpe: "", description: "", blocks: [simpleBlock("Échauffement", "", "Z1"), repeatBlock(), simpleBlock("Retour au calme", "", "Z1")] }; }
function blankFeedback() { return { actualTime: "", rpe: "", motivation: "", pleasure: "", comment: "", validated: false }; }
function blankNonDone() { return { validated: false, reason: "", fatigue: "", pain: "", comment: "" }; }
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

function numberFromText(value) { return Number(String(value || "").replace(",", ".").match(/[0-9.]+/)?.[0] || 0); }
function hoursFromTime(value) { const parts = String(value || "").split(":").map(Number); if (parts.length === 3) return parts[0] + parts[1] / 60 + parts[2] / 3600; if (parts.length === 2) return parts[0] / 60 + parts[1] / 3600; return numberFromText(value); }
function durationHours(value) { const text = String(value || "").trim(); if (text.includes(":")) return hoursFromTime(text); const parts = text.toLowerCase().split("h"); const hours = parts.length > 1 ? numberFromText(parts[0]) : 0; const minutes = parts.length > 1 ? numberFromText(parts[1]) : numberFromText(text); return hours + (minutes ? minutes / 60 : 0); }
function estimateDistance(movingTime, avgSpeed) { const km = hoursFromTime(movingTime) * numberFromText(avgSpeed); return km ? `${km.toFixed(1).replace(".", ",")} km` : ""; }
function feedbackReady(feedback = {}) { return Boolean(feedback.actualTime && feedback.rpe && feedback.motivation && feedback.pleasure && feedback.comment); }
function feedbackDone(feedback = {}) { return Boolean(feedbackReady(feedback) && feedback.validated); }
function monthDays(year, month) { const first = new Date(year, month, 1); const last = new Date(year, month + 1, 0); const offset = (first.getDay() + 6) % 7; return [...Array(offset).fill(null), ...Array.from({ length: last.getDate() }, (_, index) => new Date(year, month, index + 1))]; }
function mondayOfWeek(date) { const day = dayStart(date); const offset = (day.getDay() + 6) % 7; return addDays(day, -offset); }
function firstMondayOfYear(year) { return mondayOfWeek(new Date(year, 0, 4)); }
function weeksInYear(year) { const start = firstMondayOfYear(year); const next = firstMondayOfYear(year + 1); return Math.round((next.getTime() - start.getTime()) / 604800000); }
function shortDate(date) { return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`; }
function weekStart(year, weekIndex) { return addDays(firstMondayOfYear(Number(year)), weekIndex * 7); }
function weekObject(year, weekIndex) { const start = weekStart(year, weekIndex); const end = addDays(start, 6); return { week: `S${weekIndex + 1}`, start, end, range: `${shortDate(start)} - ${shortDate(end)}`, sessions: 0, ...emptyTrainingValues() }; }
function weeksOfYear(year) { return Array.from({ length: weeksInYear(Number(year)) }, (_, index) => weekObject(Number(year), index)); }
function findWeekForDate(date, year) { const day = dayStart(parseLocalDate(date)).getTime(); const weeks = weeksOfYear(year); return weeks.find((week) => day >= week.start.getTime() && day <= week.end.getTime()) || weeks[0]; }
function weekInfoForYear(date, year) { const week = findWeekForDate(date, Number(year)); return { year: Number(year), week: Number(week.week.replace("S", "")), label: week.week, range: week.range }; }
function weekInfo(date) { const day = parseLocalDate(date); return weekInfoForYear(day, day.getFullYear()); }
function weekLabel(date) { return weekInfo(date).label; }
function weekRange(year, index) { return weekObject(Number(year), Math.floor(index / 7)).range; }
function avg(list, key) { if (!list.length) return "—"; return (list.reduce((sum, row) => sum + Number(row.feedback?.[key] || 0), 0) / list.length).toFixed(1); }

function criticalPower(power5, power12, power20, weight) {
  const p5 = +power5, p12 = +power12, p20 = +power20, bodyWeight = +weight;
  if (!p5 || !p12 || !p20) return null;
  const points = [{ t: 300, work: p5 * 300 }, { t: 720, work: p12 * 720 }, { t: 1200, work: p20 * 1200 }];
  const n = points.length, sumT = points.reduce((s, p) => s + p.t, 0), sumW = points.reduce((s, p) => s + p.work, 0), sumTW = points.reduce((s, p) => s + p.t * p.work, 0), sumT2 = points.reduce((s, p) => s + p.t * p.t, 0);
  const cp = (n * sumTW - sumT * sumW) / (n * sumT2 - sumT * sumT);
  return { cp: Math.round(cp), wPrime: Math.round((sumW - cp * sumT) / n), wattsPerKg: bodyWeight ? (cp / bodyWeight).toFixed(2) : "—", zones: [{ id: "Z1", name: "Récupération", min: 0, max: 0.55 }, { id: "Z2", name: "Endurance", min: 0.56, max: 0.75 }, { id: "Z3", name: "Tempo", min: 0.76, max: 0.9 }, { id: "Z4", name: "Seuil / CP", min: 0.91, max: 1.05 }, { id: "Z5", name: "VO2max", min: 1.06, max: 1.2 }, { id: "Z6", name: "Anaérobie", min: 1.21, max: 1.5 }, { id: "Z7", name: "Maximal", min: 1.51, max: null }] };
}
function zoneWatts(zoneId, cpData) { if (!cpData) return "Zones non renseignées"; const z = cpData.zones.find((zone) => zone.id === zoneId); if (!z) return "—"; if (z.max === null) return `> ${Math.round(cpData.cp * z.min)} W`; if (z.min === 0) return `< ${Math.round(cpData.cp * z.max)} W`; return `${Math.round(cpData.cp * z.min)} - ${Math.round(cpData.cp * z.max)} W`; }
function sessionStatus(session) { const future = dayStart(session.date) > dayStart(new Date()); const justified = Boolean(session.nonDone?.validated && session.nonDone?.reason); if (future) return "planned"; if (justified) return "notDoneJustified"; if (feedbackDone(session.feedback)) return "done"; return "awaitingAction"; }
function proposalStyle(status) { return status === "Programmée" ? "bg-white text-black" : "bg-zinc-500 text-white"; }
function emptyTrainingValues() { return { time: 0, rpeSum: 0, motivationSum: 0, pleasureSum: 0, sessionsList: [] }; }
function addTrainingValues(acc, session) { return { ...acc, time: acc.time + durationHours(session.feedback.actualTime), rpeSum: acc.rpeSum + Number(session.feedback.rpe || 0), motivationSum: acc.motivationSum + Number(session.feedback.motivation || 0), pleasureSum: acc.pleasureSum + Number(session.feedback.pleasure || 0), sessionsList: [...(acc.sessionsList || []), session] }; }
function trainingAverage(sum, count) { return count ? (Number(sum || 0) / count).toFixed(1) : "—"; }
function availableYears(sessions, preferredYear = new Date().getFullYear()) { const currentYear = new Date().getFullYear(); const years = new Set([currentYear - 5, currentYear, currentYear + 25, Number(preferredYear)]); CALENDAR_YEARS.forEach((year) => years.add(year)); sessions.forEach((session) => years.add(parseLocalDate(session.date).getFullYear())); return [...years].sort((a, b) => b - a); }
function trainingStats(sessions, year = new Date().getFullYear()) {
  const yearSessions = sessions.filter((session) => parseLocalDate(session.date).getFullYear() === Number(year));
  const planned = yearSessions.length;

  const doneSessions = yearSessions.filter(
  (session) =>
    feedbackDone(session.feedback) ||
    (session.nonDone?.validated && session.nonDone?.reason)
);
  const totals = doneSessions.reduce((acc, session) => addTrainingValues(acc, session), emptyTrainingValues());
  const byWeek = doneSessions.reduce((acc, session) => {
    const key = weekInfoForYear(session.date, year).label;
    acc[key] ||= { week: key, sessions: 0, ...emptyTrainingValues() };
    acc[key].sessions += 1;
    acc[key] = addTrainingValues(acc[key], session);
    return acc;
  }, {});
  const weeks = weeksOfYear(Number(year)).map((week) => ({ ...week, ...(byWeek[week.week] || {}) }));
  return { year: Number(year), planned, done: doneSessions.length, doneSessions, totals, weeks };
}

const defaultCategories = [item("cat-route", "Route", "bg-blue-500"), item("cat-vtt", "VTT", "bg-emerald-500"), item("cat-cx", "Cyclo-cross", "bg-orange-500"), item("cat-home", "Home-trainer", "bg-purple-500"), item("cat-run", "Course à pied", "bg-rose-500"), item("cat-ppg", "Préparation physique", "bg-zinc-500")];
const defaultSubcategories = [item("sub-endurance", "Endurance", "bg-blue-500"), item("sub-seuil", "Seuil", "bg-yellow-500"), item("sub-pma", "PMA", "bg-red-500"), item("sub-sprint", "Sprint", "bg-rose-500"), item("sub-force", "Force", "bg-orange-500"), item("sub-velocite", "Vélocité", "bg-cyan-500"), item("sub-technique", "Technique", "bg-emerald-500"), item("sub-recuperation", "Récupération", "bg-emerald-500"), item("sub-mobilite", "Mobilité", "bg-purple-500"), item("sub-renfo", "Renforcement", "bg-zinc-500")];
const defaultAthletes = [athlete("athlete-1", "Athlète 1", "70", "420", "360", "330"), athlete("athlete-2", "Athlète 2", "65"), athlete("athlete-3", "Athlète 3")];
const defaultLibrary = [{ id: "workout-1", category: "Route", subcategory: "Endurance", title: "Endurance fondamentale progressive", totalDuration: "1h30", expectedRpe: "4/10", description: "Séance d’endurance avec progression légère en fin de sortie.", blocks: [simpleBlock("Échauffement", "20 min", "Z1", "Pédalage facile."), simpleBlock("Corps de séance", "55 min", "Z2", "Rester stable."), simpleBlock("Fin de séance", "15 min", "Z3", "Progressif sans se mettre dans le rouge.")] }];
const statusStyle = { planned: "bg-white text-black", awaitingAction: "bg-yellow-400 text-black", done: "bg-emerald-500 text-white", notDoneJustified: "bg-zinc-700 text-white" };
const statusLabel = { planned: "Programmée", awaitingAction: "Action attendue", done: "Réalisée", notDoneJustified: "Non faite justifiée" };
const weekLabels = [{ name: "Aucun", color: "" }, { name: "Off", color: "bg-zinc-700 text-white border-zinc-500" }, { name: "Maintien", color: "bg-blue-500 text-white border-blue-400" }, { name: "Récup", color: "bg-emerald-500 text-white border-emerald-400" }, { name: "Charge", color: "bg-yellow-500 text-black border-yellow-400" }, { name: "Grosse charge", color: "bg-red-500 text-white border-red-400" }, { name: "Affûtage", color: "bg-rose-500 text-white border-rose-400" }, { name: "Affûtage / Course", color: "bg-purple-500 text-white border-purple-400" }];

function Field({ label, children }) { return <label className="block"><span className="mb-1 block text-xs font-medium text-zinc-400">{label}</span>{children}</label>; }
function Input({ className = "", ...props }) { return <input {...props} className={`w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-base outline-none sm:py-2 ${className}`} />; }
function Textarea({ className = "", ...props }) { return <textarea {...props} className={`w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-base outline-none sm:py-2 ${className}`} />; }
function Select({ children, className = "", ...props }) { return <select {...props} className={`w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-base outline-none sm:py-2 ${className}`}>{children}</select>; }
function Panel({ children, className = "" }) { return <section className={`rounded-3xl border border-zinc-800 bg-zinc-900 p-3 shadow-xl sm:p-5 ${className}`}>{children}</section>; }
function Badge({ children, className = "" }) { return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{children}</span>; }
function Btn({ children, variant = "secondary", className = "", ...props }) { const base = "rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed sm:py-2 sm:text-base"; const styles = { primary: "bg-white text-black hover:opacity-90", secondary: "border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700", danger: "bg-red-500 text-white hover:bg-red-600" }; return <button {...props} className={`${base} ${styles[variant]} ${className}`}>{children}</button>; }
function Empty({ text }) { return <div className="rounded-2xl border border-dashed border-zinc-600 bg-zinc-800 p-8 text-center text-zinc-500">{text}</div>; }
function ColorSelect(props) { return <Select {...props}>{COLORS.map(([label, value]) => <option key={value} value={value}>{label}</option>)}</Select>; }

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
      expectedRpe: "",
      description: "",
      date: row.date,
      blocks: [],
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
    proposalData.map((row) => ({
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

    setAuth({ role: "coach" });
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
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Erreur connexion coach", error);
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

if (error) {
  console.error("Erreur connexion athlète", error);
  return false;
}

if (!data.user) {
  return false;
}

const { data: athlete, error: athleteError } = await supabase
  .from("athletes")
  .select("*")
  .eq("user_id", data.user.id)
  .single();

if (athleteError) {
  console.error("Erreur récupération athlète", athleteError);
}

  if (!athlete) {
    console.error("Aucun athlète lié à ce compte");
    return false;
  }

  setAuth({
    role: "athlete",
    athleteId: athlete.id,
  });

  return true;
}

async function logout() {
  await supabase.auth.signOut();
  setAuth(null);
  setView("calendar");
}
  async function deleteAthlete(athleteId) {
  if (athletes.length <= 1) return;

  const { error } = await supabase
    .from("athletes")
    .delete()
    .eq("id", athleteId);

  if (error) {
    console.error("Erreur suppression athlète", error);
    return;
  }

  const next = athletes.filter((row) => row.id !== athleteId);

  setAthletes(next);
  setSessions((items) => {
    const copy = { ...items };
    delete copy[athleteId];
    return copy;
  });
  setProposals((items) => items.filter((proposal) => proposal.athleteId !== athleteId));
  setWeekColors((items) =>
    Object.fromEntries(
      Object.entries(items).filter(([key]) => !key.startsWith(`${athleteId}-`))
    )
  );

  if (activeId === athleteId) setActiveId(next[0].id);
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
      console.error("Erreur ajout séance bibliothèque", JSON.stringify(error, null, 2));
alert(error.message || "Erreur Supabase");
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

console.log("RENOMMAGE", { kind, oldName, name, table });

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
  const programProposal = (proposal) => { updateSession((items) => items.some((session) => session.sourceProposalId === proposal.id) ? items : [...items, proposalToSession(proposal)]); setProposals((items) => items.map((p) => p.id === proposal.id ? { ...p, status: "Programmée" } : p)); };
  const addAthleteProposal = async (proposal) => {
  const { data, error } = await supabase
    .from("athlete_proposals")
    .insert({
      athlete_id: activeId,
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

  if (!auth) return <AuthPage athletes={athletes} loginCoach={loginCoach} loginAthlete={loginAthlete} />;

  return <div className="min-h-screen bg-zinc-950 p-3 text-white sm:p-4 lg:p-6"><div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
    <Header view={view} setView={setView} auth={auth} logout={logout} />
    <AthleteSelector visible={isCoach && ["calendar", "athlete", "management"].includes(view)} athletes={athletes} activeId={activeId} setActiveId={setActiveId} />
    {view === "calendar" && <CalendarPage {...{ athleteActive, mode, setMode, year, setYear, month, setMonth, selectedDate, setSelectedDate, days, sessionsFor, proposalsFor, categories, subcategories, filter, setFilter, filteredLibrary, cpData, importWorkout, updateFeedback, updateNonDone, updateSession, setProposals, programProposal, addAthleteProposal, isCoach }} />}
    {isCoach && view === "create" && <CreatePage {...{ categories, subcategories, draft, editingId, updateDraft, updateBlock, updateRepeat, setDraft, saveWorkout, newCat, setNewCat, newSub, setNewSub, addItem }} />}
    {isCoach && view === "library" && <LibraryPage {...{ categories, setCategories, subcategories, setSubcategories, filter, setFilter, filteredLibrary, editWorkout, setLibrary, library, rename, removeItem }} />}
    {isCoach && view === "athlete" && <AthletePage {...{ athleteActive, activeId, calendarYear: year, updateAthlete, cpData, stats, training, activeSessions, weekColors, setWeekColors }} />}
    {isCoach && view === "management" && <ManagementPage {...{ athletes, newAthlete, setNewAthlete, addAthlete, deleteAthlete }} />}
    <DevChecks />
  </div></div>;
}

function Header({ view, setView, auth, logout }) {
  const nav = auth?.role === "coach" ? [["calendar", "Calendriers"], ["create", "Création séance"], ["library", "Bibliothèque"], ["athlete", "Fiche athlète"], ["management", "Gestion athlètes"]] : [["calendar", "Mon calendrier"]];
  return <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><h1 className="text-2xl font-bold sm:text-3xl xl:text-4xl">Ma Plateforme Coaching Cycliste</h1><p className="mt-2 text-sm text-zinc-400 sm:text-base">Calendriers individuels, bibliothèque, fiches athlètes, retours et propositions.</p></div><div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:gap-3">{nav.map(([key, label]) => <button key={key} onClick={() => setView(key)} className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-semibold sm:px-5 sm:text-base ${view === key ? "bg-white text-black" : "border border-zinc-800 bg-zinc-900 hover:bg-zinc-800"}`}>{label}</button>)}<button onClick={logout} className="shrink-0 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-300 sm:px-5 sm:text-base">Déconnexion</button></div></header>;
}
function AuthPage({ athletes, loginCoach, loginAthlete }) {
  const [coachEmail, setCoachEmail] = useState("");
  const [coachPassword, setCoachPassword] = useState("");
  const [athleteEmail, setAthleteEmail] = useState("");
const [athletePassword, setAthletePassword] = useState("");
  const [error, setError] = useState("");

  async function submitCoach(event) {
    event.preventDefault();

    const ok = await loginCoach(coachEmail, coachPassword);

    if (!ok) {
      setError("Email ou mot de passe incorrect");
    }
  }

  async function submitAthlete(event) {
    event.preventDefault();

    const ok = await loginAthlete(athleteEmail, athletePassword);

    if (!ok) {
      setError("Code athlète invalide");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Plateforme Coaching</h1>
          <p className="text-sm text-neutral-500">
            Connexion coach ou athlète
          </p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submitCoach} className="space-y-3">
          <h2 className="font-semibold">Connexion Coach</h2>

<input
  className="w-full border rounded-xl p-3"
  type="email"
  placeholder="Email coach"
  value={coachEmail}
  onChange={(event) => setCoachEmail(event.target.value)}
/>

<input
  className="w-full border rounded-xl p-3"
  type="password"
  placeholder="Mot de passe"
  value={coachPassword}
  onChange={(event) => setCoachPassword(event.target.value)}
/>

          <button
            className="w-full bg-black text-white rounded-xl p-3"
            type="submit"
          >
            Se connecter coach
          </button>
        </form>

        <div className="border-t pt-4">
          <form onSubmit={submitAthlete} className="space-y-3">
            <h2 className="font-semibold">Connexion Athlète</h2>

<input
  className="w-full border rounded-xl p-3"
  type="email"
  placeholder="Email athlète"
  value={athleteEmail}
  onChange={(event) => setAthleteEmail(event.target.value)}
/>

<input
  className="w-full border rounded-xl p-3"
  type="password"
  placeholder="Mot de passe"
  value={athletePassword}
  onChange={(event) => setAthletePassword(event.target.value)}
/>

            <button
              className="w-full bg-neutral-800 text-white rounded-xl p-3"
              type="submit"
            >
              Se connecter athlète
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
function AthleteSelector({ visible, athletes, activeId, setActiveId }) { if (!visible) return null; const badges = [["Programmée", "bg-white text-black"], ["Action attendue", "bg-yellow-400 text-black"], ["Réalisée", "bg-emerald-500 text-white"], ["Non faite justifiée", "bg-zinc-700 text-white"], ["Proposition", "bg-zinc-500 text-white"]]; return <Panel><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">{athletes.map((a) => <button key={a.id} onClick={() => setActiveId(a.id)} className={`shrink-0 rounded-xl border px-4 py-3 text-sm font-semibold sm:py-2 sm:text-base ${activeId === a.id ? "border-white bg-white text-black" : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>{a.calendarName}</button>)}</div><div className="flex flex-wrap gap-2">{badges.map(([text, klass]) => <Badge key={text} className={klass}>{text}</Badge>)}</div></div></Panel>; }
function CalendarPage(props) { return <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-4"><Panel className={props.isCoach ? "xl:col-span-3" : "xl:col-span-4"}><CalendarToolbar {...props} />{props.mode === "year" && <YearView setMonth={props.setMonth} setMode={props.setMode} />}{props.mode === "month" && <MonthView {...props} />}{props.mode === "day" && <DayView {...props} sessions={props.sessionsFor(props.selectedDate)} proposals={props.proposalsFor(props.selectedDate)} />}</Panel>{props.isCoach && <QuickLibrary {...props} />}</div>; }
function CalendarToolbar({ athleteActive, mode, setMode, year, setYear, month, setMonth }) { return <div className="mb-5 space-y-5"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-2xl font-semibold">{athleteActive.calendarName}</h2><p className="text-sm text-zinc-400">Séances programmées et propositions de l’athlète.</p></div><div className="grid grid-cols-3 gap-2 sm:flex">{[["year", "Année"], ["month", "Mois"], ["day", "Jour"]].map(([key, label]) => <button key={key} onClick={() => setMode(key)} className={`rounded-xl px-3 py-3 text-sm font-semibold sm:px-4 sm:py-2 ${mode === key ? "bg-white text-black" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>{label}</button>)}</div></div><div className="flex flex-wrap gap-3"><Select value={year} onChange={(event) => setYear(+event.target.value)} className="w-auto">{CALENDAR_YEARS.map((yearItem) => <option key={yearItem}>{yearItem}</option>)}</Select><Select value={month}
 onChange={(event) => setMonth(+event.target.value)} className="w-auto">{MONTHS.map((monthItem, index) => <option key={monthItem} value={index}>{monthItem}</option>)}</Select></div></div>; }
function YearView({ setMonth, setMode }) { return <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{MONTHS.map((monthItem, index) => <button key={monthItem} onClick={() => { setMonth(index); setMode("month"); }} className="rounded-2xl border border-zinc-700 bg-zinc-800 p-5 text-left hover:bg-zinc-700"><div className="text-xl font-bold">{monthItem}</div><div className="text-sm text-zinc-400">Voir le mois</div></button>)}</div>; }
function MonthView({ days, sessionsFor, proposalsFor, setSelectedDate, setMode }) { return <div><div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">{DAYS.map((day) => <div key={day} className="py-2 text-center text-sm text-zinc-400">{day}</div>)}</div><div className="grid grid-cols-7 gap-1 sm:gap-2">{days.map((date, index) => { const daySessions = date ? sessionsFor(date) : []; const dayProposals = date ? proposalsFor(date) : []; return <button key={index} onClick={() => { if (date) { setSelectedDate(date); setMode("day"); } }} className={`min-h-20 rounded-xl border p-1 text-left sm:min-h-28 sm:rounded-2xl sm:p-2 ${date ? "border-zinc-700 bg-zinc-800 hover:bg-zinc-700" : "border-transparent"}`}>{date && <><div className="text-xs font-bold sm:text-sm">{date.getDate()}</div><div className="mt-2 space-y-1">{daySessions.slice(0, 2).map((session) => <div key={session.id} className={`${statusStyle[sessionStatus(session)]} truncate rounded-md px-1 py-1 text-[10px] sm:rounded-lg sm:px-2 sm:text-xs`}>{session.title}</div>)}{dayProposals.slice(0, 2).map((proposal) => <div key={proposal.id} className={`${proposalStyle(proposal.status)} truncate rounded-md px-1 py-1 text-[10px] sm:rounded-lg sm:px-2 sm:text-xs`}>{proposal.title || proposal.type}</div>)}{!daySessions.length && !dayProposals.length && <div className="mt-4 text-xs text-zinc-500">Cliquer pour importer</div>}</div></>}</button>; })}</div></div>; }
function DayView({ athleteActive, selectedDate, setMode, sessions, proposals, cpData, updateFeedback, updateNonDone, updateSession, setProposals, programProposal, addAthleteProposal, isCoach }) { return <div className="space-y-5"><div className="flex items-center justify-between gap-3"><div><h3 className="text-2xl font-bold">{selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h3><p className="text-sm text-zinc-400">Séances et propositions du jour.</p></div><Btn onClick={() => setMode("month")}>Retour mois</Btn></div>{sessions.length ? <div className="space-y-4">{sessions.map((session) => <Session key={session.id} session={session} cpData={cpData} updateFeedback={updateFeedback} updateNonDone={updateNonDone} updateSession={updateSession} isCoach={isCoach} />)}</div> : <Empty text="Aucune séance programmée." />}{!isCoach && <AthleteProposalForm selectedDate={selectedDate} addAthleteProposal={addAthleteProposal} />}{!!proposals.length && <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4"><h4 className="mb-3 font-semibold">Propositions de {athleteActive.name}</h4><div className="space-y-2">{proposals.map((proposal) => <Proposal key={proposal.id} proposal={proposal} setProposals={setProposals} programProposal={programProposal} isCoach={isCoach} />)}</div></div>}</div>; }
function AthleteProposalForm({ selectedDate, addAthleteProposal }) { const [type, setType] = useState("Disponibilité"); const [title, setTitle] = useState(""); const [message, setMessage] = useState(""); const ready = title.trim() && message.trim(); function submit() { if (!ready) return; addAthleteProposal({ type, title: title.trim(), message: message.trim() }); setTitle(""); setMessage(""); setType("Disponibilité"); } return <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4"><h4 className="mb-2 font-semibold">Faire une proposition au coach</h4><p className="mb-4 text-sm text-zinc-400">Propose une course, une contrainte, une indisponibilité ou une idée pour le {selectedDate.toLocaleDateString("fr-FR")}.</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Type de proposition"><Select value={type} onChange={(event) => setType(event.target.value)}>{["Disponibilité", "Indisponibilité", "Course à ajouter", "Demande de repos", "Contrainte horaire", "Autre"].map((row) => <option key={row}>{row}</option>)}</Select></Field><Field label="Titre"><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex : Course XCO / indisponible matin" /></Field></div><div className="mt-3"><Field label="Message au coach"><Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} placeholder="Explique ce que tu proposes ou ce que tu veux signaler." /></Field></div><Btn variant="primary" className={`mt-3 w-full sm:w-auto ${!ready ? "opacity-40" : ""}`} disabled={!ready} onClick={submit}>Envoyer la proposition</Btn></div>; }
function Proposal({ proposal, setProposals, programProposal, isCoach }) { const scheduled = proposal.status === "Programmée"; const setStatus = (status) => status === "Programmée" ? programProposal(proposal) : setProposals((items) => status === "Refusée" ? items.filter((row) => row.id !== proposal.id) : items.map((row) => row.id === proposal.id ? { ...row, status } : row)); return <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><Badge className={proposalStyle(proposal.status)}>{scheduled ? "Programmée" : "Proposition"}</Badge><h5 className="mt-2 font-bold">{proposal.type} — {proposal.title || "Sans titre"}</h5><p className="text-sm text-zinc-400">{proposal.date || "Date non précisée"} • {proposal.status}</p><p className="mt-2 text-sm text-zinc-300">{proposal.message}</p></div>{isCoach && !scheduled && <div className="flex gap-2"><Btn variant="primary" onClick={() => setStatus("Programmée")}>Programmer</Btn><Btn onClick={() => setStatus("Refusée")}>Refuser</Btn></div>}</div></div>; }
function Session({ session, cpData, updateFeedback, updateNonDone, updateSession, isCoach }) { const status = sessionStatus(session); const ready = feedbackReady(session.feedback); const changeFeedback = (field, value) => updateFeedback(session.id, field, value); const changeNonDone = (field, value) => updateNonDone(session.id, field, value); const patch = (fn) => updateSession((items) => items.map((item) => item.id === session.id ? fn(item) : item)); return <article className="rounded-3xl border border-zinc-700 bg-zinc-800 p-3 sm:p-5"><div className="flex flex-col gap-4 md:flex-row md:justify-between"><div><div className="text-sm text-zinc-400">{session.category} • {session.subcategory}</div><h4 className="text-xl font-bold sm:text-2xl">{session.title}</h4><p className="text-zinc-300">Durée : {session.totalDuration || "—"} • RPE attendu : {session.expectedRpe || "—"}</p></div><div className="flex flex-wrap gap-2"><span className={`${statusStyle[status]} rounded-xl px-3 py-2 text-sm font-bold`}>{statusLabel[status]}</span>{status === "awaitingAction" && <span className="rounded-xl bg-yellow-100 px-3 py-2 text-sm font-bold text-black">Retour à compléter</span>}{isCoach && <Btn
  onClick={async () => {
    await supabase
      .from("calendar_workouts")
      .delete()
      .eq("id", session.id);

    updateSession((items) => items.filter((item) => item.id !== session.id));
  }}
>
  Retirer
</Btn>}</div></div><p className="mt-4 rounded-2xl bg-zinc-900 p-4 text-zinc-300">{session.description || "Pas de description."}</p><div className="mt-4 space-y-3">{session.blocks.map((block, index) => <Block key={index} block={block} cpData={cpData} />)}</div><div className="mt-4 rounded-2xl bg-zinc-900 p-3 sm:p-5"><div className="mb-3"><div className="text-sm font-semibold text-zinc-300">Retour athlète après séance</div><p className="mt-1 text-xs text-zinc-500">Le temps réel de roulage, le RPE, la motivation, le plaisir et le commentaire valident la séance.</p></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4"><Field label="Temps réel de roulage"><Input value={session.feedback?.actualTime || ""} onChange={(event) => changeFeedback("actualTime", event.target.value)} placeholder="Ex : 1h25" /></Field><Field label="RPE ressenti /10"><Input value={session.feedback?.rpe || ""} onChange={(event) => changeFeedback("rpe", event.target.value)} placeholder="Ex : 7" /></Field><Field label="Motivation avant séance /10"><Input value={session.feedback?.motivation || ""} onChange={(event) => changeFeedback("motivation", event.target.value)} placeholder="Ex : 8" /></Field><Field label="Plaisir pris /5"><Input value={session.feedback?.pleasure || ""} onChange={(event) => changeFeedback("pleasure", event.target.value)} placeholder="Ex : 4" /></Field></div><div className="mt-4"><Field label="Commentaire libre (fatigue, douleur éventuelle, ressenti, etc.)"><Textarea value={session.feedback?.comment || ""} onChange={(event) => changeFeedback("comment", event.target.value)} rows={8} placeholder="Ex : fatigue 6/10, aucune douleur, bonnes sensations..." /></Field></div><div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><p className="text-sm text-zinc-400">{session.feedback?.validated ? "Séance validée et comptabilisée dans la fiche athlète." : ready ? "Retour complet : tu peux valider la séance réalisée." : "Complète tous les champs pour pouvoir valider la séance réalisée."}</p><Btn variant="primary" disabled={!ready || session.feedback?.validated} className={!ready || session.feedback?.validated ? "opacity-40" : ""} onClick={() => changeFeedback("validated", true)}>Valider séance réalisée</Btn></div></div>{status === "awaitingAction" && <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-4"><div className="mb-3 text-sm font-semibold text-zinc-300">Séance non faite</div><div
 className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3"><Field label="Raison"><Select value={session.nonDone?.reason || ""} onChange={(event) => changeNonDone("reason", event.target.value)}><option value="">Choisir</option>{["Malade", "Blessure", "Fatigue", "Repos", "Météo", "Imprévu"].map((reason) => <option key={reason}>{reason}</option>)}</Select></Field><Field label="Fatigue optionnelle"><Input value={session.nonDone?.fatigue || ""} onChange={(event) => changeNonDone("fatigue", event.target.value)} /></Field><Field label="Douleur optionnelle"><Input value={session.nonDone?.pain || ""} onChange={(event) => changeNonDone("pain", event.target.value)} /></Field></div><Field label="Commentaire optionnel"><Textarea value={session.nonDone?.comment || ""} onChange={(event) => changeNonDone("comment", event.target.value)} rows={3} /></Field><Btn
  variant="primary"
  className="mt-3"
  onClick={() => changeNonDone("validated", true)}
>
  Valider séance non faite
</Btn></div>}{status === "notDoneJustified" && (
  <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-300">
    <div className="font-semibold">
      Justification enregistrée : {session.nonDone?.reason}
    </div>

    {session.nonDone?.fatigue && (
      <div className="mt-1 text-zinc-400">
        Fatigue : {session.nonDone.fatigue}
      </div>
    )}

    {session.nonDone?.pain && (
      <div className="mt-1 text-zinc-400">
        Douleur : {session.nonDone.pain}
      </div>
    )}

    {session.nonDone?.comment && (
      <div className="mt-1 text-zinc-400">
        Commentaire : {session.nonDone.comment}
      </div>
    )}
  </div>
)}</article>; }
function Block({ block, cpData }) { const repeat = block.type === "repeat"; return <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><div className="font-bold">{block.name}</div><div className="text-sm text-zinc-400">{block.duration || "Durée non renseignée"}</div></div>{!repeat && <div className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-black">{block.zone} : {zoneWatts(block.zone, cpData)}</div>}</div>{!repeat && <p className="mt-3 text-sm text-zinc-300">{block.instruction || "Consignes non renseignées."}</p>}{repeat && <div className="mt-3 space-y-2">{block.repeatItems.map((repeatItem, index) => <div key={index} className="flex flex-col gap-2 rounded-xl bg-zinc-800 p-3 md:flex-row md:items-center md:justify-between"><div><div className="font-semibold">{repeatItem.name}</div><div className="text-sm text-zinc-400">{repeatItem.duration} — {repeatItem.instruction}</div></div><div className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-black">{repeatItem.zone} : {zoneWatts(repeatItem.zone, cpData)}</div></div>)}</div>}</div>; }
function QuickLibrary({ categories, subcategories, filter, setFilter, filteredLibrary, importWorkout }) { return <aside className="h-fit rounded-3xl border border-zinc-800 bg-zinc-900 p-3 shadow-xl sm:p-5"><h2 className="mb-2 text-xl font-semibold">Bibliothèque rapide</h2><p className="mb-4 text-sm text-zinc-400">Importer une séance sur le jour sélectionné.</p><FilterSelects {...{ categories, subcategories, filter, setFilter }} /><div className="space-y-3">{!filteredLibrary.length && <Empty text="Aucune séance." />}{filteredLibrary.map((workout) => <div key={workout.id} className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4"><h3 className="font-bold">{workout.title}</h3><p className="text-sm text-zinc-400">{workout.totalDuration || "Durée libre"} • {workout.blocks.length} bloc(s)</p><Btn variant="primary" onClick={() => importWorkout(workout)} className="mt-3 w-full">Importer ce jour</Btn></div>)}</div></aside>; }
function FilterSelects({ categories, subcategories, filter, setFilter }) { return <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2"><Select value={filter.category} onChange={(event) => setFilter({ ...filter, category: event.target.value })}>{categories.map((category) => <option key={category.id}>{category.name}</option>)}</Select><Select value={filter.subcategory} onChange={(event) => setFilter({ ...filter, subcategory: event.target.value })}>{subcategories.map((subcategory) => <option key={subcategory.id}>{subcategory.name}</option>)}</Select></div>; }
function CreatePage({ categories, subcategories, draft, editingId, updateDraft, updateBlock, updateRepeat, setDraft, saveWorkout, newCat, setNewCat, newSub, setNewSub, addItem }) { const addSimple = () => setDraft((current) => ({ ...current, blocks: [...current.blocks, simpleBlock(`Bloc ${current.blocks.length + 1}`)] })); const addRepeat = () => setDraft((current) => ({ ...current, blocks: [...current.blocks, repeatBlock(`Bloc répétition ${current.blocks.length + 1}`)] })); return <Panel><div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-2xl font-semibold">Ma création détaillée de séance</h2><p className="text-sm text-zinc-400">Outil commun : aucune sélection d’athlète ici.</p></div><Btn variant="primary" onClick={saveWorkout}>{editingId ? "Mettre à jour" : "Enregistrer dans la bibliothèque"}</Btn></div><div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"><Field label="Catégorie / discipline"><Select value={draft.category} onChange={(event) => updateDraft("category", event.target.value)}>{categories.map((category) => <option key={category.id}>{category.name}</option>)}</Select></Field><Field label="Sous-partie / contenu"><Select value={draft.subcategory} onChange={(event) => updateDraft("subcategory", event.target.value)}>{subcategories.map((subcategory) => <option key={subcategory.id}>{subcategory.name}</option>)}</Select></Field><Field label="Titre"><Input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} /></Field><Field label="Durée totale"><Input value={draft.totalDuration} onChange={(event) => updateDraft("totalDuration", event.target.value)} /></Field><Field label="RPE attendu"><Select value={draft.expectedRpe} onChange={(event) => updateDraft("expectedRpe", event.target.value)}><option value="">Choisir</option>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((number) => <option key={number}>{number}/10</option>)}</Select></Field><Field label="Description"><Textarea value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} rows={4} /></Field></div><div className="space-y-4"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-semibold">Blocs de séance</h3><div className="flex gap-2"><Btn onClick={addSimple}>+ Bloc simple</Btn><Btn onClick={addRepeat}>+ Bloc répétition</Btn></div></div>{draft.blocks.map((block, blockIndex) => <WorkoutBlock key={blockIndex} {...{ block, blockIndex, updateBlock, updateRepeat, setDraft }} />)}</div><QuickCreate {...{ newCat, setNewCat, newSub, setNewSub, addItem }} /></Panel>; }
function WorkoutBlock({ block, blockIndex, updateBlock, updateRepeat, setDraft }) { return <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4"><div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4"><Input value={block.name} onChange={(event) => updateBlock(blockIndex, "name", event.target.value)} /><Input value={block.duration} onChange={(event) => updateBlock(blockIndex, "duration", event.target.value)} className="md:col-span-2" /><Btn onClick={() => setDraft((current) => ({ ...current, blocks: current.blocks.filter((_, index) => index !== blockIndex) }))}>Supprimer</Btn></div>{block.type === "simple" ? <><Select value={block.zone} onChange={(event) => updateBlock(blockIndex, "zone", event.target.value)} className="mb-3 max-w-xs">{ZONES.map((zone) => <option key={zone}>{zone}</option>)}</Select><Textarea value={block.instruction} onChange={(event) => updateBlock(blockIndex, "instruction", event.target.value)} rows={3} /></> : <div className="space-y-3"><div className="flex items-center justify-between"><h4 className="font-semibold">Détail des étapes</h4><Btn onClick={() => setDraft((current) => ({ ...current, blocks: current.blocks.map((itemBlock, index) => index === blockIndex ? { ...itemBlock, repeatItems: [...itemBlock.repeatItems, { name: `Étape ${itemBlock.repeatItems.length + 1}`, duration: "", zone: "Z4", instruction: "" }] } : itemBlock) }))}>+ Étape</Btn></div>{block.repeatItems.map((repeatItem, repeatIndex) => <div key={repeatIndex} className="grid grid-cols-1 gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 p-3 sm:grid-cols-2 md:grid-cols-5"><Input value={repeatItem.name} onChange={(event) => updateRepeat(blockIndex, repeatIndex, "name", event.target.value)} /><Input value={repeatItem.duration} onChange={(event) => updateRepeat(blockIndex, repeatIndex, "duration", event.target.value)} /><Select value={repeatItem.zone} onChange={(event) => updateRepeat(blockIndex, repeatIndex, "zone", event.target.value)}>{ZONES.map((zone) => <option key={zone}>{zone}</option>)}</Select><Input value={repeatItem.instruction} onChange={(event) => updateRepeat(blockIndex, repeatIndex, "instruction", event.target.value)} /><Btn onClick={() => setDraft((current) => ({ ...current, blocks: current.blocks.map((itemBlock, index) => index === blockIndex ? { ...itemBlock, repeatItems: itemBlock.repeatItems.filter((_, rIndex) => rIndex !== repeatIndex) } : itemBlock) }))}>Supprimer</Btn></div>)}</div>}</div>; }
function QuickCreate({ newCat, setNewCat, newSub, setNewSub, addItem }) { return <div className="mt-8 rounded-2xl border border-zinc-700 bg-zinc-800 p-4"><h3 className="mb-3 text-base font-semibold">Gestion catégories & sous-parties</h3><div className="grid grid-cols-1 gap-3 xl:grid-cols-2"><QuickCreateCard title="Ajouter une catégorie" value={newCat} setValue={setNewCat} onAdd={() => addItem("cat")} /><QuickCreateCard title="Ajouter une sous-partie" value={newSub} setValue={setNewSub} onAdd={() => addItem("sub")} /></div></div>; }
function QuickCreateCard({ title, value, setValue, onAdd }) { return <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3"><div className="mb-2 text-sm font-semibold">{title}</div><div className="flex gap-2"><Input
 value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })} placeholder="Nom" /><ColorSelect value={value.color} onChange={(event) => setValue({ ...value, color: event.target.value })} className="max-w-28" /><Btn variant="primary" onClick={onAdd}>+</Btn></div></div>; }
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
function Editable({ title, items, setItems, kind, rename, removeItem }) { return <div className="rounded-3xl border border-zinc-700 bg-zinc-900 p-5"><h3 className="mb-4 text-xl font-bold">{title}</h3><div className="space-y-2">{items.map((row) => <div key={row.id} className="grid grid-cols-1 gap-2 rounded-2xl bg-zinc-800 p-3 md:grid-cols-4"><span className={`${row.color} rounded-xl px-3 py-2 text-center text-sm font-semibold`}>{row.name}</span><Input defaultValue={row.name} onBlur={(event) => rename(kind, row.id, event.target.value)} /><ColorSelect
  value={row.color}
  onChange={async (event) => {
    const color = event.target.value;
    const table = kind === "category"
      ? "workout_categories"
      : "workout_subcategories";

    await supabase
      .from(table)
      .update({ color })
      .eq("id", row.id);

    setItems(
      items.map((itemRow) =>
        itemRow.id === row.id ? { ...itemRow, color } : itemRow
      )
    );
  }}
/><Btn variant="danger" onClick={() => removeItem(kind, row.name)}>Supprimer</Btn></div>)}</div></div>; }
function AthletePage({ athleteActive, activeId, calendarYear, updateAthlete, cpData, stats, training, activeSessions, weekColors, setWeekColors }) { const a = athleteActive; return <div className="grid grid-cols-1 gap-6 xl:grid-cols-3"><Panel className="h-fit"><h2 className="mb-2 text-2xl font-semibold">Fiche de {a.name}</h2><div className="space-y-4">{[["Nom", "name"], ["Nom du calendrier", "calendarName"], ["Email", "email"], ["Âge", "age"], ["Taille", "height"], ["Poids", "weight"]].map(([label, key]) => <Field key={key} label={label}><Input value={a[key]} onChange={(event) => updateAthlete(key, event.target.value)} /></Field>)}</div></Panel><section className="space-y-6 xl:col-span-2"><Panel><h2 className="mb-4 text-2xl font-semibold">Objectifs et contexte</h2><div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">{[["Court terme", "shortGoal"], ["Moyen terme", "mediumGoal"], ["Long terme", "longGoal"]].map(([label, key]) => <Field key={key} label={label}><Textarea value={a[key]} onChange={(event) => updateAthlete(key, event.target.value)} rows={4} /></Field>)}</div><Field label="Contexte"><Textarea value={a.context} onChange={(event) => updateAthlete("context", event.target.value)} rows={5} /></Field></Panel><Stats stats={stats} training={training} sessions={activeSessions} athleteId={activeId} calendarYear={calendarYear} weekColors={weekColors} setWeekColors={setWeekColors} /><CP athlete={a} updateAthlete={updateAthlete} cpData={cpData} /><Panel><h2 className="mb-2 text-2xl font-semibold">Invitation individuelle</h2><p className="text-sm text-zinc-400">Lien prévu : https://ta-plateforme-coaching.fr/invitation/{a.inviteToken}</p><div className="mt-3 rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-sm"><div className="text-zinc-400">Code invitation</div><div className="mt-1 font-mono text-lg font-bold">{a.inviteToken}</div></div></Panel></section></div>; }
function Stats({ training, sessions, athleteId, calendarYear, weekColors, setWeekColors }) { const years = availableYears(sessions, calendarYear); const latestDone = [...sessions].filter((session) => feedbackDone(session.feedback)).sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())[0]; const latestInfo = latestDone ? weekInfoForYear(latestDone.date, parseLocalDate(latestDone.date).getFullYear()) : null; const latestKey = latestDone ? `${latestDone.id}-${latestDone.feedback?.validated}-${latestDone.date}` : ""; const [selectedYear, setSelectedYear] = useState(latestInfo?.year || calendarYear || training.year || years[0]); const [selectedWeek, setSelectedWeek] = useState(latestInfo?.label || "S1"); useEffect(() => { if (latestInfo) { setSelectedYear(latestInfo.year); setSelectedWeek(latestInfo.label); } }, [latestKey]); const activeYear = years.includes(Number(selectedYear)) ? Number(selectedYear) : years[0]; const yearTraining = trainingStats(sessions, activeYear); const yearDone = yearTraining.doneSessions || []; const yearStats = { rpe: avg(yearDone, "rpe"), motivation: avg(yearDone, "motivation"), pleasure: avg(yearDone, "pleasure") }; const week = yearTraining.weeks.find((row) => row.week === selectedWeek) || yearTraining.weeks[0]; const tagKey = `${athleteId}-${activeYear}-${selectedWeek}`; const selectedTag = weekColors[tagKey] || "Aucun"; const cards = [["Séances prévues", yearTraining.planned], ["Séances réalisées", yearTraining.done], ["Temps total", `${yearTraining.totals.time.toFixed(1)} h`], ["RPE moyen", yearStats.rpe], ["Motivation moyenne", yearStats.motivation], ["Plaisir moyen", yearStats.pleasure]]; function tagWeek(value) { setWeekColors((items) => { const next = { ...items }; if (value === "Aucun") delete next[tagKey]; else next[tagKey] = value; return next; }); } return <Panel><div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="text-2xl font-semibold">Statistiques entraînement de l’année</h2><p className="mt-1 text-sm text-zinc-400">Choisis une année, sélectionne une semaine, puis ajoute une couleur de planification.</p></div><div className="flex flex-col gap-2 md:flex-row md:items-center"><Btn onClick={() => { if (latestInfo) { setSelectedYear(latestInfo.year); setSelectedWeek(latestInfo.label); } }} className={!latestInfo ? "opacity-40" : ""} disabled={!latestInfo}>Dernière séance réalisée</Btn><Select value={activeYear} onChange={(event) => { setSelectedYear(Number(event.target.value)); setSelectedWeek("S1"); }} className="md:w-40">{years.map((year) => <option key={year} value={year}>{year}</option>)}</Select></div></div><div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">{cards.map(([label, value]) => <StatCard key={label} label={label} value={value} />)}</div><WeekPicker weeks={yearTraining.weeks} selectedWeek={selectedWeek} setSelectedWeek={setSelectedWeek} selectedYear={activeYear} athleteId={athleteId} weekColors={weekColors} /><WeekDetail
  week={week}
  selectedTag={selectedTag}
  tagWeek={tagWeek}
  athleteId={athleteId}
  activeYear={activeYear}
/></Panel>; }
function StatCard({ label, value }) { return <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-center"><div className="text-xs text-zinc-400">{label}</div><div className="text-2xl font-bold">{value}</div></div>; }
function WeekPicker({ weeks, selectedWeek, setSelectedWeek, selectedYear, athleteId, weekColors }) { return <div className="mt-6"><h3 className="mb-3 text-lg font-semibold">Semaines de l’année</h3><div className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-[repeat(13,minmax(0,1fr))]">{weeks.map((week) => { const tag = weekColors[`${athleteId}-${selectedYear}-${week.week}`]; const tagColor = weekLabels.find((row) => row.name === tag)?.color; const base = selectedWeek === week.week ? "border-white bg-white text-black" : week.sessions ? "border-zinc-600 bg-zinc-800 text-white" : "border-zinc-800 bg-zinc-900 text-zinc-500"; return <button key={week.week} onClick={() => setSelectedWeek(week.week)} className={`rounded-xl border px-2 py-2 text-sm font-semibold ${tagColor || base}`}><span className="block">{week.week}</span><span className="block text-[10px] font-normal opacity-80">{week.range}</span></button>; })}</div><div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">{weekLabels.filter((row) => row.name !== "Aucun").map((row) => <span key={row.name} className={`rounded-full border px-3 py-1 ${row.color}`}>{row.name}</span>)}</div></div>; }
function WeekDetail({ week, selectedTag, tagWeek, athleteId, activeYear }) { const details = [["Séances réalisées", week.sessions], ["Temps", `${week.time.toFixed(1)} h`], ["RPE moyen", trainingAverage(week.rpeSum, week.sessions)], ["Motivation moyenne", trainingAverage(week.motivationSum, week.sessions)], ["Plaisir moyen", trainingAverage(week.pleasureSum,
 week.sessions)]]; return <div className="mt-6 rounded-3xl border border-zinc-700 bg-zinc-800 p-5"><div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h3 className="text-2xl font-bold">Détail {week.week}</h3><p className="text-sm text-zinc-400">{week.range} • Résumé de la semaine sélectionnée.</p></div><Field label="Couleur / type de semaine"><Select
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
        { onConflict: "athlete_id,year,week" }
      );
  }}
  className="md:w-52"
>{weekLabels.map((row) => <option key={row.name} value={row.name}>{row.name}</option>)}</Select></Field></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">{details.map(([label, value]) => <StatCard key={label} label={label} value={value} />)}</div><div className="mt-5 rounded-2xl border border-zinc-700 bg-zinc-900 p-4"><h4 className="mb-3 font-semibold">Séances validées comptabilisées dans cette semaine</h4>{week.sessionsList?.length ? <div className="space-y-2">{week.sessionsList.map((session) => <div key={session.id} className="rounded-xl bg-zinc-800 p-3 text-sm"><div className="font-semibold">{dateKey(session.date)} — {session.title}</div><div className="text-zinc-400">{feedbackDone(session.feedback) ? (
  <>Temps : {session.feedback.actualTime} • RPE : {session.feedback.rpe} • Motivation : {session.feedback.motivation} • Plaisir : {session.feedback.pleasure}</>
) : (
  <>Non faite : {session.nonDone?.reason} {session.nonDone?.fatigue && `• Fatigue : ${session.nonDone.fatigue}`} {session.nonDone?.pain && `• Douleur : ${session.nonDone.pain}`}</>
)}</div></div>)}</div> : <div className="text-sm text-zinc-500">Aucune séance validée sur cette semaine.</div>}</div></div>; }
function CP({ athlete: a, updateAthlete, cpData }) { return <Panel><h2 className="mb-2 text-2xl font-semibold">Tests principaux — puissance critique</h2><div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">{[["5 min", "power5"], ["12 min", "power12"], ["20 min", "power20"], ["Poids", "weight"]].map(([label, key]) => <Field key={key} label={label}><Input value={a[key]} onChange={(event) => updateAthlete(key, event.target.value)} /></Field>)}</div>{cpData ? <><div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">{[["CP", `${cpData.cp} W`], ["W′", `${cpData.wPrime} J`], ["W/kg", cpData.wattsPerKg]].map(([label, value]) => <div key={label} className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-center"><div className="text-sm text-zinc-400">{label}</div><div className="text-3xl font-bold">{value}</div></div>)}</div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{cpData.zones.map((zone) => <div key={zone.id} className="flex justify-between rounded-2xl border border-zinc-700 bg-zinc-800 p-4"><span>{zone.id} — {zone.name}</span><b>{zoneWatts(zone.id, cpData)}</b></div>)}</div></> : <Empty text="Renseigne les tests pour générer les zones." />}</Panel>; }
function ManagementPage({ athletes, newAthlete, setNewAthlete, addAthlete, deleteAthlete }) { const [confirmDelete, setConfirmDelete] = useState(null); return <Panel><h2 className="mb-2 text-2xl font-semibold">Ma gestion des athlètes & calendriers</h2><p className="mb-5 text-sm text-zinc-400">Ajout ou suppression d’athlètes dans un espace séparé.</p><div className="grid grid-cols-1 gap-4 xl:grid-cols-2"><div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5"><h3 className="mb-3 text-lg font-semibold">Ajouter un athlète</h3><div className="flex flex-col gap-3 sm:flex-row"><Input value={newAthlete} onChange={(event) => setNewAthlete(event.target.value)} placeholder="Nom de l’athlète" /><Btn variant="primary" onClick={addAthlete}>+ Ajouter</Btn></div></div><div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5"><h3 className="mb-3 text-lg font-semibold">Supprimer un calendrier</h3><div className="space-y-3">{athletes.map((athleteItem) => <div key={athleteItem.id} className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4"><div className="flex items-center justify-between gap-3"><div><b>{athleteItem.name}</b><div className="text-xs text-zinc-500">{athleteItem.calendarName}</div></div><Btn variant="danger" onClick={() => setConfirmDelete(athleteItem.id)} className={athletes.length <= 1 ? "opacity-40" : ""} disabled={athletes.length <= 1}>Supprimer</Btn></div>{confirmDelete === athleteItem.id && <div className="mt-4 rounded-2xl border border-red-500 bg-zinc-950 p-4"><div className="text-sm text-zinc-300">Confirmer la suppression de <b>{athleteItem.name}</b> ? Cette action retirera son calendrier, ses propositions et ses données de séances.</div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Btn variant="danger" onClick={() => { deleteAthlete(athleteItem.id); setConfirmDelete(null); }}>Confirmer</Btn><Btn onClick={() => setConfirmDelete(null)}>Annuler</Btn></div></div>}</div>)}</div></div></div></Panel>; }
function DevChecks() { const future = calendarSession(defaultLibrary[0], addDays(new Date(), 2)); const awaiting = calendarSession(defaultLibrary[0], new Date()); const readyOnly = { ...awaiting, feedback: { ...awaiting.feedback, actualTime: "1h30", rpe: "7", motivation: "8", pleasure: "4", comment: "RAS" } }; const completed = { ...readyOnly, feedback: { ...readyOnly.feedback, validated: true } }; const justified = { ...awaiting, nonDone: { validated: true, reason: "Malade" } }; const checks = [["CP", Boolean(criticalPower(420, 360, 330, 70)?.cp)], ["Zone 7", criticalPower(420, 360, 330, 70)?.zones.length === 7], ["Temps converti", durationHours("1h30") === 1.5], ["Calendrier", monthDays(2026, 0).length >= 31], ["Proposition blanche", proposalStyle("Programmée") === "bg-white text-black"], ["Futur blanc", sessionStatus(future) === "planned"], ["Retour incomplet jaune", sessionStatus(awaiting) === "awaitingAction"], ["Retour complet non validé jaune", sessionStatus(readyOnly) === "awaitingAction"], ["Retour validé vert", sessionStatus(completed) === "done"], ["Non faite gris", sessionStatus(justified) === "notDoneJustified"], ["Stats semaines réelles", [52, 53].includes(trainingStats([completed], new Date().getFullYear()).weeks.length)], ["Années stats", availableYears([completed], 2029).includes(2029)], ["Années futures", availableYears([], 2045).includes(2045)], ["Stats temps", trainingStats([completed], new Date().getFullYear()).totals.time === 1.5], ["Stats synchronisées", trainingStats([completed], weekInfo(completed.date).year).done === 1], ["Stats calendrier 2029", trainingStats([{ ...completed, date: "2029-02-20" }], 2029).done === 1], ["Stats semaine 8", trainingStats([{ ...completed, date: "2029-02-20" }], 2029).weeks.find((week) => week.week === "S8")?.sessions === 1], ["Détail semaine complet", trainingStats([{ ...completed, date: "2029-04-18" }], 2029).weeks.find((week) => week.week === weekInfo("2029-04-18").label)?.time === 1.5], ["Liste séances semaine", trainingStats([{ ...completed, date: "2029-04-18" }], 2029).weeks.find((week) => week.week === weekInfo("2029-04-18").label)?.sessionsList?.length === 1], ["Couleurs semaines", weekLabels.length >= 8], ["Date locale", dateKey(new Date(2026, 0, 1)) === "2026-01-01"], ["Parse date locale", parseLocalDate("2029-02-20").getMonth() === 1], ["Semaine ISO", weekInfo(new Date(2026, 0, 1)).label === "S1"], ["Clé couleur athlete", `${"athlete-1"}-${2026}-${"S1"}` === "athlete-1-2026-S1"], ["Dates semaines réelles", trainingStats([completed], 2026).weeks[0].range === "29/12 - 04/01"], ["Semaine calendrier", weekInfo(new Date("2029-02-20")).label === "S8"], ["21 mai semaine 21", weekInfoForYear("2026-05-21", 2026).label === "S21"], ["21 mai dans plage", findWeekForDate("2026-05-21", 2026).range === "18/05 - 24/05"], ["Semaine 20 mai", trainingStats([{ ...completed, date: "2026-05-11" }], 2026).weeks.find((week) => week.week === "S20")?.sessions === 1], ["Temps semaine 20", trainingStats([{ ...completed, date: "2026-05-11" }], 2026).weeks.find((week) => week.week === "S20")?.time === 1.5], ["Liste semaine 20", trainingStats([{ ...completed, date: "2026-05-11" }], 2026).weeks.find((week) => week.week === "S20")?.sessionsList?.[0]?.id === completed.id], ["RPE semaine 20", trainingAverage(trainingStats([{ ...completed, date: "2026-05-11" }], 2026).weeks.find((week) => week.week === "S20")?.rpeSum, 1) === "7.0"], ["21 mai compté S21", trainingStats([{ ...completed, date: "2026-05-21" }], 2026).weeks.find((week) => week.week === "S21")?.sessions === 1], ["21 mai pas S20", trainingStats([{ ...completed, date: "2026-05-21" }], 2026).weeks.find((week) => week.week === "S20")?.sessions === 0], ["Token invitation", athlete("test", "Test").inviteToken === "invite-test"], ["Proposition session", proposalToSession({ id: "p1", type: "Course", title: "Test", date: "2026-05-21", message: "OK" }).sourceProposalId === "p1"]]; return <Panel className="text-sm text-zinc-400"><b className="text-white">Tests intégrés</b><div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">{checks.map(([label, ok]) => <div key={label}>{label} : {ok ? "OK" : "Erreur"}</div>)}</div></Panel>; }
