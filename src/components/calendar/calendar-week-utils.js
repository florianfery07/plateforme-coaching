import {
  addDays,
  dateKey,
  durationHours,
  feedbackDone,
  plannedSessionLoadParts,
  sessionLoadParts,
  weekInfo,
  weekStart,
} from "@/lib/trainingUtils";

export function formatHours(value) {
  if (!value) return "0h00";

  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);

  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

export function weekBounds(selectedDate) {
  const info = weekInfo(selectedDate);
  const start = weekStart(
    selectedDate.getFullYear(),
    Number(info.label.replace("S", "")) - 1,
  );

  return { info, start, end: addDays(start, 6) };
}

export function weekSessionsFor(sessions = [], start, end) {
  return sessions.filter((session) => {
    const key = session.date;
    return key >= dateKey(start) && key <= dateKey(end);
  });
}

export function computeWeekLoad(weekSessions = []) {
  const plannedTime = weekSessions.reduce(
    (sum, session) => sum + durationHours(session.totalDuration),
    0,
  );
  const doneSessions = weekSessions.filter((session) => feedbackDone(session.feedback));
  const realizedTime = doneSessions.reduce(
    (sum, session) => sum + durationHours(session.feedback?.actualTime),
    0,
  );
  const plannedLoad = weekSessions.reduce(
    (sum, session) => sum + plannedSessionLoadParts(session).totalLoad,
    0,
  );
  const realizedLoad = doneSessions.reduce(
    (sum, session) => sum + sessionLoadParts(session).totalLoad,
    0,
  );

  return { plannedTime, realizedTime, plannedLoad, realizedLoad };
}
