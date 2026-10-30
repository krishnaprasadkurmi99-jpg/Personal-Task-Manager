import { useCallback, useEffect, useState } from "react";
import {
  initialTasks,
  taskCategories,
  taskPriorities,
  taskStatuses,
  type DashboardTask,
  type TaskCategory,
  type TaskDraft,
  type TaskPriority,
  type TaskStatus,
  type TaskSubtask,
} from "../data/dashboard";
import { recordTaskCompletion } from "../services/taskCompletionService";
import { isSupabaseConfigured } from "../services/supabase";

const STORAGE_KEY = "mindspace.tasks.v1";

type LoadResult = {
  tasks: DashboardTask[];
  error: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseSubtasks(value: unknown): TaskSubtask[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: TaskSubtask[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.completed !== "boolean"
    ) {
      return null;
    }
    parsed.push({ id: item.id, title: item.title, completed: item.completed });
  }
  return parsed;
}

function parseTask(value: unknown, index: number): DashboardTask | null {
  if (!isRecord(value) || typeof value.title !== "string" || !value.title.trim()) return null;
  const status: TaskStatus =
    taskStatuses.find((candidate) => candidate === value.status) ??
    (value.completed === true ? "Completed" : "To Do");
  const category: TaskCategory = taskCategories.find((candidate) => candidate === value.category) ?? "Other";
  const priority: TaskPriority = taskPriorities.find((candidate) => candidate === value.priority) ?? "Medium";
  const subtasks = parseSubtasks(value.subtasks ?? []);
  if (!subtasks) return null;
  if (value.dueAt !== undefined && value.dueAt !== null && typeof value.dueAt !== "string") return null;
  if (typeof value.dueAt === "string" && Number.isNaN(Date.parse(value.dueAt))) return null;
  for (const key of ["scheduledStartAt", "scheduledEndAt"] as const) {
    const scheduledValue = value[key];
    if (scheduledValue !== undefined && scheduledValue !== null && typeof scheduledValue !== "string") return null;
    if (typeof scheduledValue === "string" && Number.isNaN(Date.parse(scheduledValue))) return null;
  }
  const scheduledStartAt = typeof value.scheduledStartAt === "string" ? value.scheduledStartAt : null;
  const scheduledEndAt = typeof value.scheduledEndAt === "string" ? value.scheduledEndAt : null;
  if (
    (scheduledStartAt === null) !== (scheduledEndAt === null) ||
    scheduledStartAt !== null &&
    scheduledEndAt !== null &&
    Date.parse(scheduledEndAt) <= Date.parse(scheduledStartAt)
  ) return null;
  if (value.tags !== undefined && !isStringArray(value.tags)) return null;

  const now = new Date().toISOString();
  return {
    id: typeof value.id === "string" ? value.id : `restored-${index}`,
    title: value.title.trim(),
    description: typeof value.description === "string" ? value.description : "",
    category,
    tags: isStringArray(value.tags) ? value.tags : [],
    dueAt: typeof value.dueAt === "string" && !Number.isNaN(Date.parse(value.dueAt)) ? value.dueAt : null,
    scheduledStartAt,
    scheduledEndAt,
    priority,
    status,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now,
    completedAt: typeof value.completedAt === "string" ? value.completedAt : status === "Completed" ? now : null,
    subtasks,
  };
}

function loadTasks(): LoadResult {
  if (typeof window === "undefined") return { tasks: initialTasks, error: null };
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return { tasks: initialTasks, error: null };
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return { tasks: initialTasks, error: "Saved tasks could not be read. Sample tasks are shown instead." };
    }
    const tasks: DashboardTask[] = [];
    for (const [index, item] of parsed.entries()) {
      const task = parseTask(item, index);
      if (!task) {
        return { tasks: initialTasks, error: "Saved tasks were incomplete. Sample tasks are shown instead." };
      }
      tasks.push(task);
    }
    return { tasks, error: null };
  } catch {
    return { tasks: initialTasks, error: "Your saved tasks could not be accessed. Sample tasks are shown instead." };
  }
}

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useTasks() {
  const [loaded] = useState(loadTasks);
  const [tasks, setTasks] = useState(loaded.tasks);
  const [storageError, setStorageError] = useState<string | null>(loaded.error);
  const [completionError, setCompletionError] = useState<string | null>(null);

  useEffect(() => {
    if (loaded.error !== null && tasks === loaded.tasks) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      setStorageError(null);
    } catch {
      setStorageError("Changes could not be saved in this browser. Check storage permissions and available space.");
    }
  }, [loaded, tasks]);

  useEffect(() => {
    function syncFromAnotherTab(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || event.newValue === null) return;
      try {
        const parsed: unknown = JSON.parse(event.newValue);
        if (!Array.isArray(parsed)) throw new Error("Saved tasks are not a list.");
        const restored: DashboardTask[] = [];
        for (const [index, item] of parsed.entries()) {
          const task = parseTask(item, index);
          if (!task) throw new Error("A saved task is incomplete.");
          restored.push(task);
        }
        setTasks(restored);
        setStorageError(null);
      } catch {
        setStorageError("Updates from another tab could not be loaded.");
      }
    }

    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, []);

  const createTask = useCallback((draft: TaskDraft) => {
    const now = new Date().toISOString();
    const task: DashboardTask = {
      ...draft,
      id: createId(),
      tags: [...draft.tags],
      createdAt: now,
      updatedAt: now,
      completedAt: draft.status === "Completed" ? now : null,
      subtasks: [],
    };
    setTasks((current) => [task, ...current]);
    if (task.status === "Completed" && isSupabaseConfigured) {
      void recordTaskCompletion(task).then(() => setCompletionError(null)).catch((error: unknown) => {
        setCompletionError(`Task completion analytics could not be saved. ${error instanceof Error ? error.message : "Try again later."}`);
      });
    }
    return task;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<TaskDraft>) => {
    const previous = tasks.find((task) => task.id === id);
    if (previous && previous.status !== "Completed" && patch.status === "Completed" && isSupabaseConfigured) {
      const completedTask = { ...previous, ...patch, completedAt: new Date().toISOString() };
      void recordTaskCompletion(completedTask).then(() => setCompletionError(null)).catch((error: unknown) => {
        setCompletionError(`Task completion analytics could not be saved. ${error instanceof Error ? error.message : "Try again later."}`);
      });
    }
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== id) return task;
        const nextStatus = patch.status ?? task.status;
        return {
          ...task,
          ...patch,
          tags: patch.tags ? [...patch.tags] : task.tags,
          updatedAt: new Date().toISOString(),
          completedAt: nextStatus === "Completed"
            ? task.status === "Completed" ? task.completedAt : new Date().toISOString()
            : null,
        };
      }),
    );
  }, [tasks]);

  const deleteTask = useCallback((id: string) => {
    setTasks((current) => current.filter((task) => task.id !== id));
  }, []);

  const duplicateTask = useCallback((id: string) => {
    const source = tasks.find((task) => task.id === id);
    if (!source) return null;
    const now = new Date().toISOString();
    const duplicate: DashboardTask = {
      ...source,
      id: createId(),
      title: `${source.title} (copy)`,
      tags: [...source.tags],
      scheduledStartAt: null,
      scheduledEndAt: null,
      status: "To Do",
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      subtasks: source.subtasks.map((subtask) => ({
        ...subtask,
        id: createId(),
        completed: false,
      })),
    };
    setTasks((current) => [duplicate, ...current]);
    return duplicate;
  }, [tasks]);

  const addSubtask = useCallback((taskId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const subtask: TaskSubtask = { id: createId(), title: trimmed, completed: false };
    setTasks((current) =>
      current.map((task) => task.id === taskId
        ? { ...task, subtasks: [...task.subtasks, subtask], updatedAt: new Date().toISOString() }
        : task),
    );
  }, []);

  const updateSubtask = useCallback((taskId: string, subtaskId: string, completed: boolean) => {
    setTasks((current) =>
      current.map((task) => task.id === taskId
        ? {
            ...task,
            subtasks: task.subtasks.map((subtask) =>
              subtask.id === subtaskId ? { ...subtask, completed } : subtask,
            ),
            updatedAt: new Date().toISOString(),
          }
        : task),
    );
  }, []);

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((current) =>
      current.map((task) => task.id === taskId
        ? {
            ...task,
            subtasks: task.subtasks.filter((subtask) => subtask.id !== subtaskId),
            updatedAt: new Date().toISOString(),
          }
        : task),
    );
  }, []);

  return {
    tasks,
    storageError: [storageError, completionError].filter(Boolean).join(" ") || null,
    createTask,
    updateTask,
    deleteTask,
    duplicateTask,
    addSubtask,
    updateSubtask,
    deleteSubtask,
  };
}
