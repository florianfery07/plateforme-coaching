// @ts-nocheck
"use client";

import { useState } from "react";

const TABS = [
  { key: "about", label: "Comprendre", icon: "ℹ" },
  { key: "global", label: "RPE global", icon: "📊" },
  { key: "specific", label: "RPE spécifique", icon: "⚡" },
  { key: "motivation", label: "Motivation", icon: "🔥" },
  { key: "pleasure", label: "Plaisir", icon: "😊" },
];

function HelpButton({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[44px] flex-1 rounded-2xl border px-3 py-2 text-sm font-bold transition active:scale-95 sm:flex-none sm:px-4 sm:text-base ${
        active
          ? "border-white bg-white text-zinc-950 shadow-lg shadow-white/10"
          : "border-zinc-700 bg-zinc-800 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-700"
      }`}
    >
      <span className="flex items-center justify-center gap-2 whitespace-nowrap">
        <span>{icon}</span>
        <span>{label}</span>
      </span>
    </button>
  );
}

export default function RpeHelp() {
  const [open, setOpen] = useState("");

  const toggle = (value) =>
    setOpen((current) => (current === value ? "" : value));

  return (
    <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-zinc-100">
            Aide aux retours
          </div>
          <div className="text-xs text-zinc-500">
            Appuie sur une échelle pour afficher l&apos;explication.
          </div>
        </div>

        {open && (
          <button
            type="button"
            onClick={() => setOpen("")}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-zinc-800 active:scale-95"
          >
            Fermer
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {TABS.map((tab) => (
          <HelpButton
            key={tab.key}
            active={open === tab.key}
            icon={tab.icon}
            label={tab.label}
            onClick={() => toggle(tab.key)}
          />
        ))}
      </div>

      {open === "about" && (
        <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">
          <p>
            Le RPE sert à décrire le ressenti réel après une séance. Il n&apos;existe pas
            de bonne ou de mauvaise note.
          </p>

          <p className="mt-2">
            Le but n&apos;est pas de juger la séance, mais de comprendre comment le corps
            a réagi à l&apos;entraînement.
          </p>

          <p className="mt-2">
            Une même séance peut produire un RPE différent selon la fatigue,
            le sommeil, le stress, la récupération, la météo ou l&apos;état de forme.
          </p>

          <p className="mt-2">
            Soyez le plus honnête possible : ces retours servent directement aux
            indicateurs hebdomadaires.
          </p>
        </div>
      )}

      {open === "global" && (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-sm">
          <div className="mb-3 rounded-xl border border-blue-500/30 bg-blue-950/40 p-3 text-blue-100">
            <div className="mb-1 font-semibold">
              📊 À retenir
            </div>

            <div>
              Évaluez vos sensations sur l&apos;ensemble de la séance, surtout pendant les périodes faciles et hors intervalles : échauffement, récupération entre les efforts, endurance, retour au calme. Les efforts intenses ne doivent pas faire monter fortement le RPE global : leur difficulté est déjà exprimée dans le RPE spécifique.
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
        <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-sm">
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
        <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-sm">
          <div className="mb-3 rounded-xl border border-orange-500/30 bg-orange-950/20 p-3 text-orange-100">
            <div className="mb-1 font-semibold">
              🔥 À retenir
            </div>

            <div>
              Évaluez votre motivation avant la séance. Il n&apos;existe pas de bonne ou de mauvaise note. L&apos;objectif est simplement de décrire le plus fidèlement possible votre état d&apos;esprit avant l&apos;entraînement.
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
        <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-sm">
          <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-rose-100">
            <div className="mb-1 font-semibold">
              😊 À retenir
            </div>

            <div>
              Évaluez le plaisir que vous avez pris pendant la séance. Il n&apos;existe pas de bonne ou de mauvaise note. L&apos;objectif est simplement de décrire votre ressenti pendant l&apos;entraînement.
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
