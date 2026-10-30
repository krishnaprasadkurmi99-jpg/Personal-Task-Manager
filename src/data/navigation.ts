export const workspacePages = [
  "dashboard",
  "tasks",
  "brainDump",
  "planner",
  "focus",
  "habits",
  "goals",
  "productivity",
  "calendar",
  "insights",
] as const;

export type WorkspacePage = (typeof workspacePages)[number];
