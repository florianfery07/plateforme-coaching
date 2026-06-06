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
      <div className="flex flex-wrap gap-2">
        <Btn
          type="button"
          className="px-3 py-1 text-xs"
          onClick={() => toggle("about")}
        >
          ℹ Comprendre le RPE
        </Btn>

        <Btn
          type="button"
          className="px-3 py-1 text-xs"
          onClick={() => toggle("global")}
        >
          📊 Échelle RPE global
        </Btn>

        <Btn
          type="button"
          className="px-3 py-1 text-xs"
          onClick={() => toggle("specific")}
        >
          ⚡ Échelle RPE spécifique
        </Btn>
      </div>

      {open === "about" && (
        <div className="mt-3 text-sm text-zinc-300">
          <p>
            Le RPE (Ressenti Personnel d'Effort) sert à décrire votre ressenti
            réel après une séance.
          </p>

          <p className="mt-2">
            Il n'existe pas de bonne ou de mauvaise note.
          </p>

          <p className="mt-2">
            Le but n'est pas de juger la qualité de la séance mais de permettre
            de comprendre comment votre corps a réagi à l'entraînement.
          </p>
          
          <p className="mt-2">
          Une même séance peut produire un RPE différent d'un jour à l'autre.
          </p>

          <p className="mt-2">
          Cette différence peut être influencée par :
          </p>

          <ul className="mt-2 list-disc pl-5">
            <li>fatigue accumulée ;</li>
            <li>sommeil ;</li>
            <li>stress ;</li>
            <li>récupération ;</li>
            <li>conditions météo ;</li>
            <li>état de forme du moment.</li>
          </ul>

          <p className="mt-2">
            Soyez le plus honnête possible afin d'améliorer le suivi de votre
            entraînement.
          </p>
        </div>
      )}

      {open === "global" && (
        <div className="mt-3 overflow-x-auto text-sm">
          <div className="mb-3 rounded-xl border border-blue-500/30 bg-blue-950/40 p-3 text-sm text-blue-100">
          <div className="mb-1 font-semibold">
            📊 À retenir
          </div>

         <div>
            Évaluez la difficulté de l'ensemble de la séance.
            Les exercices difficiles comptent, mais le RPE global doit principalement refléter votre ressenti sur le reste de la séance et sur la totalité du temps passé à l'entraînement.
           </div>
          </div>

          <table className="w-full border-collapse text-left">
            <tbody>
              {[
                ["1", "Très facile. Sortie récupération."],
                ["2", "Facile. Aucune fatigue particulière."],
                ["3", "Endurance confortable. Je termine frais."],
                ["4", "Bonne séance d'endurance. Je suis un peu fatigué mais prêt à m'entraîner normalement demain."],
                ["5", "Séance engagée. J'ai réellement travaillé."],
                ["6", "Séance difficile. Je sens que j'ai fait une vraie séance de qualité et que la récupération va compter."],
                ["7", "Très bonne séance de travail. Fatigue importante mais normale."],
                ["8", "Très difficile. Grosse sollicitation physique."],
                ["9", "Exceptionnellement difficile. J'ai approché mes limites."],
                ["10", "Maximum du jour. Impossible d'aller plus loin."],
              ].map(([rpe, text]) => (
                <tr key={rpe} className="border-t border-zinc-800">
                  <td className="w-12 py-2 font-bold text-white">{rpe}</td>
                  <td className="py-2 text-zinc-300">{text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open === "specific" && (
        <div className="mt-3 overflow-x-auto text-sm">
          <div className="mb-3 rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-3 text-sm text-yellow-100">
         <div className="mb-1 font-semibold">
          ⚡ À retenir
          </div>

          <div>
            Évaluez uniquement la difficulté des passages intenses
           (intervalles, PMA, seuil, course, spéciale, etc.).
          </div>
         </div>

          <table className="w-full border-collapse text-left">
            <tbody>
              {[
                ["1", "Très facile. Aucune difficulté particulière."],
                ["2", "Facile. Effort léger et confortable."],
                ["3", "Modéré. Je dois me concentrer mais reste très à l'aise."],
                ["4", "Soutenu. L'effort est présent mais reste confortable."],
                ["5", "Difficile. Je dois produire un vrai effort pour maintenir le niveau demandé."],
                ["6", "Difficile. L'effort demande un engagement important mais reste maîtrisé."],
                ["7", "Très difficile. J'ai dû bien me concentrer pour maintenir l'effort et réussir ce qui était demandé."],
                ["8", "Effort très engagé. J'ai dû serrer les dents pour réussir les passages concernés, mais l'effort est resté maîtrisé."],
                ["9", "Quasi maximal. J'ai l'impression d'avoir utilisé presque toutes mes capacités sur ces passages."],
                ["10", "Maximum absolu. Je n'aurais pas pu faire mieux ou plus fort aujourd'hui."],
              ].map(([rpe, text]) => (
                <tr key={rpe} className="border-t border-zinc-800">
                  <td className="w-12 py-2 font-bold text-white">{rpe}</td>
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