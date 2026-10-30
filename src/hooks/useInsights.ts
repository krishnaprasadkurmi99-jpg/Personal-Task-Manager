import { useCallback, useEffect, useState } from "react";
import type { InsightsSnapshot } from "../services/insightsService";
import { getInsightsSnapshot } from "../services/insightsService";
import { isSupabaseConfigured } from "../services/supabase";

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function useInsights() {
  const [snapshot, setSnapshot] = useState<InsightsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(isSupabaseConfigured ? null : "Configure Supabase to load real productivity insights.");

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      setError("Configure Supabase to load real productivity insights.");
      return;
    }
    const end = new Date();
    end.setDate(end.getDate() + 1);
    const start = new Date();
    start.setDate(start.getDate() - 34);
    setIsLoading(true);
    try {
      setSnapshot(await getInsightsSnapshot(localDayKey(start), localDayKey(end)));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Productivity insights could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { snapshot, isLoading, error, reload, isConfigured: isSupabaseConfigured };
}
