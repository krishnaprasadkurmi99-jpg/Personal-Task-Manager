import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  CalendarDays,
  Circle,
  Flag,
  Link2,
  Plus,
  Pencil,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { goalCategories, type Goal, type GoalCategory, type GoalDraft, type Milestone } from "../data/productivity";
import type { DashboardTask } from "../data/dashboard";
import type { WorkspacePage } from "../data/navigation";
import { useGoals } from "../hooks/useGoals";
import { DashboardSidebar } from "./DashboardSidebar";

type GoalForm = { id: string | null; draft: GoalDraft; status: Goal["status"] };
const emptyGoal: GoalDraft = { title: "", description: "", category: "Personal", targetDate: null };

function goalProgress(goal: Goal, linkedTaskIds: string[], tasks: DashboardTask[]): number {
  if (goal.milestones.length > 0) {
    return Math.round(goal.milestones.filter((milestone) => milestone.isCompleted).length / goal.milestones.length * 100);
  }
  const linkedTasks = linkedTaskIds.map((id) => tasks.find((task) => task.id === id)).filter((task) => task !== undefined);
  return linkedTasks.length
    ? Math.round(linkedTasks.filter((task) => task.status === "Completed").length / linkedTasks.length * 100)
    : goal.status === "completed" ? 100 : 0;
}

export function GoalsPage({
  tasks,
  onNavigate,
  onOpenWelcome,
}: {
  tasks: DashboardTask[];
  onNavigate: (page: WorkspacePage) => void;
  onOpenWelcome: () => void;
}) {
  const store = useGoals();
  const [form, setForm] = useState<GoalForm | null>(null);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<Goal | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function openForm(goal?: Goal) {
    setForm(goal
      ? { id: goal.id, status: goal.status, draft: { title: goal.title, description: goal.description, category: goal.category, targetDate: goal.targetDate } }
      : { id: null, status: "active", draft: { ...emptyGoal } });
    setErrorMessage("");
  }

  function updateDraft<Key extends keyof GoalDraft>(key: Key, value: GoalDraft[Key]) {
    setForm((current) => current ? { ...current, draft: { ...current.draft, [key]: value } } : current);
  }

  async function submitGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    const title = form.draft.title.trim();
    if (!title || title.length > 120) {
      setErrorMessage("Give your goal a title between 1 and 120 characters.");
      return;
    }
    setBusy(true);
    setErrorMessage("");
    try {
      const draft = { ...form.draft, title };
      if (form.id) {
        const existing = store.goals.find((goal) => goal.id === form.id);
        if (existing) await store.update(existing, draft, form.status);
      } else {
        await store.create(draft);
      }
      setForm(null);
      setMessage(form.id ? "Goal updated." : "Your new goal is ready.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The goal could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function addMilestone(event: FormEvent<HTMLFormElement>, goalId: string) {
    event.preventDefault();
    const title = milestoneTitle[goalId]?.trim() ?? "";
    if (!title || title.length > 160) return;
    setBusy(true);
    try {
      await store.addMilestone(goalId, title);
      setMilestoneTitle((current) => ({ ...current, [goalId]: "" }));
      setMessage("Milestone added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Milestone could not be added.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleMilestone(goalId: string, milestone: Milestone) {
    try {
      await store.setMilestoneCompleted(goalId, milestone.id, !milestone.isCompleted);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Milestone could not be updated.");
    }
  }

  async function toggleTaskLink(goalId: string, taskId: string) {
    const linked = store.taskLinks[goalId]?.includes(taskId) ?? false;
    try {
      await store.linkTask(goalId, taskId, !linked);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Task link could not be updated.");
    }
  }

  async function removeMilestone(goalId: string, milestoneId: string) {
    try {
      await store.removeMilestone(goalId, milestoneId);
      setMessage("Milestone removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Milestone could not be removed.");
    }
  }

  async function removeGoal() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await store.remove(confirmDelete.id);
      setConfirmDelete(null);
      setMessage("Goal removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Goal could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleGoalStatus(goal: Goal) {
    try {
      await store.update(goal, goal, goal.status === "completed" ? "active" : "completed");
      setMessage(goal.status === "completed" ? "Goal reopened." : "Goal completed. Well done.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Goal status could not be updated.");
    }
  }

  const activeGoals = store.goals.filter((goal) => goal.status === "active").length;
  const completedGoals = store.goals.filter((goal) => goal.status === "completed").length;
  const milestonesDone = store.goals.reduce((sum, goal) => sum + goal.milestones.filter((milestone) => milestone.isCompleted).length, 0);

  return (
    <div className="dashboard-shell">
      <DashboardSidebar activePage="goals" collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} onNavigate={onNavigate} onOpenWelcome={onOpenWelcome} onToggle={() => setCollapsed((value) => !value)} />
      <main className="dashboard-main goal-main">
        <header className="dashboard-topbar"><div className="topbar-leading"><button aria-label="Open navigation" className="mobile-menu-button" onClick={() => setMobileOpen(true)} type="button"><Target size={18} /></button><div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Goals</strong></div></div></header>
        <div className="goal-page-content">
          {(store.error || message) && <div className={`goal-alert${store.error || message.toLowerCase().includes("could not") ? " is-warning" : ""}`} role="status"><AlertCircle size={15} />{message || store.error}</div>}
          <section className="goal-page-heading"><div><div className="dashboard-eyebrow"><span className="eyebrow-line" /> A DIRECTION FOR YOUR EFFORT</div><h1>Goals & <span>milestones</span></h1><p>Turn what matters to you into meaningful steps forward.</p></div><button className="goal-add-button" disabled={!store.isConfigured} onClick={() => openForm()} type="button"><Plus size={16} /> New goal</button></section>
          {!store.isConfigured ? (
            <section className="goal-connect-state"><Target size={24} /><h2>Connect your private workspace</h2><p>Your goals, milestones and task links are stored securely in Supabase. Configure your project to begin.</p></section>
          ) : store.isLoading ? (
            <div className="goal-loading"><span /><span /><span /></div>
          ) : (
            <>
              <section className="goal-overview">
                <article><span><Target size={15} /></span><strong>{activeGoals}</strong><small>Active goals</small></article>
                <article><span className="mint"><CheckCircle2 size={15} /></span><strong>{completedGoals}</strong><small>Goals completed</small></article>
                <article><span className="gold"><Flag size={15} /></span><strong>{milestonesDone}</strong><small>Milestones reached</small></article>
              </section>
              {store.goals.length === 0 ? (
                <section className="goal-empty"><span><Target size={22} /></span><h2>Choose a direction</h2><p>Start with something that matters to you. Add milestones and connect the tasks that move it forward.</p><button onClick={() => openForm()} type="button"><Plus size={14} /> Create a goal</button></section>
              ) : (
                <section className="goal-grid">
                  {store.goals.map((goal) => {
                    const linked = store.taskLinks[goal.id] ?? [];
                    const percent = goalProgress(goal, linked, tasks);
                    const isExpanded = expandedGoal === goal.id;
                    const linkedTasks = linked.map((id) => tasks.find((task) => task.id === id)).filter((task) => task !== undefined);
                    return (
                      <motion.article className={`goal-card${goal.status === "completed" ? " is-complete" : ""}`} layout key={goal.id}>
                        <header className="goal-card-top"><span className="goal-category">{goal.category}</span><div><button aria-label={`Edit ${goal.title}`} onClick={() => openForm(goal)} type="button"><Pencil size={14} /></button><button aria-label={`Delete ${goal.title}`} onClick={() => setConfirmDelete(goal)} type="button"><Trash2 size={14} /></button></div></header>
                        <h2>{goal.title}</h2><p className="goal-description">{goal.description || "A clear intention, with space to define the next step."}</p>
                        {goal.targetDate && <span className="goal-target-date"><CalendarDays size={13} /> Target {new Date(`${goal.targetDate}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>}
                        <div className="goal-progress-copy"><span>Progress</span><strong>{goal.status === "completed" ? 100 : percent}%</strong></div><span className="goal-progress-track"><i style={{ width: `${goal.status === "completed" ? 100 : percent}%` }} /></span>
                        <div className="goal-card-meta"><span>{goal.milestones.filter((milestone) => milestone.isCompleted).length}/{goal.milestones.length} milestones</span><span>{linked.length} linked {linked.length === 1 ? "task" : "tasks"}</span></div>
                        <button className="goal-expand-button" aria-expanded={isExpanded} onClick={() => setExpandedGoal(isExpanded ? null : goal.id)} type="button">{isExpanded ? "Hide details" : "Milestones & linked tasks"}<ArrowUpRight size={13} /></button>
                        <button className={`goal-complete-button${goal.status === "completed" ? " done" : ""}`} onClick={() => void toggleGoalStatus(goal)} type="button">{goal.status === "completed" ? <CheckCircle2 size={14} /> : <Circle size={14} />}{goal.status === "completed" ? "Completed" : "Mark goal complete"}</button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div className="goal-details" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                              <div className="goal-detail-section"><h3>Milestones</h3>
                                {goal.milestones.length === 0 ? <p className="goal-no-details">No milestones yet.</p> : goal.milestones.map((milestone) => <div className="goal-milestone" key={milestone.id}><button aria-label={`${milestone.isCompleted ? "Reopen" : "Complete"} ${milestone.title}`} aria-pressed={milestone.isCompleted} onClick={() => void toggleMilestone(goal.id, milestone)} type="button">{milestone.isCompleted ? <Check size={12} /> : <span />}</button><span className={milestone.isCompleted ? "done" : ""}>{milestone.title}</span><button aria-label={`Remove ${milestone.title}`} onClick={() => void removeMilestone(goal.id, milestone.id)} type="button"><X size={13} /></button></div>)}
                                <form className="goal-add-milestone" onSubmit={(event) => void addMilestone(event, goal.id)}><input maxLength={160} onChange={(event) => setMilestoneTitle((current) => ({ ...current, [goal.id]: event.target.value }))} placeholder="Add a milestone…" value={milestoneTitle[goal.id] ?? ""} /><button aria-label="Add milestone" disabled={busy || !(milestoneTitle[goal.id]?.trim())} type="submit"><Plus size={14} /></button></form>
                              </div>
                              <div className="goal-detail-section"><h3><Link2 size={13} /> Link tasks</h3>{tasks.filter((task) => task.status !== "Completed" || linked.includes(task.id)).length === 0 ? <p className="goal-no-details">Open tasks will appear here.</p> : tasks.filter((task) => task.status !== "Completed" || linked.includes(task.id)).map((task) => <label className="goal-task-link" key={task.id}><input checked={linked.includes(task.id)} onChange={() => void toggleTaskLink(goal.id, task.id)} type="checkbox" /><span><strong>{task.title}</strong><small>{task.priority} · {task.category}</small></span></label>)}
                                {linkedTasks.filter((task) => task.status === "Completed").map((task) => <div className="goal-linked-complete" key={task.id}><CheckCircle2 size={13} />{task.title}</div>)}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.article>
                    );
                  })}
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <AnimatePresence>
        {form && <div className="goal-modal-backdrop"><motion.section aria-labelledby="goal-form-heading" aria-modal="true" className="goal-modal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="dialog"><header><span><Target size={16} /></span><div><h2 id="goal-form-heading">{form.id ? "Edit your goal" : "Create a goal"}</h2><p>Give your intention a clear shape.</p></div><button aria-label="Close dialog" disabled={busy} onClick={() => setForm(null)} type="button"><X size={17} /></button></header><form onSubmit={(event) => void submitGoal(event)}><label>Goal title<input autoFocus maxLength={120} onChange={(event) => updateDraft("title", event.target.value)} placeholder="e.g. Build a sustainable morning routine" value={form.draft.title} /></label><label>Description<textarea maxLength={1200} onChange={(event) => updateDraft("description", event.target.value)} placeholder="Why does this matter to you?" value={form.draft.description} /></label><div className="goal-form-row"><label>Category<select onChange={(event) => updateDraft("category", event.target.value as GoalCategory)} value={form.draft.category}>{goalCategories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Target date<input onChange={(event) => updateDraft("targetDate", event.target.value || null)} type="date" value={form.draft.targetDate ?? ""} /></label></div>{form.id && <label className="goal-status-field">Status<select onChange={(event) => setForm((current) => current ? { ...current, status: event.target.value as Goal["status"] } : current)} value={form.status}><option value="active">In progress</option><option value="completed">Completed</option></select></label>}{errorMessage && <p className="goal-form-error" role="alert">{errorMessage}</p>}<footer><button className="goal-cancel-button" disabled={busy} onClick={() => setForm(null)} type="button">Cancel</button><button className="goal-save-button" disabled={busy} type="submit">{busy ? "Saving…" : form.id ? "Save changes" : "Create goal"}</button></footer></form></motion.section></div>}
        {confirmDelete && <div className="goal-modal-backdrop"><motion.section aria-labelledby="goal-delete-heading" aria-modal="true" className="goal-confirm-modal" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} role="alertdialog"><span><Trash2 size={18} /></span><h2 id="goal-delete-heading">Delete this goal?</h2><p>“{confirmDelete.title}”, its milestones and task links will be removed.</p><footer><button className="goal-cancel-button" disabled={busy} onClick={() => setConfirmDelete(null)} type="button">Keep goal</button><button className="goal-delete-button" disabled={busy} onClick={() => void removeGoal()} type="button">{busy ? "Deleting…" : "Delete goal"}</button></footer></motion.section></div>}
      </AnimatePresence>
    </div>
  );
}
