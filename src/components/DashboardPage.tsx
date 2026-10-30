import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarClock,
  Check,
  CircleCheck,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  Command,
  Flame,
  Focus,
  Lightbulb,
  ListTodo,
  Menu,
  Plus,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import {
  type ActivityItem,
  type DashboardTask,
  type TaskCategory,
  type TaskDraft,
} from "../data/dashboard";
import type { WorkspacePage } from "../data/navigation";
import { useFocusSessions } from "../hooks/useFocusSessions";
import { DashboardSidebar } from "./DashboardSidebar";

const WeeklyProductivityChart = lazy(async () => {
  const module = await import("./WeeklyProductivityChart");
  return { default: module.WeeklyProductivityChart };
});

type DashboardPageProps = {
  onOpenWelcome: () => void;
  onNavigate: (page: WorkspacePage) => void;
  onCreateTask: (draft: TaskDraft) => void;
  onUpdateTask: (id: string, patch: Partial<TaskDraft>) => void;
  tasks: DashboardTask[];
  storageError: string | null;
};

function getGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDueDate(value: string | null): { label: string; tone: string } {
  if (!value) return { label: "No deadline", tone: "later" };
  const due = new Date(value);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const dayDifference = Math.round(
    (startOfDueDate.getTime() - startOfToday.getTime()) / 86_400_000,
  );

  if (due.getTime() < Date.now()) {
    return { label: `Overdue · ${due.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`, tone: "overdue" };
  }
  if (dayDifference === 0) {
    return { label: `Today · ${due.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`, tone: "today" };
  }
  if (dayDifference === 1) return { label: "Tomorrow", tone: "tomorrow" };
  return {
    label: due.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
    tone: "later",
  };
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatActivityTime(value: string, now: Date): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "Recently";
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - timestamp.getTime()) / 60_000));
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  return timestamp.toLocaleDateString([], { month: "short", day: "numeric" });
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getFocusStreak(sessions: ReturnType<typeof useFocusSessions>["sessions"], today: Date): { current: number; longest: number } {
  const completedDays = new Set(sessions
    .filter((session) => session.status === "completed")
    .map((session) => localDateKey(new Date(session.startedAt))));
  const sortedDays = [...completedDays].sort();
  let longest = 0;
  let streak = 0;
  let previous: Date | null = null;
  for (const key of sortedDays) {
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    streak = previous && Math.round((date.getTime() - previous.getTime()) / 86_400_000) === 1 ? streak + 1 : 1;
    longest = Math.max(longest, streak);
    previous = date;
  }
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!completedDays.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let current = 0;
  while (completedDays.has(localDateKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, longest };
}

function StatCard({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: string;
  note: ReactNode;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>
      <p className="stat-label">{label}</p>
      <div className="stat-value">{value}</div>
      <p className="stat-note">{note}</p>
    </article>
  );
}

function TaskRow({
  task,
  onToggle,
}: {
  task: DashboardTask;
  onToggle: (task: DashboardTask) => void;
}) {
  const due = formatDueDate(task.dueAt);
  const completed = task.status === "Completed";

  return (
    <div className={`task-row${completed ? " task-is-complete" : ""}`}>
      <button
        aria-label={completed ? `Mark ${task.title} as incomplete` : `Complete ${task.title}`}
        className="task-check"
        onClick={() => onToggle(task)}
        type="button"
      >
        {completed ? <CheckCircle2 size={19} /> : <Circle size={19} />}
      </button>
      <span className="task-content">
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          <span className={`task-priority priority-${task.priority.toLowerCase()}`} />
          {task.category}
          <span className="task-meta-dot" />
          <span className={`due-label ${due.tone}`}>{due.label}</span>
        </span>
      </span>
      <span className={`task-priority-label priority-text-${task.priority.toLowerCase()}`}>
        {task.priority}
      </span>
    </div>
  );
}

function QuickAddModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (draft: TaskDraft) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TaskCategory>("Work");
  const [dueAt, setDueAt] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Give your task a name before adding it.");
      return;
    }
    onCreate({
      title: trimmedTitle,
      category,
      dueAt: dueAt ? new Date(dueAt).toISOString() : new Date(Date.now() + 86_400_000).toISOString(),
      scheduledStartAt: null,
      scheduledEndAt: null,
      description: "",
      priority: "Medium",
      status: "To Do",
      tags: [],
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section aria-labelledby="quick-add-title" aria-modal="true" className="quick-add-modal" role="dialog">
        <div className="modal-heading">
          <div>
            <span className="modal-kicker"><Sparkles size={13} /> MAKE SPACE FOR IT</span>
            <h2 id="quick-add-title">Add a task</h2>
          </div>
          <button aria-label="Close quick add" className="icon-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Task name</span>
            <input
              autoFocus
              onChange={(event) => {
                setTitle(event.target.value);
                setError("");
              }}
              placeholder="What would you like to get done?"
              value={title}
            />
          </label>
          <div className="form-row">
            <label className="form-field">
              <span>Space</span>
              <span className="select-wrap">
                <select onChange={(event) => setCategory(event.target.value as TaskCategory)} value={category}>
                  <option>Work</option>
                  <option>Personal</option>
                  <option>Study</option>
                  <option>Health</option>
                  <option>Other</option>
                </select>
                <ChevronDown size={15} />
              </span>
            </label>
            <label className="form-field">
              <span>Due date <small>Optional</small></span>
              <input onChange={(event) => setDueAt(event.target.value)} type="datetime-local" value={dueAt} />
            </label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions">
            <button className="secondary-button" onClick={onClose} type="button">Cancel</button>
            <button className="primary-button" type="submit"><Plus size={16} /> Add to my day</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ActivityIcon({ kind }: { kind: ActivityItem["kind"] }) {
  if (kind === "focus") return <Focus size={15} />;
  if (kind === "created") return <Plus size={15} />;
  return <Check size={15} />;
}

export function DashboardPage({
  onOpenWelcome,
  onNavigate,
  onCreateTask,
  onUpdateTask,
  tasks,
  storageError,
}: DashboardPageProps) {
  const [now, setNow] = useState(() => new Date());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { sessions: focusSessions } = useFocusSessions(500);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status !== "Completed").sort((a, b) => {
      if (!a.dueAt) return b.dueAt ? 1 : 0;
      if (!b.dueAt) return -1;
      return a.dueAt.localeCompare(b.dueAt);
    }),
    [tasks],
  );
  const overdueCount = openTasks.filter((task) => task.dueAt !== null && formatDueDate(task.dueAt).tone === "overdue").length;
  const completedCount = tasks.filter((task) => {
    if (task.status !== "Completed" || !task.completedAt) return false;
    const completedAt = new Date(task.completedAt);
    return completedAt.getFullYear() === now.getFullYear() &&
      completedAt.getMonth() === now.getMonth() &&
      completedAt.getDate() === now.getDate();
  }).length;
  const dailyTasks = tasks.filter((task) =>
    (task.completedAt !== null && localDateKey(new Date(task.completedAt)) === localDateKey(now)) ||
    (task.dueAt !== null && localDateKey(new Date(task.dueAt)) === localDateKey(now)) ||
    (task.scheduledStartAt !== null && localDateKey(new Date(task.scheduledStartAt)) === localDateKey(now)));
  const productivityScore = dailyTasks.length ? Math.round(completedCount / dailyTasks.length * 100) : null;
  const weeklyTaskData = useMemo(() => {
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => {
      const dayStart = new Date(weekStart);
      dayStart.setDate(weekStart.getDate() + index);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      const completed = tasks.filter((task) => task.status === "Completed" && task.completedAt !== null &&
        new Date(task.completedAt) >= dayStart && new Date(task.completedAt) < dayEnd).length;
      const focus = focusSessions
        .filter((session) => session.status === "completed" &&
          new Date(session.startedAt) >= dayStart && new Date(session.startedAt) < dayEnd)
        .reduce((total, session) => total + session.actualDurationMinutes, 0) / 60;
      return {
        day: dayStart.toLocaleDateString([], { weekday: "short" }).toUpperCase(),
        completed,
        focus: Math.round(focus * 10) / 10,
      };
    });
  }, [focusSessions, tasks, now]);
  const weeklyCompletedCount = weeklyTaskData.reduce((total, point) => total + point.completed, 0);
  const weeklyFocusHours = weeklyTaskData.reduce((total, point) => total + point.focus, 0);
  const focusStreak = getFocusStreak(focusSessions, now);
  const dailyFocusMinutes = focusSessions
    .filter((session) => session.status === "completed" && localDateKey(new Date(session.startedAt)) === localDateKey(now))
    .reduce((total, session) => total + session.actualDurationMinutes, 0);
  const activity = useMemo(() => {
    const events: Array<ActivityItem & { occurredAt: string }> = [];
    for (const task of tasks) {
      events.push({
        id: `task-created-${task.id}`,
        title: "Added a task",
        detail: task.title,
        time: "",
        kind: "created",
        occurredAt: task.createdAt,
      });
      if (task.completedAt) {
        events.push({
          id: `task-completed-${task.id}`,
          title: "Completed a task",
          detail: task.title,
          time: "",
          kind: "completed",
          occurredAt: task.completedAt,
        });
      }
    }
    for (const session of focusSessions) {
      if (session.status !== "completed") continue;
      events.push({
        id: `focus-session-${session.id}`,
        title: "Completed a focus session",
        detail: `${session.actualDurationMinutes} min${session.taskTitle ? ` · ${session.taskTitle}` : ""}`,
        time: "",
        kind: "focus",
        occurredAt: session.completedAt ?? session.startedAt,
      });
    }
    return events
      .sort((left, right) => {
        const leftTime = Date.parse(left.occurredAt);
        const rightTime = Date.parse(right.occurredAt);
        return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
      })
      .slice(0, 5)
      .map(({ occurredAt, ...event }) => ({ ...event, time: formatActivityTime(occurredAt, now) }));
  }, [focusSessions, now, tasks]);

  function toggleTask(task: DashboardTask) {
    const completing = task.status !== "Completed";
    onUpdateTask(task.id, { status: completing ? "Completed" : "To Do" });
  }

  function addTask(draft: TaskDraft) {
    onCreateTask(draft);
    setIsAddOpen(false);
  }

  const greeting = getGreeting(now.getHours());

  return (
    <div className="dashboard-shell">
      <DashboardSidebar
        activePage="dashboard"
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenWelcome={onOpenWelcome}
        onNavigate={onNavigate}
        onToggle={() => setSidebarCollapsed((value) => !value)}
      />
      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-leading">
            <button
              aria-label="Open navigation"
              className="mobile-menu-button"
              onClick={() => setMobileSidebarOpen(true)}
              type="button"
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Dashboard</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="topbar-date"><Clock3 size={14} /><span>{formatClock(now)}</span></div>
            <button
              aria-label="Notifications (coming in a future stage)"
              className="icon-button notification-button"
              disabled
              title="Notifications — coming in a future stage"
              type="button"
            >
              <Bell size={17} /><span className="notification-dot" />
            </button>
            <span className="topbar-avatar" aria-label="Your profile">M</span>
          </div>
        </header>

        <div className="dashboard-content">
          {storageError && <div className="task-storage-warning dashboard-storage-warning" role="alert">{storageError}</div>}
          <section className="welcome-row">
            <div>
              <div className="dashboard-eyebrow"><span className="eyebrow-line" /> YOUR PERSONAL SPACE</div>
              <h1>{greeting}, <span>there</span><span className="greeting-spark">✳</span></h1>
              <p className="welcome-subtitle">A new day is a fresh chance to make room for what matters.</p>
              <div className="current-date">
                <CalendarClock size={15} />
                {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </div>
            </div>
            <button className="primary-button add-task-button" onClick={() => setIsAddOpen(true)} type="button">
              <Plus size={17} /> <span>New task</span>
              <kbd>N</kbd>
            </button>
          </section>

          <section aria-label="Today's productivity summary" className="stats-grid">
            <StatCard
              icon={<Target size={18} />}
              label="Productivity score"
              note={productivityScore === null ? "Schedule or complete a task to measure today" : "Based on tasks due or scheduled today"}
              tone="violet"
              value={productivityScore === null ? "—" : `${productivityScore}%`}
            />
            <StatCard
              icon={<CircleCheck size={18} />}
              label="Completed today"
              note={`${dailyFocusMinutes} min focused today`}
              tone="mint"
              value={String(completedCount).padStart(2, "0")}
            />
            <StatCard
              icon={<ListTodo size={18} />}
              label="Still on your mind"
              note={<>{overdueCount > 0 ? <span className="overdue-note">{overdueCount} overdue</span> : "Nothing overdue"} · you’ve got this</>}
              tone="blue"
              value={String(openTasks.length).padStart(2, "0")}
            />
            <StatCard
              icon={<Flame size={18} />}
              label="Focus streak"
              note={`Longest recorded streak: ${focusStreak.longest} days`}
              tone="amber"
              value={`${focusStreak.current} days`}
            />
          </section>

          <section className="dashboard-grid">
            <article className="panel productivity-panel">
              <div className="panel-heading">
                <div>
                  <div className="panel-kicker">YOUR RHYTHM</div>
                  <h2>Weekly productivity</h2>
                  <p>A little progress adds up to a lot.</p>
                </div>
                <span className="range-selector">This week</span>
              </div>
              <div className="chart-summary">
                <span className="chart-total">{weeklyCompletedCount} <small>tasks completed</small></span>
                <span className="chart-focus"><span /> {weeklyFocusHours > 0 ? `${weeklyFocusHours.toFixed(1)}h focus this week` : "No recorded focus time yet"}</span>
              </div>
              <div className="productivity-chart">
                <Suspense fallback={<div className="chart-loading" aria-label="Loading productivity chart" />}>
                  <WeeklyProductivityChart data={weeklyTaskData} />
                </Suspense>
              </div>
              <div className="chart-footer">
                <span><span className="legend-dot" /> Tasks completed</span>
                <span><span className="legend-dot focus-legend-dot" /> Focus time</span>
              </div>
            </article>

            <article className="panel score-panel">
              <div className="panel-heading">
                <div>
                  <div className="panel-kicker">A MOMENT FOR YOU</div>
                  <h2>Today, in balance</h2>
                </div>
                <span className="balance-icon"><Sparkles size={17} /></span>
              </div>
              <div className="score-orb-wrap">
                <div
                  aria-label={productivityScore === null ? "No tasks scheduled today" : `Productivity score ${productivityScore} percent`}
                  className="score-orb"
                  role="img"
                  style={{ "--score": `${(productivityScore ?? 0) * 3.6}deg` } as CSSProperties}
                >
                  <div className="score-orb-inner">
                    <span>{productivityScore ?? "—"}</span>
                    <small>{productivityScore === null ? "NO TASKS PLANNED" : productivityScore >= 80 ? "ON TRACK" : "IN PROGRESS"}</small>
                  </div>
                </div>
              </div>
              <p className="balance-copy">{productivityScore === null ? "Choose a task to give today a clear direction." : "Your score reflects completed work among today's due and scheduled tasks."}</p>
              <div className="score-footnote"><span />{dailyTasks.length} task{dailyTasks.length === 1 ? "" : "s"} due or scheduled today</div>
            </article>

            <article className="panel deadlines-panel">
              <div className="panel-heading compact-heading">
                <div>
                  <div className="panel-kicker">KEEP THINGS MOVING</div>
                  <h2>On your horizon</h2>
                </div>
                <span className="panel-count">{openTasks.length} tasks</span>
              </div>
              <div className="task-list">
                {openTasks.slice(0, 5).map((task) => (
                  <TaskRow key={task.id} onToggle={toggleTask} task={task} />
                ))}
                {openTasks.length === 0 && (
                  <div className="empty-tasks">
                    <CheckCircle2 size={22} />
                    <span>You're all caught up. Enjoy the breathing room.</span>
                  </div>
                )}
              </div>
              <button
                className="panel-action"
                onClick={() => setIsAddOpen(true)}
                type="button"
              >
                Add something to your day <ArrowRight size={15} />
              </button>
            </article>

            <article className="panel activity-panel">
              <div className="panel-heading compact-heading">
                <div>
                  <div className="panel-kicker">LITTLE WINS ADD UP</div>
                  <h2>Recent activity</h2>
                </div>
                <Activity className="activity-heading-icon" size={17} />
              </div>
              <div className="activity-list">
                {activity.length === 0 && <div className="activity-empty-state">Your recent task activity will appear here as you use MINDSPACE.</div>}
                {activity.slice(0, 5).map((item) => (
                  <div className="activity-row" key={item.id}>
                    <span className={`activity-icon activity-${item.kind}`}><ActivityIcon kind={item.kind} /></span>
                    <span className="activity-copy">
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <time>{item.time}</time>
                  </div>
                ))}
              </div>
              <div className="activity-note">
                <Lightbulb size={15} />
                <span>Every small step is still a step forward.</span>
              </div>
            </article>
          </section>

          <section className="dashboard-affirmation">
            <span className="affirmation-icon"><Sparkles size={17} /></span>
            <span><strong>A gentle reminder</strong> — you don’t have to do it all. Just the next right thing.</span>
            <Command className="affirmation-command" size={16} />
          </section>
          <footer className="dashboard-footer">
            <span>MINDSPACE <span className="footer-dot">·</span> YOUR SPACE TO GROW</span>
            <span>Clear Your Mind. Own Your Time. Build Your Future.</span>
          </footer>
        </div>
      </main>
      {isAddOpen && <QuickAddModal onClose={() => setIsAddOpen(false)} onCreate={addTask} />}
    </div>
  );
}
