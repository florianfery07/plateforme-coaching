// @ts-nocheck
"use client";

import { sessionLoadParts } from "@/lib/trainingUtils";

function rollingAverage(rows, index, size) {
  const start = Math.max(0, index - size + 1);
  const slice = rows.slice(start, index + 1);
  const sum = slice.reduce((total, row) => total + row.total, 0);
  return slice.length ? sum / slice.length : 0;
}

export default function AnnualLoadChart({ weeks }) {
  const rows = (weeks || []).map((week) => {
    const loads = (week.sessionsList || []).reduce(
      (acc, session) => {
        const parts = sessionLoadParts(session);

        if (parts.globalBucket === "green") acc.green += parts.globalLoad;
        if (parts.globalBucket === "yellow") acc.yellow += parts.globalLoad;
        if (parts.globalBucket === "red") acc.red += parts.globalLoad;

        if (parts.specificBucket === "green") acc.green += parts.specificBonus;
        if (parts.specificBucket === "yellow") acc.yellow += parts.specificBonus;
        if (parts.specificBucket === "red") acc.red += parts.specificBonus;

        return acc;
      },
      { green: 0, yellow: 0, red: 0 }
    );

    return {
      week: week.week,
      range: week.range,
      green: loads.green,
      yellow: loads.yellow,
      red: loads.red,
      total: loads.green + loads.yellow + loads.red,
    };
  });

  const computedRows = rows.map((row, index) => {
    const acute = rollingAverage(rows, index, 1);
    const chronic = rollingAverage(rows, index, 6);
    const form = chronic - acute;

    return {
      ...row,
      acute,
      chronic,
      form,
    };
  });

  const maxLoad = Math.max(
    ...computedRows.map((row) =>
      Math.max(row.total, row.acute, row.chronic)
    ),
    1
  );

  const minForm = Math.min(...computedRows.map((row) => row.form), 0);
  const maxForm = Math.max(...computedRows.map((row) => row.form), 0);
  const yTicks = 5;

  const width = 1100;
  const height = 360;
  const top = 30;
  const bottom = 46;
  const left = 60;
  const right = 60;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const barGap = 4;
  const barWidth = chartWidth / computedRows.length - barGap;

  function loadY(value) {
    return top + chartHeight - (value / maxLoad) * chartHeight;
  }

  function formY(value) {
    const range = Math.max(maxForm - minForm, 1);
    return top + chartHeight - ((value - minForm) / range) * chartHeight;
  }

  function x(index) {
    return left + index * (chartWidth / computedRows.length) + barGap / 2;
  }

  function linePath(key, mapper = loadY) {
    return computedRows
      .map((row, index) => {
        const pointX = x(index) + barWidth / 2;
        const pointY = mapper(row[key]);
        return `${index === 0 ? "M" : "L"} ${pointX} ${pointY}`;
      })
      .join(" ");
  }

  if (!computedRows.length) {
    return (
      <div className="mt-6 rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-sm text-zinc-400">
        Pas encore de données annuelles.
      </div>
    );
  }

  return (
    <section aria-labelledby="annual-load-chart-title" className="mt-6 rounded-3xl border border-zinc-700 bg-zinc-800 p-4 sm:p-5">
      <div className="mb-4">
        <h3 id="annual-load-chart-title" className="text-xl font-semibold">
          Charge annuelle, fatigue et forme
        </h3>

        <p className="text-sm text-zinc-400">
          Barres = charge réalisée par semaine. Courbes = fatigue aiguë, charge chronique et forme estimée.
        </p>
      </div>

      <p id="annual-load-chart-scroll-hint" className="mb-3 text-xs text-zinc-500 sm:hidden">Fais défiler le graphique horizontalement pour consulter toutes les semaines.</p>

      <div className="overflow-x-auto rounded-2xl focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-amber-400" tabIndex="0" aria-describedby="annual-load-chart-scroll-hint">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[780px] rounded-2xl bg-zinc-900"
          role="img"
          aria-labelledby="annual-load-chart-svg-title annual-load-chart-svg-description"
        >
          <title id="annual-load-chart-svg-title">Charge annuelle, fatigue et forme</title>
          <desc id="annual-load-chart-svg-description">Graphique hebdomadaire. Les barres montrent la charge réalisée par intensité. Les courbes montrent la fatigue aiguë, la charge chronique et la forme estimée.</desc>
          <text x={14} y={18} fontSize="11" fill="#a1a1aa">
            Charge
          </text>

          <text
            x={width - 16}
            y={18}
            textAnchor="end"
            fontSize="11"
            fill="#60a5fa"
          >
            Forme
          </text>

          <line
            x1={left}
            y1={top + chartHeight}
            x2={width - right}
            y2={top + chartHeight}
            stroke="#52525b"
            strokeWidth="1"
          />

          {Array.from({ length: yTicks + 1 }).map((_, index) => {
            const value = (maxLoad / yTicks) * (yTicks - index);
            const y = loadY(value);

            return (
              <g key={`load-${index}`}>
                <line
                  x1={left}
                  y1={y}
                  x2={width - right}
                  y2={y}
                  stroke="#27272a"
                  strokeWidth="1"
                />

                <text
                  x={left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#a1a1aa"
                >
                  {Math.round(value)}
                </text>
              </g>
            );
          })}

          {Array.from({ length: yTicks + 1 }).map((_, index) => {
            const value =
              maxForm -
              ((maxForm - minForm) / yTicks) * index;

            const y = formY(value);

            return (
              <text
                key={`form-${index}`}
                x={width - right + 8}
                y={y + 4}
                textAnchor="start"
                fontSize="10"
                fill="#60a5fa"
              >
                {Math.round(value)}
              </text>
            );
          })}

          {computedRows.map((row, index) => {
            const totalHeight = (row.total / maxLoad) * chartHeight;
            const greenHeight = row.total ? (row.green / row.total) * totalHeight : 0;
            const yellowHeight = row.total ? (row.yellow / row.total) * totalHeight : 0;
            const redHeight = row.total ? (row.red / row.total) * totalHeight : 0;

            const baseY = top + chartHeight;
            const barX = x(index);

            return (
              <g key={row.week}>
                <title>
                  {row.week} • {row.range} • charge {row.total.toFixed(1)} • aiguë {row.acute.toFixed(1)} • chronique {row.chronic.toFixed(1)} • forme {row.form.toFixed(1)}
                </title>

                <rect
                  x={barX}
                  y={baseY - greenHeight}
                  width={barWidth}
                  height={greenHeight}
                  fill="#10b981"
                  rx="2"
                />

                <rect
                  x={barX}
                  y={baseY - greenHeight - yellowHeight}
                  width={barWidth}
                  height={yellowHeight}
                  fill="#facc15"
                  rx="2"
                />

                <rect
                  x={barX}
                  y={baseY - greenHeight - yellowHeight - redHeight}
                  width={barWidth}
                  height={redHeight}
                  fill="#ef4444"
                  rx="2"
                />

                {(index % 2 === 0 || computedRows.length <= 26) && (
                  <text
                    x={barX + barWidth / 2}
                    y={height - 18}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#71717a"
                  >
                    {row.week.replace("S", "")}
                  </text>
                )}
              </g>
            );
          })}

          <path
            d={linePath("acute")}
            fill="none"
            stroke="#fb923c"
            strokeWidth="3"
          />

          <path
            d={linePath("chronic")}
            fill="none"
            stroke="#a1a1aa"
            strokeWidth="3"
          />

          <path
            d={linePath("form", formY)}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="3"
          />
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-400" aria-label="Légende du graphique">
        <span className="text-emerald-400">Vert = charge facile</span>
        <span className="text-yellow-300">Jaune = charge modérée</span>
        <span className="text-red-400">Rouge = charge élevée</span>
        <span className="text-orange-400">Orange = fatigue aiguë</span>
        <span className="text-zinc-300">Gris = charge chronique</span>
        <span className="text-blue-400">Bleu = forme estimée</span>
      </div>

      <details className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-950/50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">Consulter les données hebdomadaires</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-zinc-700 text-zinc-400">
              <tr><th className="py-2 pr-3">Semaine</th><th className="py-2 pr-3">Charge</th><th className="py-2 pr-3">Fatigue aiguë</th><th className="py-2 pr-3">Charge chronique</th><th className="py-2">Forme</th></tr>
            </thead>
            <tbody>
              {computedRows.map((row) => <tr key={`row-${row.week}`} className="border-b border-zinc-900 text-zinc-200"><td className="py-2 pr-3 font-medium">{row.week} <span className="text-zinc-500">{row.range}</span></td><td className="py-2 pr-3">{row.total.toFixed(1)}</td><td className="py-2 pr-3">{row.acute.toFixed(1)}</td><td className="py-2 pr-3">{row.chronic.toFixed(1)}</td><td className="py-2">{row.form.toFixed(1)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
