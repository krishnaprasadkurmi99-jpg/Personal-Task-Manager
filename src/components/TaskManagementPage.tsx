import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownWideNarrow,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  Copy,
  FileText,
  List,
  ListTodo,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
  XCircle,
  LayoutGrid,
} from "lucide-react";
import {
  taskCategories,
  taskPriorities,
  taskStatuses,
  type DashboardTask,
  type TaskCategory,
  type TaskDraft,
  type TaskPriority,
  type TaskStatus,
} from "../data/dashboard";
import type { WorkspacePage } from "../data/navigation";
import { DashboardSidebar } from "./DashboardSidebar";

type TaskManagementPageProps = {
  tasks: DashboardTask[];
  storageError: string | null;
  onCreateTask: (draft: TaskDraft) => void;
  onUpdateTask: (id: string, patch: Partial<TaskDraft>) => void;
  onDeleteTask: (id: string) => void;
  onDuplicateTask: (id: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onUpdateSubtask: (taskId: string, subtaskId: string, completed: boolean) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
  onOpenDashboard: () => void;
  onOpenWelcome: () => void;
  onOpenCalendar: () => void;
  onOpenBrainDump: () => void;
  onOpenPlanner: () => void;
  onNavigate: (page: WorkspacePage) => void;
};

type SortMode = "newest" | "oldest" | "priority" | "deadline";
type DueFilter = "all" | "overdue" | "today" | "upcoming" | "no-date";
type ViewMode = "list" | "board";
type ToastMessage = { id: number; message: string };

const priorityRank: Record<TaskPriority, number> = {
  Urgent: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

function isDueToday(value: string): boolean {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
}

function isOverdue(task: Pick<DashboardTask, "dueAt" | "status">): boolean {
  return task.status !== "Completed" && task.dueAt !== null &&
    new Date(task.dueAt).getTime() < Date.now();
}

function formatDue(value: string | null, status: TaskStatus = "To Do"): { text: string; tone: string } {
  if (!value) return { text: "No deadline", tone: "no-date" };
  const date = new Date(value);
  if (isOverdue({ dueAt: value, status })) {
    return {
      text: `Overdue · ${date.toLocaleDateString([], { month: "short", day: "numeric" })}`,
      tone: "overdue",
    };
  }
  if (isDueToday(value)) {
    return {
      text: `Today · ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
      tone: "today",
    };
  }
  return {
    text: date.toLocaleDateString([], { month: "short", day: "numeric" }),
    tone: "upcoming",
  };
}

function toLocalDateTimeInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function StatusMark({ status }: { status: TaskStatus }) {
  if (status === "Completed") return <CheckCircle2 size={16} />;
  if (status === "In Progress") return <Clock3 size={16} />;
  return <Circle size={16} />;
}

function TaskEditor({
  task,
  onClose,
  onSave,
}: {
  task: DashboardTask | null;
  onClose: () => void;
  onSave: (draft: TaskDraft) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [category, setCategory] = useState<TaskCategory>(task?.category ?? "Work");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "Medium");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "To Do");
  const [dueAt, setDueAt] = useState(toLocalDateTimeInput(task?.dueAt ?? null));
  const [tagsText, setTagsText] = useState(task?.tags.join(", ") ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("A task needs a title before it can be saved.");
      return;
    }
    onSave({
      title: trimmedTitle,
      description: description.trim(),
      category,
      priority,
      status,
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      scheduledStartAt: task?.scheduledStartAt ?? null,
      scheduledEndAt: task?.scheduledEndAt ?? null,
      tags: [...new Set(tagsText.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean))],
    });
  }

  return (
    <div className="task-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section aria-labelledby="task-editor-title" aria-modal="true" className="task-editor-modal" role="dialog">
        <div className="task-editor-heading">
          <div>
            <span className="task-modal-kicker"><Sparkles size={13} /> {task ? "REFINE YOUR PLAN" : "MAKE SPACE FOR IT"}</span>
            <h2 id="task-editor-title">{task ? "Edit task" : "Create a task"}</h2>
          </div>
          <button aria-label="Close task editor" className="task-icon-button" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <form className="task-editor-form" onSubmit={handleSubmit}>
          <label className="task-field">
            <span>Task title</span>
            <input autoFocus onChange={(event) => { setTitle(event.target.value); setError(""); }} placeholder="What needs your attention?" value={title} />
          </label>
          <label className="task-field">
            <span>Description <small>Optional</small></span>
            <textarea onChange={(event) => setDescription(event.target.value)} placeholder="Add a little more context…" rows={3} value={description} />
          </label>
          <div className="task-form-grid">
            <label className="task-field">
              <span>Category</span>
              <select onChange={(event) => setCategory(event.target.value as TaskCategory)} value={category}>
                {taskCategories.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className="task-field">
              <span>Priority</span>
              <select onChange={(event) => setPriority(event.target.value as TaskPriority)} value={priority}>
                {taskPriorities.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          </div>
          <div className="task-form-grid">
            <label className="task-field">
              <span>Status</span>
              <select onChange={(event) => setStatus(event.target.value as TaskStatus)} value={status}>
                {taskStatuses.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className="task-field">
              <span>Due date <small>Optional</small></span>
              <input onChange={(event) => setDueAt(event.target.value)} type="datetime-local" value={dueAt} />
            </label>
          </div>
          <label className="task-field">
            <span>Tags <small>Separate with commas</small></span>
            <input onChange={(event) => setTagsText(event.target.value)} placeholder="planning, deep work" value={tagsText} />
          </label>
          {error && <p className="task-form-error" role="alert">{error}</p>}
          <div className="task-modal-actions">
            <button className="task-secondary-button" onClick={onClose} type="button">Cancel</button>
            <button className="task-primary-button" type="submit"><Check size={15} /> {task ? "Save changes" : "Create task"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ConfirmationDialog({
  task,
  onCancel,
  onConfirm,
}: {
  task: DashboardTask;
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
    <div className="task-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <section aria-labelledby="delete-task-title" aria-modal="true" className="task-confirm-dialog" role="alertdialog">
        <span className="confirm-icon"><Trash2 size={20} /></span>
        <h2 id="delete-task-title">Let this one go?</h2>
        <p><strong>{task.title}</strong> will be removed from your tasks. This can’t be undone.</p>
        <div className="task-modal-actions">
          <button className="task-secondary-button" onClick={onCancel} type="button">Keep task</button>
          <button className="task-danger-button" onClick={onConfirm} type="button"><Trash2 size={15} /> Delete task</button>
        </div>
      </section>
    </div>
  );
}

function TaskDetailPanel({
  task,
  onClose,
  onEdit,
  onDelete,
  onToggleStatus,
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
}: {
  task: DashboardTask;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onAddSubtask: (title: string) => void;
  onUpdateSubtask: (id: string, completed: boolean) => void;
  onDeleteSubtask: (id: string) => void;
}) {
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const doneCount = task.subtasks.filter((subtask) => subtask.completed).length;
  const due = formatDue(task.dueAt, task.status);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  function submitSubtask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subtaskTitle.trim()) return;
    onAddSubtask(subtaskTitle);
    setSubtaskTitle("");
  }

  return (
    <>
      <div className="detail-backdrop" onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
        <aside aria-labelledby="task-detail-title" aria-modal="true" className="task-detail-panel" role="dialog">
          <div className="detail-topbar">
            <span className="detail-label"><FileText size={14} /> TASK DETAILS</span>
            <button aria-label="Close task details" className="task-icon-button" onClick={onClose} type="button"><X size={18} /></button>
          </div>
          <div className="detail-status-line">
            <span className={`task-status-pill status-${task.status.toLowerCase().replace(" ", "-")}`}><StatusMark status={task.status} /> {task.status}</span>
            <span className={`task-priority-pill priority-pill-${task.priority.toLowerCase()}`}><span /> {task.priority}</span>
          </div>
          <h2 id="task-detail-title" className="detail-title">{task.title}</h2>
          <div className="detail-meta-grid">
            <div><small>CATEGORY</small><span className={`category-dot category-${task.category.toLowerCase()}`} />{task.category}</div>
            <div><small>DEADLINE</small><CalendarDays size={14} /><span className={`due-label ${due.tone}`}>{due.text}</span></div>
          </div>
          {task.tags.length > 0 && (
            <div className="detail-section">
              <h3><Tag size={14} /> Tags</h3>
              <div className="task-tags">{task.tags.map((tag) => <span className="task-tag" key={tag}>#{tag}</span>)}</div>
            </div>
          )}
          <div className="detail-section">
            <h3><FileText size={14} /> Description</h3>
            <p className={`detail-description${task.description ? "" : " is-empty"}`}>
              {task.description || "Nothing written here yet. Add a description to give this task a little more context."}
            </p>
          </div>
          <div className="detail-section subtasks-section">
            <div className="subtask-heading">
              <h3><ListTodo size={14} /> Subtasks</h3>
              <span>{doneCount}/{task.subtasks.length}</span>
            </div>
            {task.subtasks.length > 0 && (
              <div className="subtask-progress"><span style={{ width: `${doneCount / task.subtasks.length * 100}%` }} /></div>
            )}
            <div className="subtask-list">
              {task.subtasks.map((subtask) => (
                <div className={`subtask-row${subtask.completed ? " is-done" : ""}`} key={subtask.id}>
                  <button
                    aria-label={`${subtask.completed ? "Reopen" : "Complete"} subtask ${subtask.title}`}
                    className="subtask-check"
                    onClick={() => onUpdateSubtask(subtask.id, !subtask.completed)}
                    type="button"
                  >
                    {subtask.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </button>
                  <span>{subtask.title}</span>
                  <button aria-label={`Delete subtask ${subtask.title}`} className="subtask-delete" onClick={() => onDeleteSubtask(subtask.id)} type="button"><X size={14} /></button>
                </div>
              ))}
            </div>
            <form className="add-subtask-form" onSubmit={submitSubtask}>
              <Plus size={15} />
              <input aria-label="New subtask" onChange={(event) => setSubtaskTitle(event.target.value)} placeholder="Add a subtask…" value={subtaskTitle} />
              <button disabled={!subtaskTitle.trim()} type="submit">Add</button>
            </form>
          </div>
          <div className="detail-actions">
            <button className="task-secondary-button" onClick={onToggleStatus} type="button">
              <CheckCircle2 size={15} /> {task.status === "Completed" ? "Reopen task" : "Mark complete"}
            </button>
            <div>
              <button aria-label="Edit task" className="task-icon-button" onClick={onEdit} type="button"><Pencil size={16} /></button>
              <button aria-label="Delete task" className="task-icon-button danger-hover" onClick={() => setShowDelete(true)} type="button"><Trash2 size={16} /></button>
            </div>
          </div>
        </aside>
      </div>
      {showDelete && (
        <ConfirmationDialog task={task} onCancel={() => setShowDelete(false)} onConfirm={onDelete} />
      )}
    </>
  );
}

function TaskCard({
  task,
  onOpen,
  onEdit,
  onDelete,
  onDuplicate,
  onMove,
}: {
  task: DashboardTask;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (status: TaskStatus) => void;
}) {
  const due = formatDue(task.dueAt, task.status);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <article
      className="task-management-card"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", task.id);
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="task-card-topline">
        <span className={`task-priority-pill priority-pill-${task.priority.toLowerCase()}`}><span /> {task.priority}</span>
        <button aria-label={`Task actions for ${task.title}`} className="task-icon-button task-card-menu-trigger" onClick={() => setMenuOpen((open) => !open)} type="button">
          <MoreHorizontal size={17} />
        </button>
        {menuOpen && (
          <div className="task-actions-menu">
            <button onClick={() => { onEdit(); setMenuOpen(false); }} type="button"><Pencil size={14} /> Edit</button>
            <button onClick={() => { onDuplicate(); setMenuOpen(false); }} type="button"><Copy size={14} /> Duplicate</button>
            <button className="menu-delete" onClick={() => { onDelete(); setMenuOpen(false); }} type="button"><Trash2 size={14} /> Delete</button>
          </div>
        )}
      </div>
      <button className="task-card-title-button" onClick={onOpen} type="button">
        <span className={`task-card-title${task.status === "Completed" ? " completed" : ""}`}>{task.title}</span>
        {task.description && <span className="task-card-description">{task.description}</span>}
      </button>
      {task.tags.length > 0 && (
        <div className="task-tags task-card-tags">
          {task.tags.slice(0, 3).map((tag) => <span className="task-tag" key={tag}>#{tag}</span>)}
          {task.tags.length > 3 && <span className="task-tag-more">+{task.tags.length - 3}</span>}
        </div>
      )}
      <div className="task-card-footer">
        <span className="task-card-category"><span className={`category-dot category-${task.category.toLowerCase()}`} />{task.category}</span>
        <span className={`task-card-due ${due.tone}`}><CalendarDays size={12} />{due.text}</span>
      </div>
      <div className="task-card-bottom">
        <span className="task-subtask-count">
          {task.subtasks.length > 0 && <><CheckCircle2 size={13} /> {task.subtasks.filter((item) => item.completed).length}/{task.subtasks.length}</>}
        </span>
        <label className="task-move-select">
          <span className="sr-only">Move {task.title} to status</span>
          <select onChange={(event) => onMove(event.target.value as TaskStatus)} value={task.status}>
            {taskStatuses.map((status) => <option key={status}>{status}</option>)}
          </select>
          <ChevronDown size={12} />
        </label>
      </div>
    </article>
  );
}

function TaskRow({
  task,
  onOpen,
  onEdit,
  onDelete,
  onDuplicate,
  onMove,
}: {
  task: DashboardTask;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (status: TaskStatus) => void;
}) {
  const due = formatDue(task.dueAt, task.status);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <article className={`management-list-row${task.status === "Completed" ? " is-completed" : ""}`}>
      <button
        aria-label={`${task.status === "Completed" ? "Reopen" : "Complete"} ${task.title}`}
        className="list-status-button"
        onClick={() => onMove(task.status === "Completed" ? "To Do" : "Completed")}
        type="button"
      >
        <StatusMark status={task.status} />
      </button>
      <button className="list-task-main" onClick={onOpen} type="button">
        <strong>{task.title}</strong>
        <span>{task.description || "No description"}{task.tags.length > 0 && <span className="list-tags-inline">{task.tags.slice(0, 2).map((tag) => ` #${tag}`).join("")}</span>}</span>
      </button>
      <span className={`task-priority-pill priority-pill-${task.priority.toLowerCase()}`}><span /> {task.priority}</span>
      <span className="list-category"><span className={`category-dot category-${task.category.toLowerCase()}`} />{task.category}</span>
      <span className={`list-deadline ${due.tone}`}><CalendarDays size={13} />{due.text}</span>
      <label className="list-status-select">
        <span className="sr-only">Status of {task.title}</span>
        <select onChange={(event) => onMove(event.target.value as TaskStatus)} value={task.status}>
          {taskStatuses.map((status) => <option key={status}>{status}</option>)}
        </select>
        <ChevronDown size={12} />
      </label>
      <div className="list-actions-wrap">
        <button aria-label={`Task actions for ${task.title}`} className="task-icon-button" onClick={() => setMenuOpen((open) => !open)} type="button"><MoreHorizontal size={17} /></button>
        {menuOpen && (
          <div className="task-actions-menu">
            <button onClick={() => { onEdit(); setMenuOpen(false); }} type="button"><Pencil size={14} /> Edit</button>
            <button onClick={() => { onDuplicate(); setMenuOpen(false); }} type="button"><Copy size={14} /> Duplicate</button>
            <button className="menu-delete" onClick={() => { onDelete(); setMenuOpen(false); }} type="button"><Trash2 size={14} /> Delete</button>
          </div>
        )}
      </div>
    </article>
  );
}

function EmptyTasks({ onCreate, onClear }: { onCreate: () => void; onClear: () => void }) {
  return (
    <div className="tasks-empty-state">
      <span className="tasks-empty-icon"><ListTodo size={25} /></span>
      <h3>A little room to breathe</h3>
      <p>Nothing matches right now. Try a different search or create something new.</p>
      <div>
        <button className="task-secondary-button" onClick={onClear} type="button"><XCircle size={14} /> Clear filters</button>
        <button className="task-primary-button" onClick={onCreate} type="button"><Plus size={15} /> Create a task</button>
      </div>
    </div>
  );
}

export function TaskManagementPage({
  tasks,
  storageError,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  onOpenWelcome,
  onNavigate,
}: TaskManagementPageProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [editorTask, setEditorTask] = useState<DashboardTask | null | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  const detailTask = tasks.find((task) => task.id === detailId) ?? null;
  const deleteTask = tasks.find((task) => task.id === deleteId) ?? null;

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const selected = tasks.filter((task) => {
      const matchesQuery = !normalizedQuery ||
        task.title.toLowerCase().includes(normalizedQuery) ||
        task.description.toLowerCase().includes(normalizedQuery) ||
        task.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesCategory = categoryFilter === "all" || task.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesDue = dueFilter === "all" ||
        (dueFilter === "overdue" && isOverdue(task)) ||
        (dueFilter === "today" && task.dueAt !== null && isDueToday(task.dueAt) && task.status !== "Completed") ||
        (dueFilter === "upcoming" && task.dueAt !== null && new Date(task.dueAt).getTime() > Date.now() && !isDueToday(task.dueAt) && task.status !== "Completed") ||
        (dueFilter === "no-date" && task.dueAt === null);
      return matchesQuery && matchesPriority && matchesCategory && matchesStatus && matchesDue;
    });

    return selected.sort((left, right) => {
      if (sort === "newest") return right.createdAt.localeCompare(left.createdAt);
      if (sort === "oldest") return left.createdAt.localeCompare(right.createdAt);
      if (sort === "priority") return priorityRank[left.priority] - priorityRank[right.priority] ||
        right.createdAt.localeCompare(left.createdAt);
      if (!left.dueAt) return right.dueAt ? 1 : 0;
      if (!right.dueAt) return -1;
      return left.dueAt.localeCompare(right.dueAt);
    });
  }, [tasks, query, priorityFilter, categoryFilter, statusFilter, dueFilter, sort]);

  function notify(message: string) {
    const id = Date.now();
    setToast({ id, message });
    window.setTimeout(() => setToast((current) => current?.id === id ? null : current), 2600);
  }

  function saveTask(draft: TaskDraft) {
    if (editorTask) {
      onUpdateTask(editorTask.id, draft);
      notify("Your task has been updated.");
    } else {
      onCreateTask(draft);
      notify("A new task is in your space.");
    }
    setEditorTask(undefined);
  }

  function confirmDelete() {
    if (!deleteId || !deleteTask) return;
    const removingOpenDetail = detailId === deleteId;
    onDeleteTask(deleteId);
    setDeleteId(null);
    if (removingOpenDetail) setDetailId(null);
    notify("Task removed from your space.");
  }

  function moveTask(task: DashboardTask, status: TaskStatus) {
    if (task.status === status) return;
    onUpdateTask(task.id, { status });
    notify(`Moved to ${status.toLowerCase()}.`);
  }

  function clearFilters() {
    setQuery("");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setStatusFilter("all");
    setDueFilter("all");
  }

  const activeFiltersCount = [
    priorityFilter !== "all",
    categoryFilter !== "all",
    statusFilter !== "all",
    dueFilter !== "all",
  ].filter(Boolean).length;

  return (
    <div className="dashboard-shell">
      <DashboardSidebar
        activePage="tasks"
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onNavigate={onNavigate}
        onOpenWelcome={onOpenWelcome}
        onToggle={() => setCollapsed((value) => !value)}
      />
      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-leading">
            <button aria-label="Open navigation" className="mobile-menu-button" onClick={() => setMobileOpen(true)} type="button"><List size={20} /></button>
            <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>My Tasks</strong></div>
          </div>
          <div className="topbar-actions">
            <span className="task-count-topbar">{tasks.length} {tasks.length === 1 ? "task" : "tasks"}</span>
            <span className="topbar-avatar" aria-label="Your profile">M</span>
          </div>
        </header>
        <div className="tasks-page-content">
          {storageError && <div className="task-storage-warning" role="alert"><XCircle size={15} />{storageError}</div>}
          <section className="tasks-page-heading">
            <div>
              <div className="dashboard-eyebrow"><span className="eyebrow-line" /> A LITTLE MORE CLARITY</div>
              <h1>My <span>tasks</span></h1>
              <p>Gather your plans in one place. Take them one thoughtful step at a time.</p>
              <div className="tasks-summary">
                <span><strong>{tasks.filter((task) => task.status !== "Completed").length}</strong> in your space</span>
                <i />
                <span><strong>{tasks.filter((task) => task.status === "Completed").length}</strong> completed</span>
                <i />
                <span><strong>{tasks.filter(isOverdue).length}</strong> overdue</span>
              </div>
            </div>
            <button className="primary-button task-new-button" onClick={() => setEditorTask(null)} type="button"><Plus size={17} /> New task</button>
          </section>

          <section aria-label="Task search and filters" className="tasks-toolbar">
            <label className="task-search">
              <Search size={16} />
              <input onChange={(event) => setQuery(event.target.value)} placeholder="Search title, description or tags…" value={query} />
              {query && <button aria-label="Clear search" onClick={() => setQuery("")} type="button"><X size={14} /></button>}
            </label>
            <div className="task-toolbar-filters">
              <label className="task-filter-select">
                <span className="sr-only">Filter by priority</span>
                <select onChange={(event) => setPriorityFilter(event.target.value)} value={priorityFilter}>
                  <option value="all">All priorities</option>
                  {taskPriorities.map((priority) => <option key={priority}>{priority}</option>)}
                </select>
                <ChevronDown size={13} />
              </label>
              <label className="task-filter-select">
                <span className="sr-only">Filter by category</span>
                <select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
                  <option value="all">All categories</option>
                  {taskCategories.map((category) => <option key={category}>{category}</option>)}
                </select>
                <ChevronDown size={13} />
              </label>
              <label className="task-filter-select">
                <span className="sr-only">Filter by status</span>
                <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                  <option value="all">All statuses</option>
                  {taskStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
                <ChevronDown size={13} />
              </label>
              <label className="task-filter-select">
                <span className="sr-only">Filter by due date</span>
                <select onChange={(event) => setDueFilter(event.target.value as DueFilter)} value={dueFilter}>
                  <option value="all">Any deadline</option>
                  <option value="overdue">Overdue</option>
                  <option value="today">Due today</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="no-date">No deadline</option>
                </select>
                <ChevronDown size={13} />
              </label>
            </div>
          </section>

          <div className="tasks-view-toolbar">
            <div className="task-result-count">
              <span>Showing <strong>{filteredTasks.length}</strong> of {tasks.length}</span>
              {activeFiltersCount > 0 && <button onClick={clearFilters} type="button">Clear filters <X size={12} /></button>}
            </div>
            <div className="task-view-actions">
              <label className="task-sort-select">
                <ArrowDownWideNarrow size={14} />
                <span className="sr-only">Sort tasks</span>
                <select onChange={(event) => setSort(event.target.value as SortMode)} value={sort}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="priority">Priority</option>
                  <option value="deadline">Deadline</option>
                </select>
                <ChevronDown size={13} />
              </label>
              <div aria-label="Task view" className="task-view-switch" role="group">
                <button aria-pressed={view === "list"} className={view === "list" ? "selected" : ""} onClick={() => setView("list")} title="List view" type="button"><List size={16} /><span>List</span></button>
                <button aria-pressed={view === "board"} className={view === "board" ? "selected" : ""} onClick={() => setView("board")} title="Board view" type="button"><LayoutGrid size={15} /><span>Board</span></button>
              </div>
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <EmptyTasks onClear={clearFilters} onCreate={() => setEditorTask(null)} />
          ) : view === "list" ? (
            <section aria-label="Tasks in list view" className="tasks-list-panel">
              <div className="management-list-header">
                <span>TASK</span><span>PRIORITY</span><span>CATEGORY</span><span>DEADLINE</span><span>STATUS</span><span />
              </div>
              {filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  onDelete={() => setDeleteId(task.id)}
                  onDuplicate={() => { onDuplicateTask(task.id); notify("A copy of your task is ready."); }}
                  onEdit={() => setEditorTask(task)}
                  onMove={(status) => moveTask(task, status)}
                  onOpen={() => setDetailId(task.id)}
                  task={task}
                />
              ))}
            </section>
          ) : (
            <section aria-label="Tasks in kanban board" className="task-kanban-board">
              {taskStatuses.map((status) => {
                const columnTasks = filteredTasks.filter((task) => task.status === status);
                return (
                  <div
                    aria-label={`${status} tasks`}
                    className={`kanban-column${dragOver === status ? " is-drag-over" : ""}`}
                    key={status}
                    onDragEnter={(event) => { event.preventDefault(); setDragOver(status); }}
                    onDragLeave={(event) => {
                      if (event.currentTarget === event.target) setDragOver(null);
                    }}
                    onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const id = event.dataTransfer.getData("text/plain");
                      const task = tasks.find((item) => item.id === id);
                      setDragOver(null);
                      if (task) moveTask(task, status);
                    }}
                  >
                    <div className="kanban-column-heading">
                      <span className={`kanban-status-dot column-${status.toLowerCase().replace(" ", "-")}`} />
                      <h2>{status}</h2>
                      <span>{columnTasks.length}</span>
                      {status === "To Do" && <button aria-label="Add task to To Do" onClick={() => setEditorTask(null)} type="button"><Plus size={15} /></button>}
                    </div>
                    <div className="kanban-column-cards">
                      {columnTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          onDelete={() => setDeleteId(task.id)}
                          onDuplicate={() => { onDuplicateTask(task.id); notify("A copy of your task is ready."); }}
                          onEdit={() => setEditorTask(task)}
                          onMove={(nextStatus) => moveTask(task, nextStatus)}
                          onOpen={() => setDetailId(task.id)}
                          task={task}
                        />
                      ))}
                      {columnTasks.length === 0 && <div className="kanban-empty">Drop a task here when it feels right.</div>}
                    </div>
                  </div>
                );
              })}
            </section>
          )}
          <footer className="tasks-page-footer"><span><Sparkles size={13} /> Small steps still move you forward.</span><span>MINDSPACE · YOUR SPACE TO GROW</span></footer>
        </div>
      </main>
      {editorTask !== undefined && (
        <TaskEditor
          key={editorTask?.id ?? "new-task"}
          onClose={() => setEditorTask(undefined)}
          onSave={saveTask}
          task={editorTask}
        />
      )}
      {detailTask && (
        <TaskDetailPanel
          key={detailTask.id}
          onAddSubtask={(title) => { onAddSubtask(detailTask.id, title); notify("Subtask added."); }}
          onClose={() => setDetailId(null)}
          onDelete={() => { setDeleteId(detailTask.id); }}
          onDeleteSubtask={(id) => { onDeleteSubtask(detailTask.id, id); notify("Subtask removed."); }}
          onEdit={() => { setEditorTask(detailTask); setDetailId(null); }}
          onToggleStatus={() => {
            moveTask(detailTask, detailTask.status === "Completed" ? "To Do" : "Completed");
          }}
          onUpdateSubtask={(id, completed) => onUpdateSubtask(detailTask.id, id, completed)}
          task={detailTask}
        />
      )}
      {deleteTask && <ConfirmationDialog task={deleteTask} onCancel={() => setDeleteId(null)} onConfirm={confirmDelete} />}
      {toast && <div aria-live="polite" className="task-toast" role="status"><CheckCircle2 size={17} />{toast.message}</div>}
    </div>
  );
}
