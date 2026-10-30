import { useCallback, useEffect, useState } from "react";
import type { Habit, HabitDraft, HabitLog } from "../data/productivity";
import {
  createHabit,
  deleteHabit,
  listHabitLogs,
  listHabits,
  setHabitCompletion,
  updateHabit,
} from "../services/habitGoalService";
import { isSupabaseConfigured } from "../services/supabase";

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(isSupabaseConfigured ? null : "Configure Supabase to save habits.");

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      setError("Configure Supabase to save habits.");
      return;
    }
    setIsLoading(true);
    try {
      const [nextHabits, nextLogs] = await Promise.all([listHabits(), listHabitLogs()]);
      setHabits(nextHabits);
      setLogs(nextLogs);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Habits could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(async (draft: HabitDraft) => {
    const saved = await createHabit(draft);
    setHabits((current) => [saved, ...current]);
    return saved;
  }, []);

  const update = useCallback(async (id: string, draft: HabitDraft) => {
    const saved = await updateHabit(id, draft);
    setHabits((current) => current.map((habit) => habit.id === id ? saved : habit));
    return saved;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteHabit(id);
    setHabits((current) => current.filter((habit) => habit.id !== id));
    setLogs((current) => current.filter((log) => log.habitId !== id));
  }, []);

  const setCompleted = useCallback(async (habitId: string, logDate: string, completed: boolean) => {
    const saved = await setHabitCompletion(habitId, logDate, completed);
    setLogs((current) => [
      ...current.filter((log) => !(log.habitId === habitId && log.logDate === logDate)),
      ...(saved ? [saved] : []),
    ]);
  }, []);

  return { habits, logs, isLoading, error, reload, create, update, remove, setCompleted, isConfigured: isSupabaseConfigured };
}
