import type { DailyPlan, DailyPlanDraft, PlannedBlock, PlannerSettings } from "../data/productivity";
import type { Json } from "../data/database.types";
import { getBrainDumpUserId, getSupabaseClient } from "./supabase";

export const defaultPlannerSettings: PlannerSettings = {
  workingStartTime: "09:00",
  workingEndTime: "17:00",
  energyLevel: "Balanced",
  breakIntervalMinutes: 90,
  breakDurationMinutes: 10,
  focusDurationMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePlanBlocks(value: Json): PlannedBlock[] {
  if (!Array.isArray(value)) throw new Error("The saved daily plan has an invalid schedule.");
  return value.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.startAt !== "string" ||
      typeof item.endAt !== "string" ||
      typeof item.durationMinutes !== "number" ||
      !Number.isFinite(Date.parse(item.startAt)) ||
      !Number.isFinite(Date.parse(item.endAt)) ||
      item.durationMinutes <= 0
    ) {
      throw new Error("A saved schedule item is incomplete.");
    }
    if (typeof item.taskId !== "string" && item.title === "Short break") {
      return {
        id: item.id,
        title: "Short break" as const,
        startAt: item.startAt,
        endAt: item.endAt,
        durationMinutes: item.durationMinutes,
      };
    }
    if (
      typeof item.taskId !== "string" ||
      !["Urgent", "High", "Medium", "Low"].includes(String(item.priority)) ||
      !["Work", "Personal", "Study", "Health", "Other"].includes(String(item.category))
    ) {
      throw new Error("A saved task in the daily plan is incomplete.");
    }
    return {
      id: item.id,
      taskId: item.taskId,
      title: item.title,
      priority: item.priority as "Urgent" | "High" | "Medium" | "Low",
      category: item.category as "Work" | "Personal" | "Study" | "Health" | "Other",
      startAt: item.startAt,
      endAt: item.endAt,
      durationMinutes: item.durationMinutes,
    };
  });
}

function mapPlan(row: {
  id: string;
  plan_date: string;
  working_start_time: string;
  working_end_time: string;
  energy_level: DailyPlan["energyLevel"];
  break_interval_minutes: number;
  break_duration_minutes: number;
  blocks: Json;
  created_at: string;
  updated_at: string;
}): DailyPlan {
  return {
    id: row.id,
    planDate: row.plan_date,
    workingStartTime: row.working_start_time.slice(0, 5),
    workingEndTime: row.working_end_time.slice(0, 5),
    energyLevel: row.energy_level,
    breakIntervalMinutes: row.break_interval_minutes,
    breakDurationMinutes: row.break_duration_minutes,
    blocks: parsePlanBlocks(row.blocks),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPlannerSettings(): Promise<PlannerSettings> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { data, error } = await client
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load your planning preferences. ${error.message}`);
  if (data) {
    return {
      workingStartTime: data.working_start_time.slice(0, 5),
      workingEndTime: data.working_end_time.slice(0, 5),
      energyLevel: data.energy_level,
      breakIntervalMinutes: data.break_interval_minutes,
      breakDurationMinutes: data.break_duration_minutes,
      focusDurationMinutes: data.focus_duration_minutes,
      shortBreakMinutes: data.short_break_minutes,
      longBreakMinutes: data.long_break_minutes,
      longBreakInterval: data.long_break_interval,
    };
  }

  const { data: inserted, error: insertError } = await client
    .from("user_settings")
    .insert({
      user_id: userId,
      working_start_time: defaultPlannerSettings.workingStartTime,
      working_end_time: defaultPlannerSettings.workingEndTime,
      energy_level: defaultPlannerSettings.energyLevel,
      break_interval_minutes: defaultPlannerSettings.breakIntervalMinutes,
      break_duration_minutes: defaultPlannerSettings.breakDurationMinutes,
      focus_duration_minutes: defaultPlannerSettings.focusDurationMinutes,
      short_break_minutes: defaultPlannerSettings.shortBreakMinutes,
      long_break_minutes: defaultPlannerSettings.longBreakMinutes,
      long_break_interval: defaultPlannerSettings.longBreakInterval,
    })
    .select("*")
    .single();
  if (insertError) throw new Error(`Could not initialize your planning preferences. ${insertError.message}`);
  return {
    workingStartTime: inserted.working_start_time.slice(0, 5),
    workingEndTime: inserted.working_end_time.slice(0, 5),
    energyLevel: inserted.energy_level,
    breakIntervalMinutes: inserted.break_interval_minutes,
    breakDurationMinutes: inserted.break_duration_minutes,
    focusDurationMinutes: inserted.focus_duration_minutes,
    shortBreakMinutes: inserted.short_break_minutes,
    longBreakMinutes: inserted.long_break_minutes,
    longBreakInterval: inserted.long_break_interval,
  };
}

export async function savePlannerSettings(settings: PlannerSettings): Promise<PlannerSettings> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { data, error } = await client
    .from("user_settings")
    .upsert({
      user_id: userId,
      working_start_time: settings.workingStartTime,
      working_end_time: settings.workingEndTime,
      energy_level: settings.energyLevel,
      break_interval_minutes: settings.breakIntervalMinutes,
      break_duration_minutes: settings.breakDurationMinutes,
      focus_duration_minutes: settings.focusDurationMinutes,
      short_break_minutes: settings.shortBreakMinutes,
      long_break_minutes: settings.longBreakMinutes,
      long_break_interval: settings.longBreakInterval,
    }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw new Error(`Could not save your planning preferences. ${error.message}`);
  return {
    workingStartTime: data.working_start_time.slice(0, 5),
    workingEndTime: data.working_end_time.slice(0, 5),
    energyLevel: data.energy_level,
    breakIntervalMinutes: data.break_interval_minutes,
    breakDurationMinutes: data.break_duration_minutes,
    focusDurationMinutes: data.focus_duration_minutes,
    shortBreakMinutes: data.short_break_minutes,
    longBreakMinutes: data.long_break_minutes,
    longBreakInterval: data.long_break_interval,
  };
}

export async function getDailyPlan(planDate: string): Promise<DailyPlan | null> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { data, error } = await client
    .from("daily_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_date", planDate)
    .maybeSingle();
  if (error) throw new Error(`Could not load this day's plan. ${error.message}`);
  return data ? mapPlan(data) : null;
}

export async function saveDailyPlan(draft: DailyPlanDraft): Promise<DailyPlan> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const blocks: Json[] = draft.blocks.map((block) => ({ ...block }));
  const { data, error } = await client
    .from("daily_plans")
    .upsert({
      user_id: userId,
      plan_date: draft.planDate,
      working_start_time: draft.workingStartTime,
      working_end_time: draft.workingEndTime,
      energy_level: draft.energyLevel,
      break_interval_minutes: draft.breakIntervalMinutes,
      break_duration_minutes: draft.breakDurationMinutes,
      blocks,
    }, { onConflict: "user_id,plan_date" })
    .select("*")
    .single();
  if (error) throw new Error(`Could not save this day's plan. ${error.message}`);
  return mapPlan(data);
}
