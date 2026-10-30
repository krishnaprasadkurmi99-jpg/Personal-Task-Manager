export const taskPriorities = ["Urgent", "High", "Medium", "Low"] as const;
export const taskStatuses = ["To Do", "In Progress", "Completed"] as const;
export const taskCategories = ["Work", "Personal", "Study", "Health", "Other"] as const;

export type TaskPriority = (typeof taskPriorities)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskCategory = (typeof taskCategories)[number];

export type TaskSubtask = {
  id: string;
  title: string;
  completed: boolean;
};

export type DashboardTask = {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  tags: string[];
  dueAt: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  subtasks: TaskSubtask[];
};

export type TaskDraft = Omit<DashboardTask, "id" | "createdAt" | "updatedAt" | "completedAt" | "subtasks">;

export type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  kind: "completed" | "created" | "focus";
};

function atTime(dayOffset: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function seededTask(
  task: Omit<DashboardTask, "createdAt" | "updatedAt" | "completedAt" | "subtasks"> &
    Partial<Pick<DashboardTask, "completedAt" | "subtasks">>,
): DashboardTask {
  const createdAt = atTime(-1, 9);
  return {
    ...task,
    createdAt,
    updatedAt: createdAt,
    completedAt: task.completedAt ?? null,
    subtasks: task.subtasks ?? [],
  };
}

export const initialTasks: DashboardTask[] = [
  seededTask({
    id: "task-1",
    title: "Send the revised proposal to Olivia",
    description: "Polish the pricing section and send the proposal before the client check-in.",
    category: "Work",
    tags: ["client", "writing"],
    dueAt: atTime(0, 10),
    scheduledStartAt: null,
    scheduledEndAt: null,
    priority: "High",
    status: "To Do",
  }),
  seededTask({
    id: "task-2",
    title: "Review Q4 product strategy",
    description: "Review the quarterly priorities and leave feedback for the team.",
    category: "Work",
    tags: ["planning", "team"],
    dueAt: atTime(0, 14, 30),
    scheduledStartAt: null,
    scheduledEndAt: null,
    priority: "High",
    status: "In Progress",
    subtasks: [
      { id: "subtask-1", title: "Read the strategy brief", completed: true },
      { id: "subtask-2", title: "Add comments to the roadmap", completed: false },
    ],
  }),
  seededTask({
    id: "task-3",
    title: "Book a table for Friday",
    description: "",
    category: "Personal",
    tags: [],
    dueAt: atTime(0, 17),
    scheduledStartAt: null,
    scheduledEndAt: null,
    priority: "Low",
    status: "To Do",
  }),
  seededTask({
    id: "task-4",
    title: "Share design notes with the team",
    description: "Send the updated notes and final mockup links to the product channel.",
    category: "Work",
    tags: ["design"],
    dueAt: atTime(-1, 16),
    scheduledStartAt: null,
    scheduledEndAt: null,
    priority: "Medium",
    status: "To Do",
  }),
  seededTask({
    id: "task-5",
    title: "Prepare the product launch brief",
    description: "Bring together launch messaging, key dates, and owner assignments.",
    category: "Work",
    tags: ["launch", "writing"],
    dueAt: atTime(-1, 11),
    scheduledStartAt: null,
    scheduledEndAt: null,
    priority: "Urgent",
    status: "To Do",
  }),
  seededTask({
    id: "task-6",
    title: "Pick up the new journal",
    description: "",
    category: "Personal",
    tags: [],
    dueAt: atTime(1, 12),
    scheduledStartAt: null,
    scheduledEndAt: null,
    priority: "Low",
    status: "To Do",
  }),
  seededTask({
    id: "task-7",
    title: "Outline next week's priorities",
    description: "Choose three outcomes to focus on next week.",
    category: "Work",
    tags: ["planning"],
    dueAt: atTime(2, 15),
    scheduledStartAt: null,
    scheduledEndAt: null,
    priority: "Medium",
    status: "To Do",
  }),
  seededTask({
    id: "task-8",
    title: "Morning pages",
    description: "Take ten quiet minutes to write without editing.",
    category: "Personal",
    tags: ["ritual"],
    dueAt: atTime(1, 9),
    scheduledStartAt: null,
    scheduledEndAt: null,
    priority: "Low",
    status: "To Do",
  }),
  ...([
    ["task-9", "Finish the onboarding notes", "Work"],
    ["task-10", "Take a mindful lunch break", "Health"],
    ["task-11", "Send the weekly update", "Work"],
    ["task-12", "Clear the reading list", "Study"],
  ] as const satisfies readonly [string, string, TaskCategory][]).map(([id, title, category], index) =>
    seededTask({
      id,
      title,
      description: "",
      category,
      tags: [],
      dueAt: null,
      scheduledStartAt: null,
      scheduledEndAt: null,
      priority: "Low",
      status: "Completed",
      completedAt: atTime(0, 8 + index),
    }),
  ),
];
