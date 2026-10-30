import type { FocusSession, FocusSessionDraft } from "../data/productivity";
import { getBrainDumpUserId, getSupabaseClient } from "./supabase";

export async function getFocusSessions(limit = 100): Promise<FocusSession[]> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { data, error } = await client
    .from("focus_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not load focus history. ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    taskId: row.task_id,
    taskTitle: row.task_title,
    plannedDurationMinutes: row.planned_duration_minutes,
    actualDurationMinutes: row.actual_duration_minutes,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function saveFocusSession(session: FocusSessionDraft): Promise<FocusSession> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { data, error } = await client
    .from("focus_sessions")
    .insert({
      user_id: userId,
      task_id: session.taskId,
      task_title: session.taskTitle,
      planned_duration_minutes: session.plannedDurationMinutes,
      actual_duration_minutes: session.actualDurationMinutes,
      started_at: session.startedAt,
      completed_at: session.completedAt,
      status: session.status,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Could not save this focus session. ${error.message}`);
  return {
    id: data.id,
    taskId: data.task_id,
    taskTitle: data.task_title,
    plannedDurationMinutes: data.planned_duration_minutes,
    actualDurationMinutes: data.actual_duration_minutes,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    status: data.status,
    createdAt: data.created_at,
  };
}
