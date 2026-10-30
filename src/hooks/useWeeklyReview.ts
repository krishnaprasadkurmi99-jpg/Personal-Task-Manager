import { useCallback, useEffect, useState } from "react";
import type { ProductivityReview } from "../data/productivity";
import { isSupabaseConfigured } from "../services/supabase";
import { getProductivityReview, saveProductivityReview, type ProductivityReviewDraft } from "../services/reviewService";

export function useWeeklyReview(weekStart: string) {
  const [review, setReview] = useState<ProductivityReview | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(isSupabaseConfigured ? null : "Configure Supabase to save weekly reviews.");

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      setError("Configure Supabase to save weekly reviews.");
      return;
    }
    setIsLoading(true);
    try {
      setReview(await getProductivityReview(weekStart));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The weekly review could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(async (draft: ProductivityReviewDraft) => {
    setIsSaving(true);
    try {
      const saved = await saveProductivityReview(weekStart, draft);
      setReview(saved);
      setError(null);
      return saved;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The weekly review could not be saved.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [weekStart]);

  return { review, isLoading, isSaving, error, reload, save, isConfigured: isSupabaseConfigured };
}
