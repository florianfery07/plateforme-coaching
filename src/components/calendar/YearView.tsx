// @ts-nocheck

import { MONTHS } from "@/lib/platformDefaults";

export default function YearView({ setMonth, setMode }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {MONTHS.map((monthItem, index) => (
        <button
          key={monthItem}
          onClick={() => {
            setMonth(index);
            setMode("month");
          }}
          className="rounded-2xl border border-zinc-700 bg-zinc-800 p-5 text-left hover:bg-zinc-700"
        >
          <div className="text-xl font-bold">{monthItem}</div>
          <div className="text-sm text-zinc-400">Voir le mois</div>
        </button>
      ))}
    </div>
  );
}