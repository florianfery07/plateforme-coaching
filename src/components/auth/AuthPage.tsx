// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useReliableMutation } from "@/hooks/use-reliable-mutation";
import { isFeatureEnabled } from "@/lib/features";

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

function invitationTokenFromLocation() {
  const queryToken = new URLSearchParams(window.location.search).get("invite");
  const fragmentToken = new URLSearchParams(window.location.hash.slice(1)).get("invite");
  return fragmentToken || queryToken || window.history.state?.athleteInviteToken || "";
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
  const [inviteToken, setInviteToken] = useState("");

  useEffect(() => {
    const synchronizeInvitation = () => {
      const token = invitationTokenFromLocation();
      if (!token) {
        setInviteToken("");
        return;
      }
      if (window.location.hash) {
        window.history.replaceState(
          { ...window.history.state, athleteInviteToken: token },
          "",
          `${window.location.pathname}${window.location.search}`,
        );
      }
      setInviteToken(token);
    };

    synchronizeInvitation();
    window.addEventListener("hashchange", synchronizeInvitation);
    return () => window.removeEventListener("hashchange", synchronizeInvitation);
  }, []);

  const isV2Invite = /^v2i_[0-9a-f]{64}$/.test(inviteToken || "");
  const v2InviteEnabled = isV2Invite
    && isFeatureEnabled("accessControlV2")
    && isFeatureEnabled("athleteInvitesV2");

  const invitedAthlete = inviteToken && !isV2Invite
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

    const mutation = await inviteMutation.mutate({
      token: inviteToken,
      email: inviteEmail.trim(),
      password: invitePassword,
    });
    const result = mutation.data;

    if (mutation.state !== "success" || !result?.ok) {
      setInviteMessage(result?.message || "Cette invitation est indisponible ou n’est plus valide.");
      return;
    }

    setInviteMessage("Compte créé. Connexion en cours...");
  }

  const inviteMutation = useReliableMutation({
    key: `athlete-invite-accept:${inviteToken || "none"}`,
    concurrency: "reject",
    type: "athlete-invite-v2-consume",
    operation: async (input) => acceptInvite(input.token, input.email, input.password),
  });

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

              {v2InviteEnabled ? (
                <p className="mt-2 text-sm leading-6 text-zinc-600">Crée ton compte pour activer ton accès athlète.</p>
              ) : invitedAthlete ? (
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Crée ton compte pour accéder au calendrier de{" "}
                  <span className="font-semibold text-zinc-950">
                    {invitedAthlete.name}
                  </span>
                  .
                </p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-red-700">
                  {isV2Invite ? "Ce pilote d’invitation sécurisée n’est pas disponible." : "Invitation introuvable. Vérifie que le lien est complet."}
                </p>
              )}
            </div>

            {inviteMessage && (
              <div className="mb-4 rounded-2xl bg-zinc-100 p-3 text-sm font-medium text-zinc-800">
                {inviteMessage}
              </div>
            )}

            {(invitedAthlete || v2InviteEnabled) && (
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
                  {inviteMutation.pending ? "Création..." : "Créer mon compte athlète"}
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
