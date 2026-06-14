// @ts-nocheck

export function item(id: string, name: string, color: string) {
  return { id, name, color };
}

export function athlete(id, name, weight = "", power5 = "", power12 = "", power20 = "") {
  return {
    id,
    name,
    calendarName: `Calendrier de ${name}`,
    inviteToken: `invite-${id}`,
    email: "",
    age: "",
    height: "",
    weight,
    sport: "Vélo",
    shortGoal: "",
    mediumGoal: "",
    longGoal: "",
    context: "",
    power5,
    power12,
    power20,
  };
}

export function simpleBlock(name = "", duration = "", zone = "Z2", instruction = "") {
  return { type: "simple", name, duration, zone, instruction, repeatItems: [] };
}

export function repeatBlock(name = "") {
  return {
    type: "repeat",
    name,
    duration: "",
    zone: "Z4",
    instruction: "",
    repeatItems: [],
  };
}

export function blankWorkout() {
  return {
    category: "",
    subcategory: "",
    title: "",
    totalDuration: "",
    expectedRpe: "",
    expectedRpeGlobal: "",
    expectedSpecificDuration: "",
    expectedRpeSpecific: "",
    description: "",
    blocks: [],
  };
}

export function blankFeedback() {
  return {
    actualTime: "",
    rpe: "",
    rpeGlobal: "",
    rpeSpecific: "",
    motivation: "",
    pleasure: "",
    comment: "",
    validated: false,
  };
}

export function blankNonDone() {
  return {
    validated: false,
    reason: "",
    fatigue: "",
    pain: "",
    comment: "",
  };
}

export const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const ZONES = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6", "Z7"];

export const COLORS = [
  ["Bleu", "bg-blue-500"],
  ["Cyan", "bg-cyan-500"],
  ["Indigo", "bg-indigo-500"],

  ["Vert", "bg-emerald-500"],
  ["Lime", "bg-lime-500"],

  ["Jaune", "bg-yellow-500"],
  ["Ambre", "bg-amber-500"],
  ["Orange", "bg-orange-500"],

  ["Rouge", "bg-red-500"],

  ["Rose", "bg-rose-500"],
  ["Fuchsia", "bg-fuchsia-500"],
  ["Violet", "bg-purple-500"],

  ["Gris", "bg-zinc-500"],
];

export const CALENDAR_YEARS = Array.from(
  { length: 31 },
  (_, index) => new Date().getFullYear() - 5 + index
);

export const defaultCategories = [
  item("cat-route", "Route", "bg-blue-500"),
  item("cat-vtt", "VTT", "bg-emerald-500"),
  item("cat-cx", "Cyclo-cross", "bg-orange-500"),
  item("cat-home", "Home-trainer", "bg-purple-500"),
  item("cat-run", "Course à pied", "bg-rose-500"),
  item("cat-ppg", "Préparation physique", "bg-zinc-500"),
];

export const defaultSubcategories = [
  item("sub-endurance", "Endurance", "bg-blue-500"),
  item("sub-seuil", "Seuil", "bg-yellow-500"),
  item("sub-pma", "PMA", "bg-red-500"),
  item("sub-sprint", "Sprint", "bg-rose-500"),
  item("sub-force", "Force", "bg-orange-500"),
  item("sub-velocite", "Vélocité", "bg-cyan-500"),
  item("sub-technique", "Technique", "bg-emerald-500"),
  item("sub-recuperation", "Récupération", "bg-emerald-500"),
  item("sub-mobilite", "Mobilité", "bg-purple-500"),
  item("sub-renfo", "Renforcement", "bg-zinc-500"),
];

export const defaultAthletes = [
  athlete("athlete-1", "Athlète 1", "70", "420", "360", "330"),
  athlete("athlete-2", "Athlète 2", "65"),
  athlete("athlete-3", "Athlète 3"),
];

export const defaultLibrary = [
  {
    id: "workout-1",
    category: "Route",
    subcategory: "Endurance",
    title: "Endurance fondamentale progressive",
    totalDuration: "1h30",
    expectedRpe: "4/10",
    expectedRpeGlobal: "4/10",
    expectedSpecificDuration: "",
    expectedRpeSpecific: "",
    description: "Séance d’endurance avec progression légère en fin de sortie.",
    blocks: [
      simpleBlock("Échauffement", "20 min", "Z1", "Pédalage facile."),
      simpleBlock("Corps de séance", "55 min", "Z2", "Rester stable."),
      simpleBlock("Fin de séance", "15 min", "Z3", "Progressif sans se mettre dans le rouge."),
    ],
  },
];

export const statusStyle = {
  planned: "bg-white text-black",
  awaitingAction: "bg-yellow-400 text-black",
  done: "bg-emerald-500 text-white",
  notDoneJustified: "bg-zinc-700 text-white",
  rest: "bg-blue-500 text-white",
};

export const statusLabel = {
  planned: "Programmée",
  awaitingAction: "Action attendue",
  done: "Réalisée",
  notDoneJustified: "Non faite justifiée",
  rest: "Repos",
};

export const weekLabels = [
  { name: "Aucun", color: "" },
  { name: "Off", color: "bg-zinc-700 text-white border-zinc-500" },
  { name: "Maintien", color: "bg-blue-500 text-white border-blue-400" },
  { name: "Récup", color: "bg-emerald-500 text-white border-emerald-400" },
  { name: "Charge", color: "bg-yellow-500 text-black border-yellow-400" },
  { name: "Grosse charge", color: "bg-red-500 text-white border-red-400" },
  { name: "Affûtage", color: "bg-rose-500 text-white border-rose-400" },
  { name: "Affûtage / Course", color: "bg-purple-500 text-white border-purple-400" },
];