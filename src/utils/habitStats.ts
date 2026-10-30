import type { Habit, HabitLog } from "../data/productivity";

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getHabitStreaks(habit: Habit, logs: readonly HabitLog[], today = new Date()): { current: number; longest: number } {
  const completed = new Set(logs.filter((log) => log.habitId === habit.id).map((log) => log.logDate));
  const isScheduled = (date: Date) => habit.daysOfWeek.includes(date.getDay());
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let current = 0;
  if (isScheduled(cursor) && !completed.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (current < 366) {
    if (isScheduled(cursor)) {
      if (!completed.has(localDateKey(cursor))) break;
      current += 1;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  const datedLogs = [...completed].sort();
  let longest = 0;
  let streak = 0;
  let lastScheduledDate: Date | null = null;
  for (const key of datedLogs) {
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (!isScheduled(date)) continue;
    const gap = lastScheduledDate ? Math.round((date.getTime() - lastScheduledDate.getTime()) / 86_400_000) : 0;
    let hasMissedScheduledDay = false;
    if (lastScheduledDate) {
      const between = new Date(lastScheduledDate);
      between.setDate(between.getDate() + 1);
      while (between < date) {
        if (isScheduled(between)) {
          hasMissedScheduledDay = true;
          break;
        }
        between.setDate(between.getDate() + 1);
      }
    }
    streak = !lastScheduledDate || (!hasMissedScheduledDay && gap > 0) ? streak + 1 : 1;
    longest = Math.max(longest, streak);
    lastScheduledDate = date;
  }
  return { current, longest };
}

export function habitCompletionRate(habit: Habit, logs: readonly HabitLog[], start: Date, end: Date): number {
  const completed = new Set(logs.filter((log) => log.habitId === habit.id).map((log) => log.logDate));
  let scheduled = 0;
  let completedCount = 0;
  const date = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (date <= last) {
    if (habit.daysOfWeek.includes(date.getDay())) {
      scheduled += 1;
      if (completed.has(localDateKey(date))) completedCount += 1;
    }
    date.setDate(date.getDate() + 1);
  }
  return scheduled === 0 ? 0 : Math.round(completedCount / scheduled * 100);
}

export function habitDateKey(date: Date): string {
  return localDateKey(date);
}
