import { useCallback, useEffect, useState } from "react";
import type { Goal, GoalDraft } from "../data/productivity";
import {
  createGoal,
  createMilestone,
  deleteGoal,
  deleteMilestone,
  getGoalTaskLinks,
  listGoals,
  setGoalTaskLink,
  updateGoal,
  updateMilestoneCompletion,
} from "../services/habitGoalService";
import { isSupabaseConfigured } from "../services/supabase";

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [taskLinks, setTaskLinks] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(isSupabaseConfigured ? null : "Configure Supabase to save goals.");

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      setError("Configure Supabase to save goals.");
      return;
    }
    setIsLoading(true);
    try {
      const [nextGoals, nextLinks] = await Promise.all([listGoals(), getGoalTaskLinks()]);
      setGoals(nextGoals);
      setTaskLinks(nextLinks);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Goals could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(async (draft: GoalDraft) => {
    const saved = await createGoal(draft);
    setGoals((current) => [saved, ...current]);
    return saved;
  }, []);

  const update = useCallback(async (goal: Goal, draft: GoalDraft, status: Goal["status"]) => {
    const row = await updateGoal(goal.id, draft, status);
    setGoals((current) => current.map((item) => item.id === goal.id
      ? { ...item, title: row.title, description: row.description, category: row.category, targetDate: row.target_date, status: row.status, updatedAt: row.updated_at }
      : item));
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteGoal(id);
    setGoals((current) => current.filter((goal) => goal.id !== id));
    setTaskLinks((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const addMilestone = useCallback(async (goalId: string, title: string) => {
    const milestone = await createMilestone(goalId, title);
    setGoals((current) => current.map((goal) => goal.id === goalId
      ? { ...goal, milestones: [...goal.milestones, milestone] }
      : goal));
    return milestone;
  }, []);

  const setMilestoneCompleted = useCallback(async (goalId: string, milestoneId: string, completed: boolean) => {
    const milestone = await updateMilestoneCompletion(milestoneId, completed);
    setGoals((current) => current.map((goal) => goal.id === goalId
      ? { ...goal, milestones: goal.milestones.map((item) => item.id === milestoneId ? milestone : item) }
      : goal));
  }, []);

  const removeMilestone = useCallback(async (goalId: string, milestoneId: string) => {
    await deleteMilestone(milestoneId);
    setGoals((current) => current.map((goal) => goal.id === goalId
      ? { ...goal, milestones: goal.milestones.filter((item) => item.id !== milestoneId) }
      : goal));
  }, []);

  const linkTask = useCallback(async (goalId: string, taskId: string, linked: boolean) => {
    await setGoalTaskLink(goalId, taskId, linked);
    setTaskLinks((current) => {
      const currentIds = current[goalId] ?? [];
      return {
        ...current,
        [goalId]: linked
          ? currentIds.includes(taskId) ? currentIds : [...currentIds, taskId]
          : currentIds.filter((id) => id !== taskId),
      };
    });
  }, []);

  return {
    goals,
    taskLinks,
    isLoading,
    error,
    reload,
    create,
    update,
    remove,
    addMilestone,
    setMilestoneCompleted,
    removeMilestone,
    linkTask,
    isConfigured: isSupabaseConfigured,
  };
}
