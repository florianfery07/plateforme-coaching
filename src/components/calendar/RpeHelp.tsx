// @ts-nocheck
"use client";

import { useState } from "react";
import { Btn } from "@/components/ui/ui";

export default function RpeHelp() {
  const [open, setOpen] = useState("");

  const toggle = (value) =>
    setOpen((current) => (current === value ? "" : value));

  return (
    <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex flex-wrap gap-1">
        <Btn type="button" className="px-1.5 py-1 text-xs whitespace-nowrap" onClick={() => toggle("about")}>
          ℹ Comprendre le RPE
        </Btn>

        <Btn type="button" className="px-1.5 py-1 text-xs whitespace-nowrap" onClick={() => toggle("global")}>
          📊 RPE global
        </Btn>

        <Btn type="button" className="px-1.5 py-1 text-xs whitespace-nowrap" onClick={() => toggle("specific")}>
          ⚡ RPE spécifique
        </Btn>

        <Btn type="button" className="px-1.5 py-1 text-xs whitespace-nowrap" onClick={() => toggle("motivation")}>
          🔥 Motivation
        </Btn>

        <Btn type="button" className="px-1.5 py-1 text-xs whitespace-nowrap" onClick={() => toggle("pleasure")}>
          😊 Plaisir
        </Btn>
      </div>

      {open === "about" && (
        <div className="mt-3 text-sm text-zinc-300">
          <p>
            Le RPE sert à décrire le ressenti réel après une séance. Il n'existe pas
            de bonne ou de mauvaise note.
          </p>

          <p className="mt-2">
            Le but n'est pas de juger la séance, mais de comprendre comment le corps
            a réagi à l'entraînement.
          </p>

          <p className="mt-2">
            Une même séance peut produire un RPE différent selon la fatigue,
            le sommeil, le stress, la récupération, la météo ou l'état de forme.
          </p>

          <p className="mt-2">
            Soyez le plus honnête possible : ces retours servent directement aux
            indicateurs hebdomadaires.
          </p>
        </div>
      )}

      {open === "global" && (
        <div className="mt-3 overflow-x-auto text-sm">
          <div className="mb-3 rounded-xl border border-blue-500/30 bg-blue-950/40 p-3 text-blue-100">
            <div className="mb-1 font-semibold">
              📊 À retenir
            </div>

            <div>
              Évaluez vos sensations sur l'ensemble de la séance, surtout pendant les périodes faciles et hors intervalles : échauffement, récupération entre les efforts, endurance, retour au calme. Les efforts intenses ne doivent pas faire monter fortement le RPE global : leur difficulté est déjà exprimée dans le RPE spécifique.
            </div>
          </div>

          <table className="w-full border-collapse text-left">
            <tbody>
              {[
                ["1", "Très facile hors intervalles. Je me sens très frais sur les parties faciles."],
                ["2", "Facile. Les périodes faciles restent très confortables."],
                ["3", "Confortable. Je roule facilement entre les efforts."],
                ["4", "Légère fatigue générale, mais les parties faciles restent bien maîtrisées."],
                ["5", "Fatigue normale. Les récupérations et portions faciles demandent un peu d'attention."],
                ["6", "Fatigue présente. Les parties faciles ne sont plus totalement confortables."],
                ["7", "Fatigue marquée. Même hors efforts intenses, je sens une vraie lourdeur."],
                ["8", "Très fatigué globalement. Les récupérations ou portions faciles deviennent difficiles."],
                ["9", "Très forte fatigue générale. J'ai du mal à rester fluide hors intervalles."],
                ["10", "Extrêmement difficile même hors efforts intenses. Les parties faciles ne passent presque plus."],
              ].map(([score, text]) => (
                <tr key={score} className="border-t border-zinc-800">
                  <td className="w-12 py-2 font-bold text-white">{score}</td>
                  <td className="py-2 text-zinc-300">{text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open === "specific" && (
        <div className="mt-3 overflow-x-auto text-sm">
          <div className="mb-3 rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-3 text-yellow-100">
            <div className="mb-1 font-semibold">
              ⚡ À retenir
            </div>

            <div>
              Évaluez uniquement la difficulté des efforts ciblés : intervalles, PMA, seuil, course, spéciale, sprint, relances, etc. Ici, on note la difficulté des passages intenses, pas la fatigue globale de la séance.
            </div>
          </div>

          <table className="w-full border-collapse text-left">
            <tbody>
              {[
                ["1", "Efforts ciblés très faciles. Aucune contrainte particulière."],
                ["2", "Efforts faciles. Je reste très confortable."],
                ["3", "Efforts modérés. Je dois être attentif mais reste à l'aise."],
                ["4", "Efforts soutenus. Je travaille, mais je garde de la marge."],
                ["5", "Efforts difficiles. Je dois vraiment m'appliquer."],
                ["6", "Efforts difficiles et exigeants, mais encore bien maîtrisés."],
                ["7", "Efforts très difficiles. Forte concentration nécessaire pour tenir la cible."],
                ["8", "Efforts très engagés. Je serre les dents mais je reste dans le contrôle."],
                ["9", "Efforts quasi maximaux. Très peu de marge restante."],
                ["10", "Efforts maximaux. Je n'aurais pas pu produire plus sur ces passages."],
              ].map(([score, text]) => (
                <tr key={score} className="border-t border-zinc-800">
                  <td className="w-12 py-2 font-bold text-white">{score}</td>
                  <td className="py-2 text-zinc-300">{text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open === "motivation" && (
        <div className="mt-3 overflow-x-auto text-sm">
          <div className="mb-3 rounded-xl border border-orange-500/30 bg-orange-950/20 p-3 text-orange-100">
            <div className="mb-1 font-semibold">
              🔥 À retenir
            </div>

            <div>
              Évaluez votre motivation avant la séance.

              Il n'existe pas de bonne ou de mauvaise note. L'objectif est simplement de décrire le plus fidèlement possible votre état d'esprit avant l'entraînement.

              Soyez le plus honnête possible afin d'améliorer le suivi de votre entraînement.
            </div>
          </div>

          <table className="w-full border-collapse text-left">
            <tbody>
              {[
                ["10", "Très motivé. Grande envie de faire la séance."],
                ["9", "Très bonne motivation."],
                ["8", "Bonne motivation."],
                ["7", "Motivation normale. Prêt à m'entraîner."],
                ["6", "Légère baisse de motivation."],
                ["5", "Motivation moyenne. Je fais la séance sans grande envie."],
                ["4", "Difficulté à me mettre en route."],
                ["3", "Très peu motivé."],
                ["2", "Forte démotivation."],
                ["1", "Aucune envie de m'entraîner."],
              ].map(([score, text]) => (
                <tr key={score} className="border-t border-zinc-800">
                  <td className="w-12 py-2 font-bold text-white">{score}</td>
                  <td className="py-2 text-zinc-300">{text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open === "pleasure" && (
        <div className="mt-3 overflow-x-auto text-sm">
          <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-rose-100">
            <div className="mb-1 font-semibold">
              😊 À retenir
            </div>

            <div>
              Évaluez le plaisir que vous avez pris pendant la séance.

              Il n'existe pas de bonne ou de mauvaise note. L'objectif est simplement de décrire votre ressenti pendant l'entraînement.

              Soyez le plus honnête possible afin d'améliorer le suivi de votre entraînement.
            </div>
          </div>

          <table className="w-full border-collapse text-left">
            <tbody>
              {[
                ["5", "Beaucoup de plaisir. Séance très agréable."],
                ["4", "Séance agréable."],
                ["3", "Séance neutre. Ni agréable ni désagréable."],
                ["2", "Peu de plaisir."],
                ["1", "Aucun plaisir. Séance vécue négativement."],
              ].map(([score, text]) => (
                <tr key={score} className="border-t border-zinc-800">
                  <td className="w-12 py-2 font-bold text-white">{score}</td>
                  <td className="py-2 text-zinc-300">{text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}