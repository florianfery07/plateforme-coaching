"use client";

import { useCallback, useEffect, useState } from "react";

import { useReliableMutation } from "@/hooks/use-reliable-mutation";
import { loadAccessControlV2Context, resolveAccessControlMode } from "@/lib/access/access-control-v2";
import type { AccessContextRpcClient } from "@/lib/access/types";
import { isFeatureEnabled } from "@/lib/features";
import { createTypedSupabaseClient } from "@/lib/supabase-typed";
import {
  createAthleteInviteService,
  createAthleteInviteSupabaseRepository,
  type AthleteInviteSummary,
} from "@/services/athlete-invites";

type Props = { athleteId: string };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AthleteInviteV2Panel({ athleteId }: Props) {
  const enabled = isFeatureEnabled("accessControlV2") && isFeatureEnabled("athleteInvitesV2");
  const [coachMembershipId, setCoachMembershipId] = useState<string | null>(null);
  const [invites, setInvites] = useState<AthleteInviteSummary[]>([]);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const service = useCallback(() => createAthleteInviteService(createAthleteInviteSupabaseRepository(
    createTypedSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
  )), []);

  const refresh = useCallback(async (membershipId: string) => {
    const result = await service().list({ legacyAthleteId: athleteId, coachMembershipId: membershipId });
    if (result.kind === "success") setInvites(result.invites);
  }, [athleteId, service]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void (async () => {
      const client = createTypedSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const context = await loadAccessControlV2Context(client as unknown as AccessContextRpcClient, true);
      const membership = resolveAccessControlMode(context, true) === "v2"
        ? context?.memberships.find((candidate) => candidate.role === "coach" && candidate.status === "active")
        : undefined;
      if (!active || !membership) return;
      setCoachMembershipId(membership.id);
      await refresh(membership.id);
    })();
    return () => { active = false; };
  }, [enabled, refresh]);

  const createMutation = useReliableMutation({
    key: `athlete-invite-v2:create:${athleteId}`,
    concurrency: "reject" as const,
    type: "athlete-invite-v2-create",
    operation: async () => {
      if (!coachMembershipId) throw { kind: "permission" };
      const result = await service().create({ legacyAthleteId: athleteId, coachMembershipId });
      if (result.kind === "error") throw { kind: result.error };
      return result;
    },
    onSuccess: async (result) => {
      setGeneratedLink(`${window.location.origin}/#invite=${encodeURIComponent(result.token)}`);
      setMessage("Lien V2 créé. Copiez-le maintenant : le jeton ne sera plus affiché.");
      if (coachMembershipId) await refresh(coachMembershipId);
    },
  });

  const revokeMutation = useReliableMutation({
    key: `athlete-invite-v2:revoke:${athleteId}`,
    concurrency: "reject" as const,
    type: "athlete-invite-v2-revoke",
    operation: async (inviteId: string) => {
      if (!coachMembershipId) throw { kind: "permission" };
      const result = await service().revoke({ inviteId, coachMembershipId });
      if (result.kind === "error") throw { kind: result.error };
      return result;
    },
    onSuccess: async () => {
      setGeneratedLink(null);
      setMessage("Invitation V2 révoquée.");
      if (coachMembershipId) await refresh(coachMembershipId);
    },
  });

  if (!enabled || !coachMembershipId) return null;

  return (
    <div className="mt-6 rounded-2xl border border-emerald-700 bg-emerald-950/30 p-4">
      <h3 className="mb-2 text-lg font-semibold">Invitation sécurisée V2</h3>
      <p className="text-sm text-zinc-300">Pilote réversible : lien à usage unique, valable sept jours.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => void createMutation.mutate(undefined)} disabled={createMutation.pending || invites.some((invite) => invite.status === "active")}
          className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-bold text-emerald-950 disabled:cursor-not-allowed disabled:opacity-50">
          {createMutation.pending ? "Création..." : "Créer un lien sécurisé"}
        </button>
        {generatedLink && <button type="button" onClick={() => void navigator.clipboard.writeText(generatedLink).then(() => setMessage("Lien copié."), () => setMessage("Copie impossible : sélectionnez le lien."))}
          className="rounded-xl border border-emerald-500 px-3 py-2 text-sm font-bold text-emerald-100">Copier le lien</button>}
      </div>

      {generatedLink && <p className="mt-3 break-all rounded-xl bg-zinc-950 p-3 font-mono text-xs text-zinc-200">{generatedLink}</p>}
      {message && <p className="mt-3 text-sm text-emerald-200">{message}</p>}
      {createMutation.error && <p className="mt-3 text-sm text-red-300">{createMutation.error.message}</p>}
      {revokeMutation.error && <p className="mt-3 text-sm text-red-300">{revokeMutation.error.message}</p>}

      <div className="mt-4 space-y-2">
        {invites.map((invite) => (
          <div key={invite.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm">
            <span className="text-zinc-300">{invite.status === "active" ? `Expire le ${formatDate(invite.expiresAt)}` : `Statut : ${invite.status}`}</span>
            {invite.status === "active" && <button type="button" onClick={() => void revokeMutation.mutate(invite.id)} disabled={revokeMutation.pending}
              className="rounded-lg border border-red-400 px-2 py-1 text-xs font-bold text-red-200 disabled:opacity-50">Révoquer</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
