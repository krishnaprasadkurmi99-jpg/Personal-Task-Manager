import type { TaskCategory, TaskPriority } from "./dashboard";

export const energyLevels = ["Low", "Balanced", "High"] as const;
export type EnergyLevel = (typeof energyLevels)[number];

export type PlannedTask = {
  id: string;
  taskId: string;
  title: string;
  priority: TaskPriority;
  category: TaskCategory;
  startAt: string;
  endAt: string;
  durationMinutes: number;
};

export type PlannedBreak = {
  id: string;
  title: "Short break";
  startAt: string;
  endAt: string;
  durationMinutes: number;
};

export type PlannedBlock = PlannedTask | PlannedBreak;

export type DailyPlanDraft = {
  planDate: string;
  workingStartTime: string;
  workingEndTime: string;
  energyLevel: EnergyLevel;
  breakIntervalMinutes: number;
  breakDurationMinutes: number;
  blocks: PlannedBlock[];
};

export type PlannerSettings = Pick<
  DailyPlanDraft,
  "workingStartTime" | "workingEndTime" | "energyLevel" | "breakIntervalMinutes" | "breakDurationMinutes"
> & {
  focusDurationMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
};

export type DailyPlan = DailyPlanDraft & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type PlannerTaskInput = {
  taskId: string;
  title: string;
  priority: TaskPriority;
  category: TaskCategory;
  dueAt: string | null;
  createdAt: string;
  durationMinutes: number;
};

export type FocusSession = {
  id: string;
  taskId: string | null;
  taskTitle: string | null;
  plannedDurationMinutes: number;
  actualDurationMinutes: number;
  startedAt: string;
  completedAt: string | null;
  status: "completed" | "interrupted";
  createdAt: string;
};

export type FocusSessionDraft = Omit<FocusSession, "id" | "createdAt">;

export const habitCategories = ["Health", "Mindfulness", "Learning", "Personal", "Other"] as const;
export type HabitCategory = (typeof habitCategories)[number];

export type Habit = {
  id: string;
  title: string;
  description: string;
  category: HabitCategory;
  daysOfWeek: number[];
  reminderTime: string | null;
  reminderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HabitDraft = Omit<Habit, "id" | "createdAt" | "updatedAt">;

export type HabitLog = {
  id: string;
  habitId: string;
  logDate: string;
  completedAt: string | null;
};

export const goalCategories = ["Personal", "Career", "Health", "Learning", "Finance", "Other"] as const;
export type GoalCategory = (typeof goalCategories)[number];

export type Goal = {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  targetDate: string | null;
  status: "active" | "completed";
  createdAt: string;
  updatedAt: string;
  milestones: Milestone[];
};

export type GoalDraft = Pick<Goal, "title" | "description" | "category" | "targetDate">;

export type Milestone = {
  id: string;
  goalId: string;
  title: string;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
};

export type ProductivityReview = {
  id: string;
  weekStart: string;
  wins: string;
  challenges: string;
  priorities: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};
