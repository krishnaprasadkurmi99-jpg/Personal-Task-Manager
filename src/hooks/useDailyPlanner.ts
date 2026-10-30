import { useCallback, useEffect, useState } from "react";
import type { DailyPlan, DailyPlanDraft, PlannerSettings } from "../data/productivity";
import { getDailyPlan, getPlannerSettings, saveDailyPlan, savePlannerSettings } from "../services/plannerService";
import { isSupabaseConfigured } from "../services/supabase";

export function useDailyPlanner(planDate: string) {
  const [settings, setSettings] = useState<PlannerSettings | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(isSupabaseConfigured ? null : "Configure Supabase to save daily plans.");

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      setError("Configure Supabase to save daily plans.");
      return;
    }
    setIsLoading(true);
    try {
      const [nextSettings, nextPlan] = await Promise.all([getPlannerSettings(), getDailyPlan(planDate)]);
      setSettings(nextSettings);
      setPlan(nextPlan);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The daily plan could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [planDate]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateSettings = useCallback(async (next: PlannerSettings) => {
    setIsSaving(true);
    try {
      const saved = await savePlannerSettings(next);
      setSettings(saved);
      setError(null);
      return saved;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Planning preferences could not be saved.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const save = useCallback(async (draft: DailyPlanDraft) => {
    setIsSaving(true);
    try {
      const saved = await saveDailyPlan(draft);
      setPlan(saved);
      setError(null);
      return saved;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "This daily plan could not be saved.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    settings,
    plan,
    isLoading,
    isSaving,
    error,
    isConfigured: isSupabaseConfigured,
    reload,
    updateSettings,
    save,
  };
}
