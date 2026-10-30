import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Heart,
  Menu,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { habitCategories, type Habit, type HabitCategory, type HabitDraft } from "../data/productivity";
import type { WorkspacePage } from "../data/navigation";
import { useHabits } from "../hooks/useHabits";
import { habitCompletionRate, habitDateKey, getHabitStreaks } from "../utils/habitStats";
import { DashboardSidebar } from "./DashboardSidebar";

type ViewMode = "week" | "month";
type HabitFormState = { id: string | null; draft: HabitDraft };
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekDays = [0, 1, 2, 3, 4, 5, 6];
const emptyDraft: HabitDraft = {
  title: "",
  description: "",
  category: "Health",
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  reminderTime: null,
  reminderEnabled: false,
};

function rangeFor(date: Date, mode: ViewMode): { start: Date; end: Date; label: string } {
  if (mode === "week") {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return {
      start,
      end,
      label: `${start.toLocaleDateString([], { month: "short", day: "numeric" })} – ${end.toLocaleDateString([], { month: "short", day: "numeric" })}`,
    };
  }
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end, label: date.toLocaleDateString([], { month: "long", year: "numeric" }) };
}

function dayRange(start: Date, end: Date): Date[] {
  const result: Date[] = [];
  const date = new Date(start);
  while (date <= end) {
    result.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return result;
}

function habitRateLabel(habit: Habit, logs: ReturnType<typeof useHabits>["logs"], start: Date, end: Date): string {
  const rate = habitCompletionRate(habit, logs, start, end);
  return `${rate}%`;
}

export function HabitsPage({
  onNavigate,
  onOpenWelcome,
}: {
  onNavigate: (page: WorkspacePage) => void;
  onOpenWelcome: () => void;
}) {
  const store = useHabits();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>("week");
  const [form, setForm] = useState<HabitFormState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Habit | null>(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const range = useMemo(() => rangeFor(selectedDate, view), [selectedDate, view]);
  const dates = useMemo(() => dayRange(range.start, range.end), [range]);
  const today = habitDateKey(new Date());
  const selectedKey = habitDateKey(selectedDate);

  function shiftPeriod(amount: number) {
    setSelectedDate((current) => view === "week"
      ? new Date(current.getFullYear(), current.getMonth(), current.getDate() + amount * 7)
      : new Date(current.getFullYear(), current.getMonth() + amount, current.getDate()));
  }

  function openForm(habit?: Habit) {
    setForm(habit
      ? { id: habit.id, draft: { title: habit.title, description: habit.description, category: habit.category, daysOfWeek: [...habit.daysOfWeek], reminderTime: habit.reminderTime, reminderEnabled: habit.reminderEnabled } }
      : { id: null, draft: { ...emptyDraft, daysOfWeek: [...emptyDraft.daysOfWeek] } });
    setFormError("");
    setMessage("");
  }

  function updateDraft<Key extends keyof HabitDraft>(key: Key, value: HabitDraft[Key]) {
    setForm((current) => current ? { ...current, draft: { ...current.draft, [key]: value } } : current);
  }

  function toggleDay(day: number) {
    setForm((current) => {
      if (!current) return current;
      const selected = current.draft.daysOfWeek.includes(day);
      return {
        ...current,
        draft: {
          ...current.draft,
          daysOfWeek: selected
            ? current.draft.daysOfWeek.filter((value) => value !== day)
            : [...current.draft.daysOfWeek, day].sort((a, b) => a - b),
        },
      };
    });
  }

  async function submitHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    const title = form.draft.title.trim();
    if (!title || title.length > 100) {
      setFormError("Give your habit a title between 1 and 100 characters.");
      return;
    }
    if (form.draft.daysOfWeek.length === 0) {
      setFormError("Choose at least one day for this habit.");
      return;
    }
    if (form.draft.reminderEnabled && !form.draft.reminderTime) {
      setFormError("Choose a reminder time or turn reminders off.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const draft = { ...form.draft, title };
      if (form.id) await store.update(form.id, draft);
      else await store.create(draft);
      setForm(null);
      setMessage(form.id ? "Habit updated." : "Habit added to your routine.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "The habit could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCompleted(habit: Habit, date: string) {
    const completed = store.logs.some((log) => log.habitId === habit.id && log.logDate === date);
    setMessage("");
    try {
      await store.setCompleted(habit.id, date, !completed);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Habit progress could not be updated.");
    }
  }

  async function deleteConfirmed() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await store.remove(confirmDelete.id);
      setConfirmDelete(null);
      setMessage("Habit removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Habit could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  const expectedToday = store.habits.filter((habit) => habit.daysOfWeek.includes(selectedDate.getDay()));
  const checkedToday = expectedToday.filter((habit) => store.logs.some((log) => log.habitId === habit.id && log.logDate === selectedKey)).length;

  return (
    <div className="dashboard-shell">
      <DashboardSidebar activePage="habits" collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} onNavigate={onNavigate} onOpenWelcome={onOpenWelcome} onToggle={() => setCollapsed((value) => !value)} />
      <main className="dashboard-main habit-main">
        <header className="dashboard-topbar"><div className="topbar-leading"><button aria-label="Open navigation" className="mobile-menu-button" onClick={() => setMobileOpen(true)} type="button"><Menu size={18} /></button><div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Habits</strong></div></div></header>
        <div className="habit-page-content">
          {(store.error || message) && <div className={`habit-alert${message.includes("could not") || store.error ? " is-warning" : ""}`} role="status"><AlertCircle size={15} />{message || store.error}</div>}
          <section className="habit-page-heading">
            <div><div className="dashboard-eyebrow"><span className="eyebrow-line" /> SMALL PROMISES, KEPT OFTEN</div><h1>Your <span>habits</span></h1><p>Build consistency through the small things you choose each day.</p></div>
            <button className="habit-add-button" disabled={!store.isConfigured} onClick={() => openForm()} type="button"><Plus size={16} /> New habit</button>
          </section>
          {!store.isConfigured ? (
            <section className="habit-connect-state"><Heart size={23} /><h2>Connect your private workspace</h2><p>Your routines and daily progress are saved to Supabase. Configure your project to begin tracking habits.</p></section>
          ) : store.isLoading ? (
            <div aria-label="Loading habits" className="habit-loading"><span /><span /><span /></div>
          ) : (
            <>
              <section className="habit-overview">
                <article><span className="habit-overview-icon"><Heart size={15} /></span><strong>{store.habits.length}</strong><small>Active habits</small></article>
                <article><span className="habit-overview-icon mint"><CheckCircle2 size={15} /></span><strong>{checkedToday}<small>/{expectedToday.length}</small></strong><small>Completed on selected day</small></article>
                <article><span className="habit-overview-icon gold"><Flame size={15} /></span><strong>{store.habits.reduce((best, habit) => Math.max(best, getHabitStreaks(habit, store.logs).current), 0)}</strong><small>Best current streak</small></article>
              </section>
              <section className="habit-tracker-panel">
                <header className="habit-tracker-header">
                  <div><span className="habit-panel-kicker">YOUR CONSISTENCY, AT A GLANCE</span><h2>Progress tracker</h2></div>
                  <div className="habit-view-controls">
                    <button aria-label="Previous period" onClick={() => shiftPeriod(-1)} type="button"><ChevronLeft size={15} /></button>
                    <strong>{range.label}</strong>
                    <button aria-label="Next period" onClick={() => shiftPeriod(1)} type="button"><ChevronRight size={15} /></button>
                    <button className="habit-today-button" onClick={() => setSelectedDate(new Date())} type="button">Today</button>
                    <div className="habit-view-switch"><button className={view === "week" ? "active" : ""} onClick={() => setView("week")} type="button">Week</button><button className={view === "month" ? "active" : ""} onClick={() => setView("month")} type="button">Month</button></div>
                  </div>
                </header>
                {store.habits.length === 0 ? (
                  <div className="habit-empty"><span><Heart size={22} /></span><h3>Make room for a new ritual</h3><p>Start with one small habit. Pick a rhythm that feels realistic, then track the days you show up.</p><button onClick={() => openForm()} type="button"><Plus size={14} /> Create your first habit</button></div>
                ) : (
                  <div className="habit-table-wrap">
                    <div className="habit-table-heading"><span>HABIT</span><span>STREAK</span><span>PERIOD</span><span>{view === "week" ? "WEEK" : "MONTH"} AT A GLANCE</span><span>SELECTED DAY</span><span>ACTIONS</span></div>
                    {store.habits.map((habit) => {
                      const streak = getHabitStreaks(habit, store.logs);
                      const rate = habitRateLabel(habit, store.logs, range.start, range.end);
                      const completed = store.logs.some((log) => log.habitId === habit.id && log.logDate === selectedKey);
                      return (
                        <article className="habit-row" key={habit.id}>
                          <div className="habit-name-cell"><span className="habit-row-icon"><Heart size={14} /></span><span><strong>{habit.title}</strong><small>{habit.category}{habit.reminderEnabled && habit.reminderTime ? ` · Reminder ${habit.reminderTime}` : ""}</small></span></div>
                          <div className="habit-streak-cell"><Flame size={13} /><strong>{streak.current}</strong><small>current</small><span className="habit-longest">Best {streak.longest}</span></div>
                          <div className="habit-rate-cell"><strong>{rate}</strong><span className="habit-rate-track"><i style={{ width: rate }} /></span></div>
                          <div className={`habit-heatmap ${view === "month" ? "is-month" : ""}`} aria-label={`${habit.title} daily completion heatmap`}>
                            {dates.map((date) => {
                              const key = habitDateKey(date);
                              const done = store.logs.some((log) => log.habitId === habit.id && log.logDate === key);
                              const scheduled = habit.daysOfWeek.includes(date.getDay());
                              return <button aria-label={`${date.toLocaleDateString([], { month: "short", day: "numeric" })}${done ? " completed" : scheduled ? " scheduled" : ""}`} className={`${done ? "done" : ""}${scheduled ? " scheduled" : ""}${key === selectedKey ? " selected" : ""}${key === today ? " today" : ""}`} key={key} onClick={() => setSelectedDate(date)} title={date.toLocaleDateString()} type="button" />;
                            })}
                          </div>
                          <button aria-pressed={completed} className={`habit-check-button${completed ? " completed" : ""}`} disabled={!habit.daysOfWeek.includes(selectedDate.getDay())} onClick={() => void toggleCompleted(habit, selectedKey)} type="button">{completed ? <Check size={14} /> : <span />}{completed ? "Done" : "Mark done"}</button>
                          <div className="habit-row-actions"><button aria-label={`Edit ${habit.title}`} onClick={() => openForm(habit)} type="button"><Pencil size={14} /></button><button aria-label={`Delete ${habit.title}`} onClick={() => setConfirmDelete(habit)} type="button"><Trash2 size={14} /></button></div>
                        </article>
                      );
                    })}
                    <footer className="habit-tracker-legend"><span><i className="legend-done" /> Completed</span><span><i className="legend-scheduled" /> Scheduled</span><span>Click a day to select it, then mark the habit done.</span></footer>
                  </div>
                )}
              </section>
              <section className="habit-reminder-note"><Bell size={14} /><span>Reminders are saved with each habit. Your browser's notification permission is not required for tracking progress.</span><span><CalendarDays size={13} />{checkedToday} of {expectedToday.length} complete</span></section>
            </>
          )}
        </div>
      </main>
      <AnimatePresence>
        {form && (
          <div className="habit-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setForm(null); }}>
            <motion.section aria-labelledby="habit-form-title" aria-modal="true" className="habit-modal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} role="dialog">
              <header><span className="habit-modal-icon"><Heart size={16} /></span><div><h2 id="habit-form-title">{form.id ? "Edit habit" : "Create a habit"}</h2><p>Choose a rhythm you can return to.</p></div><button aria-label="Close dialog" disabled={busy} onClick={() => setForm(null)} type="button"><X size={17} /></button></header>
              <form onSubmit={(event) => void submitHabit(event)}>
                <label>Habit name<input autoFocus maxLength={100} onChange={(event) => updateDraft("title", event.target.value)} placeholder="e.g. Take a mindful walk" value={form.draft.title} /></label>
                <label>Description <span className="habit-optional">optional</span><textarea maxLength={600} onChange={(event) => updateDraft("description", event.target.value)} placeholder="A little context for future you…" value={form.draft.description} /></label>
                <label>Category<select onChange={(event) => updateDraft("category", event.target.value as HabitCategory)} value={form.draft.category}>{habitCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
                <fieldset><legend>Repeat on</legend><div className="habit-day-picker">{weekDays.map((day) => <button aria-pressed={form.draft.daysOfWeek.includes(day)} className={form.draft.daysOfWeek.includes(day) ? "active" : ""} key={day} onClick={() => toggleDay(day)} type="button">{weekdayLabels[day]}</button>)}</div></fieldset>
                <div className="habit-reminder-fields"><label className="habit-reminder-toggle"><input checked={form.draft.reminderEnabled} onChange={(event) => updateDraft("reminderEnabled", event.target.checked)} type="checkbox" /> Set a reminder</label>{form.draft.reminderEnabled && <input aria-label="Reminder time" onChange={(event) => updateDraft("reminderTime", event.target.value || null)} type="time" value={form.draft.reminderTime ?? ""} />}</div>
                {formError && <p className="habit-form-error" role="alert">{formError}</p>}
                <footer><button className="habit-cancel-button" disabled={busy} onClick={() => setForm(null)} type="button">Cancel</button><button className="habit-save-button" disabled={busy} type="submit">{busy ? "Saving…" : form.id ? "Save changes" : "Create habit"}</button></footer>
              </form>
            </motion.section>
          </div>
        )}
        {confirmDelete && (
          <div className="habit-modal-backdrop">
            <motion.section aria-labelledby="habit-delete-title" aria-modal="true" className="habit-confirm-modal" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} role="alertdialog">
              <span className="habit-delete-icon"><Trash2 size={18} /></span><h2 id="habit-delete-title">Remove this habit?</h2><p>“{confirmDelete.title}” and its completion history will be permanently deleted.</p>{message && <span className="habit-form-error" role="alert">{message}</span>}
              <footer><button className="habit-cancel-button" disabled={busy} onClick={() => setConfirmDelete(null)} type="button">Keep habit</button><button className="habit-delete-button" disabled={busy} onClick={() => void deleteConfirmed()} type="button">{busy ? "Deleting…" : "Delete habit"}</button></footer>
            </motion.section>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
