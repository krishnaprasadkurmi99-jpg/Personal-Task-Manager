import type { ProductivityReview } from "../data/productivity";
import { getBrainDumpUserId, getSupabaseClient } from "./supabase";

export type ProductivityReviewDraft = Pick<ProductivityReview, "wins" | "challenges" | "priorities" | "notes">;

function mapReview(row: {
  id: string;
  week_start: string;
  wins: string;
  challenges: string;
  priorities: string;
  notes: string;
  created_at: string;
  updated_at: string;
}): ProductivityReview {
  return {
    id: row.id,
    weekStart: row.week_start,
    wins: row.wins,
    challenges: row.challenges,
    priorities: row.priorities,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProductivityReview(weekStart: string): Promise<ProductivityReview | null> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { data, error } = await client
    .from("productivity_reviews")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw new Error(`Could not load this weekly review. ${error.message}`);
  return data ? mapReview(data) : null;
}

export async function saveProductivityReview(
  weekStart: string,
  draft: ProductivityReviewDraft,
): Promise<ProductivityReview> {
  const client = getSupabaseClient();
  const userId = await getBrainDumpUserId(client);
  const { data, error } = await client
    .from("productivity_reviews")
    .upsert({
      user_id: userId,
      week_start: weekStart,
      wins: draft.wins.trim(),
      challenges: draft.challenges.trim(),
      priorities: draft.priorities.trim(),
      notes: draft.notes.trim(),
    }, { onConflict: "user_id,week_start" })
    .select("*")
    .single();
  if (error) throw new Error(`Could not save your weekly review. ${error.message}`);
  return mapReview(data);
}
