// @ts-nocheck
"use client";

import { getColorHex, getFallbackColorHex } from "@/lib/colors";
import { durationHours, sessionLoadParts } from "@/lib/trainingUtils";

function colorForName(name, items, index) {
  const item = (items || []).find(
    (row) => row.name?.trim().toLowerCase() === name?.trim().toLowerCase()
  );

  return item?.color ? getColorHex(item.color) : getFallbackColorHex(index);
}

function buildDistribution(sessions, field, items) {
  const totalTime = sessions.reduce(
    (sum, session) => sum + durationHours(session.feedback?.actualTime),
    0
  );

  const rows = Object.values(
    sessions.reduce((acc, session) => {
      const name = session[field] || "Non renseigné";
      const time = durationHours(session.feedback?.actualTime);
      const load = sessionLoadParts(session).totalLoad;

      acc[name] ||= {
        name,
        sessions: 0,
        time: 0,
        load: 0,
      };

      acc[name].sessions += 1;
      acc[name].time += time;
      acc[name].load += load;

      return acc;
    }, {})
  )
    .map((row, index) => ({
      ...row,
      percent: totalTime ? (row.time / totalTime) * 100 : 0,
      loadPerHour: row.time ? row.load / row.time : 0,
      color: colorForName(row.name, items, index),
    }))
    .sort((a, b) => b.time - a.time);

  return rows;
}

function PieChart({ rows, labelId, descriptionId }) {
  const total = rows.reduce((sum, row) => sum + row.time, 0);
  const chartRows = rows.map((row, index) => {
    const value = total ? (row.time / total) * 100 : 0;
    const previous = rows
      .slice(0, index)
      .reduce((sum, previousRow) => sum + (previousRow.time / total) * 100, 0);

    return { ...row, value, offset: 25 - previous };
  });

  if (!rows.length || !total) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl bg-zinc-900 text-sm text-zinc-500">
        Pas encore de données.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center rounded-2xl bg-zinc-900 p-4">
      <svg viewBox="0 0 42 42" className="h-48 w-48" role="img" aria-labelledby={`${labelId} ${descriptionId}`}>
        <title id={labelId}>Répartition du temps réalisé</title>
        <desc id={descriptionId}>La répartition détaillée est disponible juste après le graphique.</desc>
        <circle
          cx="21"
          cy="21"
          r="15.915"
          fill="transparent"
          stroke="#27272a"
          strokeWidth="10"
        />

        {chartRows.map((row) => {
          const dash = `${row.value} ${100 - row.value}`;

          return (
            <circle
              key={row.name}
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke={row.color}
              strokeWidth="10"
              strokeDasharray={dash}
              strokeDashoffset={row.offset}
            >
              <title>
                {row.name} • {row.percent.toFixed(1)} %
              </title>
            </circle>
          );
        })}

        <text
          x="21"
          y="20"
          textAnchor="middle"
          fontSize="4"
          fill="white"
          fontWeight="700"
        >
          Temps
        </text>

        <text
          x="21"
          y="25"
          textAnchor="middle"
          fontSize="3"
          fill="#a1a1aa"
        >
          réalisé
        </text>
      </svg>
    </div>
  );
}

function DistributionBlock({ title, rows }) {
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
      <h3 className="mb-1 text-xl font-semibold">
        {title}
      </h3>

      <p className="mb-4 text-sm text-zinc-400">
        Le camembert représente le temps passé. Le tableau détaille séances,
        temps, charge totale et charge par heure.
      </p>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[260px_1fr]">
        <PieChart rows={rows} labelId={`${id}-chart-title`} descriptionId={`${id}-chart-description`} />

        <div className="space-y-3 md:hidden">
          {rows.map((row) => (
            <article key={`mobile-${row.name}`} className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-semibold text-white"><span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />{row.name}</h4>
                <span className="text-sm font-bold text-zinc-200">{row.percent.toFixed(1)} %</span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div><dt className="text-xs text-zinc-500">Séances</dt><dd className="mt-1 font-semibold text-zinc-100">{row.sessions}</dd></div>
                <div><dt className="text-xs text-zinc-500">Temps</dt><dd className="mt-1 font-semibold text-zinc-100">{row.time.toFixed(1)} h</dd></div>
                <div><dt className="text-xs text-zinc-500">Charge / h</dt><dd className="mt-1 font-semibold text-zinc-100">{row.loadPerHour.toFixed(0)}</dd></div>
              </dl>
            </article>
          ))}
          {!rows.length && <p className="rounded-2xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">Pas encore de données réalisées.</p>}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-zinc-400">
                <th className="py-2 pr-3">Nom</th>
                <th className="py-2 pr-3">% temps</th>
                <th className="py-2 pr-3">Séances</th>
                <th className="py-2 pr-3">Temps</th>
                <th className="py-2 pr-3">Charge</th>
                <th className="py-2 pr-3">Charge / h</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className="border-b border-zinc-900">
                  <td className="py-2 pr-3 font-semibold text-white">
                    <span
                      className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                      style={{ backgroundColor: row.color }}
                    />
                    {row.name}
                  </td>

                  <td className="py-2 pr-3 text-zinc-300">
                    {row.percent.toFixed(1)} %
                  </td>

                  <td className="py-2 pr-3 text-zinc-300">
                    {row.sessions}
                  </td>

                  <td className="py-2 pr-3 text-zinc-300">
                    {row.time.toFixed(1)} h
                  </td>

                  <td className="py-2 pr-3 text-zinc-300">
                    {row.load.toFixed(0)}
                  </td>

                  <td className="py-2 pr-3 text-zinc-300">
                    {row.loadPerHour.toFixed(0)}
                  </td>
                </tr>
              ))}

              {!rows.length && (
                <tr>
                  <td colSpan={6} className="py-4 text-zinc-500">
                    Pas encore de données réalisées.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function TrainingDistribution({
  sessions,
  categories,
  subcategories,
}) {

  const categoryRows = buildDistribution(sessions, "category", categories);
  const subcategoryRows = buildDistribution(
    sessions,
    "subcategory",
    subcategories
  );

  return (
    <div className="mt-6 grid grid-cols-1 gap-6">
      <DistributionBlock
        title="Répartition par discipline"
        rows={categoryRows}
      />

      <DistributionBlock
        title="Répartition par thème"
        rows={subcategoryRows}
      />
    </div>
  );
}
