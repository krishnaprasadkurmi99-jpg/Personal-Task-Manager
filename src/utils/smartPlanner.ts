import type {
  DailyPlanDraft,
  PlannedBlock,
  PlannedBreak,
  PlannedTask,
  PlannerTaskInput,
  PlannerSettings,
} from "../data/productivity";

const priorityRank = { Urgent: 0, High: 1, Medium: 2, Low: 3 } as const;

function timeToMinutes(value: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return Number.NaN;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function timestampFor(planDate: string, minutes: number): string {
  const [year, month, day] = planDate.split("-").map(Number);
  const date = new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60);
  return date.toISOString();
}

function deadlineOrder(task: PlannerTaskInput): number {
  return task.dueAt ? Date.parse(task.dueAt) : Number.MAX_SAFE_INTEGER;
}

export function createDailySchedule(
  planDate: string,
  inputTasks: readonly PlannerTaskInput[],
  settings: PlannerSettings,
): { plan: DailyPlanDraft; unscheduledTaskIds: string[] } {
  const start = timeToMinutes(settings.workingStartTime);
  const finish = timeToMinutes(settings.workingEndTime);
  if (!Number.isFinite(start) || !Number.isFinite(finish) || finish <= start) {
    throw new Error("Choose a valid working-day start and end time.");
  }
  if (
    !Number.isInteger(settings.breakIntervalMinutes) ||
    settings.breakIntervalMinutes < 30 ||
    settings.breakIntervalMinutes > 240 ||
    !Number.isInteger(settings.breakDurationMinutes) ||
    settings.breakDurationMinutes < 5 ||
    settings.breakDurationMinutes > 45
  ) {
    throw new Error("Choose valid break intervals and durations.");
  }
  if (inputTasks.some((task) => !Number.isFinite(task.durationMinutes) || task.durationMinutes < 5 || task.durationMinutes > 480)) {
    throw new Error("Task estimates must be between 5 minutes and 8 hours.");
  }
  if (new Set(inputTasks.map((task) => task.taskId)).size !== inputTasks.length) {
    throw new Error("A task can only appear once in the schedule.");
  }

  const sortedTasks = [...inputTasks].sort((left, right) =>
    priorityRank[left.priority] - priorityRank[right.priority] ||
    deadlineOrder(left) - deadlineOrder(right) ||
    (settings.energyLevel === "High"
      ? right.durationMinutes - left.durationMinutes
      : settings.energyLevel === "Low"
        ? left.durationMinutes - right.durationMinutes
        : 0) ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.taskId.localeCompare(right.taskId),
  );
  const blocks: PlannedBlock[] = [];
  const unscheduledTaskIds: string[] = [];
  let cursor = start;
  let minutesSinceBreak = 0;

  for (const task of sortedTasks) {
    if (minutesSinceBreak > 0 && minutesSinceBreak >= settings.breakIntervalMinutes) {
      if (cursor + settings.breakDurationMinutes <= finish) {
        const breakBlock: PlannedBreak = {
          id: `break-${blocks.length + 1}`,
          title: "Short break",
          startAt: timestampFor(planDate, cursor),
          endAt: timestampFor(planDate, cursor + settings.breakDurationMinutes),
          durationMinutes: settings.breakDurationMinutes,
        };
        blocks.push(breakBlock);
        cursor += settings.breakDurationMinutes;
      }
      minutesSinceBreak = 0;
    }

    const duration = Math.ceil(task.durationMinutes / 5) * 5;
    if (cursor + duration > finish) {
      unscheduledTaskIds.push(task.taskId);
      continue;
    }
    const scheduled: PlannedTask = {
      id: `task-${task.taskId}`,
      taskId: task.taskId,
      title: task.title,
      priority: task.priority,
      category: task.category,
      startAt: timestampFor(planDate, cursor),
      endAt: timestampFor(planDate, cursor + duration),
      durationMinutes: duration,
    };
    blocks.push(scheduled);
    cursor += duration;
    minutesSinceBreak += duration;
  }

  return {
    plan: {
      planDate,
      ...settings,
      blocks,
    },
    unscheduledTaskIds,
  };
}

export function reschedulePlanBlock(
  blocks: readonly PlannedBlock[],
  blockId: string,
  startAt: string,
): PlannedBlock[] {
  const target = blocks.find((block) => block.id === blockId);
  if (!target) throw new Error("That schedule block could not be found.");
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) throw new Error("Enter a valid start time.");
  const durationMinutes = target.durationMinutes;
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const overlaps = blocks.some((block) => {
    if (block.id === blockId) return false;
    const otherStart = Date.parse(block.startAt);
    const otherEnd = Date.parse(block.endAt);
    return start.getTime() < otherEnd && end.getTime() > otherStart;
  });
  if (overlaps) throw new Error("That time overlaps another item in this plan.");
  return blocks
    .map((block) => block.id === blockId
      ? { ...block, startAt: start.toISOString(), endAt: end.toISOString() }
      : block)
    .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt));
}

export function isWithinWorkingHours(
  block: PlannedBlock,
  planDate: string,
  startTime: string,
  endTime: string,
): boolean {
  const startOfDay = new Date(`${planDate}T00:00:00`);
  const start = new Date(block.startAt);
  const end = new Date(block.endAt);
  const endOfDay = new Date(`${planDate}T00:00:00`);
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  startOfDay.setHours(startHour, startMinute, 0, 0);
  endOfDay.setHours(endHour, endMinute, 0, 0);
  return start >= startOfDay && end <= endOfDay && end > start;
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localDateTimeInput(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}
