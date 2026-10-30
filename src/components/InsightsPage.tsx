import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Lightbulb,
  Menu,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WorkspacePage } from "../data/navigation";
import { useInsights } from "../hooks/useInsights";
import { DashboardSidebar } from "./DashboardSidebar";

type DailyPoint = { date: string; label: string; completed: number; focusHours: number };
const chartTooltipStyle = {
  background: "#191927",
  border: "1px solid rgba(167,139,250,.2)",
  borderRadius: 10,
  color: "#f5f3ff",
  fontSize: 10,
};

function localKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateOffset(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function startOfWeek(date: Date): Date {
  return dateOffset(date, -((date.getDay() + 6) % 7));
}

function pointsForRange(snapshot: NonNullable<ReturnType<typeof useInsights>["snapshot"]>, days: number): DailyPoint[] {
  const today = new Date();
  const start = days === 7 ? startOfWeek(today) : dateOffset(today, 1 - days);
  return Array.from({ length: days }, (_, index) => {
    const date = dateOffset(start, index);
    const key = localKey(date);
    const focusMinutes = snapshot.focusSessions
      .filter((session) => localKey(new Date(session.startedAt)) === key)
      .reduce((total, session) => total + session.actualDurationMinutes, 0);
    return {
      date: key,
      label: date.toLocaleDateString([], { month: "short", day: "numeric" }),
      completed: snapshot.completions.filter((item) => localKey(new Date(item.completedAt)) === key).length,
      focusHours: Math.round(focusMinutes / 6) / 10,
    };
  });
}

function habitRateThisWeek(snapshot: NonNullable<ReturnType<typeof useInsights>["snapshot"]>): number | null {
  if (snapshot.habits.length === 0) return null;
  const start = startOfWeek(new Date());
  const end = new Date();
  const completed = new Set(snapshot.habitLogs.map((log) => `${log.habitId}:${log.logDate}`));
  let expected = 0;
  let checked = 0;
  for (const habit of snapshot.habits) {
    const created = new Date(habit.createdAt);
    for (let cursor = new Date(start); cursor <= end; cursor = dateOffset(cursor, 1)) {
      if (cursor < new Date(created.getFullYear(), created.getMonth(), created.getDate())) continue;
      if (!habit.daysOfWeek.includes(cursor.getDay())) continue;
      expected += 1;
      if (completed.has(`${habit.id}:${localKey(cursor)}`)) checked += 1;
    }
  }
  return expected ? Math.round(checked / expected * 100) : 0;
}

function goalPercent(goal: NonNullable<ReturnType<typeof useInsights>["snapshot"]>["goals"][number]): number {
  if (goal.status === "completed") return 100;
  if (!goal.milestones.length) return 0;
  return Math.round(goal.milestones.filter((item) => item.isCompleted).length / goal.milestones.length * 100);
}

function productivitySuggestion(
  snapshot: NonNullable<ReturnType<typeof useInsights>["snapshot"]>,
  currentWeekCount: number,
  previousWeekCount: number,
  focusHours: number,
): string {
  if (snapshot.completions.length === 0 && snapshot.focusSessions.length === 0) {
    return "Complete a task or record a focus session to start building your personal insights.";
  }
  if (currentWeekCount < previousWeekCount) {
    return "Your task completions are below the previous week. Try choosing one achievable priority for tomorrow.";
  }
  if (focusHours > currentWeekCount * 1.5 && focusHours > 3) {
    return "Your focus time is outpacing completions. Consider ending each session with one clear next action.";
  }
  if (snapshot.habits.length > 0 && (habitRateThisWeek(snapshot) ?? 0) < 50) {
    return "A gentler habit cadence may be easier to sustain. Review the days assigned to each routine.";
  }
  return "Your recent activity is steady. Protect time for your highest-priority work and keep breaks in the plan.";
}

export function InsightsPage({
  onNavigate,
  onOpenWelcome,
}: {
  onNavigate: (page: WorkspacePage) => void;
  onOpenWelcome: () => void;
}) {
  const store = useInsights();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const snapshot = store.snapshot;
  const daily = useMemo(() => snapshot ? pointsForRange(snapshot, 30) : [], [snapshot]);
  const weekly = daily.slice(-7);
  const thisWeekStart = startOfWeek(new Date());
  const lastWeekStart = dateOffset(thisWeekStart, -7);
  const currentWeekEnd = dateOffset(thisWeekStart, 7);
  const previousWeekEnd = thisWeekStart;
  const currentWeekCompletions = snapshot?.completions.filter((event) => {
    const completed = new Date(event.completedAt);
    return completed >= thisWeekStart && completed < currentWeekEnd;
  }).length ?? 0;
  const previousWeekCompletions = snapshot?.completions.filter((event) => {
    const completed = new Date(event.completedAt);
    return completed >= lastWeekStart && completed < previousWeekEnd;
  }).length ?? 0;
  const weeklyFocusMinutes = snapshot?.focusSessions
    .filter((session) => new Date(session.startedAt) >= thisWeekStart && new Date(session.startedAt) < currentWeekEnd)
    .reduce((sum, session) => sum + session.actualDurationMinutes, 0) ?? 0;
  const monthlyCompletions = daily.reduce((total, point) => total + point.completed, 0);
  const rate = snapshot ? habitRateThisWeek(snapshot) : null;
  const mostProductiveDay = useMemo(() => {
    const totals = new Map<string, number>();
    const monthStart = dateOffset(new Date(), -29);
    for (const completion of snapshot?.completions ?? []) {
      const date = new Date(completion.completedAt);
      if (date < monthStart) continue;
      const weekday = date.toLocaleDateString([], { weekday: "long" });
      totals.set(weekday, (totals.get(weekday) ?? 0) + 1);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  }, [snapshot]);
  const suggestion = snapshot
    ? productivitySuggestion(snapshot, currentWeekCompletions, previousWeekCompletions, weeklyFocusMinutes / 60)
    : "";
  const hasWeeklyData = weekly.some((point) => point.completed > 0 || point.focusHours > 0);
  const hasMonthlyTaskData = daily.some((point) => point.completed > 0);
  const hasPreviousWeek = (snapshot?.completions ?? []).some((event) => {
    const date = new Date(event.completedAt);
    return date >= lastWeekStart && date < previousWeekEnd;
  });

  return (
    <div className="dashboard-shell">
      <DashboardSidebar activePage="insights" collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} onNavigate={onNavigate} onOpenWelcome={onOpenWelcome} onToggle={() => setCollapsed((value) => !value)} />
      <main className="dashboard-main insights-main">
        <header className="dashboard-topbar"><div className="topbar-leading"><button aria-label="Open navigation" className="mobile-menu-button" onClick={() => setMobileOpen(true)} type="button"><Menu size={18} /></button><div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Insights</strong></div></div></header>
        <div className="insights-page-content">
          {store.error && <div className="insights-alert" role="alert"><AlertCircle size={15} />{store.error}<button disabled={store.isLoading} onClick={() => void store.reload()} type="button"><RefreshCw size={13} /> Retry</button></div>}
          <section className="insights-page-heading"><div><div className="dashboard-eyebrow"><span className="eyebrow-line" /> A CLEARER VIEW OF YOUR RHYTHM</div><h1>Your <span>Insights</span></h1><p>Real patterns from your recorded tasks, focus sessions, habits and goals.</p></div><div className="insights-range-pill"><CalendarDays size={13} /> Last 30 days</div></section>
          {!store.isConfigured ? (
            <section className="insights-connect-state"><BarChart3 size={24} /><h2>Connect your private workspace</h2><p>Insights use real records saved in Supabase. Configure your project and record activity to see your personal patterns.</p></section>
          ) : store.isLoading ? (
            <div className="insights-loading" aria-label="Loading insights"><span /><span /><span /><span /></div>
          ) : snapshot ? (
            <>
              {snapshot.completions.length === 0 && snapshot.focusSessions.length === 0 && snapshot.habitLogs.length === 0 && snapshot.goals.length === 0 ? (
                <section className="insights-empty"><span><TrendingUp size={22} /></span><h2>Your patterns will take shape here</h2><p>There is not enough recorded activity yet. Complete a task, finish a focus session or track a habit. Your insights will update from those real records.</p><div><button onClick={() => onNavigate("tasks")} type="button">View tasks</button><button onClick={() => onNavigate("focus")} type="button">Open Focus Room</button></div></section>
              ) : (
                <>
                  <section className="insights-stat-grid">
                    <article><span><CheckCircle2 size={15} /></span><strong>{currentWeekCompletions}</strong><small>Tasks completed this week</small><em>{hasPreviousWeek ? `${currentWeekCompletions - previousWeekCompletions >= 0 ? "+" : ""}${currentWeekCompletions - previousWeekCompletions} vs last week` : "Building a weekly baseline"}</em></article>
                    <article><span className="mint"><Clock3 size={15} /></span><strong>{(weeklyFocusMinutes / 60).toFixed(1)}<small>h</small></strong><small>Recorded focus this week</small><em>{snapshot.focusSessions.length} completed sessions in 30 days</em></article>
                    <article><span className="gold"><Flame size={15} /></span><strong>{rate === null ? "—" : `${rate}%`}</strong><small>Habit consistency this week</small><em>{snapshot.habits.length ? `${snapshot.habits.length} tracked ${snapshot.habits.length === 1 ? "habit" : "habits"}` : "No habits to measure yet"}</em></article>
                    <article><span><Target size={15} /></span><strong>{snapshot.goals.filter((goal) => goal.status === "completed").length}<small>/{snapshot.goals.length}</small></strong><small>Goals completed</small><em>Across your active goal set</em></article>
                  </section>
                  <section className="insights-chart-grid">
                    <article className="insights-panel insights-weekly-panel"><header><div><span className="insights-panel-kicker">DAILY COMPARISON</span><h2>This week at a glance</h2></div><span className="insights-chart-legend"><i />Tasks <i className="legend-focus" />Focus hours</span></header>
                      {hasWeeklyData ? <div className="insights-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={weekly} margin={{ top: 10, right: 7, left: -22, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#85818f", fontSize: 8 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#777381", fontSize: 8 }} /><Tooltip contentStyle={chartTooltipStyle} formatter={(value, name) => [name === "focusHours" ? `${value} h` : value, name === "focusHours" ? "Focus time" : "Tasks completed"]} /><Bar dataKey="completed" fill="#a78bfa" radius={[4, 4, 0, 0]} /><Bar dataKey="focusHours" fill="#6ee7b7" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <div className="insights-chart-empty">No task completions or focus sessions recorded this week.</div>}
                    </article>
                    <article className="insights-panel insights-monthly-panel"><header><div><span className="insights-panel-kicker">MONTHLY TREND</span><h2>Task completion trend</h2></div><span className="insights-total-pill">{monthlyCompletions} total</span></header>
                      {hasMonthlyTaskData ? <div className="insights-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={daily} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false} /><XAxis dataKey="label" interval={4} axisLine={false} tickLine={false} tick={{ fill: "#85818f", fontSize: 8 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#777381", fontSize: 8 }} /><Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [value, "Tasks completed"]} /><Line dataKey="completed" type="monotone" stroke="#a78bfa" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#c4b5fd", stroke: "#191927", strokeWidth: 2 }} /></LineChart></ResponsiveContainer></div> : <div className="insights-chart-empty">Task completion records will build this trend.</div>}
                    </article>
                  </section>
                  <section className="insights-lower-grid">
                    <article className="insights-panel insights-comparison-panel"><header><span className="insights-panel-icon"><TrendingUp size={15} /></span><div><h2>Weekly comparison</h2><p>Recorded completions, this week and last.</p></div></header><div className="insights-week-comparison"><div><span>This week</span><strong>{currentWeekCompletions}</strong><i><em style={{ width: `${Math.min(100, currentWeekCompletions / Math.max(1, currentWeekCompletions, previousWeekCompletions) * 100)}%` }} /></i></div><div><span>Last week</span><strong>{hasPreviousWeek ? previousWeekCompletions : "—"}</strong><i><em style={{ width: `${hasPreviousWeek ? Math.min(100, previousWeekCompletions / Math.max(1, currentWeekCompletions, previousWeekCompletions) * 100) : 0}%` }} /></i></div><small>{hasPreviousWeek ? "A comparison based on task completion timestamps." : "A previous-week baseline will appear after recorded completions."}</small></div></article>
                    <article className="insights-panel insights-productive-panel"><header><span className="insights-panel-icon gold"><Flame size={15} /></span><div><h2>Most productive day</h2><p>Based on task completion records from the last 30 days.</p></div></header>{mostProductiveDay ? <div className="insights-productive-callout"><strong>{mostProductiveDay[0]}</strong><span>{mostProductiveDay[1]} completed {mostProductiveDay[1] === 1 ? "task" : "tasks"}</span></div> : <div className="insights-inline-empty">Not enough completion history yet.</div>}</article>
                    <article className="insights-panel insights-goals-panel"><header><span className="insights-panel-icon"><Target size={15} /></span><div><h2>Goal progress</h2><p>Progress derived from completed milestones.</p></div></header>{snapshot.goals.length === 0 ? <div className="insights-inline-empty">No goals recorded yet.</div> : <div className="insights-goal-list">{snapshot.goals.slice(0, 5).map((goal) => <div key={goal.id}><span><strong>{goal.title}</strong><small>{goal.status === "completed" ? "Completed" : `${goal.milestones.filter((item) => item.isCompleted).length} of ${goal.milestones.length} milestones`}</small></span><b>{goalPercent(goal)}%</b><i><em style={{ width: `${goalPercent(goal)}%` }} /></i></div>)}</div>}</article>
                  </section>
                  <section className="insights-suggestion"><span><Lightbulb size={15} /></span><div><strong>A note from your data</strong><p>{suggestion}</p></div></section>
                  <footer className="insights-footnote">All statistics above are calculated from your Supabase records within the displayed period. No sample or generated analytics are shown.</footer>
                </>
              )}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
