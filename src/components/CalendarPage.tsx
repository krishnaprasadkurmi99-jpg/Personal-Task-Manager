import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import {
  AlarmClock,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Coffee,
  GraduationCap,
  Layers3,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  timeBlockTypes,
  type TimeBlock,
  type TimeBlockDraft,
  type TimeBlockType,
} from "../data/calendar";
import {
  type DashboardTask,
  type TaskDraft,
} from "../data/dashboard";
import type { WorkspacePage } from "../data/navigation";
import { DashboardSidebar } from "./DashboardSidebar";

type CalendarView = "month" | "week" | "day";
type ScheduledTask = DashboardTask & { scheduledStartAt: string; scheduledEndAt: string };
type CalendarEvent = { kind: "task"; task: ScheduledTask } | { kind: "block"; block: TimeBlock };
type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  tone: "overdue" | "soon" | "block";
  date: string;
};

type CalendarPageProps = {
  tasks: DashboardTask[];
  taskStorageError: string | null;
  onUpdateTask: (id: string, patch: Partial<TaskDraft>) => void;
  blocks: TimeBlock[];
  blockStorageError: string | null;
  onCreateBlock: (draft: TimeBlockDraft) => void;
  onUpdateBlock: (id: string, patch: Partial<TimeBlockDraft>) => void;
  onDeleteBlock: (id: string) => void;
  onOpenDashboard: () => void;
  onOpenTasks: () => void;
  onOpenWelcome: () => void;
  onOpenBrainDump: () => void;
  onOpenPlanner: () => void;
  onNavigate: (page: WorkspacePage) => void;
};

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const weekdayLong = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, count: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

function monthDates(date: Date): Date[] {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstCell = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, index) => addDays(firstCell, index));
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatRange(startAt: string, endAt: string): string {
  return `${formatTime(startAt)} – ${formatTime(endAt)}`;
}

function toLocalDateTimeInput(value: string): string {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function localDateTime(date: Date, hour: number, minute = 0): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0);
}

function isSameDay(left: Date, right: Date): boolean {
  return dayKey(left) === dayKey(right);
}

function isScheduled(task: DashboardTask): task is DashboardTask & { scheduledStartAt: string; scheduledEndAt: string } {
  return task.scheduledStartAt !== null && task.scheduledEndAt !== null;
}

function eventsOnDate(tasks: DashboardTask[], blocks: TimeBlock[], date: Date): CalendarEvent[] {
  const taskEvents: CalendarEvent[] = tasks
    .filter(isScheduled)
    .filter((task) => isSameDay(new Date(task.scheduledStartAt), date))
    .map((task) => ({ kind: "task", task }));
  const blockEvents: CalendarEvent[] = blocks
    .filter((block) => isSameDay(new Date(block.startAt), date))
    .map((block) => ({ kind: "block", block }));
  return [...taskEvents, ...blockEvents].sort((a, b) => {
    const startA = a.kind === "task" ? a.task.scheduledStartAt : a.block.startAt;
    const startB = b.kind === "task" ? b.task.scheduledStartAt : b.block.startAt;
    return startA.localeCompare(startB);
  });
}

function timeBlockIcon(type: TimeBlockType, size = 14) {
  if (type === "Deep Work") return <Sparkles size={size} />;
  if (type === "Study") return <GraduationCap size={size} />;
  if (type === "Meeting") return <Users size={size} />;
  if (type === "Break") return <Coffee size={size} />;
  return <MapPin size={size} />;
}

function scheduledTaskDraft(task: DashboardTask, startAt: Date, endAt: Date): Partial<TaskDraft> {
  return {
    scheduledStartAt: startAt.toISOString(),
    scheduledEndAt: endAt.toISOString(),
    dueAt: task.dueAt,
    title: task.title,
    description: task.description,
    category: task.category,
    priority: task.priority,
    status: task.status,
    tags: task.tags,
  };
}

function NotificationBell({
  notifications,
}: {
  notifications: NotificationItem[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="calendar-notification-wrap">
      <button
        aria-expanded={open}
        aria-label={`Notifications${notifications.length ? `, ${notifications.length} alerts` : ""}`}
        className={`icon-button calendar-bell${notifications.length ? " has-alerts" : ""}`}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Bell size={17} />
        {notifications.length > 0 && <span className="calendar-bell-count">{notifications.length > 9 ? "9+" : notifications.length}</span>}
      </button>
      {open && (
        <div className="calendar-notification-popover">
          <div className="calendar-popover-heading">
            <div><strong>Your gentle nudges</strong><small>{notifications.length ? `${notifications.length} things to keep in view` : "Nothing needs your attention right now"}</small></div>
            <button aria-label="Close notifications" onClick={() => setOpen(false)} type="button"><X size={15} /></button>
          </div>
          <div className="calendar-notification-list">
            {notifications.length === 0 ? (
              <div className="calendar-notification-empty"><Sparkles size={20} /><span>You're all caught up. Keep enjoying the space.</span></div>
            ) : notifications.map((item) => (
              <article className={`calendar-notification notification-${item.tone}`} key={item.id}>
                <span className="notification-mark">{item.tone === "overdue" ? <AlarmClock size={15} /> : item.tone === "block" ? <Layers3 size={15} /> : <CalendarDays size={15} />}</span>
                <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                <time>{item.date}</time>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleTaskDialog({
  tasks,
  task,
  initialDate,
  initialHour,
  onClose,
  onSave,
}: {
  tasks: DashboardTask[];
  task: DashboardTask | null;
  initialDate: Date;
  initialHour: number;
  onClose: () => void;
  onSave: (task: DashboardTask, startAt: Date, endAt: Date) => void;
}) {
  const [taskId, setTaskId] = useState(task?.id ?? tasks.find((item) => !isScheduled(item))?.id ?? "");
  const selectedTask = tasks.find((item) => item.id === taskId) ?? null;
  const initialStart = task?.scheduledStartAt
    ? new Date(task.scheduledStartAt)
    : localDateTime(initialDate, initialHour);
  const [startValue, setStartValue] = useState(toLocalDateTimeInput(initialStart.toISOString()));
  const initialEnd = task?.scheduledEndAt
    ? new Date(task.scheduledEndAt)
    : new Date(initialStart.getTime() + 60 * 60_000);
  const [endValue, setEndValue] = useState(toLocalDateTimeInput(initialEnd.toISOString()));
  const [error, setError] = useState("");

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startAt = new Date(startValue);
    const endAt = new Date(endValue);
    if (!selectedTask) {
      setError("Choose a task to add to your schedule.");
      return;
    }
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      setError("The end time needs to be later than the start time.");
      return;
    }
    onSave(selectedTask, startAt, endAt);
  }

  return (
    <div className="calendar-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section aria-labelledby="schedule-task-title" aria-modal="true" className="calendar-editor-modal" role="dialog">
        <div className="calendar-editor-heading">
          <div><span className="calendar-modal-kicker"><CalendarDays size={13} /> MAKE TIME FOR WHAT MATTERS</span><h2 id="schedule-task-title">{task ? "Adjust your schedule" : "Schedule a task"}</h2></div>
          <button aria-label="Close schedule editor" className="task-icon-button" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <form className="calendar-editor-form" onSubmit={submit}>
          <label className="calendar-field">
            <span>Task</span>
            <select disabled={Boolean(task)} onChange={(event) => setTaskId(event.target.value)} value={taskId}>
              <option value="">Choose a task to schedule or reschedule</option>
              {tasks.map((item) => (
                <option key={item.id} value={item.id}>{item.title}{isScheduled(item) && item.id !== task?.id ? " · already scheduled" : ""}</option>
              ))}
            </select>
          </label>
          <div className="calendar-form-grid">
            <label className="calendar-field"><span>Starts</span><input onChange={(event) => setStartValue(event.target.value)} type="datetime-local" value={startValue} /></label>
            <label className="calendar-field"><span>Ends</span><input onChange={(event) => setEndValue(event.target.value)} type="datetime-local" value={endValue} /></label>
          </div>
          {error && <p className="calendar-form-error" role="alert">{error}</p>}
          <p className="calendar-helper"><Sparkles size={14} /> Scheduling updates this task in place—your task details and deadline stay intact.</p>
          <div className="calendar-modal-actions">
            <button className="task-secondary-button" onClick={onClose} type="button">Cancel</button>
            <button className="task-primary-button" type="submit"><Check size={15} /> {task ? "Save schedule" : "Add to calendar"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function TimeBlockDialog({
  block,
  initialDate,
  initialHour,
  onClose,
  onSave,
  onDelete,
}: {
  block: TimeBlock | null;
  initialDate: Date;
  initialHour: number;
  onClose: () => void;
  onSave: (draft: TimeBlockDraft) => void;
  onDelete: (block: TimeBlock) => void;
}) {
  const [title, setTitle] = useState(block?.title ?? "");
  const [type, setType] = useState<TimeBlockType>(block?.type ?? "Deep Work");
  const start = block ? new Date(block.startAt) : localDateTime(initialDate, initialHour);
  const end = block ? new Date(block.endAt) : new Date(start.getTime() + 60 * 60_000);
  const [startValue, setStartValue] = useState(toLocalDateTimeInput(start.toISOString()));
  const [endValue, setEndValue] = useState(toLocalDateTimeInput(end.toISOString()));
  const [notes, setNotes] = useState(block?.notes ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const startAt = new Date(startValue);
    const endAt = new Date(endValue);
    if (!trimmedTitle) {
      setError("Give your time block a name.");
      return;
    }
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      setError("The end time needs to be later than the start time.");
      return;
    }
    onSave({ title: trimmedTitle, type, startAt: startAt.toISOString(), endAt: endAt.toISOString(), notes: notes.trim() });
  }

  return (
    <div className="calendar-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section aria-labelledby="time-block-title" aria-modal="true" className="calendar-editor-modal" role="dialog">
        <div className="calendar-editor-heading">
          <div><span className="calendar-modal-kicker"><Layers3 size={13} /> PROTECT A LITTLE SPACE</span><h2 id="time-block-title">{block ? "Edit time block" : "Create a time block"}</h2></div>
          <button aria-label="Close time block editor" className="task-icon-button" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <form className="calendar-editor-form" onSubmit={submit}>
          <label className="calendar-field"><span>What are you making time for?</span><input autoFocus onChange={(event) => { setTitle(event.target.value); setError(""); }} placeholder="A moment for focused work…" value={title} /></label>
          <label className="calendar-field"><span>Kind of time</span><select onChange={(event) => setType(event.target.value as TimeBlockType)} value={type}>{timeBlockTypes.map((option) => <option key={option}>{option}</option>)}</select></label>
          <div className="calendar-form-grid">
            <label className="calendar-field"><span>Starts</span><input onChange={(event) => setStartValue(event.target.value)} type="datetime-local" value={startValue} /></label>
            <label className="calendar-field"><span>Ends</span><input onChange={(event) => setEndValue(event.target.value)} type="datetime-local" value={endValue} /></label>
          </div>
          <label className="calendar-field"><span>Note <small>Optional</small></span><textarea onChange={(event) => setNotes(event.target.value)} placeholder="Anything you want to remember…" rows={2} value={notes} /></label>
          {error && <p className="calendar-form-error" role="alert">{error}</p>}
          <div className="calendar-modal-actions">
            {block && <button className="calendar-delete-block-button" onClick={() => onDelete(block)} type="button"><Trash2 size={14} /> Delete block</button>}
            <button className="task-secondary-button" onClick={onClose} type="button">Cancel</button>
            <button className="task-primary-button" type="submit"><Check size={15} /> {block ? "Save time block" : "Protect this time"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DeleteTimeBlockDialog({
  block,
  onCancel,
  onConfirm,
}: {
  block: TimeBlock;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onCancel]);

  return (
    <div className="calendar-modal-backdrop calendar-confirm-layer">
      <section aria-labelledby="delete-time-block-title" aria-modal="true" className="calendar-confirm-dialog" role="alertdialog">
        <span className="calendar-confirm-icon block-confirm-icon"><Trash2 size={19} /></span>
        <h2 id="delete-time-block-title">Release this time?</h2>
        <p><strong>{block.title}</strong> will be removed from your calendar. Your tasks are unchanged.</p>
        <div className="calendar-modal-actions">
          <button className="task-secondary-button" onClick={onCancel} type="button">Keep block</button>
          <button className="task-danger-button" onClick={onConfirm} type="button"><Trash2 size={14} /> Delete block</button>
        </div>
      </section>
    </div>
  );
}

function CalendarEventCard({
  event,
  compact = false,
  onTaskOpen,
  onTaskSchedule,
  onBlockEdit,
  onBlockDelete,
  onDragStart,
}: {
  event: CalendarEvent;
  compact?: boolean;
  onTaskOpen: (task: DashboardTask) => void;
  onTaskSchedule: (task: DashboardTask) => void;
  onBlockEdit: (block: TimeBlock) => void;
  onBlockDelete: (block: TimeBlock) => void;
  onDragStart: (event: DragEvent<HTMLElement>, value: CalendarEvent) => void;
}) {
  const task = event.kind === "task" ? event.task : null;
  const block = event.kind === "block" ? event.block : null;
  const startAt = task?.scheduledStartAt ?? block?.startAt ?? "";
  const endAt = task?.scheduledEndAt ?? block?.endAt ?? "";
  return (
    <article
      className={`calendar-event-card ${event.kind === "task" ? `event-task category-event-${task?.category.toLowerCase()}` : `event-block block-${block?.type.toLowerCase().replace(" ", "-")}`}${compact ? " is-compact" : ""}`}
      draggable
      onDragStart={(nativeEvent) => onDragStart(nativeEvent, event)}
    >
      <button
        className="calendar-event-open"
        onClick={() => task ? onTaskOpen(task) : block ? onBlockEdit(block) : undefined}
        type="button"
      >
        <span className="calendar-event-time">{formatTime(startAt)}{!compact && ` – ${formatTime(endAt)}`}</span>
        <span className="calendar-event-title">{task?.title ?? block?.title}</span>
        {!compact && block && <span className="calendar-event-subtitle">{block.type}</span>}
        {!compact && task && <span className="calendar-event-subtitle">{task.priority} priority{task.status === "Completed" ? " · Done" : ""}</span>}
      </button>
      {!compact && (
        <div className="calendar-event-actions">
          {task && <button aria-label={`Reschedule ${task.title}`} onClick={() => onTaskSchedule(task)} type="button"><Pencil size={12} /></button>}
          {block && <button aria-label={`Edit ${block.title}`} onClick={() => onBlockEdit(block)} type="button"><Pencil size={12} /></button>}
          {block && <button aria-label={`Delete ${block.title}`} onClick={() => onBlockDelete(block)} type="button"><Trash2 size={12} /></button>}
        </div>
      )}
    </article>
  );
}

function TaskDetailDialog({
  task,
  onClose,
  onSchedule,
  onComplete,
}: {
  task: DashboardTask;
  onClose: () => void;
  onSchedule: () => void;
  onComplete: () => void;
}) {
  const [confirmComplete, setConfirmComplete] = useState(false);
  return (
    <>
      <div className="calendar-modal-backdrop" onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
        <section aria-labelledby="calendar-task-detail-title" aria-modal="true" className="calendar-task-detail" role="dialog">
          <div className="calendar-editor-heading">
            <div><span className="calendar-modal-kicker"><CalendarDays size={13} /> TASK IN YOUR CALENDAR</span><h2 id="calendar-task-detail-title">{task.title}</h2></div>
            <button aria-label="Close task details" className="task-icon-button" onClick={onClose} type="button"><X size={18} /></button>
          </div>
          <p className="calendar-detail-description">{task.description || "No description has been added for this task."}</p>
          <div className="calendar-detail-badges">
            <span className={`calendar-priority-chip priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
            <span>{task.category}</span>
            <span>{task.status}</span>
          </div>
          <div className="calendar-detail-times">
            {task.scheduledStartAt && task.scheduledEndAt && <p><Clock3 size={14} /><span><strong>Scheduled</strong>{new Date(task.scheduledStartAt).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })} · {formatRange(task.scheduledStartAt, task.scheduledEndAt)}</span></p>}
            {task.dueAt && <p><AlarmClock size={14} /><span><strong>Deadline</strong>{new Date(task.dueAt).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })} · {formatTime(task.dueAt)}</span></p>}
          </div>
          {task.tags.length > 0 && <div className="calendar-detail-tags">{task.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
          {task.subtasks.length > 0 && (
            <div className="calendar-detail-subtasks">
              <strong>Subtasks · {task.subtasks.filter((item) => item.completed).length}/{task.subtasks.length}</strong>
              {task.subtasks.map((item) => <span key={item.id}>{item.completed ? <CheckCircle2 size={14} /> : <Circle size={14} />}{item.title}</span>)}
            </div>
          )}
          <div className="calendar-modal-actions">
            <button className="task-secondary-button" onClick={onSchedule} type="button"><Pencil size={14} /> Edit schedule</button>
            <button className="task-primary-button" onClick={() => setConfirmComplete(true)} type="button"><CheckCircle2 size={14} /> {task.status === "Completed" ? "Reopen task" : "Mark complete"}</button>
          </div>
        </section>
      </div>
      {confirmComplete && (
        <div className="calendar-modal-backdrop calendar-confirm-layer">
          <section aria-labelledby="calendar-complete-title" aria-modal="true" className="calendar-confirm-dialog" role="alertdialog">
            <span className="calendar-confirm-icon"><CheckCircle2 size={20} /></span>
            <h2 id="calendar-complete-title">{task.status === "Completed" ? "Bring it back to your list?" : "Mark this task complete?"}</h2>
            <p>{task.title} will be updated everywhere in your MINDSPACE.</p>
            <div className="calendar-modal-actions">
              <button className="task-secondary-button" onClick={() => setConfirmComplete(false)} type="button">Not yet</button>
              <button className="task-primary-button" onClick={onComplete} type="button"><Check size={14} /> Yes, update it</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export function CalendarPage({
  tasks,
  taskStorageError,
  onUpdateTask,
  blocks,
  blockStorageError,
  onCreateBlock,
  onUpdateBlock,
  onDeleteBlock,
  onOpenWelcome,
  onNavigate,
}: CalendarPageProps) {
  const [view, setView] = useState<CalendarView>("week");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<{ task: DashboardTask | null; date: Date; hour: number } | null>(null);
  const [blockTarget, setBlockTarget] = useState<{ block: TimeBlock | null; date: Date; hour: number } | null>(null);
  const [deleteBlockTarget, setDeleteBlockTarget] = useState<TimeBlock | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const detailTask = tasks.find((task) => task.id === detailTaskId) ?? null;
  const monthCells = useMemo(() => monthDates(selectedDate), [selectedDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(selectedDate), index)),
    [selectedDate],
  );
  const dayColumns = view === "day" ? [selectedDate] : weekDays;
  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, index) => DAY_START_HOUR + index);
  const selectedAgenda = eventsOnDate(tasks, blocks, selectedDate);
  const unscheduledTasks = tasks.filter((task) => !isScheduled(task) && task.status !== "Completed");
  const upcomingDeadlines = tasks
    .filter((task) => task.dueAt && task.status !== "Completed")
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""))
    .slice(0, 5);

  const notifications = useMemo(() => {
    const currentTime = now.getTime();
    const soonLimit = currentTime + 30 * 60_000;
    const deadlineLimit = currentTime + 24 * 60 * 60_000;
    const results: NotificationItem[] = [];
    const seen = new Set<string>();
    const notifiedTasks = new Set<string>();
    const addNotification = (item: NotificationItem) => {
      if (seen.has(item.id)) return;
      seen.add(item.id);
      results.push(item);
    };

    for (const task of tasks) {
      if (task.status === "Completed") continue;
      if (task.dueAt && Date.parse(task.dueAt) < currentTime) {
        addNotification({
          id: `overdue-task-${task.id}`,
          title: "A deadline has passed",
          detail: task.title,
          tone: "overdue",
          date: new Date(task.dueAt).toLocaleDateString([], { month: "short", day: "numeric" }),
        });
        notifiedTasks.add(task.id);
      } else if (task.dueAt && Date.parse(task.dueAt) <= deadlineLimit) {
        addNotification({
          id: `deadline-task-${task.id}`,
          title: "Deadline approaching",
          detail: task.title,
          tone: "soon",
          date: formatTime(task.dueAt),
        });
        notifiedTasks.add(task.id);
      }
      if (!notifiedTasks.has(task.id) && task.scheduledStartAt && Date.parse(task.scheduledStartAt) >= currentTime && Date.parse(task.scheduledStartAt) <= soonLimit) {
        addNotification({
          id: `scheduled-task-${task.id}`,
          title: "A task is coming up",
          detail: task.title,
          tone: "soon",
          date: formatTime(task.scheduledStartAt),
        });
        notifiedTasks.add(task.id);
      }
    }
    for (const block of blocks) {
      if (Date.parse(block.startAt) >= currentTime && Date.parse(block.startAt) <= soonLimit) {
        addNotification({
          id: `upcoming-block-${block.id}`,
          title: `${block.type} is coming up`,
          detail: block.title,
          tone: "block",
          date: formatTime(block.startAt),
        });
      }
    }
    return results.sort((a, b) => {
      const toneOrder = { overdue: 0, soon: 1, block: 2 };
      return toneOrder[a.tone] - toneOrder[b.tone];
    });
  }, [tasks, blocks, now]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function shiftPeriod(direction: -1 | 1) {
    setSelectedDate((current) => {
      const next = new Date(current);
      if (view === "month") next.setMonth(next.getMonth() + direction);
      else if (view === "week") next.setDate(next.getDate() + direction * 7);
      else next.setDate(next.getDate() + direction);
      return next;
    });
  }

  function moveTaskTo(task: DashboardTask, date: Date, hour?: number) {
    const existingStart = task.scheduledStartAt ? new Date(task.scheduledStartAt) : null;
    const startAt = hour === undefined
      ? localDateTime(date, existingStart?.getHours() ?? 9, existingStart?.getMinutes() ?? 0)
      : localDateTime(date, hour);
    const duration = task.scheduledStartAt && task.scheduledEndAt
      ? Math.max(Date.parse(task.scheduledEndAt) - Date.parse(task.scheduledStartAt), 15 * 60_000)
      : 60 * 60_000;
    const endAt = new Date(startAt.getTime() + duration);
    onUpdateTask(task.id, scheduledTaskDraft(task, startAt, endAt));
    setToast(`Moved “${task.title}” to ${startAt.toLocaleDateString([], { month: "short", day: "numeric" })} at ${formatTime(startAt.toISOString())}.`);
  }

  function moveBlockTo(block: TimeBlock, date: Date, hour?: number) {
    const existingStart = new Date(block.startAt);
    const startAt = hour === undefined
      ? localDateTime(date, existingStart.getHours(), existingStart.getMinutes())
      : localDateTime(date, hour);
    const duration = Date.parse(block.endAt) - Date.parse(block.startAt);
    const endAt = new Date(startAt.getTime() + duration);
    onUpdateBlock(block.id, { startAt: startAt.toISOString(), endAt: endAt.toISOString() });
    setToast(`Moved “${block.title}” to ${formatTime(startAt.toISOString())}.`);
  }

  function handleDrop(event: DragEvent<HTMLElement>, date: Date, hour?: number) {
    event.preventDefault();
    const payload = event.dataTransfer.getData("application/x-mindspace-event");
    const id = event.dataTransfer.getData("text/plain");
    setDragOver("");
    if (payload.startsWith("task:")) {
      const task = tasks.find((item) => item.id === payload.slice(5));
      if (task) moveTaskTo(task, date, hour);
    } else if (payload.startsWith("block:")) {
      const block = blocks.find((item) => item.id === payload.slice(6));
      if (block) moveBlockTo(block, date, hour);
    } else if (id) {
      const task = tasks.find((item) => item.id === id);
      if (task) moveTaskTo(task, date, hour);
    }
  }

  function startDrag(event: DragEvent<HTMLElement>, calendarEvent: CalendarEvent) {
    const payload = calendarEvent.kind === "task"
      ? `task:${calendarEvent.task.id}`
      : `block:${calendarEvent.block.id}`;
    event.dataTransfer.setData("application/x-mindspace-event", payload);
    event.dataTransfer.setData("text/plain", payload);
    event.dataTransfer.effectAllowed = "move";
  }

  function scheduleTask(task: DashboardTask, startAt: Date, endAt: Date) {
    onUpdateTask(task.id, scheduledTaskDraft(task, startAt, endAt));
    setScheduleTarget(null);
    setToast(`“${task.title}” is on your calendar.`);
  }

  function saveBlock(draft: TimeBlockDraft) {
    if (blockTarget?.block) {
      onUpdateBlock(blockTarget.block.id, draft);
      setToast("Your time block has been updated.");
    } else {
      onCreateBlock(draft);
      setToast("A little time has been protected.");
    }
    setBlockTarget(null);
  }

  function scheduleFromTask(task: DashboardTask) {
    const date = task.scheduledStartAt ? new Date(task.scheduledStartAt) : selectedDate;
    const hour = task.scheduledStartAt ? new Date(task.scheduledStartAt).getHours() : 9;
    setScheduleTarget({ task, date, hour });
  }

  const heading = view === "month"
    ? selectedDate.toLocaleDateString([], { month: "long", year: "numeric" })
    : view === "day"
      ? selectedDate.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })
      : `${weekDays[0].toLocaleDateString([], { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString([], { month: "short", day: "numeric", year: weekDays[0].getFullYear() !== weekDays[6].getFullYear() ? "numeric" : undefined })}`;

  return (
    <div className="dashboard-shell">
      <DashboardSidebar
        activePage="calendar"
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onNavigate={onNavigate}
        onOpenWelcome={onOpenWelcome}
        onToggle={() => setCollapsed((value) => !value)}
      />
      <main className="dashboard-main calendar-main">
        <header className="dashboard-topbar">
          <div className="topbar-leading">
            <button aria-label="Open navigation" className="mobile-menu-button" onClick={() => setMobileOpen(true)} type="button"><CalendarDays size={19} /></button>
            <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Calendar</strong></div>
          </div>
          <div className="topbar-actions">
            <NotificationBell notifications={notifications} />
            <span className="topbar-avatar" aria-label="Your profile">M</span>
          </div>
        </header>
        <div className="calendar-page-content">
          {(taskStorageError || blockStorageError) && (
            <div className="task-storage-warning calendar-storage-warning" role="alert">
              <X size={15} />{[taskStorageError, blockStorageError].filter(Boolean).join(" ")}
            </div>
          )}
          <section className="calendar-page-heading">
            <div>
              <div className="dashboard-eyebrow"><span className="eyebrow-line" /> MAKE TIME FOR WHAT MATTERS</div>
              <h1>Your <span>calendar</span></h1>
              <p>A little structure can make room for a lot of good things.</p>
            </div>
            <div className="calendar-heading-actions">
              <button className="calendar-secondary-action" onClick={() => setBlockTarget({ block: null, date: selectedDate, hour: 9 })} type="button"><Layers3 size={15} /><span>Time block</span></button>
              <button className="primary-button calendar-schedule-button" onClick={() => setScheduleTarget({ task: null, date: selectedDate, hour: 9 })} type="button"><Plus size={16} /><span>Schedule task</span></button>
            </div>
          </section>

          <section className="calendar-panel">
            <div className="calendar-toolbar">
              <div className="calendar-period-controls">
                <button aria-label="Previous period" className="calendar-arrow" onClick={() => shiftPeriod(-1)} type="button"><ChevronLeft size={17} /></button>
                <button aria-label="Next period" className="calendar-arrow" onClick={() => shiftPeriod(1)} type="button"><ChevronRight size={17} /></button>
                <h2>{heading}</h2>
                <button className="calendar-today-button" onClick={() => setSelectedDate(new Date())} type="button">Today</button>
              </div>
              <div aria-label="Calendar view" className="calendar-view-switch" role="group">
                {(["month", "week", "day"] as const).map((option) => (
                  <button aria-pressed={view === option} className={view === option ? "selected" : ""} key={option} onClick={() => setView(option)} type="button">{option[0].toUpperCase()}{option.slice(1)}</button>
                ))}
              </div>
            </div>

            {view === "month" ? (
              <div aria-label={`${heading} calendar`} className="month-calendar">
                <div className="month-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
                <div className="month-grid">
                  {monthCells.map((date) => {
                    const dateEvents = eventsOnDate(tasks, blocks, date);
                    const isToday = isSameDay(date, today);
                    const isSelected = isSameDay(date, selectedDate);
                    const dateKey = dayKey(date);
                    return (
                      <div
                        aria-label={`${weekdayLong[(date.getDay() + 6) % 7]}, ${date.toLocaleDateString([], { month: "long", day: "numeric" })}`}
                        className={`month-cell${date.getMonth() !== selectedDate.getMonth() ? " outside-month" : ""}${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}${dragOver === `month-${dateKey}` ? " is-drop-target" : ""}`}
                        key={dateKey}
                        onClick={() => setSelectedDate(date)}
                        onDragEnter={(event) => { event.preventDefault(); setDragOver(`month-${dateKey}`); }}
                        onDragLeave={() => setDragOver("")}
                        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                        onDrop={(event) => handleDrop(event, date)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") setSelectedDate(date);
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <span className={`month-date${isToday ? " today-date" : ""}`}>{date.getDate()}</span>
                        <div className="month-events">
                          {dateEvents.slice(0, 3).map((calendarEvent) => {
                                                const eventId = calendarEvent.kind === "task" ? calendarEvent.task.id : calendarEvent.block.id;
                            return (
                              <CalendarEventCard
                                compact
                                event={calendarEvent}
                                key={`${calendarEvent.kind}-${eventId}`}
                                onBlockDelete={setDeleteBlockTarget}
                                onBlockEdit={(block) => setBlockTarget({ block, date: new Date(block.startAt), hour: new Date(block.startAt).getHours() })}
                                onDragStart={startDrag}
                                onTaskOpen={(task) => setDetailTaskId(task.id)}
                                onTaskSchedule={scheduleFromTask}
                              />
                            );
                          })}
                          {dateEvents.length > 3 && <span className="month-more-events">+{dateEvents.length - 3} more</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={`time-calendar time-calendar-${view}`}>
                <div className="time-calendar-header">
                  <span className="time-gutter-label"><Clock3 size={13} /></span>
                  {dayColumns.map((date) => (
                    <button className={`time-day-heading${isSameDay(date, today) ? " is-today" : ""}`} key={dayKey(date)} onClick={() => { setSelectedDate(date); if (view === "week") setView("day"); }} type="button">
                      <span>{weekdays[(date.getDay() + 6) % 7]}</span>
                      <strong>{date.getDate()}</strong>
                    </button>
                  ))}
                </div>
                <div className="time-calendar-scroll">
                  <div className="time-calendar-grid">
                    <div className="time-label-column">
                      {hours.map((hour) => <span className="time-label" data-short-time={`${hour % 12 || 12}${hour < 12 ? "a" : "p"}`} key={hour}>{new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: "numeric" })}</span>)}
                    </div>
                    {dayColumns.map((date) => (
                      <div className="time-day-column" key={dayKey(date)}>
                        {hours.map((hour) => {
                          const dateEvents = eventsOnDate(tasks, blocks, date).filter((event) => {
                            const startsAt = event.kind === "task" ? event.task.scheduledStartAt : event.block.startAt;
                            return new Date(startsAt).getHours() === hour;
                          });
                          const slotKey = `${dayKey(date)}-${hour}`;
                          return (
                            <div
                              className={`time-slot${dragOver === slotKey ? " is-drop-target" : ""}`}
                              key={slotKey}
                              onClick={() => {
                                setSelectedDate(date);
                                if (view === "week") setView("day");
                              }}
                              onDragEnter={(event) => { event.preventDefault(); setDragOver(slotKey); }}
                              onDragLeave={() => setDragOver("")}
                              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                              onDrop={(event) => handleDrop(event, date, hour)}
                            >
                              {dateEvents.map((calendarEvent) => {
                                const eventId = calendarEvent.kind === "task" ? calendarEvent.task.id : calendarEvent.block.id;
                                return (
                                  <CalendarEventCard
                                    event={calendarEvent}
                                    key={`${calendarEvent.kind}-${eventId}`}
                                    onBlockDelete={setDeleteBlockTarget}
                                    onBlockEdit={(block) => setBlockTarget({ block, date: new Date(block.startAt), hour: new Date(block.startAt).getHours() })}
                                    onDragStart={startDrag}
                                    onTaskOpen={(task) => setDetailTaskId(task.id)}
                                    onTaskSchedule={scheduleFromTask}
                                  />
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="calendar-lower-grid">
            <article className="calendar-agenda-panel">
              <div className="calendar-section-heading">
                <div><span className="calendar-panel-kicker">A CLEAR PLAN FOR TODAY</span><h2>{isSameDay(selectedDate, today) ? "Today’s agenda" : selectedDate.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</h2></div>
                <span className="calendar-agenda-date">{selectedDate.toLocaleDateString([], { month: "short", day: "numeric" })}</span>
              </div>
              <div className="calendar-agenda-list">
                {selectedAgenda.length === 0 ? (
                  <div className="calendar-agenda-empty"><span><CalendarDays size={17} /></span><p>A little open space. Add a task or protect some time.</p><button onClick={() => setScheduleTarget({ task: null, date: selectedDate, hour: 9 })} type="button"><Plus size={13} /> Schedule a task</button></div>
                ) : selectedAgenda.map((calendarEvent) => {
                  const isTask = calendarEvent.kind === "task";
                  const title = isTask ? calendarEvent.task.title : calendarEvent.block.title;
                  const startAt = isTask ? calendarEvent.task.scheduledStartAt : calendarEvent.block.startAt;
                  const endAt = isTask ? calendarEvent.task.scheduledEndAt : calendarEvent.block.endAt;
                  const priority = isTask ? calendarEvent.task.priority : null;
                  const status = isTask ? calendarEvent.task.status : null;
                  const key = isTask ? calendarEvent.task.id : calendarEvent.block.id;
                  return (
                    <button
                      className={`calendar-agenda-row ${isTask ? `agenda-task category-event-${calendarEvent.task.category.toLowerCase()}` : `agenda-block block-${calendarEvent.block.type.toLowerCase().replace(" ", "-")}`}`}
                      key={`${calendarEvent.kind}-${key}`}
                      onClick={() => isTask ? setDetailTaskId(calendarEvent.task.id) : setBlockTarget({ block: calendarEvent.block, date: new Date(calendarEvent.block.startAt), hour: new Date(calendarEvent.block.startAt).getHours() })}
                      type="button"
                    >
                      <span className="agenda-time">{formatRange(startAt, endAt)}</span>
                      <span className="agenda-event-mark">{isTask ? status === "Completed" ? <CheckCircle2 size={16} /> : <Circle size={16} /> : timeBlockIcon(calendarEvent.block.type, 15)}</span>
                      <span className="agenda-event-copy"><strong>{title}</strong><small>{isTask ? `${calendarEvent.task.category} · ${priority} priority` : calendarEvent.block.type}</small></span>
                      <ChevronRight className="agenda-chevron" size={15} />
                    </button>
                  );
                })}
              </div>
            </article>
            <article className="calendar-deadlines-panel">
              <div className="calendar-section-heading">
                <div><span className="calendar-panel-kicker">COMING INTO VIEW</span><h2>Upcoming deadlines</h2></div>
                <AlarmClock className="calendar-deadline-heading-icon" size={17} />
              </div>
              <div className="upcoming-deadlines-list">
                {upcomingDeadlines.length === 0 ? (
                  <div className="upcoming-empty"><Sparkles size={17} /><span>No deadlines are waiting for you.</span></div>
                ) : upcomingDeadlines.map((task) => (
                  <button className="upcoming-deadline-row" key={task.id} onClick={() => setDetailTaskId(task.id)} type="button">
                    <span className={`calendar-priority-chip priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
                    <span className="upcoming-deadline-title">{task.title}<small>{task.category}</small></span>
                    <time className={task.dueAt && Date.parse(task.dueAt) < now.getTime() ? "is-overdue" : ""}>{task.dueAt && new Date(task.dueAt).toLocaleDateString([], { month: "short", day: "numeric" })}</time>
                  </button>
                ))}
              </div>
            </article>
          </section>

          <section className="calendar-unscheduled-panel">
            <div className="calendar-section-heading">
              <div><span className="calendar-panel-kicker">MAKE ROOM IN YOUR DAY</span><h2>Ready to find a time</h2></div>
              <span className="unscheduled-count">{unscheduledTasks.length} unscheduled</span>
            </div>
            {unscheduledTasks.length === 0 ? (
              <div className="unscheduled-empty"><CheckCircle2 size={17} /> Everything has a place. Nice work.</div>
            ) : (
              <div className="unscheduled-task-list">
                {unscheduledTasks.slice(0, 6).map((task) => (
                  <article className="unscheduled-task" key={task.id}>
                    <span className={`unscheduled-priority priority-${task.priority.toLowerCase()}`} />
                    <button onClick={() => setDetailTaskId(task.id)} type="button"><strong>{task.title}</strong><small>{task.category}{task.dueAt ? ` · Due ${new Date(task.dueAt).toLocaleDateString([], { month: "short", day: "numeric" })}` : ""}</small></button>
                    <button aria-label={`Schedule ${task.title}`} onClick={() => setScheduleTarget({ task, date: selectedDate, hour: 9 })} type="button"><Plus size={14} /><span>Schedule</span></button>
                  </article>
                ))}
              </div>
            )}
          </section>
          <footer className="calendar-footer"><span><Sparkles size={13} /> Your time is yours to shape.</span><span>MINDSPACE · YOUR SPACE TO GROW</span></footer>
        </div>
      </main>
      {scheduleTarget && (
        <ScheduleTaskDialog
          initialDate={scheduleTarget.date}
          initialHour={scheduleTarget.hour}
          onClose={() => setScheduleTarget(null)}
          onSave={scheduleTask}
          task={scheduleTarget.task}
          tasks={tasks}
        />
      )}
      {blockTarget && (
        <TimeBlockDialog
          block={blockTarget.block}
          initialDate={blockTarget.date}
          initialHour={blockTarget.hour}
          onClose={() => setBlockTarget(null)}
          onDelete={(block) => {
            setBlockTarget(null);
            setDeleteBlockTarget(block);
          }}
          onSave={saveBlock}
        />
      )}
      {deleteBlockTarget && (
        <DeleteTimeBlockDialog
          block={deleteBlockTarget}
          onCancel={() => setDeleteBlockTarget(null)}
          onConfirm={() => {
            onDeleteBlock(deleteBlockTarget.id);
            setDeleteBlockTarget(null);
            setToast("Your calendar has a little more room.");
          }}
        />
      )}
      {detailTask && (
        <TaskDetailDialog
          onClose={() => setDetailTaskId(null)}
          onComplete={() => {
            onUpdateTask(detailTask.id, { status: detailTask.status === "Completed" ? "To Do" : "Completed" });
            setDetailTaskId(null);
            setToast(detailTask.status === "Completed" ? "Task moved back to your list." : "A task well done. Your dashboard is updated.");
          }}
          onSchedule={() => { scheduleFromTask(detailTask); setDetailTaskId(null); }}
          task={detailTask}
        />
      )}
      {toast && <div aria-live="polite" className="task-toast calendar-toast" role="status"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  );
}
