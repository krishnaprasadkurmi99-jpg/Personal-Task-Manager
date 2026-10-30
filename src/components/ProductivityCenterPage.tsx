import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  Flag,
  ListTodo,
  Menu,
  Save,
  Target,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { taskPriorities, type DashboardTask, type TaskDraft, type TaskPriority } from "../data/dashboard";
import type { WorkspacePage } from "../data/navigation";
import type { ProductivityReview } from "../data/productivity";
import { useFocusSessions } from "../hooks/useFocusSessions";
import { useGoals } from "../hooks/useGoals";
import { useWeeklyReview } from "../hooks/useWeeklyReview";
import { DashboardSidebar } from "./DashboardSidebar";

type ReviewFields = Pick<ProductivityReview, "wins" | "challenges" | "priorities" | "notes">;
const blankReview: ReviewFields = { wins: "", challenges: "", priorities: "", notes: "" };
const priorityRank: Record<TaskPriority, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

function mondayKey(date: Date): string {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

function dateRange(weekStart: string): { start: Date; end: Date; label: string } {
  const [year, month, day] = weekStart.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(year, month - 1, day + 6);
  return {
    start,
    end,
    label: `${start.toLocaleDateString([], { month: "short", day: "numeric" })} – ${end.toLocaleDateString([], { month: "short", day: "numeric" })}`,
  };
}

function completedThisWeek(tasks: DashboardTask[], start: Date, end: Date): number {
  return tasks.filter((task) => {
    if (!task.completedAt) return false;
    const completedAt = new Date(task.completedAt);
    return completedAt >= start && completedAt < new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
  }).length;
}

export function ProductivityCenterPage({
  tasks,
  onUpdateTask,
  onNavigate,
  onOpenWelcome,
}: {
  tasks: DashboardTask[];
  onUpdateTask: (id: string, patch: Partial<TaskDraft>) => void;
  onNavigate: (page: WorkspacePage) => void;
  onOpenWelcome: () => void;
}) {
  const [weekStart, setWeekStart] = useState(() => mondayKey(new Date()));
  const [fields, setFields] = useState<ReviewFields>(blankReview);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const review = useWeeklyReview(weekStart);
  const focus = useFocusSessions();
  const goals = useGoals();
  const range = useMemo(() => dateRange(weekStart), [weekStart]);
  const activeTasks = tasks.filter((task) => task.status !== "Completed");
  const sortedTasks = [...activeTasks].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] ||
    (a.dueAt ? Date.parse(a.dueAt) : Number.MAX_SAFE_INTEGER) - (b.dueAt ? Date.parse(b.dueAt) : Number.MAX_SAFE_INTEGER));
  const completedTasksCount = completedThisWeek(tasks, range.start, range.end);
  const focusMinutes = focus.sessions
    .filter((session) => session.status === "completed" && new Date(session.startedAt) >= range.start && new Date(session.startedAt) < new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate() + 1))
    .reduce((sum, session) => sum + session.actualDurationMinutes, 0);

  useEffect(() => {
    setFields(review.review
      ? { wins: review.review.wins, challenges: review.review.challenges, priorities: review.review.priorities, notes: review.review.notes }
      : blankReview);
    setIsDirty(false);
  }, [review.review, weekStart]);

  function changeWeek(amount: number) {
    const [year, month, day] = weekStart.split("-").map(Number);
    setWeekStart(mondayKey(new Date(year, month - 1, day + amount * 7)));
    setMessage("");
  }

  function updateField(key: keyof ReviewFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    setIsDirty(true);
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await review.save(fields);
      setIsDirty(false);
      setMessage("Your weekly review is saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The weekly review could not be saved.");
    }
  }

  function setPriority(task: DashboardTask, priority: TaskPriority) {
    onUpdateTask(task.id, { priority });
  }

  const highlightedGoals = goals.goals.filter((goal) => goal.status === "active").slice(0, 3);

  return (
    <div className="dashboard-shell">
      <DashboardSidebar activePage="productivity" collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} onNavigate={onNavigate} onOpenWelcome={onOpenWelcome} onToggle={() => setCollapsed((value) => !value)} />
      <main className="dashboard-main center-main">
        <header className="dashboard-topbar"><div className="topbar-leading"><button aria-label="Open navigation" className="mobile-menu-button" onClick={() => setMobileOpen(true)} type="button"><Menu size={18} /></button><div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Productivity Center</strong></div></div></header>
        <div className="center-page-content">
          {(review.error || focus.error || goals.error || message) && <div className="center-alert" role="status"><AlertCircle size={15} />{message || review.error || focus.error || goals.error}</div>}
          <section className="center-page-heading"><div><div className="dashboard-eyebrow"><span className="eyebrow-line" /> YOUR PERSONAL OPERATING RHYTHM</div><h1>Productivity <span>Center</span></h1><p>Plan deliberately, reflect honestly, and make room for what matters.</p></div><button className="center-plan-button" onClick={() => onNavigate("planner")} type="button"><Compass size={15} /> Plan your day <ArrowRight size={14} /></button></section>
          <section className="center-weekbar"><div><span className="center-panel-kicker">WEEKLY REVIEW</span><strong>{range.label}</strong></div><div><button aria-label="Previous week" onClick={() => changeWeek(-1)} type="button"><ChevronLeft size={15} /></button><button className="center-current-week" onClick={() => setWeekStart(mondayKey(new Date()))} type="button">This week</button><button aria-label="Next week" onClick={() => changeWeek(1)} type="button"><ChevronRight size={15} /></button></div></section>
          <section className="center-summary">
            <article><span><CheckCircle2 size={15} /></span><strong>{completedTasksCount}</strong><small>Tasks completed this week</small></article>
            <article><span className="mint"><Clock3 size={15} /></span><strong>{(focusMinutes / 60).toFixed(1)}<small>h</small></strong><small>Recorded focus time</small></article>
            <article><span className="gold"><Flag size={15} /></span><strong>{highlightedGoals.length}</strong><small>Active goals in view</small></article>
          </section>
          <div className="center-grid">
            <section className="center-panel center-review-panel">
              <header className="center-panel-heading"><span className="center-panel-icon"><CalendarDays size={15} /></span><div><h2>Reflect on your week</h2><p>Keep the lessons that make next week easier.</p></div></header>
              {!review.isConfigured ? <div className="center-inline-empty">Connect Supabase to save private weekly reviews.</div> : review.isLoading ? <div className="center-inline-empty">Loading your review…</div> : (
                <form className="center-review-form" onSubmit={(event) => void saveReview(event)}>
                  <label><span>What went well?</span><textarea maxLength={2000} onChange={(event) => updateField("wins", event.target.value)} placeholder="Notice your progress, even the quiet wins…" value={fields.wins} /></label>
                  <label><span>What felt challenging?</span><textarea maxLength={2000} onChange={(event) => updateField("challenges", event.target.value)} placeholder="What would you like to approach differently?" value={fields.challenges} /></label>
                  <label><span>Priorities for next week</span><textarea maxLength={2000} onChange={(event) => updateField("priorities", event.target.value)} placeholder="Name the few things that deserve your attention…" value={fields.priorities} /></label>
                  <label><span>Personal notes</span><textarea maxLength={3000} onChange={(event) => updateField("notes", event.target.value)} placeholder="Anything else you want future you to remember…" value={fields.notes} /></label>
                  <div className="center-review-footer"><span>{review.review ? `Last saved ${new Date(review.review.updatedAt).toLocaleDateString()}` : "Your review is private to your workspace."}{isDirty ? " · Unsaved edits" : ""}</span><button disabled={review.isSaving || (!isDirty && Boolean(review.review))} type="submit"><Save size={13} />{review.isSaving ? "Saving…" : "Save review"}</button></div>
                </form>
              )}
            </section>
            <aside className="center-side-column">
              <section className="center-panel center-priority-panel">
                <header className="center-panel-heading"><span className="center-panel-icon"><ListTodo size={15} /></span><div><h2>Priority tune-up</h2><p>Adjust your focus without leaving this page.</p></div></header>
                {activeTasks.length === 0 ? <div className="center-inline-empty">No open tasks. Enjoy the breathing room.</div> : <div className="center-priority-list">{sortedTasks.slice(0, 6).map((task) => <article key={task.id}><span className={`center-task-dot priority-${task.priority.toLowerCase()}`} /><div><strong>{task.title}</strong><small>{task.dueAt ? `Due ${new Date(task.dueAt).toLocaleDateString([], { month: "short", day: "numeric" })}` : task.category}</small></div><select aria-label={`Set priority for ${task.title}`} onChange={(event) => setPriority(task, event.target.value as TaskPriority)} value={task.priority}>{taskPriorities.map((priority) => <option key={priority}>{priority}</option>)}</select></article>)}</div>}
                <button className="center-text-link" onClick={() => onNavigate("tasks")} type="button">Organize all tasks <ArrowRight size={13} /></button>
              </section>
              <section className="center-panel center-goal-panel">
                <header className="center-panel-heading"><span className="center-panel-icon gold"><Target size={15} /></span><div><h2>Goal review</h2><p>Keep your long-term direction close.</p></div></header>
                {goals.isConfigured && highlightedGoals.length === 0 ? <div className="center-inline-empty">Create a goal to give your effort a direction.</div> : !goals.isConfigured ? <div className="center-inline-empty">Connect Supabase to view your goals.</div> : highlightedGoals.map((goal) => <div className="center-goal-item" key={goal.id}><span><Target size={13} /></span><div><strong>{goal.title}</strong><small>{goal.milestones.filter((item) => item.isCompleted).length} of {goal.milestones.length} milestones complete</small></div><button aria-label={`Review ${goal.title}`} onClick={() => onNavigate("goals")} type="button"><ArrowRight size={13} /></button></div>)}
                <button className="center-text-link" onClick={() => onNavigate("goals")} type="button">Review all goals <ArrowRight size={13} /></button>
              </section>
              <section className="center-time-card"><span><TrendingUp size={15} /></span><div><strong>Make time intentional</strong><small>Build a realistic day with breaks between focus blocks.</small></div><button aria-label="Open Smart Planner" onClick={() => onNavigate("planner")} type="button"><ArrowRight size={14} /></button></section>
            </aside>
          </div>
          <div className="center-footer-note"><Clock3 size={13} /> Your week starts Monday. Review entries are stored privately in your Supabase workspace.</div>
        </div>
      </main>
    </div>
  );
}
