import type { DashboardTask } from "../data/dashboard";
import { getBrainDumpUserId, getSupabaseClient, isSupabaseConfigured } from "./supabase";

export async function recordTaskCompletion(task: DashboardTask): Promise<void> {
  if (!isSupabaseConfigured || !task.completedAt) return;
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { error } = await client.from("task_completion_events").insert({
    user_id: userId,
    task_id: task.id,
    task_title: task.title,
    category: task.category,
    priority: task.priority,
    completed_at: task.completedAt,
  });
  if (error) throw new Error(error.message);
}
