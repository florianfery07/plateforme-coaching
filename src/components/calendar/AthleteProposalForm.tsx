// @ts-nocheck
"use client";

import { useState } from "react";
import { Btn, Field, Input, Select, Textarea } from "@/components/ui/ui";

export default function AthleteProposalForm({
  selectedDate,
  addAthleteProposal,
}) {
  const [type, setType] = useState("Indisponibilité / demande de repos");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const ready = title.trim() && message.trim();

  function submit() {
    if (!ready) return;

    addAthleteProposal({
      type,
      title: title.trim(),
      message: message.trim(),
    });

    setTitle("");
    setMessage("");
    setType("Indisponibilité / demande de repos");
  }

  return (
    <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4">
      <h4 className="mb-2 font-semibold">Faire une proposition au coach</h4>

      <p className="mb-4 text-sm text-zinc-400">
        Propose une course, une contrainte, une indisponibilité ou une idée pour le{" "}
        {selectedDate.toLocaleDateString("fr-FR")}.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Type de proposition">
          <Select value={type} onChange={(event) => setType(event.target.value)}>
            {[
              "Indisponibilité / demande de repos",
              "Course à ajouter",
              "Contrainte horaire",
              "Autre",
            ].map((row) => (
              <option key={row}>{row}</option>
            ))}
          </Select>
        </Field>

        <Field label="Titre">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex : Course XCO / indisponible matin"
          />
        </Field>
      </div>

      <div className="mt-3">
        <Field label="Message au coach">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            placeholder="Explique ce que tu proposes ou ce que tu veux signaler."
          />
        </Field>
      </div>

      <Btn
        variant="primary"
        className={`mt-3 w-full sm:w-auto ${!ready ? "opacity-40" : ""}`}
        disabled={!ready}
        onClick={submit}
      >
        Envoyer la proposition
      </Btn>
    </div>
  );
}