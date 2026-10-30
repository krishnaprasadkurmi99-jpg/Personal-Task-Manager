import type { Goal, Habit, HabitLog, FocusSession } from "../data/productivity";
import { getBrainDumpUserId, getSupabaseClient } from "./supabase";

export type TaskCompletionRecord = {
  id: string;
  taskId: string;
  title: string;
  category: string;
  priority: string;
  completedAt: string;
};

export type InsightsSnapshot = {
  completions: TaskCompletionRecord[];
  focusSessions: FocusSession[];
  habits: Habit[];
  habitLogs: HabitLog[];
  goals: Goal[];
};

function mapGoalRow(row: {
  id: string;
  title: string;
  description: string;
  category: Goal["category"];
  target_date: string | null;
  status: Goal["status"];
  created_at: string;
  updated_at: string;
}, milestones: Goal["milestones"]): Goal {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    targetDate: row.target_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    milestones,
  };
}

function dayStartIso(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date).toISOString();
}

export async function getInsightsSnapshot(startDate: string, endDateExclusive: string): Promise<InsightsSnapshot> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const startIso = dayStartIso(startDate);
  const endIso = dayStartIso(endDateExclusive);
  const [completionsResult, sessionsResult, habitsResult, logsResult, goalsResult, milestonesResult] = await Promise.all([
    client.from("task_completion_events").select("*").eq("user_id", userId).gte("completed_at", startIso).lt("completed_at", endIso).order("completed_at", { ascending: true }).limit(2000),
    client.from("focus_sessions").select("*").eq("user_id", userId).eq("status", "completed").gte("started_at", startIso).lt("started_at", endIso).order("started_at", { ascending: true }).limit(2000),
    client.from("habits").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    client.from("habit_logs").select("*").eq("user_id", userId).gte("log_date", startDate).lt("log_date", endDateExclusive).order("log_date", { ascending: true }).limit(10000),
    client.from("goals").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    client.from("milestones").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
  ]);
  if (completionsResult.error) throw new Error(`Could not load task completion insights. ${completionsResult.error.message}`);
  if (sessionsResult.error) throw new Error(`Could not load focus insights. ${sessionsResult.error.message}`);
  if (habitsResult.error) throw new Error(`Could not load habit insights. ${habitsResult.error.message}`);
  if (logsResult.error) throw new Error(`Could not load habit completion insights. ${logsResult.error.message}`);
  if (goalsResult.error) throw new Error(`Could not load goal insights. ${goalsResult.error.message}`);
  if (milestonesResult.error) throw new Error(`Could not load milestone insights. ${milestonesResult.error.message}`);

  const milestones = milestonesResult.data.map((row) => ({
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    isCompleted: row.is_completed,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }));
  return {
    completions: completionsResult.data.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      title: row.task_title,
      category: row.category,
      priority: row.priority,
      completedAt: row.completed_at,
    })),
    focusSessions: sessionsResult.data.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      taskTitle: row.task_title,
      plannedDurationMinutes: row.planned_duration_minutes,
      actualDurationMinutes: row.actual_duration_minutes,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      status: row.status,
      createdAt: row.created_at,
    })),
    habits: habitsResult.data.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      daysOfWeek: row.days_of_week,
      reminderTime: row.reminder_time?.slice(0, 5) ?? null,
      reminderEnabled: row.reminder_enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    habitLogs: logsResult.data.map((row) => ({
      id: row.id,
      habitId: row.habit_id,
      logDate: row.log_date,
      completedAt: row.completed_at,
    })),
    goals: goalsResult.data.map((row) => mapGoalRow(
      row,
      milestones.filter((item) => item.goalId === row.id),
    )),
  };
}
