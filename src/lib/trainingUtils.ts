// @ts-nocheck

export function numberFromText(value) {
  return Number(String(value || "").replace(",", ".").match(/[0-9.]+/)?.[0] || 0);
}

export function hoursFromTime(value) {
  const parts = String(value || "").split(":").map(Number);
  if (parts.length === 3) return parts[0] + parts[1] / 60 + parts[2] / 3600;
  if (parts.length === 2) return parts[0] / 60 + parts[1] / 3600;
  return numberFromText(value);
}

export function durationHours(value) {
  const text = String(value || "").trim();
  if (text.includes(":")) return hoursFromTime(text);

  const parts = text.toLowerCase().split("h");
  const hours = parts.length > 1 ? numberFromText(parts[0]) : 0;
  const minutes = parts.length > 1 ? numberFromText(parts[1]) : numberFromText(text);

  return hours + (minutes ? minutes / 60 : 0);
}

export function rpeNumber(value) {
  return Number(String(value || "").replace("/10", "").replace(",", ".").match(/[0-9.]+/)?.[0] || 0);
}

export function rpeColorBucket(rpe) {
  const value = rpeNumber(rpe);

  if (value >= 9) return "red";
  if (value >= 5) return "yellow";
  if (value >= 1) return "green";

  return "none";
}

export function sessionLoadParts(session) {
  const duration = durationHours(session.feedback?.actualTime);
  const rpeGlobal = rpeNumber(session.feedback?.rpeGlobal || session.feedback?.rpe);
  const rpeSpecific = rpeNumber(session.feedback?.rpeSpecific);
  const specificDuration = durationHours(
  session.adjustedSpecificDuration || session.expectedSpecificDuration
);

  const globalLoad = duration * Math.pow(rpeGlobal, 2);

  const specificBonus =
    specificDuration *
    Math.max(0, Math.pow(rpeSpecific, 2) - Math.pow(rpeGlobal, 2));

  return {
    globalLoad,
    specificBonus,
    totalLoad: globalLoad + specificBonus,
    globalBucket: rpeColorBucket(rpeGlobal),
    specificBucket: rpeColorBucket(rpeSpecific),
  };
}

export function parseLocalDate(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const match = String(value || "").match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);

  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
}

export function dayStart(date) {
  const copy = parseLocalDate(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function dateKey(date) {
  if (!date) return "";

  const d = parseLocalDate(date);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function addDays(date, days) {
  const copy = parseLocalDate(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function monthDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const offset = (first.getDay() + 6) % 7;

  return [
    ...Array(offset).fill(null),
    ...Array.from({ length: last.getDate() }, (_, index) => new Date(year, month, index + 1)),
  ];
}

export function mondayOfWeek(date) {
  const day = dayStart(date);
  const offset = (day.getDay() + 6) % 7;
  return addDays(day, -offset);
}

export function firstMondayOfYear(year) {
  return mondayOfWeek(new Date(year, 0, 4));
}

export function weeksInYear(year) {
  const start = firstMondayOfYear(year);
  const next = firstMondayOfYear(year + 1);
  return Math.round((next.getTime() - start.getTime()) / 604800000);
}

export function shortDate(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

export function emptyTrainingValues() {
  return {
    time: 0,
    rpeSum: 0,
    motivationSum: 0,
    pleasureSum: 0,
    sessionsList: [],
  };
}

export function weekStart(year, weekIndex) {
  return addDays(firstMondayOfYear(Number(year)), weekIndex * 7);
}

export function weekObject(year, weekIndex) {
  const start = weekStart(year, weekIndex);
  const end = addDays(start, 6);

  return {
    week: `S${weekIndex + 1}`,
    start,
    end,
    range: `${shortDate(start)} - ${shortDate(end)}`,
    sessions: 0,
    ...emptyTrainingValues(),
  };
}

export function weeksOfYear(year) {
  return Array.from({ length: weeksInYear(Number(year)) }, (_, index) =>
    weekObject(Number(year), index)
  );
}

export function findWeekForDate(date, year) {
  const day = dayStart(parseLocalDate(date)).getTime();
  const weeks = weeksOfYear(year);

  return weeks.find((week) => day >= week.start.getTime() && day <= week.end.getTime()) || weeks[0];
}

export function weekInfoForYear(date, year) {
  const week = findWeekForDate(date, Number(year));

  return {
    year: Number(year),
    week: Number(week.week.replace("S", "")),
    label: week.week,
    range: week.range,
  };
}

export function weekInfo(date) {
  const day = parseLocalDate(date);
  return weekInfoForYear(day, day.getFullYear());
}

export function weekLabel(date) {
  return weekInfo(date).label;
}

export function weekRange(year, index) {
  return weekObject(Number(year), Math.floor(index / 7)).range;
}

export function feedbackReady(feedback = {}) {
  return Boolean(
    feedback.actualTime &&
      (feedback.rpeGlobal || feedback.rpe) &&
      feedback.rpeSpecific &&
      feedback.motivation &&
      feedback.pleasure &&
      feedback.comment
  );
}

export function feedbackDone(feedback = {}) {
  return Boolean(feedbackReady(feedback) && feedback.validated);
}

export function avg(list, key) {
  if (!list.length) return "—";

  return (
    list.reduce((sum, row) => sum + Number(row.feedback?.[key] || 0), 0) / list.length
  ).toFixed(1);
}

export function addTrainingValues(acc, session) {
  return {
    ...acc,
    time: acc.time + durationHours(session.feedback.actualTime),
    rpeSum: acc.rpeSum + Number(session.feedback.rpeGlobal || session.feedback.rpe || 0),
    motivationSum: acc.motivationSum + Number(session.feedback.motivation || 0),
    pleasureSum: acc.pleasureSum + Number(session.feedback.pleasure || 0),
    sessionsList: [...(acc.sessionsList || []), session],
  };
}

export function trainingAverage(sum, count) {
  return count ? (Number(sum || 0) / count).toFixed(1) : "—";
}

export function trainingStats(sessions, year = new Date().getFullYear()) {
  const yearSessions = sessions.filter(
    (session) => parseLocalDate(session.date).getFullYear() === Number(year)
  );

  const planned = yearSessions.length;

  const doneSessions = yearSessions.filter(
    (session) =>
      feedbackDone(session.feedback) ||
      (session.nonDone?.validated && session.nonDone?.reason)
  );

  const totals = doneSessions.reduce(
    (acc, session) => addTrainingValues(acc, session),
    emptyTrainingValues()
  );

  const byWeek = doneSessions.reduce((acc, session) => {
    const key = weekInfoForYear(session.date, year).label;

    acc[key] ||= {
      week: key,
      sessions: 0,
      ...emptyTrainingValues(),
    };

    acc[key].sessions += 1;
    acc[key] = addTrainingValues(acc[key], session);

    return acc;
  }, {});

  const weeks = weeksOfYear(Number(year)).map((week) => ({
    ...week,
    ...(byWeek[week.week] || {}),
  }));

  return {
    year: Number(year),
    planned,
    done: doneSessions.length,
    doneSessions,
    totals,
    weeks,
  };
}

export function criticalPower(power5, power12, power20, weight) {
  const p5 = +power5;
  const p12 = +power12;
  const p20 = +power20;
  const bodyWeight = +weight;

  if (!p5 || !p12 || !p20) return null;

  const points = [
    { t: 300, work: p5 * 300 },
    { t: 720, work: p12 * 720 },
    { t: 1200, work: p20 * 1200 },
  ];

  const n = points.length;
  const sumT = points.reduce((s, p) => s + p.t, 0);
  const sumW = points.reduce((s, p) => s + p.work, 0);
  const sumTW = points.reduce((s, p) => s + p.t * p.work, 0);
  const sumT2 = points.reduce((s, p) => s + p.t * p.t, 0);

  const cp = (n * sumTW - sumT * sumW) / (n * sumT2 - sumT * sumT);

  return {
    cp: Math.round(cp),
    wPrime: Math.round((sumW - cp * sumT) / n),
    wattsPerKg: bodyWeight ? (cp / bodyWeight).toFixed(2) : "—",
    zones: [
      { id: "Z1", name: "Récupération", min: 0, max: 0.55 },
      { id: "Z2", name: "Endurance", min: 0.56, max: 0.75 },
      { id: "Z3", name: "Tempo", min: 0.76, max: 0.9 },
      { id: "Z4", name: "Seuil / CP", min: 0.91, max: 1.05 },
      { id: "Z5", name: "VO2max", min: 1.06, max: 1.2 },
      { id: "Z6", name: "Anaérobie", min: 1.21, max: 1.5 },
      { id: "Z7", name: "Maximal", min: 1.51, max: null },
    ],
  };
}

export function zoneWatts(zoneId, cpData) {
  if (!cpData) return "Zones non renseignées";

  const z = cpData.zones.find((zone) => zone.id === zoneId);

  if (!z) return "—";
  if (z.max === null) return `> ${Math.round(cpData.cp * z.min)} W`;
  if (z.min === 0) return `< ${Math.round(cpData.cp * z.max)} W`;

  return `${Math.round(cpData.cp * z.min)} - ${Math.round(cpData.cp * z.max)} W`;
}

export function sessionStatus(session) {
  if (session.category?.toLowerCase() === "repos") return "rest";

  const future = dayStart(session.date) > dayStart(new Date());
  const justified = Boolean(session.nonDone?.validated && session.nonDone?.reason);

  if (future) return "planned";
  if (justified) return "notDoneJustified";
  if (feedbackDone(session.feedback)) return "done";

  return "awaitingAction";
}