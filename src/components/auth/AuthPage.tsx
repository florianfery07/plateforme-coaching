// @ts-nocheck

import {
  Btn,
  Field,
  Input,
  Panel,
} from "@/components/ui/ui";

export default function AuthPage({
  authMode,
  setAuthMode,
  coachEmail,
  setCoachEmail,
  coachPassword,
  setCoachPassword,
  athleteEmail,
  setAthleteEmail,
  athletePassword,
  setAthletePassword,
  inviteToken,
  setInviteToken,
  authError,
  loginCoach,
  loginAthlete,
  acceptInvite,
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Panel className="w-full space-y-5">
        <div className="space-y-1 text-center">
          <h1 className="text-3xl font-black tracking-tight">
            MyRide
          </h1>

          <p className="text-sm text-zinc-400">
            Plateforme de coaching
          </p>
        </div>

        <div className="flex gap-2">
          <Btn
            className="flex-1"
            variant={authMode === "coach" ? "primary" : "secondary"}
            onClick={() => setAuthMode("coach")}
          >
            Coach
          </Btn>

          <Btn
            className="flex-1"
            variant={authMode === "athlete" ? "primary" : "secondary"}
            onClick={() => setAuthMode("athlete")}
          >
            Athlète
          </Btn>
        </div>

        {authMode === "coach" ? (
          <div className="space-y-4">
            <Field label="Email">
              <Input
                type="email"
                value={coachEmail}
                onChange={(e) => setCoachEmail(e.target.value)}
              />
            </Field>

            <Field label="Mot de passe">
              <Input
                type="password"
                value={coachPassword}
                onChange={(e) => setCoachPassword(e.target.value)}
              />
            </Field>

            <Btn
              className="w-full"
              variant="primary"
              onClick={loginCoach}
            >
              Connexion coach
            </Btn>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Email">
              <Input
                type="email"
                value={athleteEmail}
                onChange={(e) => setAthleteEmail(e.target.value)}
              />
            </Field>

            <Field label="Mot de passe">
              <Input
                type="password"
                value={athletePassword}
                onChange={(e) => setAthletePassword(e.target.value)}
              />
            </Field>

            <Btn
              className="w-full"
              variant="primary"
              onClick={loginAthlete}
            >
              Connexion athlète
            </Btn>

            <div className="border-t border-zinc-800 pt-4">
              <Field label="Code invitation">
                <Input
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                />
              </Field>

              <Btn
                className="mt-4 w-full"
                variant="secondary"
                onClick={acceptInvite}
              >
                Accepter une invitation
              </Btn>
            </div>
          </div>
        )}

        {authError ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {authError}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}