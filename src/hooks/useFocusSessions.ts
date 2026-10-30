import { useCallback, useEffect, useState } from "react";
import type { FocusSession, FocusSessionDraft } from "../data/productivity";
import { isSupabaseConfigured } from "../services/supabase";
import { getFocusSessions, saveFocusSession } from "../services/focusService";

export function useFocusSessions(limit = 100) {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(isSupabaseConfigured ? null : "Configure Supabase to save focus history.");

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      setError("Configure Supabase to save focus history.");
      return;
    }
    setIsLoading(true);
    try {
      setSessions(await getFocusSessions(limit));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Focus history could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const recordSession = useCallback(async (draft: FocusSessionDraft) => {
    const saved = await saveFocusSession(draft);
    setSessions((current) => [saved, ...current]);
    setError(null);
    return saved;
  }, []);

  return { sessions, isLoading, error, reload, recordSession, isConfigured: isSupabaseConfigured };
}
