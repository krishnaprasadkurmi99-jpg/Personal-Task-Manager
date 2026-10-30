import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Coffee,
  Compass,
  Flame,
  Menu,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { DashboardTask, TaskDraft } from "../data/dashboard";
import type { WorkspacePage } from "../data/navigation";
import { energyLevels, type EnergyLevel, type PlannedBlock, type PlannedTask, type PlannerSettings } from "../data/productivity";
import { useDailyPlanner } from "../hooks/useDailyPlanner";
import { DashboardSidebar } from "./DashboardSidebar";
import { createDailySchedule, dateKey, isWithinWorkingHours, localDateTimeInput, reschedulePlanBlock } from "../utils/smartPlanner";

const durationOptions = [15, 25, 30, 45, 60, 75, 90, 120, 180, 240];
const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 } as const;

function formatClock(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function energySuggestion(energy: EnergyLevel): string {
  if (energy === "High") return "Use your clearest hours for the work that matters most.";
  if (energy === "Low") return "A gentler pace: give important tasks more room and keep your day light.";
  return "A balanced day with meaningful focus and space to reset.";
}

function plannedDayLabel(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function timeInputValue(value: string): string {
  return value.slice(0, 5);
}

function defaultDuration(task: DashboardTask): number {
  return task.priority === "Urgent" || task.priority === "High" ? 60 : 45;
}

function PlanBlockCard({
  block,
  disabled,
  onMove,
  onRemove,
}: {
  block: PlannedBlock;
  disabled: boolean;
  onMove: (block: PlannedBlock, startAt: string) => void;
  onRemove: (block: PlannedBlock) => void;
}) {
  const isTask = "taskId" in block;
  const start = localDateTimeInput(new Date(block.startAt));
  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className={`planner-schedule-item${isTask ? "" : " is-break"}`}
      initial={{ opacity: 0, y: 8 }}
      layout
      transition={{ duration: 0.18 }}
    >
      <div className="planner-item-time">
        <strong>{formatClock(block.startAt)}</strong>
        <span>{formatClock(block.endAt)}</span>
      </div>
      <span className="planner-item-rail" />
      <div className="planner-item-content">
        <div className="planner-item-title-row">
          <span className="planner-item-icon">{isTask ? <Target size={14} /> : <Coffee size={14} />}</span>
          <strong>{block.title}</strong>
          {isTask && <span className={`planner-priority priority-${block.priority.toLowerCase()}`}>{block.priority}</span>}
        </div>
        <span className="planner-item-meta">
          {isTask ? `${block.category} · ${block.durationMinutes} min` : `${block.durationMinutes} minute reset`}
        </span>
        <label className="planner-time-editor">
          <Clock3 size={12} />
          <span>Move to</span>
          <input
            aria-label={`Start time for ${block.title}`}
            disabled={disabled}
            onChange={(event) => onMove(block, event.target.value)}
            type="datetime-local"
            value={start}
          />
        </label>
      </div>
      <button
        aria-label={`Remove ${block.title} from this plan`}
        className="planner-remove-block"
        disabled={disabled}
        onClick={() => onRemove(block)}
        type="button"
      >
        <X size={15} />
      </button>
    </motion.article>
  );
}

export function SmartPlannerPage({
  tasks,
  storageError,
  onUpdateTask,
  onOpenWelcome,
  onNavigate,
}: {
  tasks: DashboardTask[];
  storageError: string | null;
  onUpdateTask: (id: string, patch: Partial<TaskDraft>) => void;
  onOpenDashboard: () => void;
  onOpenTasks: () => void;
  onOpenCalendar: () => void;
  onOpenBrainDump: () => void;
  onOpenWelcome: () => void;
  onOpenPlanner: () => void;
  onNavigate: (page: WorkspacePage) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const currentDate = dateKey(selectedDate);
  const store = useDailyPlanner(currentDate);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [draftBlocks, setDraftBlocks] = useState<PlannedBlock[] | null>(null);
  const [draftSettings, setDraftSettings] = useState<PlannerSettings | null>(null);
  const [unscheduled, setUnscheduled] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);

  const settings = draftSettings ?? store.settings;
  const pendingTasks = useMemo(() => tasks
    .filter((task) => task.status !== "Completed")
    .sort((left, right) => priorityOrder[left.priority] - priorityOrder[right.priority] ||
      (left.dueAt ? Date.parse(left.dueAt) : Number.MAX_SAFE_INTEGER) -
      (right.dueAt ? Date.parse(right.dueAt) : Number.MAX_SAFE_INTEGER)), [tasks]);
  const savedPlan = store.plan;
  const blocks = draftBlocks ?? savedPlan?.blocks ?? [];
  const isDirty = JSON.stringify(blocks) !== JSON.stringify(savedPlan?.blocks ?? []) ||
    (draftSettings !== null && JSON.stringify(draftSettings) !== JSON.stringify(store.settings));
  const selectedTasks = pendingTasks.filter((task) => selectedTaskIds.includes(task.id));
  const remainingMinutes = settings
    ? Math.max(0,
      (Number(settings.workingEndTime.slice(0, 2)) * 60 + Number(settings.workingEndTime.slice(3, 5))) -
      (Number(settings.workingStartTime.slice(0, 2)) * 60 + Number(settings.workingStartTime.slice(3, 5)))
    )
    : 0;
  const scheduledTaskCount = blocks.filter((block): block is PlannedTask => "taskId" in block).length;
  const totalScheduledMinutes = blocks.reduce((total, block) => total + block.durationMinutes, 0);

  function planBlocks(): PlannedBlock[] {
    return draftBlocks ?? savedPlan?.blocks ?? [];
  }

  function updateSetting<Key extends keyof PlannerSettings>(key: Key, value: PlannerSettings[Key]) {
    if (!settings) return;
    setDraftSettings({ ...settings, [key]: value });
  }

  function toggleTask(taskId: string) {
    setSelectedTaskIds((current) => current.includes(taskId)
      ? current.filter((id) => id !== taskId)
      : [...current, taskId]);
  }

  function buildSchedule() {
    if (!settings) return;
    setMessage("");
    try {
      const inputs = selectedTasks.map((task) => ({
        taskId: task.id,
        title: task.title,
        priority: task.priority,
        category: task.category,
        dueAt: task.dueAt,
        createdAt: task.createdAt,
        durationMinutes: durations[task.id] ?? defaultDuration(task),
      }));
      const result = createDailySchedule(currentDate, inputs, settings);
      setDraftBlocks(result.plan.blocks);
      setUnscheduled(result.unscheduledTaskIds);
      setMessage(result.unscheduledTaskIds.length
        ? `${result.unscheduledTaskIds.length} selected ${result.unscheduledTaskIds.length === 1 ? "task doesn't" : "tasks don't"} fit in this working day. Extend your hours or remove lower-priority tasks.`
        : "Your schedule is ready to review. Nothing has been applied yet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The schedule could not be arranged.");
    }
  }

  function moveBlock(block: PlannedBlock, localValue: string) {
    if (!localValue) return;
    setMessage("");
    try {
      const next = reschedulePlanBlock(planBlocks(), block.id, new Date(localValue).toISOString());
      if (settings && next.some((item) => !isWithinWorkingHours(item, currentDate, settings.workingStartTime, settings.workingEndTime))) {
        setMessage("Keep every item inside your working hours.");
        return;
      }
      setDraftBlocks(next);
      setUnscheduled([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This schedule item could not be moved.");
    }
  }

  function removeBlock(block: PlannedBlock) {
    setDraftBlocks(planBlocks().filter((item) => item.id !== block.id));
    setUnscheduled([]);
    setMessage(`${block.title} will be removed when you save this plan.`);
  }

  function addShortBreak() {
    if (!settings) return;
    const startMinutes = Number(settings.workingStartTime.slice(0, 2)) * 60 +
      Number(settings.workingStartTime.slice(3, 5));
    const start = new Date();
    start.setFullYear(Number(currentDate.slice(0, 4)), Number(currentDate.slice(5, 7)) - 1, Number(currentDate.slice(8, 10)));
    start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
    const candidate: PlannedBlock = {
      id: `break-manual-${Date.now()}`,
      title: "Short break",
      startAt: start.toISOString(),
      endAt: new Date(start.getTime() + settings.breakDurationMinutes * 60_000).toISOString(),
      durationMinutes: settings.breakDurationMinutes,
    };
    try {
      const next = [...planBlocks(), candidate].sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt));
      const overlap = next.some((block, index) => index > 0 && Date.parse(block.startAt) < Date.parse(next[index - 1].endAt));
      if (overlap || !isWithinWorkingHours(candidate, currentDate, settings.workingStartTime, settings.workingEndTime)) {
        setMessage("There isn't room for a break at the start of this day. Move another item first.");
        return;
      }
      setDraftBlocks(next);
      setMessage("A short break has been added to your plan.");
    } catch {
      setMessage("The break could not be added.");
    }
  }

  async function savePlan() {
    if (!settings) return;
    const blocksToSave = planBlocks();
    if (blocksToSave.some((block) => !isWithinWorkingHours(block, currentDate, settings.workingStartTime, settings.workingEndTime))) {
      setMessage("Every schedule item must fit within your working hours before saving.");
      return;
    }
    const ordered = [...blocksToSave].sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt));
    if (ordered.some((block, index) => index > 0 && Date.parse(block.startAt) < Date.parse(ordered[index - 1].endAt))) {
      setMessage("Resolve overlapping schedule items before saving.");
      return;
    }
    setMessage("");
    try {
      const previousTaskBlocks = savedPlan?.blocks.filter((block): block is PlannedTask => "taskId" in block) ?? [];
      const saved = await store.save({ planDate: currentDate, ...settings, blocks: ordered });
      setDraftBlocks(saved.blocks);
      setDraftSettings(null);
      const scheduledTaskIds = new Set(
        saved.blocks.filter((block): block is PlannedTask => "taskId" in block).map((block) => block.taskId),
      );
      for (const previous of previousTaskBlocks) {
        const task = tasks.find((item) => item.id === previous.taskId);
        if (!scheduledTaskIds.has(previous.taskId) && task?.scheduledStartAt === previous.startAt) {
          onUpdateTask(previous.taskId, { scheduledStartAt: null, scheduledEndAt: null });
        }
      }
      for (const block of saved.blocks) {
        if ("taskId" in block) {
          onUpdateTask(block.taskId, {
            scheduledStartAt: block.startAt,
            scheduledEndAt: block.endAt,
          });
        }
      }
      setSelectedTaskIds([]);
      setMessage("Your daily plan has been saved and scheduled tasks are synced to Calendar.");
    } catch {
      setMessage("Your plan could not be saved. Check the Supabase error above and try again.");
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    if (settings.workingEndTime <= settings.workingStartTime) {
      setMessage("Your working day must end after it starts.");
      return;
    }
    setIsSettingsSaving(true);
    setMessage("");
    try {
      const saved = await store.updateSettings(settings);
      setDraftSettings(saved);
      setMessage("Planning preferences saved.");
    } catch {
      setMessage("Planning preferences could not be saved. Review the error above.");
    } finally {
      setIsSettingsSaving(false);
    }
  }

  function shiftDay(amount: number) {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount);
      return next;
    });
    setDraftBlocks(null);
    setDraftSettings(null);
    setSelectedTaskIds([]);
    setUnscheduled([]);
    setMessage("");
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar
        activePage="planner"
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onNavigate={onNavigate}
        onOpenWelcome={onOpenWelcome}
        onToggle={() => setCollapsed((value) => !value)}
      />
      <main className="dashboard-main planner-main">
        <header className="dashboard-topbar">
          <div className="topbar-leading">
            <button aria-label="Open navigation" className="mobile-menu-button" onClick={() => setMobileOpen(true)} type="button"><Menu size={20} /></button>
            <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Smart Planner</strong></div>
          </div>
          <div className="topbar-actions"><span className="planner-topbar-date">{plannedDayLabel(currentDate)}</span></div>
        </header>
        <div className="planner-page-content">
          {(store.error || storageError) && (
            <div className="task-storage-warning planner-error" role="alert">
              <AlertCircle size={15} /> <span>{[store.error, storageError].filter(Boolean).join(" ")}</span>
              <button onClick={() => void store.reload()} type="button"><RefreshCw size={12} /> Retry</button>
            </div>
          )}
          <section className="planner-page-heading">
            <div>
              <div className="dashboard-eyebrow"><span className="eyebrow-line" /> A THOUGHTFUL PLAN, MADE BY YOU</div>
              <h1>Smart <span>Planner</span></h1>
              <p>Arrange your priorities around the time and energy you have.</p>
            </div>
            <div className="planner-date-control">
              <button aria-label="Previous day" onClick={() => shiftDay(-1)} type="button"><ArrowLeft size={16} /></button>
              <span><CalendarDays size={14} />{plannedDayLabel(currentDate)}</span>
              <button aria-label="Next day" onClick={() => shiftDay(1)} type="button"><ArrowRight size={16} /></button>
              <button className="planner-today-button" onClick={() => { setSelectedDate(new Date()); setDraftBlocks(null); setDraftSettings(null); setSelectedTaskIds([]); }} type="button">Today</button>
            </div>
          </section>

          {store.isLoading ? (
            <div aria-label="Loading daily plan" className="planner-loading"><span /><span /><span /></div>
          ) : !store.isConfigured ? (
            <section className="planner-empty-state">
              <span><Compass size={23} /></span>
              <h2>Connect your private workspace</h2>
              <p>Smart Planner saves your schedule and preferences to your Supabase account. Configure Supabase to start planning.</p>
            </section>
          ) : settings ? (
            <>
              <section className="planner-overview-grid">
                <article className="planner-overview-card"><span className="planner-overview-icon violet"><Target size={16} /></span><span className="planner-overview-value">{scheduledTaskCount}</span><span className="planner-overview-label">Tasks in this plan</span></article>
                <article className="planner-overview-card"><span className="planner-overview-icon mint"><Clock3 size={16} /></span><span className="planner-overview-value">{Math.round(totalScheduledMinutes / 60 * 10) / 10}<small>h</small></span><span className="planner-overview-label">Time thoughtfully booked</span></article>
                <article className="planner-overview-card"><span className="planner-overview-icon gold"><Flame size={16} /></span><span className="planner-overview-value">{settings.energyLevel}</span><span className="planner-overview-label">Your energy today</span></article>
              </section>
              <div className="planner-workspace">
                <section className="planner-panel planner-task-panel">
                  <div className="planner-panel-heading">
                    <div><span className="planner-panel-kicker">MAKE SPACE FOR WHAT MATTERS</span><h2>Choose your tasks</h2></div>
                    <span className="planner-count-pill">{pendingTasks.length} open</span>
                  </div>
                  {pendingTasks.length === 0 ? (
                    <div className="planner-small-empty"><CheckCircle2 size={20} /><strong>Nothing waiting on you</strong><span>Your open tasks will appear here.</span></div>
                  ) : (
                    <div className="planner-task-list">
                      {pendingTasks.map((task) => (
                        <article className={`planner-task-option${selectedTaskIds.includes(task.id) ? " is-selected" : ""}`} key={task.id}>
                          <label>
                            <input checked={selectedTaskIds.includes(task.id)} onChange={() => toggleTask(task.id)} type="checkbox" />
                            <span className={`planner-task-check${selectedTaskIds.includes(task.id) ? " checked" : ""}`}>{selectedTaskIds.includes(task.id) && <Check size={12} />}</span>
                            <span className="planner-task-copy"><strong>{task.title}</strong><span>{task.category}<i />{task.priority} priority</span></span>
                          </label>
                          <select
                            aria-label={`Estimated duration for ${task.title}`}
                            disabled={!selectedTaskIds.includes(task.id)}
                            onChange={(event) => setDurations((current) => ({ ...current, [task.id]: Number(event.target.value) }))}
                            value={durations[task.id] ?? defaultDuration(task)}
                          >
                            {durationOptions.map((minutes) => <option key={minutes} value={minutes}>{minutes >= 60 ? `${minutes / 60}h${minutes % 60 ? ` ${minutes % 60}m` : ""}` : `${minutes}m`}</option>)}
                          </select>
                        </article>
                      ))}
                    </div>
                  )}
                  <div className="planner-available-time">
                    <Clock3 size={14} /><span><strong>{Math.floor(remainingMinutes / 60)}h {remainingMinutes % 60}m</strong> available in your working day</span>
                  </div>
                  <button className="planner-generate-button" disabled={!selectedTasks.length} onClick={buildSchedule} type="button">
                    <Sparkles size={15} /> Arrange my day <ArrowRight size={15} />
                  </button>
                </section>

                <section className="planner-panel planner-schedule-panel">
                  <div className="planner-panel-heading">
                    <div><span className="planner-panel-kicker">A CLEAR PATH THROUGH THE DAY</span><h2>Your schedule</h2></div>
                    <button className="planner-break-button" disabled={!blocks.length} onClick={addShortBreak} type="button"><Coffee size={13} /> Add a break</button>
                  </div>
                  {savedPlan && draftBlocks === null && (
                    <div className="planner-saved-banner"><CheckCircle2 size={13} /> Your saved plan is ready to review{isDirty ? " · Unsaved edits" : ""}</div>
                  )}
                  {blocks.length === 0 ? (
                    <div className="planner-empty-state">
                      <span><Compass size={22} /></span>
                      <h3>A day with room to move</h3>
                      <p>Select the tasks you want to focus on, set your working hours, then arrange a schedule to review.</p>
                    </div>
                  ) : (
                    <div className="planner-schedule-list">
                      <AnimatePresence mode="popLayout">
                        {[...blocks].sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt)).map((block) => (
                          <PlanBlockCard block={block} disabled={store.isSaving} key={block.id} onMove={moveBlock} onRemove={removeBlock} />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                  {unscheduled.length > 0 && (
                    <div className="planner-unscheduled"><AlertCircle size={14} /><span>{unscheduled.length} task{unscheduled.length === 1 ? "" : "s"} couldn't fit. Your selected tasks remain available to adjust.</span></div>
                  )}
                  {message && <p className={`planner-message${message.includes("overlap") || message.includes("must") || message.includes("could not") ? " is-warning" : ""}`} role="status">{message}</p>}
                  <button className="planner-save-button" disabled={(!blocks.length && !(savedPlan && isDirty)) || store.isSaving} onClick={() => void savePlan()} type="button">
                    <Save size={15} /> {store.isSaving ? "Saving…" : savedPlan ? "Save plan changes" : "Save this plan"}
                  </button>
                </section>
              </div>

              <section className="planner-settings-panel">
                <div className="planner-settings-intro"><span><Clock3 size={15} /></span><div><h2>Shape your working day</h2><p>{energySuggestion(settings.energyLevel)}</p></div></div>
                <form className="planner-settings-form" onSubmit={(event) => void saveSettings(event)}>
                  <label><span>Start</span><input onChange={(event) => updateSetting("workingStartTime", timeInputValue(event.target.value))} type="time" value={settings.workingStartTime} /></label>
                  <label><span>Finish</span><input onChange={(event) => updateSetting("workingEndTime", timeInputValue(event.target.value))} type="time" value={settings.workingEndTime} /></label>
                  <label><span>Energy level</span><select onChange={(event) => updateSetting("energyLevel", event.target.value as EnergyLevel)} value={settings.energyLevel}>{energyLevels.map((level) => <option key={level}>{level}</option>)}</select></label>
                  <label><span>Break every</span><select onChange={(event) => updateSetting("breakIntervalMinutes", Number(event.target.value))} value={settings.breakIntervalMinutes}>{[45, 60, 75, 90, 120, 150].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}</select></label>
                  <label><span>Break length</span><select onChange={(event) => updateSetting("breakDurationMinutes", Number(event.target.value))} value={settings.breakDurationMinutes}>{[5, 10, 15, 20].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}</select></label>
                  <button className="planner-settings-save" disabled={isSettingsSaving || store.isSaving} type="submit">{isSettingsSaving ? "Saving…" : "Save preferences"}</button>
                </form>
              </section>
              <p className="planner-rule-note"><Sparkles size={12} /> Scheduling is deterministic: priority, deadline, and task age guide order. Your selections and estimates stay yours to review and edit before saving.</p>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
