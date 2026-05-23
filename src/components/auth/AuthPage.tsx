// @ts-nocheck

import { useState } from "react";

export default function AuthPage({ athletes, loginCoach, loginAthlete, acceptInvite }) {
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

    const ok = await loginCoach(coachEmail, coachPassword);

    if (!ok) {
      setError("Email ou mot de passe incorrect");
    }
  }

  async function submitAthlete(event) {
    event.preventDefault();

    const ok = await loginAthlete(athleteEmail, athletePassword);

    if (!ok) {
      setError("Email ou mot de passe incorrect, ou compte athlète non lié.");
    }
  }

  async function submitInvite(event) {
    event.preventDefault();

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
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Invitation athlète</h1>

            {invitedAthlete ? (
              <p className="text-sm text-neutral-500">
                Créer le compte pour {invitedAthlete.name}
              </p>
            ) : (
              <p className="text-sm text-red-600">
                Invitation introuvable. Vérifie que le lien est complet.
              </p>
            )}
          </div>

          {inviteMessage && (
            <div className="bg-neutral-100 text-neutral-700 p-3 rounded-xl text-sm">
              {inviteMessage}
            </div>
          )}

          {invitedAthlete && (
            <form onSubmit={submitInvite} className="space-y-3">
              <input
                className="w-full border rounded-xl p-3"
                type="email"
                placeholder="Email athlète"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />

              <input
                className="w-full border rounded-xl p-3"
                type="password"
                placeholder="Créer un mot de passe (6 caractères minimum)"
                value={invitePassword}
                onChange={(event) => setInvitePassword(event.target.value)}
              />

              <button
                className="w-full bg-black text-white rounded-xl p-3"
                type="submit"
              >
                Créer mon compte athlète
              </button>
            </form>
          )}
        </div>
      </div>
    );
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