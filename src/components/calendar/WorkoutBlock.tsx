// @ts-nocheck
"use client";

import { Btn, Input, Select, Textarea } from "@/components/ui/ui";
import { ZONES } from "@/lib/platformDefaults";

const ZONE_PERCENT_LABELS = {
  Z1: "< 55% CP",
  Z2: "56-75% CP",
  Z3: "76-90% CP",
  Z4: "91-105% CP",
  Z5: "106-120% CP",
  Z6: "121-150% CP",
  Z7: "> 150% CP",
};

const zoneOptionLabel = (zone) => {
  const percent = ZONE_PERCENT_LABELS[zone];
  return percent ? `${zone} — ${percent}` : zone;
};

function parseDurationParts(value) {
  const text = String(value || "").toLowerCase().replace(/\s/g, "");

  if (!text) return { hours: "", minutes: "" };

  const hoursMatch = text.match(/(\d+)h/);
  const minutesAfterHourMatch = text.match(/h(\d+)$/);
  const minutesWithMinMatch = text.match(/(\d+)min/);

  if (hoursMatch) {
    return {
      hours: hoursMatch[1],
      minutes: minutesAfterHourMatch?.[1] || minutesWithMinMatch?.[1] || "",
    };
  }

  if (minutesWithMinMatch) {
    return {
      hours: "",
      minutes: minutesWithMinMatch[1],
    };
  }

  return {
    hours: text.match(/^\d+$/) ? text : "",
    minutes: "",
  };
}

function formatDurationFromParts(hours, minutes) {
  const cleanHours = String(hours || "").replace(/\D/g, "");
  const cleanMinutes = String(minutes || "").replace(/\D/g, "");

  if (cleanHours && cleanMinutes) return `${cleanHours}h${cleanMinutes}`;
  if (cleanHours) return `${cleanHours}h`;
  if (cleanMinutes) return `${cleanMinutes}min`;

  return "";
}

function parsePercentParts(value) {
  const numbers = String(value || "").match(/\d+(?:[.,]\d+)?/g);

  return {
    min: numbers?.[0] || "",
    max: numbers?.[1] || "",
  };
}

function formatPercentFromParts(min, max) {
  const cleanMin = String(min || "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
  const cleanMax = String(max || "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  if (cleanMin && cleanMax) return `${cleanMin}-${cleanMax}`;
  if (cleanMin) return cleanMin;

  return "";
}

export default function WorkoutBlock({
  block,
  blockIndex,
  updateBlock,
  updateRepeat,
  setDraft,
}) {
  const updateDurationPart = (part, value) => {
    const current = parseDurationParts(block.duration);
    const cleanValue = String(value || "").replace(/\D/g, "");

    const nextHours = part === "hours" ? cleanValue : current.hours;
    const nextMinutes = part === "minutes" ? cleanValue : current.minutes;

    updateBlock(
      blockIndex,
      "duration",
      formatDurationFromParts(nextHours, nextMinutes)
    );
  };

  const updateRepeatDurationPart = (repeatIndex, part, value) => {
    const current = parseDurationParts(block.repeatItems[repeatIndex]?.duration);
    const cleanValue = String(value || "").replace(/\D/g, "");

    const nextHours = part === "hours" ? cleanValue : current.hours;
    const nextMinutes = part === "minutes" ? cleanValue : current.minutes;

    updateRepeat(
      blockIndex,
      repeatIndex,
      "duration",
      formatDurationFromParts(nextHours, nextMinutes)
    );
  };

  const updateTargetPercentPart = (part, value) => {
    const current = parsePercentParts(block.targetPercent);
    const cleanValue = String(value || "")
      .replace(",", ".")
      .replace(/[^\d.]/g, "");

    const nextMin = part === "min" ? cleanValue : current.min;
    const nextMax = part === "max" ? cleanValue : current.max;

    updateBlock(
      blockIndex,
      "targetPercent",
      formatPercentFromParts(nextMin, nextMax)
    );
  };

  const updateRepeatTargetPercentPart = (repeatIndex, part, value) => {
    const current = parsePercentParts(
      block.repeatItems[repeatIndex]?.targetPercent
    );
    const cleanValue = String(value || "")
      .replace(",", ".")
      .replace(/[^\d.]/g, "");

    const nextMin = part === "min" ? cleanValue : current.min;
    const nextMax = part === "max" ? cleanValue : current.max;

    updateRepeat(
      blockIndex,
      repeatIndex,
      "targetPercent",
      formatPercentFromParts(nextMin, nextMax)
    );
  };

  return (
    <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4">
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Input
          value={block.name}
          onChange={(event) => updateBlock(blockIndex, "name", event.target.value)}
          placeholder="Nom du bloc"
        />

        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 md:col-span-2">
          <Input
            value={parseDurationParts(block.duration).hours}
            onChange={(event) => updateDurationPart("hours", event.target.value)}
            type="text"
            inputMode="numeric"
            placeholder="1"
          />

          <span className="text-sm font-semibold text-zinc-400">h</span>

          <Input
            value={parseDurationParts(block.duration).minutes}
            onChange={(event) => updateDurationPart("minutes", event.target.value)}
            type="text"
            inputMode="numeric"
            placeholder="30"
          />

          <span className="text-sm font-semibold text-zinc-400">min</span>
        </div>

        <Btn
          onClick={() =>
            setDraft((current) => ({
              ...current,
              blocks: current.blocks.filter((_, index) => index !== blockIndex),
            }))
          }
        >
          Supprimer
        </Btn>
      </div>

      {block.type === "simple" ? (
        <>
          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              value={block.zone}
              onChange={(event) =>
                updateBlock(blockIndex, "zone", event.target.value)
              }
            >
              {ZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zoneOptionLabel(zone)}
                </option>
              ))}
            </Select>

            <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
              <Input
                value={parsePercentParts(block.targetPercent).min}
                onChange={(event) =>
                  updateTargetPercentPart("min", event.target.value)
                }
                type="text"
                inputMode="decimal"
                placeholder="78"
              />

              <span className="text-sm font-semibold text-zinc-400">-</span>

              <Input
                value={parsePercentParts(block.targetPercent).max}
                onChange={(event) =>
                  updateTargetPercentPart("max", event.target.value)
                }
                type="text"
                inputMode="decimal"
                placeholder="84"
              />

              <span className="text-sm font-semibold text-zinc-400">% CP</span>
            </div>
          </div>

          <Textarea
            value={block.instruction}
            onChange={(event) =>
              updateBlock(blockIndex, "instruction", event.target.value)
            }
            rows={3}
            placeholder="Consigne / description du bloc"
          />
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Détail des étapes</h4>

            <Btn
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  blocks: current.blocks.map((itemBlock, index) =>
                    index === blockIndex
                      ? {
                          ...itemBlock,
                          repeatItems: [
                            ...itemBlock.repeatItems,
                            {
                              name: `Étape ${itemBlock.repeatItems.length + 1}`,
                              duration: "",
                              zone: "Z4",
                              targetPercent: "",
                              instruction: "",
                            },
                          ],
                        }
                      : itemBlock
                  ),
                }))
              }
            >
              + Étape
            </Btn>
          </div>

          {block.repeatItems.map((repeatItem, repeatIndex) => (
            <div
              key={repeatIndex}
              className="grid grid-cols-1 gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 p-3 sm:grid-cols-2 md:grid-cols-6"
            >
              <Input
                value={repeatItem.name}
                onChange={(event) =>
                  updateRepeat(
                    blockIndex,
                    repeatIndex,
                    "name",
                    event.target.value
                  )
                }
                placeholder="Nom de l’étape"
              />

              <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                <Input
                  value={parseDurationParts(repeatItem.duration).hours}
                  onChange={(event) =>
                    updateRepeatDurationPart(
                      repeatIndex,
                      "hours",
                      event.target.value
                    )
                  }
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                />

                <span className="text-sm font-semibold text-zinc-400">h</span>

                <Input
                  value={parseDurationParts(repeatItem.duration).minutes}
                  onChange={(event) =>
                    updateRepeatDurationPart(
                      repeatIndex,
                      "minutes",
                      event.target.value
                    )
                  }
                  type="text"
                  inputMode="numeric"
                  placeholder="5"
                />

                <span className="text-sm font-semibold text-zinc-400">min</span>
              </div>

              <Select
                value={repeatItem.zone}
                onChange={(event) =>
                  updateRepeat(
                    blockIndex,
                    repeatIndex,
                    "zone",
                    event.target.value
                  )
                }
              >
                {ZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zoneOptionLabel(zone)}
                  </option>
                ))}
              </Select>

              <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                <Input
                  value={parsePercentParts(repeatItem.targetPercent).min}
                  onChange={(event) =>
                    updateRepeatTargetPercentPart(
                      repeatIndex,
                      "min",
                      event.target.value
                    )
                  }
                  type="text"
                  inputMode="decimal"
                  placeholder="102"
                />

                <span className="text-sm font-semibold text-zinc-400">-</span>

                <Input
                  value={parsePercentParts(repeatItem.targetPercent).max}
                  onChange={(event) =>
                    updateRepeatTargetPercentPart(
                      repeatIndex,
                      "max",
                      event.target.value
                    )
                  }
                  type="text"
                  inputMode="decimal"
                  placeholder="108"
                />

                <span className="text-sm font-semibold text-zinc-400">% CP</span>
              </div>

              <Input
                value={repeatItem.instruction}
                onChange={(event) =>
                  updateRepeat(
                    blockIndex,
                    repeatIndex,
                    "instruction",
                    event.target.value
                  )
                }
                placeholder="Consigne"
              />

              <Btn
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    blocks: current.blocks.map((itemBlock, index) =>
                      index === blockIndex
                        ? {
                            ...itemBlock,
                            repeatItems: itemBlock.repeatItems.filter(
                              (_, rIndex) => rIndex !== repeatIndex
                            ),
                          }
                        : itemBlock
                    ),
                  }))
                }
              >
                Supprimer
              </Btn>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}