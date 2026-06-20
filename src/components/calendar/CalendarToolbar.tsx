// @ts-nocheck

import { CALENDAR_YEARS, MONTHS } from "@/lib/platformDefaults";
import { Select } from "@/components/ui/ui";

export default function CalendarToolbar({
  athleteActive,
  mode,
  setMode,
  year,
  setYear,
  month,
  setMonth,
  isCoach,
  athleteGroups = [],
  planningTargetType,
  setPlanningTargetType,
  selectedGroupId,
  setSelectedGroupId,
  selectedGroup,
  selectedGroupMembers = [],
}) {
  return (
    <div className="mb-5 space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            {planningTargetType === "group" && selectedGroup
              ? `Calendrier du groupe ${selectedGroup.name}`
              : athleteActive.calendarName}
          </h2>
          <p className="text-sm text-zinc-400">
            {planningTargetType === "group" && selectedGroup
              ? `${selectedGroupMembers.length} athlète${selectedGroupMembers.length > 1 ? "s" : ""} recevront automatiquement chaque séance programmée sur ce calendrier.`
              : "Séances programmées et propositions de l’athlète."}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:flex">
          {[
            ["year", "Année"],
            ["month", "Mois"],
            ["day", "Jour"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`rounded-xl px-3 py-3 text-sm font-semibold sm:px-4 sm:py-2 ${
                mode === key
                  ? "bg-white text-black"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={year}
          onChange={(event) => setYear(+event.target.value)}
          className="w-auto"
        >
          {CALENDAR_YEARS.map((yearItem) => (
            <option key={yearItem}>{yearItem}</option>
          ))}
        </Select>

        <Select
          value={month}
          onChange={(event) => setMonth(+event.target.value)}
          className="w-auto"
        >
          {MONTHS.map((monthItem, index) => (
            <option key={monthItem} value={index}>
              {monthItem}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}