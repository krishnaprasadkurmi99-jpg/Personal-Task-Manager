import type {
  DailyPlan,
  FocusSession,
  Goal,
  Habit,
} from "./productivity";
import type { BrainDumpNote } from "./brainDump";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BrainDumpRow = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: BrainDumpNote["category"];
  tags: string[];
  is_pinned: boolean;
  is_archived: boolean;
  converted_task_id: string | null;
  created_at: string;
  updated_at: string;
};

type DailyPlanRow = {
  id: string;
  user_id: string;
  plan_date: string;
  working_start_time: string;
  working_end_time: string;
  energy_level: DailyPlan["energyLevel"];
  break_interval_minutes: number;
  break_duration_minutes: number;
  blocks: Json;
  created_at: string;
  updated_at: string;
};

type FocusSessionRow = {
  id: string;
  user_id: string;
  task_id: string | null;
  task_title: string | null;
  planned_duration_minutes: number;
  actual_duration_minutes: number;
  started_at: string;
  completed_at: string | null;
  status: FocusSession["status"];
  created_at: string;
};

type HabitRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: Habit["category"];
  days_of_week: number[];
  reminder_time: string | null;
  reminder_enabled: boolean;
  created_at: string;
  updated_at: string;
};

type HabitLogRow = {
  id: string;
  user_id: string;
  habit_id: string;
  log_date: string;
  completed_at: string | null;
};

type GoalRow = {
  id: string;
  user_id: string;
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
  user_id: string;
  goal_id: string;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
};

type GoalTaskLinkRow = {
  id: string;
  user_id: string;
  goal_id: string;
  task_id: string;
  created_at: string;
};

type ProductivityReviewRow = {
  id: string;
  user_id: string;
  week_start: string;
  wins: string;
  challenges: string;
  priorities: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

type UserSettingsRow = {
  user_id: string;
  working_start_time: string;
  working_end_time: string;
  energy_level: DailyPlan["energyLevel"];
  break_interval_minutes: number;
  break_duration_minutes: number;
  focus_duration_minutes: number;
  short_break_minutes: number;
  long_break_minutes: number;
  long_break_interval: number;
  updated_at: string;
};

type TaskCompletionEventRow = {
  id: string;
  user_id: string;
  task_id: string;
  task_title: string;
  category: string;
  priority: string;
  completed_at: string;
};

type TableShape<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type OwnedInsert<Row, Optional extends keyof Row = Extract<keyof Row, "id" | "created_at" | "updated_at">> =
  Omit<Row, "user_id" | Optional> & { user_id: string } & Partial<Pick<Row, Extract<Optional, keyof Row>>>;

type OwnedUpdate<Row, Immutable extends keyof Row = Extract<keyof Row, "id" | "user_id" | "created_at">> =
  Partial<Omit<Row, Immutable>>;

export type Database = {
  public: {
    Tables: {
      brain_dumps: TableShape<
        BrainDumpRow,
        OwnedInsert<BrainDumpRow> & { title: string; content: string; category?: BrainDumpRow["category"]; tags?: string[]; is_pinned?: boolean; is_archived?: boolean; converted_task_id?: string | null },
        OwnedUpdate<BrainDumpRow>
      >;
      daily_plans: TableShape<
        DailyPlanRow,
        OwnedInsert<DailyPlanRow> & { plan_date: string; working_start_time: string; working_end_time: string; energy_level: DailyPlanRow["energy_level"]; break_interval_minutes: number; break_duration_minutes: number; blocks: Json },
        OwnedUpdate<DailyPlanRow>
      >;
      focus_sessions: TableShape<
        FocusSessionRow,
        OwnedInsert<FocusSessionRow, "id" | "created_at"> & { task_id?: string | null; task_title?: string | null; planned_duration_minutes: number; actual_duration_minutes: number; started_at: string; completed_at?: string | null; status: FocusSessionRow["status"] },
        OwnedUpdate<FocusSessionRow>
      >;
      habits: TableShape<
        HabitRow,
        OwnedInsert<HabitRow> & { title: string; description?: string; category: HabitRow["category"]; days_of_week: number[]; reminder_time?: string | null; reminder_enabled?: boolean },
        OwnedUpdate<HabitRow>
      >;
      habit_logs: TableShape<
        HabitLogRow,
        OwnedInsert<HabitLogRow, "id"> & { habit_id: string; log_date: string; completed_at?: string | null },
        OwnedUpdate<HabitLogRow>
      >;
      goals: TableShape<
        GoalRow,
        OwnedInsert<GoalRow> & { title: string; description?: string; category: GoalRow["category"]; target_date?: string | null; status?: GoalRow["status"] },
        OwnedUpdate<GoalRow>
      >;
      milestones: TableShape<
        MilestoneRow,
        OwnedInsert<MilestoneRow, "id" | "created_at" | "is_completed" | "completed_at"> & { goal_id: string; title: string; is_completed?: boolean; completed_at?: string | null },
        OwnedUpdate<MilestoneRow>
      >;
      goal_task_links: TableShape<
        GoalTaskLinkRow,
        OwnedInsert<GoalTaskLinkRow, "id" | "created_at"> & { goal_id: string; task_id: string },
        OwnedUpdate<GoalTaskLinkRow>
      >;
      productivity_reviews: TableShape<
        ProductivityReviewRow,
        OwnedInsert<ProductivityReviewRow> & { week_start: string; wins?: string; challenges?: string; priorities?: string; notes?: string },
        OwnedUpdate<ProductivityReviewRow>
      >;
      user_settings: TableShape<
        UserSettingsRow,
        Omit<UserSettingsRow, "updated_at"> & { updated_at?: string },
        OwnedUpdate<UserSettingsRow, "user_id">
      >;
      task_completion_events: TableShape<
        TaskCompletionEventRow,
        OwnedInsert<TaskCompletionEventRow, "id" | "completed_at"> & { task_id: string; task_title: string; category: string; priority: string },
        OwnedUpdate<TaskCompletionEventRow>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
