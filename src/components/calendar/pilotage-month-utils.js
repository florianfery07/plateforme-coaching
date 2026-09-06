import { addDays, dateKey, monthDays } from "@/lib/trainingUtils";

export function monthBounds(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    days: monthDays(year, month),
    end: new Date(year, month + 1, 0),
    month,
    start: new Date(year, month, 1),
    year,
  };
}

export function moveMonthDate(date, offset) {
  const next = new Date(date.getFullYear(), date.getMonth() + offset, 1);
  const finalDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  return new Date(next.getFullYear(), next.getMonth(), Math.min(date.getDate(), finalDay));
}

export function overlapCycleLanes(cycles, rangeStart, rangeEnd) {
  const startKey = dateKey(rangeStart);
  const endKey = dateKey(rangeEnd);
  const laneEnds = [];

  return [...cycles]
    .filter((cycle) => cycle.startsOn <= endKey && cycle.endsOn >= startKey)
    .sort((left, right) => left.startsOn.localeCompare(right.startsOn) || left.endsOn.localeCompare(right.endsOn) || left.name.localeCompare(right.name))
    .map((cycle) => {
      const visibleStart = cycle.startsOn < startKey ? startKey : cycle.startsOn;
      const visibleEnd = cycle.endsOn > endKey ? endKey : cycle.endsOn;
      let lane = laneEnds.findIndex((laneEnd) => laneEnd < visibleStart);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(visibleEnd);
      } else {
        laneEnds[lane] = visibleEnd;
      }

      return { ...cycle, lane, visibleEnd, visibleStart };
    });
}

export function timelineDayPosition(value, rangeStart) {
  const origin = dateKey(rangeStart);
  const current = dateKey(value);
  let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
  let position = 1;

  while (dateKey(cursor) < current) {
    cursor = addDays(cursor, 1);
    position += 1;
  }

  return current < origin ? 1 : position;
}

export function timelineSpan(start, end) {
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  let count = 1;
  while (dateKey(cursor) < dateKey(end)) {
    cursor = addDays(cursor, 1);
    count += 1;
  }
  return count;
}
