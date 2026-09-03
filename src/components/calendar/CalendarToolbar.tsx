// @ts-nocheck

import { CALENDAR_YEARS, MONTHS } from "@/lib/platformDefaults";
import { Btn, Field, Select } from "@/components/ui/ui";

export default function CalendarToolbar({
  athleteActive,
  mode,
  setMode,
  year,
  setYear,
  month,
  setMonth,
  planningTargetType,
  selectedGroup,
  selectedGroupMembers = [],
}) {
  const selectedMonthLabel = MONTHS[month];
  const canMovePrevious = month > 0 || year > CALENDAR_YEARS[0];
  const canMoveNext = month < 11 || year < CALENDAR_YEARS[CALENDAR_YEARS.length - 1];
  const views = [
    ["year", "Année"],
    ["month", "Mois"],
    ["day", "Jour"],
  ];
  const calendarTitle =
    planningTargetType === "group" && selectedGroup
      ? `Calendrier du groupe ${selectedGroup.name}`
      : athleteActive.calendarName;

  const moveMonth = (offset) => {
    const nextMonth = month + offset;

    if (nextMonth < 0) {
      setYear(year - 1);
      setMonth(11);
      return;
    }

    if (nextMonth > 11) {
      setYear(year + 1);
      setMonth(0);
      return;
    }

    setMonth(nextMonth);
  };

  const moveViewFocus = (event, nextIndex) => {
    const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll('[role="tab"]') || []);
    tabs[nextIndex]?.focus();
    setMode(views[nextIndex][0]);
  };

  const handleViewKeyDown = (event, index) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveViewFocus(event, (index + 1) % views.length);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveViewFocus(event, (index - 1 + views.length) % views.length);
    }

    if (event.key === "Home") {
      event.preventDefault();
      moveViewFocus(event, 0);
    }

    if (event.key === "End") {
      event.preventDefault();
      moveViewFocus(event, views.length - 1);
    }
  };

  return (
    <section className="mb-5 space-y-5" aria-labelledby="calendar-title">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
            {planningTargetType === "group" ? "Planification de groupe" : "Planification individuelle"}
          </p>
          <h2 id="calendar-title" className="text-2xl font-semibold sm:text-3xl">
            {calendarTitle}
          </h2>
          <p className="text-sm text-zinc-400">
            {planningTargetType === "group" && selectedGroup
              ? `${selectedGroupMembers.length} athlète${selectedGroupMembers.length > 1 ? "s" : ""} recevront automatiquement chaque séance programmée sur ce calendrier.`
              : "Séances programmées et propositions de l’athlète."}
          </p>
        </div>

        <div role="tablist" aria-label="Vue du calendrier" className="grid grid-cols-3 gap-2 sm:inline-flex">
          {views.map(([key, label], index) => (
            <button
              key={key}
              id={`calendar-view-${key}`}
              onClick={() => setMode(key)}
              role="tab"
              aria-selected={mode === key}
              aria-controls="calendar-view-panel"
              onKeyDown={(event) => handleViewKeyDown(event, index)}
              type="button"
              className={`min-h-11 rounded-xl px-3 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:px-4 sm:py-2 ${
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

      <div className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
        <div className="flex items-center gap-2" aria-label="Navigation de période">
          <Btn
            type="button"
            aria-label="Mois précédent"
            onClick={() => moveMonth(-1)}
            disabled={!canMovePrevious}
            className="min-w-11 px-3"
          >
            <span aria-hidden="true">←</span>
          </Btn>
          <div className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-center">
            <div className="truncate text-sm font-semibold text-white">{selectedMonthLabel} {year}</div>
            <div className="text-xs text-zinc-400">Période affichée</div>
          </div>
          <Btn
            type="button"
            aria-label="Mois suivant"
            onClick={() => moveMonth(1)}
            disabled={!canMoveNext}
            className="min-w-11 px-3"
          >
            <span aria-hidden="true">→</span>
          </Btn>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Année">
            <Select
              value={year}
              onChange={(event) => setYear(+event.target.value)}
            >
              {CALENDAR_YEARS.map((yearItem) => (
                <option key={yearItem}>{yearItem}</option>
              ))}
            </Select>
          </Field>

          <Field label="Mois">
            <Select
              value={month}
              onChange={(event) => setMonth(+event.target.value)}
            >
              {MONTHS.map((monthItem, index) => (
                <option key={monthItem} value={index}>
                  {monthItem}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </section>
  );
}
