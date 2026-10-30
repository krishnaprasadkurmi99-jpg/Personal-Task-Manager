# MINDSPACE

Clear Your Mind. Own Your Time. Build Your Future.

## Getting started

- Node.js 20.19+ or 22.12+
- npm

In Windows PowerShell, use `npm.cmd` (or use `npm` in other shells) to install
dependencies and start the development server:

```bash
npm.cmd install
npm.cmd run dev
```

Create a production build with `npm.cmd run build`, or serve the build locally
with `npm.cmd run preview`.

## Stage 1

The initial foundation includes React, TypeScript, Vite, Tailwind CSS, Framer
Motion, Lucide, Recharts, and the Supabase client, along with MINDSPACE's
responsive dark visual identity and global design tokens.

## Stage 2

The dashboard uses realistic sample task data. Tasks added from the **New
task** action and task status changes are shared with the task manager and
saved in browser local storage. The dashboard's task counts and productivity
score are derived from that shared task state. The date and clock use the local
system time. Later-stage destinations become available as their modules are
implemented. The original MINDSPACE introduction remains available from the
sidebar brand.

## Stage 3

**My Tasks** provides list and Kanban board views, task creation and editing,
priority/status/category/tag/deadline fields, search and filters, sorting,
drag-and-drop status changes, duplication, confirmed deletion, and task
details with subtasks. Task state is stored in `localStorage` and synchronized
between tabs. If saved data cannot be read or written, the interface reports
the storage issue instead of silently treating the change as saved.

To try it, run `npm.cmd run dev`, open **My Tasks** in the sidebar, create and
edit a task, try the search and filters, switch board views to move tasks
between status columns, and refresh the browser to verify that tasks persist.
The **Dashboard** shares the same task state and updates its task statistics
when tasks change.

## Stage 4

**Calendar** adds month, week, and day views, date navigation, and a daily
agenda for scheduled tasks and upcoming deadlines. Schedule or reschedule an
existing task without creating a duplicate; its original task details and due
date are preserved. Drag calendar events to another date or time slot to move
them.

Independent time blocks can be created, edited, moved, and deleted with
confirmation. Task schedules stay in the shared task store, while time blocks
use their own `localStorage` key and synchronize between tabs. In-app
notifications are derived from approaching deadlines, overdue tasks, and
upcoming scheduled tasks and time blocks, rather than stored as duplicate
records. The calendar reports local-storage errors in the interface.

To try it, open **Calendar**, switch between Month, Week, and Day, schedule an
existing task, and create a time block. Move events by dragging them to a date
or time slot, refresh to verify persistence, and return to **Dashboard** or
**My Tasks** to confirm the same task records remain available. On a narrow
screen, open navigation with the menu button to change sections.

## Stage 5

**Brain Dump** is a manual, private notes space. Write and edit notes, search
their titles, content, and tags, filter by category, pin notes, archive or
restore them, and permanently delete them with confirmation. Convert a note
into an existing task with a chosen priority and optional due date; the note
itself is kept unchanged.

Notes are stored in Supabase, not browser local storage. To configure the
feature:

1. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` from your Supabase project's API settings. Use only
   the public anon key in frontend configuration; never put a service-role key
   in this app.
2. Apply `supabase/migrations/20261030000000_create_brain_dumps.sql` to the
   project database.
3. Enable anonymous sign-ins in Supabase Authentication. Brain Dump creates a
   persistent anonymous Supabase session and the database policies restrict
   each session to its own notes. Anonymous notes are tied to that browser's
   persisted session and are not an account-recovery mechanism.
4. Restart `npm.cmd run dev`, open **Brain Dump**, save a note, then test edit,
   search, category filters, tags, pinning, archive/restore, delete, and task
   conversion. Refresh to confirm the notes load again from Supabase.

If Supabase is not configured or a request fails, Brain Dump shows the error
and does not claim that a note was saved. MINDSPACE has no AI integrations,
assistant, provider keys, or AI-specific database tables.

## Stage 6 — Smart Planner

The Smart Planner uses deterministic TypeScript scheduling rules. Select open
tasks, set estimates, working hours, energy level and break preferences, then
review the generated schedule before saving it. Priority and deadlines order
tasks first; energy level provides a duration-based tie-breaker. You can move
or remove plan blocks and add breaks. Saved task blocks update the original
task's schedule fields, which are shared with Calendar.

## Stage 7 — Focus Room

Focus Room offers configurable focus and break timers, pause/resume/reset,
optional task association, local recovery of the active timer, focus history,
and daily focus totals. Completed focus sessions are stored in Supabase. Its
optional soft ambient tone is synthesized by the browser and does not load
third-party audio.

## Stage 8 — Habits and Goals

Habits support schedule days, categories, reminders, daily completion, weekly
and monthly heatmaps, completion rates, and current/longest streaks. Goals
support target dates, categories, completion status, milestones, linked tasks,
and progress derived from milestones or linked task completion. These records
are stored in Supabase.

## Stage 9 — Productivity Center

The manual Productivity Center provides task priority adjustments, links to
daily planning and task organization, active goal review, and a private weekly
review for wins, challenges, upcoming priorities, and notes. Weekly reviews are
stored in Supabase.

## Stage 10 — Insights

Insights are computed from real Supabase task-completion events, focus
sessions, habit logs, and goals. New task completion events are recorded when
a task is completed while Supabase is configured. Historical tasks completed
before event tracking are not backfilled. Empty states are shown when records
are insufficient; no sample analytics are presented.

## Supabase setup for Stages 6–10

Use the same public Supabase URL and anon key described in Stage 5, and enable
anonymous sign-ins. Apply the migrations in filename order:

1. `supabase/migrations/20261030000000_create_brain_dumps.sql`
2. `supabase/migrations/20261030010000_productivity_modules.sql`
3. `supabase/migrations/20261030020000_goal_task_links.sql`

Each user-owned table enables row-level security and scopes access to the
current Supabase user. This project uses anonymous sessions rather than a full
registration/login flow; browser-persisted anonymous data is not recoverable
through account credentials. Until Supabase is configured, server-backed
modules display a connection state and do not simulate successful persistence.

Run `npm.cmd run build` to type-check and create the production bundle. Start
`npm.cmd run dev` to explore the dashboard and navigate between modules.
