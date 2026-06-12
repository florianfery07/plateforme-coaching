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

export default function WorkoutBlock({
  block,
  blockIndex,
  updateBlock,
  updateRepeat,
  setDraft,
}) {
  return (
    <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4">
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Input
          value={block.name}
          onChange={(event) => updateBlock(blockIndex, "name", event.target.value)}
          placeholder="Nom du bloc"
        />

        <Input
          value={block.duration}
          onChange={(event) =>
            updateBlock(blockIndex, "duration", event.target.value)
          }
          className="md:col-span-2"
          placeholder="Durée du bloc"
        />

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

            <Input
              value={block.targetPercent || ""}
              onChange={(event) =>
                updateBlock(blockIndex, "targetPercent", event.target.value)
              }
              placeholder="Cible % CP ex : 78-84"
            />
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

              <Input
                value={repeatItem.duration}
                onChange={(event) =>
                  updateRepeat(
                    blockIndex,
                    repeatIndex,
                    "duration",
                    event.target.value
                  )
                }
                placeholder="Durée"
              />

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

              <Input
                value={repeatItem.targetPercent || ""}
                onChange={(event) =>
                  updateRepeat(
                    blockIndex,
                    repeatIndex,
                    "targetPercent",
                    event.target.value
                  )
                }
                placeholder="% CP ex : 102-108"
              />

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