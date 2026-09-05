// @ts-nocheck
"use client";

import { Panel } from "@/components/ui/ui";
import AthleteGoalUpdateBanner from "@/components/calendar/AthleteGoalUpdateBanner";
import AthleteNotificationsBanner from "@/components/calendar/AthleteNotificationsBanner";
import CalendarToolbar from "@/components/calendar/CalendarToolbar";
import CalendarWeekSummary from "@/components/calendar/CalendarWeekSummary";
import DayView from "@/components/calendar/DayView";
import MonthView from "@/components/calendar/MonthView";
import QuickLibrary from "@/components/calendar/QuickLibrary";
import WeekPlanningTool from "@/components/calendar/WeekPlanningTool";
import YearView from "@/components/calendar/YearView";

export default function CalendarPageOld(props) {
  const calendarProps = props;

  return (
    <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <Panel className={props.isCoach ? "min-w-0" : "min-w-0 xl:col-span-2"}>
        {!props.isCoach && (
          <>
            {!props.athleteGoalsV2Enabled && (
              <AthleteGoalUpdateBanner athlete={props.athleteActive} updateAthlete={props.updateAthlete} />
            )}
            <AthleteNotificationsBanner sessions={props.activeSessions} />
          </>
        )}

        <CalendarToolbar {...calendarProps} />

        <div
          id="calendar-view-panel"
          role="tabpanel"
          aria-labelledby={`calendar-view-${props.mode}`}
          className="min-w-0"
        >
          {props.mode === "year" && <YearView setMonth={calendarProps.setMonth} setMode={calendarProps.setMode} />}
          {props.mode === "month" && <MonthView {...calendarProps} currentMonth={calendarProps.month} />}
          {props.mode === "day" && (
            <DayView
              {...calendarProps}
              allAthleteSessions={calendarProps.sessions}
              sessions={calendarProps.sessionsFor(calendarProps.selectedDate)}
              proposals={calendarProps.proposalsFor(calendarProps.selectedDate)}
              deleteAthleteWorkoutFromGroupDay={calendarProps.deleteAthleteWorkoutFromGroupDay}
              deleteGroupDayWorkouts={calendarProps.deleteGroupDayWorkouts}
            />
          )}
        </div>

        {props.isCoach && (
          <>
            <WeekPlanningTool
              activeId={props.activeId}
              sessions={props.activeSessions}
              selectedDate={props.selectedDate}
              subcategories={props.subcategories}
              weekPlanning={props.weekPlanning}
              updateWeekPlanning={props.updateWeekPlanning}
              weekNotes={props.weekNotes}
              setWeekNotes={props.setWeekNotes}
              updateWeekNote={props.updateWeekNote}
            />
            <CalendarWeekSummary sessions={props.activeSessions} selectedDate={props.selectedDate} />
          </>
        )}
      </Panel>

      {props.isCoach && (
        <div className="xl:sticky xl:top-4 xl:self-start">
          <QuickLibrary {...calendarProps} />
        </div>
      )}
    </div>
  );
}
