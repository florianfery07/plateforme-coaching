// @ts-nocheck
"use client";

import { Panel } from "@/components/ui/ui";

import CalendarToolbar from "@/components/calendar/CalendarToolbar";
import YearView from "@/components/calendar/YearView";
import MonthView from "@/components/calendar/MonthView";
import DayView from "@/components/calendar/DayView";
import QuickLibrary from "@/components/calendar/QuickLibrary";

export default function CalendarPageOld(props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-4">
      <Panel
        className={
          props.isCoach
            ? "xl:col-span-3"
            : "xl:col-span-4"
        }
      >
        <CalendarToolbar {...props} />

        {props.mode === "year" && (
          <YearView
            setMonth={props.setMonth}
            setMode={props.setMode}
          />
        )}

        {props.mode === "month" && (
          <MonthView {...props} />
        )}

        {props.mode === "day" && (
          <DayView
            {...props}
            sessions={props.sessionsFor(props.selectedDate)}
            proposals={props.proposalsFor(props.selectedDate)}
          />
        )}
      </Panel>

      {props.isCoach && (
        <QuickLibrary {...props} />
      )}
    </div>
  );
}