// @ts-nocheck
"use client";

import { useState } from "react";

function PasswordInput({ value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex overflow-hidden rounded-2xl border border-zinc-300 bg-white">
      <input
        className="min-h-12 flex-1 px-4 text-base text-zinc-950 outline-none"
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />

      <button
        type="button"
        className="border-l border-zinc-300 px-3 text-sm font-semibold text-zinc-700"
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? "Masquer" : "Voir"}
      </button>
    </div>
  );
}

export default function AuthPage({
  athletes,
  loginCoach,
  loginAthlete,
  acceptInvite,
}) {
  const [coachEmail, setCoachEmail] = useState("");
  const [coachPassword, setCoachPassword] = useState("");
  const [athleteEmail, setAthleteEmail] = useState("");
  const [athletePassword, setAthletePassword] = useState("");
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  const inviteToken =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("invite")
      : "";

  const invitedAthlete = inviteToken
    ? athletes.find((row) => row.inviteToken === inviteToken)
    : null;

  async function submitCoach(event) {
    event.preventDefault();
    setError("");

    const ok = await loginCoach(coachEmail.trim(), coachPassword);

    if (!ok) {
      setError("Email ou mot de passe incorrect.");
    }
  }

  async function submitAthlete(event) {
    event.preventDefault();
    setError("");

    const ok = await loginAthlete(athleteEmail.trim(), athletePassword);

    if (!ok) {
      setError("Email ou mot de passe incorrect, ou compte athlète non lié.");
    }
  }

  async function submitInvite(event) {
    event.preventDefault();
    setInviteMessage("");

    if (!inviteToken) {
      setInviteMessage("Lien d’invitation invalide.");
      return;
    }

    if (!inviteEmail.trim() || !invitePassword.trim()) {
      setInviteMessage("Email et mot de passe obligatoires.");
      return;
    }

    const result = await acceptInvite(
      inviteToken,
      inviteEmail.trim(),
      invitePassword
    );

    if (!result.ok) {
      setInviteMessage(result.message);
      return;
    }

    setInviteMessage("Compte créé. Connexion en cours...");
  }

  if (inviteToken) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-950 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center">
          <section className="w-full rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="mb-6">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                MyRidePlan
              </p>

              <h1 className="text-2xl font-bold text-zinc-950">
                Invitation athlète
              </h1>

              {invitedAthlete ? (
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Crée ton compte pour accéder au calendrier de{" "}
                  <span className="font-semibold text-zinc-950">
                    {invitedAthlete.name}
                  </span>
                  .
                </p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-red-700">
                  Invitation introuvable. Vérifie que le lien est complet.
                </p>
              )}
            </div>

            {inviteMessage && (
              <div className="mb-4 rounded-2xl bg-zinc-100 p-3 text-sm font-medium text-zinc-800">
                {inviteMessage}
              </div>
            )}

            {invitedAthlete && (
              <form onSubmit={submitInvite} className="space-y-4">
                <input
                  className="min-h-12 w-full rounded-2xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none"
                  type="email"
                  placeholder="Email athlète"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />

                <PasswordInput
                  placeholder="Créer un mot de passe"
                  value={invitePassword}
                  onChange={(event) => setInvitePassword(event.target.value)}
                />

                <button
                  className="min-h-12 w-full rounded-2xl bg-zinc-950 px-4 text-base font-bold text-white"
                  type="submit"
                >
                  Créer mon compte athlète
                </button>
              </form>
            )}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-950 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center">
        <section className="w-full rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
          <div className="mb-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              MyRidePlan
            </p>

            <h1 className="text-2xl font-bold text-zinc-950">
              Connexion
            </h1>

            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Connecte-toi en tant que coach ou athlète.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl bg-red-100 p-3 text-sm font-semibold text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={submitCoach} className="space-y-4">
            <h2 className="text-lg font-bold text-zinc-950">
              Coach
            </h2>

            <input
              className="min-h-12 w-full rounded-2xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none"
              type="email"
              placeholder="Email coach"
              value={coachEmail}
              onChange={(event) => setCoachEmail(event.target.value)}
            />

            <PasswordInput
              placeholder="Mot de passe coach"
              value={coachPassword}
              onChange={(event) => setCoachPassword(event.target.value)}
            />

            <button
              className="min-h-12 w-full rounded-2xl bg-zinc-950 px-4 text-base font-bold text-white"
              type="submit"
            >
              Se connecter coach
            </button>
          </form>

          <div className="my-6 border-t border-zinc-200" />

          <form onSubmit={submitAthlete} className="space-y-4">
            <h2 className="text-lg font-bold text-zinc-950">
              Athlète
            </h2>

            <input
              className="min-h-12 w-full rounded-2xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none"
              type="email"
              placeholder="Email athlète"
              value={athleteEmail}
              onChange={(event) => setAthleteEmail(event.target.value)}
            />

            <PasswordInput
              placeholder="Mot de passe athlète"
              value={athletePassword}
              onChange={(event) => setAthletePassword(event.target.value)}
            />

            <button
              className="min-h-12 w-full rounded-2xl bg-zinc-950 px-4 text-base font-bold text-white"
              type="submit"
            >
              Se connecter athlète
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}