// @ts-nocheck
"use client";

import { zoneWatts } from "@/lib/trainingUtils";

export default function Block({ block, cpData }) {
  const repeat = block.type === "repeat";
  
  const repeatCount =
    block.repeatCount || block.repetitions || block.count || "";
  const repeatItemsCount = block.repeatItems?.length || 0;

  const intensityLabel = (item) => {
    if (item.targetPercent) {
      const cp = Number(cpData?.value || cpData?.cp || cpData || 0);

      const match = String(item.targetPercent).match(
        /(\d+)\s*-\s*(\d+)/
      );

      if (cp && match) {
        const minPercent = Number(match[1]);
        const maxPercent = Number(match[2]);

        const minWatts = Math.round((cp * minPercent) / 100);
        const maxWatts = Math.round((cp * maxPercent) / 100);

        return `${item.targetPercent}% CP : ${minWatts}-${maxWatts} W`;
      }

      return `${item.targetPercent}% CP`;
    }

    if (item.targetWatts) {
      return item.targetWatts;
    }

    return `${item.zone} : ${zoneWatts(item.zone, cpData)}`;
  };

  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-bold">{block.name}</div>
          <div className="text-sm text-zinc-400">
            {repeat && repeatCount
              ? `${repeatCount} répétition${Number(repeatCount) > 1 ? "s" : ""} des ${repeatItemsCount} étape${repeatItemsCount > 1 ? "s" : ""} du bloc • ${block.duration || "Durée non renseignée"}`
              : block.duration || "Durée non renseignée"}
          </div>
        </div>

        {!repeat && (
          <div className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-black">
            {intensityLabel(block)}
          </div>
        )}
      </div>

      {!repeat && (
        <p className="mt-3 text-sm text-zinc-300">
          {block.instruction || "Consignes non renseignées."}
        </p>
      )}

      {repeat && (
        <div className="mt-3 space-y-2">
          {block.repeatItems.map((repeatItem, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-xl bg-zinc-800 p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="font-semibold">{repeatItem.name}</div>
                <div className="text-sm text-zinc-400">
                  {repeatItem.duration} — {repeatItem.instruction}
                </div>
              </div>

              <div className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-black">
                {intensityLabel(repeatItem)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}