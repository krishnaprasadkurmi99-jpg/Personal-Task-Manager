import type {
  Goal,
  GoalDraft,
  Habit,
  HabitDraft,
  HabitLog,
  Milestone,
} from "../data/productivity";
import { getBrainDumpUserId, getSupabaseClient } from "./supabase";

type HabitRow = {
  id: string;
  title: string;
  description: string;
  category: Habit["category"];
  days_of_week: number[];
  reminder_time: string | null;
  reminder_enabled: boolean;
  created_at: string;
  updated_at: string;
};

type GoalRow = {
  id: string;
  title: string;
  description: string;
  category: Goal["category"];
  target_date: string | null;
  status: Goal["status"];
  created_at: string;
  updated_at: string;
};

type MilestoneRow = {
  id: string;
  goal_id: string;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
};

function mapHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    daysOfWeek: row.days_of_week,
    reminderTime: row.reminder_time?.slice(0, 5) ?? null,
    reminderEnabled: row.reminder_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGoal(row: GoalRow, milestones: Milestone[]): Goal {
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

function mapMilestone(row: MilestoneRow): Milestone {
  return {
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    isCompleted: row.is_completed,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export async function listHabits(): Promise<Habit[]> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { data, error } = await client
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load your habits. ${error.message}`);
  return data.map(mapHabit);
}

export async function listHabitLogs(): Promise<HabitLog[]> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const pageSize = 1000;
  const logs: HabitLog[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from("habit_logs")
      .select("*")
      .eq("user_id", userId)
      .order("log_date", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Could not load habit history. ${error.message}`);
    logs.push(...data.map((row) => ({
      id: row.id,
      habitId: row.habit_id,
      logDate: row.log_date,
      completedAt: row.completed_at,
    })));
    if (data.length < pageSize) return logs;
  }
}

export async function createHabit(draft: HabitDraft): Promise<Habit> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { data, error } = await client
    .from("habits")
    .insert({
      user_id: userId,
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      days_of_week: draft.daysOfWeek,
      reminder_time: draft.reminderEnabled ? draft.reminderTime : null,
      reminder_enabled: draft.reminderEnabled,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Could not create this habit. ${error.message}`);
  return mapHabit(data);
}

export async function updateHabit(id: string, draft: HabitDraft): Promise<Habit> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { data, error } = await client
    .from("habits")
    .update({
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      days_of_week: draft.daysOfWeek,
      reminder_time: draft.reminderEnabled ? draft.reminderTime : null,
      reminder_enabled: draft.reminderEnabled,
    })
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`Could not update this habit. ${error.message}`);
  return mapHabit(data);
}

export async function deleteHabit(id: string): Promise<void> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { error } = await client.from("habits").delete().eq("user_id", userId).eq("id", id);
  if (error) throw new Error(`Could not delete this habit. ${error.message}`);
}

export async function setHabitCompletion(habitId: string, logDate: string, completed: boolean): Promise<HabitLog | null> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  if (!completed) {
    const { error } = await client
      .from("habit_logs")
      .delete()
      .eq("user_id", userId)
      .eq("habit_id", habitId)
      .eq("log_date", logDate);
    if (error) throw new Error(`Could not update this habit log. ${error.message}`);
    return null;
  }
  const { data, error } = await client
    .from("habit_logs")
    .upsert({
      user_id: userId,
      habit_id: habitId,
      log_date: logDate,
      completed_at: new Date().toISOString(),
    }, { onConflict: "habit_id,log_date" })
    .select("*")
    .single();
  if (error) throw new Error(`Could not save this habit log. ${error.message}`);
  return { id: data.id, habitId: data.habit_id, logDate: data.log_date, completedAt: data.completed_at };
}

export async function listGoals(): Promise<Goal[]> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const [goalsResult, milestonesResult] = await Promise.all([
    client.from("goals").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("milestones").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
  ]);
  if (goalsResult.error) throw new Error(`Could not load your goals. ${goalsResult.error.message}`);
  if (milestonesResult.error) throw new Error(`Could not load your milestones. ${milestonesResult.error.message}`);
  const milestones = milestonesResult.data.map(mapMilestone);
  return goalsResult.data.map((goal) =>
    mapGoal(goal, milestones.filter((item) => item.goalId === goal.id)),
  );
}

export async function createGoal(draft: GoalDraft): Promise<Goal> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { data, error } = await client
    .from("goals")
    .insert({
      user_id: userId,
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      target_date: draft.targetDate,
      status: "active",
    })
    .select("*")
    .single();
  if (error) throw new Error(`Could not create this goal. ${error.message}`);
  return mapGoal(data, []);
}

export async function updateGoal(id: string, draft: GoalDraft, status: Goal["status"]): Promise<GoalRow> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { data, error } = await client
    .from("goals")
    .update({
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      target_date: draft.targetDate,
      status,
    })
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`Could not update this goal. ${error.message}`);
  return data;
}

export async function deleteGoal(id: string): Promise<void> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { error } = await client.from("goals").delete().eq("user_id", userId).eq("id", id);
  if (error) throw new Error(`Could not delete this goal. ${error.message}`);
}

export async function createMilestone(goalId: string, title: string): Promise<Milestone> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { data, error } = await client
    .from("milestones")
    .insert({ user_id: userId, goal_id: goalId, title: title.trim() })
    .select("*")
    .single();
  if (error) throw new Error(`Could not add this milestone. ${error.message}`);
  return mapMilestone(data);
}

export async function updateMilestoneCompletion(id: string, completed: boolean): Promise<Milestone> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { data, error } = await client
    .from("milestones")
    .update({ is_completed: completed, completed_at: completed ? new Date().toISOString() : null })
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`Could not update this milestone. ${error.message}`);
  return mapMilestone(data);
}

export async function deleteMilestone(id: string): Promise<void> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { error } = await client.from("milestones").delete().eq("user_id", userId).eq("id", id);
  if (error) throw new Error(`Could not remove this milestone. ${error.message}`);
}

export async function getGoalTaskLinks(): Promise<Record<string, string[]>> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { data, error } = await client.from("goal_task_links").select("*").eq("user_id", userId);
  if (error) throw new Error(`Could not load goal task links. ${error.message}`);
  return data.reduce<Record<string, string[]>>((result, row) => {
    (result[row.goal_id] ??= []).push(row.task_id);
    return result;
  }, {});
}

export async function setGoalTaskLink(goalId: string, taskId: string, linked: boolean): Promise<void> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  if (linked) {
    const { error } = await client
      .from("goal_task_links")
      .upsert({ user_id: userId, goal_id: goalId, task_id: taskId }, { onConflict: "goal_id,task_id" });
    if (error) throw new Error(`Could not link this task. ${error.message}`);
    return;
  }
  const { error } = await client
    .from("goal_task_links")
    .delete()
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .eq("task_id", taskId);
  if (error) throw new Error(`Could not unlink this task. ${error.message}`);
}
