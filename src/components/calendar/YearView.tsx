// @ts-nocheck

import { MONTHS } from "@/lib/platformDefaults";

export default function YearView({ setMonth, setMode }) {
  return (
    <section aria-label="Choisir un mois" className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {MONTHS.map((monthItem, index) => (
        <button
          key={monthItem}
          onClick={() => {
            setMonth(index);
            setMode("month");
          }}
          className="min-h-28 rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-left transition hover:border-zinc-500 hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:p-5"
        >
          <div className="text-xl font-bold">{monthItem}</div>
          <div className="text-sm text-zinc-400">Voir le mois</div>
        </button>
      ))}
    </section>
  );
}
