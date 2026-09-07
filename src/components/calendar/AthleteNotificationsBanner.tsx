// @ts-nocheck
"use client";

import { useState } from "react";

import { feedbackV2Status, sessionStatus } from "@/lib/trainingUtils";
import { supabase } from "@/lib/supabase";

export default function AthleteNotificationsBanner({ onCompleteSession, sessions = [] }) {
  const [open, setOpen] = useState(false);
  const [seenSessionIds, setSeenSessionIds] = useState([]);

  const formatSessionDate = (value) => {
    if (!value) return "date inconnue";

    return new Date(value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const newSessions = sessions.filter((session) => {
    const isSeenLocally = seenSessionIds.includes(session.id);
    const isRest = String(session.category || "").toLowerCase() === "repos";

    return !isRest && !session.athleteSeenAt && !isSeenLocally;
  });

  const sessionsToComplete = sessions.filter((session) => {
    const isRest = String(session.category || "").toLowerCase() === "repos";
    if (isRest) return false;

    return onCompleteSession
      ? ["missing", "incomplete"].includes(feedbackV2Status(session))
      : sessionStatus(session) === "awaitingAction";
  });

  const count = newSessions.length + sessionsToComplete.length;

  if (!count) return null;

  const openNotifications = () => {
    setOpen((value) => !value);
  };

  const markSessionAsRead = async (sessionId) => {
    setSeenSessionIds((current) => [...new Set([...current, sessionId])]);

    const { error } = await supabase
      .from("calendar_workouts")
      .update({ athlete_seen_at: new Date().toISOString() })
      .eq("id", sessionId);

    if (error) {
      console.error("Erreur lecture notification séance", error);
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
      <button
        type="button"
        onClick={openNotifications}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <div className="font-bold text-white">
            Notifications ({count})
          </div>

          <p className="mt-1 text-sm text-zinc-400">
            {newSessions.length ? `${newSessions.length} nouvelle(s) séance(s)` : ""}
            {newSessions.length && sessionsToComplete.length ? " • " : ""}
            {sessionsToComplete.length ? `${sessionsToComplete.length} séance(s) à compléter` : ""}
          </p>
        </div>

        <span className="text-sm font-bold text-zinc-400">
          {open ? "▼" : "▶"}
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {newSessions.map((session) => (
            <div
              key={`new-${session.id}`}
              className="flex flex-col gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-100 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                Nouvelle séance ajoutée le {formatSessionDate(session.date)} :{" "}
                <b>{session.title || session.category || "Séance"}</b>
              </div>

              <button
                type="button"
                onClick={() => markSessionAsRead(session.id)}
                className="rounded-xl border border-blue-300/40 px-3 py-1 text-xs font-bold text-blue-100"
              >
                Marquer lu
              </button>
            </div>
          ))}

          {sessionsToComplete.map((session) => (
            <div
              key={`todo-${session.id}`}
              className="flex flex-col gap-2 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>Séance du {formatSessionDate(session.date)} à compléter : <b>{session.title || session.category || "Séance"}</b></div>
              {onCompleteSession && <button type="button" onClick={() => { setOpen(false); onCompleteSession(session); }} className="min-h-11 rounded-lg border border-yellow-300/40 px-3 py-2 text-xs font-bold text-yellow-100 transition hover:bg-yellow-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">Compléter</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
