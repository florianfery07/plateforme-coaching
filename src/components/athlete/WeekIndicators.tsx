// @ts-nocheck
"use client";

import {
  durationHours,
  sessionLoadParts,
} from "@/lib/trainingUtils";

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function average(values) {
  const valid = values.filter(
    (value) => value !== null && value !== undefined
  );

  if (!valid.length) return null;

  return (
    valid.reduce((sum, value) => sum + value, 0) /
    valid.length
  );
}

function getSessionLoad(session) {
  const parts = sessionLoadParts(session);

  return (
    (parts.globalLoad || 0) +
    (parts.specificBonus || 0)
  );
}

function getSpecificTimeHours(session) {
  return durationHours(
    session.adjustedSpecificDuration ||
      session.expectedSpecificDuration ||
      ""
  );
}

function buildGeneralIndicator(week) {
  const sessions = week?.sessionsList || [];

  const rpeExpected = average(
    sessions.map((session) =>
      numberValue(
        session.expectedRpeGlobal ||
          session.expectedRpe
      )
    )
  );

  const rpeDone = average(
    sessions.map((session) =>
      numberValue(
        session.feedback?.rpeGlobal ||
          session.feedback?.rpe
      )
    )
  );

  const motivation = average(
    sessions.map((session) =>
      numberValue(session.feedback?.motivation)
    )
  );

  const pleasure = average(
    sessions.map((session) =>
      numberValue(session.feedback?.pleasure)
    )
  );

  const charge = sessions.reduce(
    (sum, session) => sum + getSessionLoad(session),
    0
  );

  const rpeDiff =
    rpeExpected !== null && rpeDone !== null
      ? rpeDone - rpeExpected
      : null;

  let status = {
    color: "bg-emerald-500",
    label: "Bien tolérée",
    emoji: "🟢",
    text: "La semaine semble bien encaissée.",
    explanation:
      "La difficulté ressentie reste proche de ce qui était prévu, avec une motivation et un plaisir corrects.",
  };

  if (!sessions.length) {
    status = {
      color: "bg-zinc-600",
      label: "Pas de données",
      emoji: "⚪",
      text: "Aucune séance réalisée sur cette semaine.",
      explanation:
        "Il n’y a pas encore assez de retours pour interpréter la tolérance de la semaine.",
    };
  } else if (
    (rpeDiff !== null && rpeDiff >= 3) ||
    (motivation !== null && motivation <= 3) ||
    (pleasure !== null && pleasure <= 2) ||
    ((rpeDiff !== null && rpeDiff >= 2) &&
      ((motivation !== null && motivation <= 4) ||
        (pleasure !== null && pleasure <= 3)))
  ) {
    status = {
      color: "bg-red-500",
      label: "Fatigue probable",
      emoji: "🔴",
      text: "La semaine semble mal tolérée.",
      explanation:
        "La difficulté ressentie dépasse fortement le prévu ou les indicateurs de ressenti sont très bas. Une récupération ou un allègement peut être à envisager.",
    };
  } else if (
    (rpeDiff !== null && rpeDiff >= 2) ||
    (motivation !== null &&
      motivation >= 4 &&
      motivation <= 6) ||
    (pleasure !== null && pleasure === 3)
  ) {
    status = {
      color: "bg-orange-500",
      label: "Vigilance",
      emoji: "🟠",
      text: "La semaine demande une surveillance.",
      explanation:
        "Un ou plusieurs signaux commencent à dériver : RPE plus haut que prévu, motivation moyenne ou plaisir limité.",
    };
  }

  return {
    ...status,
    details: [
      ["Charge", charge.toFixed(0)],
      [
        "RPE prévu",
        rpeExpected !== null
          ? rpeExpected.toFixed(1)
          : "—",
      ],
      [
        "RPE ressenti",
        rpeDone !== null ? rpeDone.toFixed(1) : "—",
      ],
      [
        "Écart RPE",
        rpeDiff !== null
          ? rpeDiff > 0
            ? `+${rpeDiff.toFixed(1)}`
            : rpeDiff.toFixed(1)
          : "—",
      ],
      [
        "Motivation",
        motivation !== null
          ? motivation.toFixed(1)
          : "—",
      ],
      [
        "Plaisir",
        pleasure !== null ? pleasure.toFixed(1) : "—",
      ],
    ],
  };
}

function buildSpecificIndicator(week) {
  const sessions = week?.sessionsList || [];

  const rows = sessions
    .map((session) => {
      const expected = numberValue(
        session.expectedRpeSpecific
      );

      const done = numberValue(
        session.feedback?.rpeSpecific
      );

      const specificHours =
        getSpecificTimeHours(session);

      const totalHours = durationHours(
        session.feedback?.actualTime
      );

      if (
        expected === null ||
        done === null ||
        !specificHours ||
        !totalHours
      ) {
        return null;
      }

      const sessionLoad = getSessionLoad(session);

      return {
        expected,
        done,
        specificHours,
        totalHours,
        specificMinutes: specificHours * 60,
        specificLoad:
          sessionLoad *
          Math.min(specificHours / totalHours, 1),
        diff: done - expected,
      };
    })
    .filter(Boolean);

  if (!rows.length) {
    return {
      color: "bg-zinc-600",
      label: "Pas assez de données",
      emoji: "⚪",
      text: "Aucun écart spécifique exploitable sur cette semaine.",
      explanation:
        "Il faut un RPE spécifique prévu, un RPE spécifique ressenti, une durée spécifique et un temps réel pour interpréter ce point.",
      details: [
        ["Temps spécifique", "—"],
        ["Charge spécifique", "—"],
        ["Part spécifique", "—"],
        ["Prévu", "—"],
        ["Réalisé", "—"],
        ["Écart", "—"],
      ],
    };
  }

  const totalSpecificMinutes = rows.reduce(
    (sum, row) => sum + row.specificMinutes,
    0
  );

  const totalSpecificLoad = rows.reduce(
    (sum, row) => sum + row.specificLoad,
    0
  );

  const totalWeekLoad = sessions.reduce(
    (sum, session) => sum + getSessionLoad(session),
    0
  );

  const expected =
    rows.reduce(
      (sum, row) =>
        sum + row.expected * row.specificMinutes,
      0
    ) / totalSpecificMinutes;

  const done =
    rows.reduce(
      (sum, row) =>
        sum + row.done * row.specificMinutes,
      0
    ) / totalSpecificMinutes;

  const diff = done - expected;

  const specificPercent =
    totalWeekLoad > 0
      ? (totalSpecificLoad / totalWeekLoad) * 100
      : 0;

  let status = {
    color: "bg-emerald-500",
    label: "Contenu conforme",
    emoji: "🟢",
    text: "La difficulté spécifique est conforme au plan.",
    explanation:
      "La difficulté ressentie sur les exercices reste proche de ce qui était prévu.",
  };

  if (diff <= -1.5) {
    status = {
      color: "bg-blue-500",
      label: "Trop facile",
      emoji: "🔵",
      text: "Les exercices semblent trop faciles.",
      explanation:
        "Le RPE spécifique réalisé est nettement inférieur au RPE spécifique prévu.",
    };
  } else if (diff >= 2.5) {
    status = {
      color: "bg-red-500",
      label: "Beaucoup plus difficile",
      emoji: "🔴",
      text: "Les exercices ont coûté beaucoup plus que prévu.",
      explanation:
        "Le RPE spécifique réalisé dépasse fortement le RPE spécifique prévu.",
    };
  } else if (diff >= 1) {
    status = {
      color: "bg-orange-500",
      label: "Plus difficile que prévu",
      emoji: "🟠",
      text: "Les exercices ont été plus difficiles que prévu.",
      explanation:
        "Le RPE spécifique réalisé est supérieur au RPE spécifique prévu.",
    };
  }

  return {
    ...status,
    details: [
      [
        "Temps spécifique",
        `${totalSpecificMinutes.toFixed(0)} min`,
      ],
      [
        "Charge spécifique",
        totalSpecificLoad.toFixed(0),
      ],
      [
        "Part spécifique",
        `${specificPercent.toFixed(0)} %`,
      ],
      ["Prévu", expected.toFixed(1)],
      ["Réalisé", done.toFixed(1)],
      [
        "Écart",
        diff > 0
          ? `+${diff.toFixed(1)}`
          : diff.toFixed(1),
      ],
    ],
  };
}

function IndicatorCard({ title, indicator }) {
  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="font-semibold text-white">
            {title}
          </h4>

          <p className="mt-1 text-sm text-zinc-400">
            {indicator.text}
          </p>
        </div>

        <div
          className={`${indicator.color} shrink-0 rounded-2xl px-3 py-2 text-sm font-bold text-white`}
        >
          {indicator.emoji} {indicator.label}
        </div>
      </div>

      <div className="mb-3 rounded-xl bg-zinc-800 p-3 text-sm text-zinc-300">
        {indicator.explanation}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {indicator.details.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl bg-zinc-800 p-3 text-sm"
          >
            <div className="text-xs text-zinc-400">
              {label}
            </div>

            <div className="mt-1 font-bold text-white">
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WeekIndicators({ week }) {
  const generalIndicator = buildGeneralIndicator(week);
  const specificIndicator = buildSpecificIndicator(week);

  return (
    <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <IndicatorCard
        title="Tolérance générale"
        indicator={generalIndicator}
      />

      <IndicatorCard
        title="Difficulté spécifique"
        indicator={specificIndicator}
      />
    </div>
  );
}