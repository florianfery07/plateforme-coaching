// @ts-nocheck
"use client";

import { Badge, Btn } from "@/components/ui/ui";
import { proposalStyle } from "@/lib/proposalUtils";
import { supabase } from "@/lib/supabase";

export default function Proposal({
  proposal,
  setProposals,
  programProposal,
  isCoach,
}) {
  const scheduled = proposal.status === "Programmée";

  async function refuseProposal() {
    const { error } = await supabase
      .from("athlete_proposals")
      .update({ status: "Refusée" })
      .eq("id", proposal.id);

    if (error) {
      console.error("Erreur refus proposition", error);
      alert(error.message || "Erreur Supabase refus proposition");
      return;
    }

    setProposals((items) =>
      items.map((row) =>
        row.id === proposal.id
          ? { ...row, status: "Refusée" }
          : row
      )
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Badge className={proposalStyle(proposal.status)}>
            {scheduled ? "Programmée" : proposal.status}
          </Badge>

          <h5 className="mt-2 font-bold">
            {proposal.type} — {proposal.title || "Sans titre"}
          </h5>

          <p className="text-sm text-zinc-400">
            {proposal.date || "Date non précisée"} • {proposal.status}
          </p>

          <p className="mt-2 text-sm text-zinc-300">
            {proposal.message}
          </p>
        </div>

        {isCoach && proposal.status === "À traiter" && (
          <div className="flex gap-2">
            <Btn
              variant="primary"
              onClick={() => programProposal(proposal)}
            >
              Programmer
            </Btn>

            <Btn onClick={refuseProposal}>
              Refuser
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}