// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { feedbackDone, rpeNumber } from "@/lib/trainingUtils";

function average(list) {
  if (!list.length) return null;
  return list.reduce((sum, value) => sum + Number(value || 0), 0) / list.length;
}

function percentDelta(expected, actual) {
  const exp = Number(expected || 0);
  const act = Number(actual || 0);

  if (!exp || !act) return null;

  return ((act - exp) / exp) * 100;
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value)} %`;
}

function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

function categoryLabel(session) {
  return session.subcategory || session.category || "Séance";
}

function buildDetailByExpected(items, expectedKey, actualKey) {
  const grouped = {};

  items.forEach((item) => {
    const expected = rpeNumber(item[expectedKey]);
    const actual = rpeNumber(item[actualKey]);

    if (!expected || !actual) return;

    const key = String(expected);

    grouped[key] ||= [];
    grouped[key].push({ expected, actual });
  });

  return Object.entries(grouped)
    .map(([expected, rows]) => {
      const actualAverage = average(rows.map((row) => row.actual));
      const deltaAverage = average(
        rows.map((row) => percentDelta(row.expected, row.actual))
      );

      return {
        expected,
        count: rows.length,
        actualAverage,
        deltaAverage,
      };
    })
    .sort((a, b) => Number(a.expected) - Number(b.expected));
}

function buildBehaviorAnalysis(sessions = []) {
  const rows = sessions
    .filter((session) => feedbackDone(session.feedback))
    .map((session) => {
      const expectedGlobal = rpeNumber(
        session.expectedRpeGlobal || session.expectedRpe
      );
      const actualGlobal = rpeNumber(
        session.feedback?.rpeGlobal || session.feedback?.rpe
      );

      const expectedSpecific = rpeNumber(session.expectedRpeSpecific);
      const actualSpecific = rpeNumber(session.feedback?.rpeSpecific);

      return {
        label: categoryLabel(session),
        expectedGlobal,
        actualGlobal,
        expectedSpecific,
        actualSpecific,
        motivation: Number(session.feedback?.motivation || 0),
        pleasure: Number(session.feedback?.pleasure || 0),
      };
    })
    .filter((row) => row.expectedGlobal && row.actualGlobal);

  const grouped = {};

  rows.forEach((row) => {
    grouped[row.label] ||= [];
    grouped[row.label].push(row);
  });

  return Object.entries(grouped)
    .map(([label, items]) => {
      const globalDeltas = items
        .map((item) => percentDelta(item.expectedGlobal, item.actualGlobal))
        .filter((value) => value !== null);

      const specificDeltas = items
        .map((item) =>
          percentDelta(item.expectedSpecific, item.actualSpecific)
        )
        .filter((value) => value !== null);

      return {
        label,
        count: items.length,
        globalExpectedAverage: average(items.map((item) => item.expectedGlobal)),
        globalActualAverage: average(items.map((item) => item.actualGlobal)),
        globalDeltaAverage: average(globalDeltas),
        specificExpectedAverage: average(
          items
            .map((item) => item.expectedSpecific)
            .filter((value) => value > 0)
        ),
        specificActualAverage: average(
          items
            .map((item) => item.actualSpecific)
            .filter((value) => value > 0)
        ),
        specificDeltaAverage: average(specificDeltas),
        motivationAverage: average(
          items.map((item) => item.motivation).filter((value) => value > 0)
        ),
        pleasureAverage: average(
          items.map((item) => item.pleasure).filter((value) => value > 0)
        ),
        globalDetail: buildDetailByExpected(
          items,
          "expectedGlobal",
          "actualGlobal"
        ),
        specificDetail: buildDetailByExpected(
          items,
          "expectedSpecific",
          "actualSpecific"
        ),
      };
    })
    .filter((row) => row.count >= 2)
    .sort((a, b) => b.globalDeltaAverage - a.globalDeltaAverage);
}

function DetailTable({ title, rows }) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-400">
        Pas assez de données pour {title.toLowerCase()}.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-3">
      <h4 className="mb-2 text-sm font-bold text-zinc-200">{title}</h4>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.expected}
            className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-900 p-2 text-xs sm:grid-cols-4"
          >
            <div>
              <div className="text-zinc-500">Prévu</div>
              <div className="font-bold">RPE {row.expected}</div>
            </div>

            <div>
              <div className="text-zinc-500">Séances</div>
              <div className="font-bold">{row.count}</div>
            </div>

            <div>
              <div className="text-zinc-500">Réalisé</div>
              <div className="font-bold">{formatNumber(row.actualAverage)}</div>
            </div>

            <div>
              <div className="text-zinc-500">Écart</div>
              <div className="font-bold">{formatPercent(row.deltaAverage)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AthleteBehaviorAnalysis({ sessions = [] }) {
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(null);

  const analysis = useMemo(() => buildBehaviorAnalysis(sessions), [sessions]);

  const moreCostly = analysis
    .filter((row) => row.globalDeltaAverage > 0)
    .slice(0, 3);

  const lessCostly = [...analysis]
    .filter((row) => row.globalDeltaAverage < 0)
    .sort((a, b) => a.globalDeltaAverage - b.globalDeltaAverage)
    .slice(0, 3);

  const selected =
    analysis.find((row) => row.label === selectedLabel) || analysis[0];

  if (!analysis.length) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-sm text-zinc-400">
        Analyse comportement athlète disponible après plusieurs séances réalisées avec RPE prévu et RPE réalisé.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <div className="text-sm font-bold text-white">
            Analyse comportement athlète
          </div>

          <p className="mt-1 text-xs text-zinc-400">
            Comparaison entre le RPE prévu par le coach et le RPE réellement ressenti.
          </p>
        </div>

        <span className="text-sm font-bold text-zinc-400">
          {open ? "▼" : "▶"}
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3">
              <h4 className="mb-2 text-sm font-bold">
                Catégories qui coûtent plus que prévu
              </h4>

              <div className="space-y-2">
                {moreCostly.map((row) => (
                  <button
                    key={row.label}
                    type="button"
                    onClick={() => setSelectedLabel(row.label)}
                    className="flex w-full justify-between rounded-lg bg-zinc-800 px-3 py-2 text-left text-sm"
                  >
                    <span>{row.label}</span>
                    <b>{formatPercent(row.globalDeltaAverage)}</b>
                  </button>
                ))}

                {!moreCostly.length && (
                  <p className="text-sm text-zinc-500">
                    Aucune catégorie clairement plus coûteuse.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3">
              <h4 className="mb-2 text-sm font-bold">
                Catégories qui coûtent moins que prévu
              </h4>

              <div className="space-y-2">
                {lessCostly.map((row) => (
                  <button
                    key={row.label}
                    type="button"
                    onClick={() => setSelectedLabel(row.label)}
                    className="flex w-full justify-between rounded-lg bg-zinc-800 px-3 py-2 text-left text-sm"
                  >
                    <span>{row.label}</span>
                    <b>{formatPercent(row.globalDeltaAverage)}</b>
                  </button>
                ))}

                {!lessCostly.length && (
                  <p className="text-sm text-zinc-500">
                    Aucune catégorie clairement moins coûteuse.
                  </p>
                )}
              </div>
            </div>
          </div>

          {selected && (
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3">
              <div className="mb-3">
                <h3 className="text-lg font-bold">{selected.label}</h3>
                <p className="text-sm text-zinc-400">
                  {selected.count} séances similaires
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                <div className="rounded-xl bg-zinc-800 p-3">
                  <div className="text-xs text-zinc-500">RPE global prévu</div>
                  <div className="font-bold">
                    {formatNumber(selected.globalExpectedAverage)}
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-800 p-3">
                  <div className="text-xs text-zinc-500">RPE global réalisé</div>
                  <div className="font-bold">
                    {formatNumber(selected.globalActualAverage)}
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-800 p-3">
                  <div className="text-xs text-zinc-500">Motivation moyenne</div>
                  <div className="font-bold">
                    {formatNumber(selected.motivationAverage)} / 10
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-800 p-3">
                  <div className="text-xs text-zinc-500">Plaisir moyen</div>
                  <div className="font-bold">
                    {formatNumber(selected.pleasureAverage)} / 5
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100">
                Cette catégorie coûte généralement{" "}
                <b>{formatPercent(selected.globalDeltaAverage)}</b> par rapport à l&apos;attendu.
              </div>

              {selected.pleasureAverage !== null &&
                selected.pleasureAverage <= 2.5 && (
                  <div className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                    Faible adhésion à ce type d&apos;entraînement.
                  </div>
                )}

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                <DetailTable
                  title="Détail RPE global par RPE prévu"
                  rows={selected.globalDetail}
                />

                <DetailTable
                  title="Détail RPE spécifique par RPE prévu"
                  rows={selected.specificDetail}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
