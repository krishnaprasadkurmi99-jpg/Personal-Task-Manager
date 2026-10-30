import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArrowUpRight,
  Check,
  Clock3,
  FileText,
  CalendarDays,
  Lightbulb,
  Menu,
  NotebookPen,
  Pin,
  Plus,
  Search,
  Send,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  brainDumpCategories,
  type BrainDumpCategory,
  type BrainDumpDraft,
  type BrainDumpNote,
} from "../data/brainDump";
import {
  taskCategories,
  taskPriorities,
  type DashboardTask,
  type TaskCategory,
  type TaskDraft,
  type TaskPriority,
} from "../data/dashboard";
import type { WorkspacePage } from "../data/navigation";
import { useBrainDump } from "../hooks/useBrainDump";
import { DashboardSidebar } from "./DashboardSidebar";

type NoteScope = "active" | "archived";
type ConfirmDelete = { note: BrainDumpNote };

function formatNoteDate(value: string): string {
  return new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: new Date(value).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function parseTags(value: string): string[] {
  return [...new Set(value.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean))];
}

function LoadingNoteCard() {
  return (
    <article aria-hidden="true" className="brain-note-card brain-note-skeleton">
      <span /><span /><span />
    </article>
  );
}

function NoteCard({
  note,
  onEdit,
  onTogglePin,
  onToggleArchive,
  onConvert,
  onDelete,
  busy,
}: {
  note: BrainDumpNote;
  busy: boolean;
  onEdit: (note: BrainDumpNote) => void;
  onTogglePin: (note: BrainDumpNote) => void;
  onToggleArchive: (note: BrainDumpNote) => void;
  onConvert: (note: BrainDumpNote) => void;
  onDelete: (note: BrainDumpNote) => void;
}) {
  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className="brain-note-card"
      exit={{ opacity: 0, scale: 0.97 }}
      initial={{ opacity: 0, y: 12 }}
      layout
      transition={{ duration: 0.2 }}
    >
      <div className="brain-note-card-head">
        <button className="brain-note-title-button" onClick={() => onEdit(note)} type="button">
          <span className="brain-note-category">{note.category}</span>
          <strong>{note.title}</strong>
        </button>
        <button
          aria-label={note.isPinned ? `Unpin ${note.title}` : `Pin ${note.title}`}
          aria-pressed={note.isPinned}
          className={`brain-icon-button${note.isPinned ? " is-pinned" : ""}`}
          disabled={busy}
          onClick={() => onTogglePin(note)}
          title={note.isPinned ? "Unpin note" : "Pin note"}
          type="button"
        >
          <Pin size={15} />
        </button>
      </div>
      <button className="brain-note-content-button" onClick={() => onEdit(note)} type="button">
        <p>{note.content}</p>
      </button>
      <div className="brain-note-meta">
        <span><CalendarDays size={12} /> Created {formatNoteDate(note.createdAt)}</span>
        <span><Clock3 size={12} /> Edited {formatNoteDate(note.updatedAt)}</span>
        {note.convertedTaskId && <span className="brain-converted-label"><Check size={12} /> Task created</span>}
      </div>
      {note.tags.length > 0 && (
        <div className="brain-note-tags">
          {note.tags.map((tag) => <span key={tag}><Tag size={10} />{tag}</span>)}
        </div>
      )}
      <div className="brain-note-actions">
        <button disabled={busy} onClick={() => onEdit(note)} type="button"><NotebookPen size={13} /> Edit</button>
        <button disabled={busy} onClick={() => onConvert(note)} type="button">
          <ArrowUpRight size={13} /> {note.convertedTaskId ? "Create another task" : "Make a task"}
        </button>
        <button
          aria-label={note.isArchived ? `Restore ${note.title}` : `Archive ${note.title}`}
          disabled={busy}
          onClick={() => onToggleArchive(note)}
          title={note.isArchived ? "Restore note" : "Archive note"}
          type="button"
        >
          {note.isArchived ? <FileText size={13} /> : <Archive size={13} />}
          <span className="brain-action-label">{note.isArchived ? "Restore" : "Archive"}</span>
        </button>
        <button aria-label={`Delete ${note.title}`} className="brain-delete-action" disabled={busy} onClick={() => onDelete(note)} title="Delete note" type="button">
          <Trash2 size={13} />
        </button>
      </div>
    </motion.article>
  );
}

function DeleteNoteDialog({
  note,
  busy,
  onCancel,
  onConfirm,
}: {
  note: BrainDumpNote;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="task-modal-backdrop brain-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel();
    }}>
      <section aria-labelledby="brain-delete-title" aria-modal="true" className="task-confirm-dialog brain-confirm-dialog" role="alertdialog">
        <span className="brain-confirm-icon"><Trash2 size={19} /></span>
        <h2 id="brain-delete-title">Let this thought go?</h2>
        <p><strong>{note.title}</strong> will be permanently deleted from your Brain Dump.</p>
        <div className="task-modal-actions">
          <button className="task-secondary-button" disabled={busy} onClick={onCancel} type="button">Keep note</button>
          <button className="task-danger-button" disabled={busy} onClick={onConfirm} type="button">
            <Trash2 size={14} /> {busy ? "Deleting…" : "Delete note"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ConvertTaskDialog({
  note,
  busy,
  error,
  onCancel,
  onConvert,
}: {
  note: BrainDumpNote;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConvert: (draft: TaskDraft) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [category, setCategory] = useState<TaskCategory>(
    taskCategories.find((option) => option === note.category) ?? "Other",
  );
  const [dueAt, setDueAt] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onConvert({
      title: trimmedTitle,
      description: note.content,
      category,
      priority,
      status: "To Do",
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      scheduledStartAt: null,
      scheduledEndAt: null,
      tags: note.tags,
    });
  }

  return (
    <div className="task-modal-backdrop brain-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel();
    }}>
      <section aria-labelledby="brain-convert-title" aria-modal="true" className="task-editor-modal brain-convert-dialog" role="dialog">
        <div className="task-editor-heading">
          <div>
            <span className="task-modal-kicker"><ArrowUpRight size={13} /> TURN A THOUGHT INTO A PLAN</span>
            <h2 id="brain-convert-title">Create a task</h2>
          </div>
          <button aria-label="Close task conversion" className="task-icon-button" disabled={busy} onClick={onCancel} type="button"><X size={18} /></button>
        </div>
        <p className="brain-convert-source">Your original note stays exactly as it is. Its content will be added to the task description.</p>
        <form className="task-editor-form" onSubmit={submit}>
          <label className="task-field">
            <span>Task title</span>
            <input autoFocus maxLength={160} onChange={(event) => setTitle(event.target.value)} required value={title} />
          </label>
          <div className="task-form-grid">
            <label className="task-field">
              <span>Priority</span>
              <select onChange={(event) => setPriority(event.target.value as TaskPriority)} value={priority}>
                {taskPriorities.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className="task-field">
              <span>Category</span>
              <select onChange={(event) => setCategory(event.target.value as TaskCategory)} value={category}>
                {taskCategories.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          </div>
          <label className="task-field">
            <span>Due date <small>Optional</small></span>
            <input onChange={(event) => setDueAt(event.target.value)} type="datetime-local" value={dueAt} />
          </label>
          {error && <p className="task-form-error" role="alert">{error}</p>}
          <div className="task-modal-actions">
            <button className="task-secondary-button" disabled={busy} onClick={onCancel} type="button">Cancel</button>
            <button className="task-primary-button" disabled={busy || !title.trim()} type="submit">
              <Check size={14} /> {busy ? "Creating…" : "Create task"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function BrainDumpPage({
  onOpenWelcome,
  onCreateTask,
  onNavigate,
}: {
  onOpenWelcome: () => void;
  onOpenDashboard: () => void;
  onOpenTasks: () => void;
  onOpenCalendar: () => void;
  onOpenPlanner: () => void;
  onCreateTask: (draft: TaskDraft) => DashboardTask;
  onNavigate: (page: WorkspacePage) => void;
}) {
  const store = useBrainDump();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<BrainDumpCategory>("Inbox");
  const [tagsText, setTagsText] = useState("");
  const [editingNote, setEditingNote] = useState<BrainDumpNote | null>(null);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<NoteScope>("active");
  const [categoryFilter, setCategoryFilter] = useState<BrainDumpCategory | "All">("All");
  const [deleteTarget, setDeleteTarget] = useState<ConfirmDelete | null>(null);
  const [convertTarget, setConvertTarget] = useState<BrainDumpNote | null>(null);
  const [busyAction, setBusyAction] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [composerError, setComposerError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return store.notes
      .filter((note) => (scope === "archived") === note.isArchived)
      .filter((note) => categoryFilter === "All" || note.category === categoryFilter)
      .filter((note) => !query || [note.title, note.content, note.category, ...note.tags]
        .some((value) => value.toLocaleLowerCase().includes(query)))
      .sort((left, right) => Number(right.isPinned) - Number(left.isPinned) ||
        Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  }, [categoryFilter, search, scope, store.notes]);

  const pinnedNotes = filteredNotes.filter((note) => note.isPinned && !note.isArchived);
  const regularNotes = filteredNotes.filter((note) => !pinnedNotes.some((pinned) => pinned.id === note.id));
  const noteCountLabel = `${filteredNotes.length} ${filteredNotes.length === 1 ? "note" : "notes"}`;

  function resetEditor() {
    setTitle("");
    setContent("");
    setCategory("Inbox");
    setTagsText("");
    setComposerError("");
    setEditingNote(null);
  }

  function startEditing(note: BrainDumpNote) {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
    setTagsText(note.tags.join(", "));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle || !trimmedContent) return;
    const tags = parseTags(tagsText);
    if (tags.length > 30) {
      setComposerError("Add no more than 30 tags to a note.");
      return;
    }
    setComposerError("");
    const draft: BrainDumpDraft = {
      title: trimmedTitle,
      content: trimmedContent,
      category,
      tags,
    };
    setBusyAction("save");
    try {
      if (editingNote) {
        await store.update(editingNote.id, draft);
        setToast("Your note has been updated.");
      } else {
        await store.create(draft);
        setToast("A thought has been saved.");
      }
      resetEditor();
    } catch {
      // The store exposes the underlying save error in the page banner.
    } finally {
      setBusyAction("");
    }
  }

  async function togglePin(note: BrainDumpNote) {
    setBusyAction(note.id);
    try {
      await store.update(note.id, { isPinned: !note.isPinned });
      setToast(note.isPinned ? "Note unpinned." : "Note pinned for later.");
    } catch {
      // The store exposes the operation error in the page banner.
    } finally {
      setBusyAction("");
    }
  }

  async function toggleArchive(note: BrainDumpNote) {
    setBusyAction(note.id);
    try {
      await store.update(note.id, { isArchived: !note.isArchived, ...(note.isArchived ? { isPinned: false } : {}) });
      setToast(note.isArchived ? "Note restored to your Brain Dump." : "Note tucked away in your archive.");
    } catch {
      // The store exposes the operation error in the page banner.
    } finally {
      setBusyAction("");
    }
  }

  async function deleteNote() {
    if (!deleteTarget) return;
    setBusyAction(deleteTarget.note.id);
    try {
      await store.remove(deleteTarget.note.id);
      if (editingNote?.id === deleteTarget.note.id) resetEditor();
      setToast("The note was deleted.");
      setDeleteTarget(null);
    } catch {
      // The store exposes the operation error in the page banner.
    } finally {
      setBusyAction("");
    }
  }

  async function convertNote(draft: TaskDraft) {
    if (!convertTarget) return;
    setBusyAction("convert");
    setDialogError("");
    try {
      const task = onCreateTask(draft);
      setConvertTarget(null);
      try {
        await store.update(convertTarget.id, { convertedTaskId: task.id });
        setToast("Task created. Your original note is still here.");
      } catch {
        setToast("Task created, but its note link could not be saved. Check the Supabase error.");
      }
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "The task could not be created.");
    } finally {
      setBusyAction("");
    }
  }

  function beginNewNote() {
    resetEditor();
    document.getElementById("brain-note-title")?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar
        activePage="brainDump"
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onNavigate={onNavigate}
        onOpenWelcome={onOpenWelcome}
        onToggle={() => setCollapsed((value) => !value)}
      />
      <main className="dashboard-main brain-dump-main">
        <header className="dashboard-topbar">
          <div className="topbar-leading">
            <button aria-label="Open navigation" className="mobile-menu-button" onClick={() => setMobileOpen(true)} type="button"><Menu size={20} /></button>
            <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Brain Dump</strong></div>
          </div>
          <div className="topbar-actions"><span className="brain-topbar-count">{store.notes.length} saved</span><span aria-label="Your profile" className="topbar-avatar">M</span></div>
        </header>

        <div className="brain-dump-page-content">
          {store.storageError && (
            <div className="task-storage-warning brain-storage-warning" role="alert">
              <X size={15} /><span>{store.storageError}</span>
              {store.isConfigured && <button onClick={() => void store.reload()} type="button">Try again</button>}
            </div>
          )}

          <section className="brain-page-heading">
            <div>
              <div className="dashboard-eyebrow"><span className="eyebrow-line" /> A QUIETER PLACE FOR YOUR THOUGHTS</div>
              <h1>Brain <span>Dump</span></h1>
              <p>Get it out of your head. Keep what matters close.</p>
            </div>
            <div className="brain-heading-mark"><Lightbulb size={21} /><span>Clear space.<br />Find your next step.</span></div>
          </section>

          <section aria-label="Write a note" className="brain-composer-panel">
            <div className="brain-composer-top">
              <div>
                <span className="brain-composer-kicker"><NotebookPen size={14} /> {editingNote ? "EDIT YOUR THOUGHT" : "A MOMENT TO UNLOAD"}</span>
                <h2>{editingNote ? "Shape this thought" : "What's on your mind?"}</h2>
              </div>
              {editingNote && <button className="brain-reset-button" onClick={resetEditor} type="button"><X size={13} /> New note</button>}
            </div>
            <form className="brain-composer-form" onSubmit={(event) => void saveNote(event)}>
              <label className="brain-field">
                <span className="brain-visually-hidden">Note title</span>
                <input
                  autoComplete="off"
                  disabled={!store.isConfigured}
                  id="brain-note-title"
                  maxLength={160}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Give this thought a name"
                  required
                  value={title}
                />
              </label>
              <label className="brain-field brain-writing-field">
                <span className="brain-visually-hidden">Your note</span>
                <textarea
                  disabled={!store.isConfigured}
                  maxLength={50000}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Write freely. No sorting, no pressure — just let it land…"
                  required
                  rows={7}
                  value={content}
                />
              </label>
              <div className="brain-composer-options">
                <label className="brain-inline-field">
                  <span>Category</span>
                  <select disabled={!store.isConfigured} onChange={(event) => setCategory(event.target.value as BrainDumpCategory)} value={category}>
                    {brainDumpCategories.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
                <label className="brain-inline-field brain-tags-field">
                  <span><Tag size={12} /> Tags</span>
                  <input disabled={!store.isConfigured} onChange={(event) => { setTagsText(event.target.value); setComposerError(""); }} placeholder="Separate with commas" value={tagsText} />
                </label>
                <span className="brain-editor-count">{content.length.toLocaleString()} characters</span>
              </div>
              {composerError && <p className="task-form-error brain-composer-error" role="alert">{composerError}</p>}
              <div className="brain-composer-footer">
                <span><Sparkles size={13} /> Private to this Supabase session</span>
                <button className="task-primary-button brain-save-button" disabled={!store.isConfigured || busyAction === "save" || !title.trim() || !content.trim()} type="submit">
                  {busyAction === "save" ? <span className="brain-saving-spinner" /> : editingNote ? <Check size={15} /> : <Send size={14} />}
                  {busyAction === "save" ? "Saving…" : editingNote ? "Save changes" : "Save thought"}
                </button>
              </div>
            </form>
          </section>

          <section aria-label="Saved notes" className="brain-library-section">
            <div className="brain-library-heading">
              <div>
                <div className="dashboard-eyebrow"><span className="eyebrow-line" /> YOUR PERSONAL LIBRARY</div>
                <h2>Thoughts, <span>kept</span></h2>
              </div>
              <button className="brain-new-note-button" disabled={!store.isConfigured} onClick={beginNewNote} type="button"><Plus size={15} /> New note</button>
            </div>

            <div className="brain-library-controls">
              <label className="brain-search">
                <Search size={16} />
                <input aria-label="Search notes" onChange={(event) => setSearch(event.target.value)} placeholder="Search thoughts, tags, or categories" value={search} />
                {search && <button aria-label="Clear search" onClick={() => setSearch("")} type="button"><X size={13} /></button>}
              </label>
              <div aria-label="Note collection" className="brain-scope-switch" role="group">
                {(["active", "archived"] as const).map((option) => (
                  <button aria-pressed={scope === option} className={scope === option ? "is-selected" : ""} key={option} onClick={() => setScope(option)} type="button">
                    {option === "active" ? <FileText size={13} /> : <Archive size={13} />}
                    {option === "active" ? "Active" : "Archive"}
                  </button>
                ))}
              </div>
            </div>
            <div aria-label="Filter by category" className="brain-category-filters" role="group">
              {(["All", ...brainDumpCategories] as const).map((option) => (
                <button aria-pressed={categoryFilter === option} className={categoryFilter === option ? "is-selected" : ""} key={option} onClick={() => setCategoryFilter(option)} type="button">{option}</button>
              ))}
            </div>

            {store.isLoading ? (
              <div aria-label="Loading notes" className="brain-note-grid">
                {Array.from({ length: 3 }, (_, index) => <LoadingNoteCard key={index} />)}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="brain-empty-state">
                <span className="brain-empty-icon">{store.storageError && store.isConfigured ? <X size={21} /> : search || categoryFilter !== "All" ? <Search size={21} /> : scope === "archived" ? <Archive size={21} /> : <NotebookPen size={21} />}</span>
                <h3>{store.storageError && store.isConfigured ? "Your notes couldn't be loaded" : search || categoryFilter !== "All" ? "Nothing found just yet" : scope === "archived" ? "Your archive is breathing easy" : "A little space to begin"}</h3>
                <p>{store.storageError && store.isConfigured ? "Check your connection and try loading your notes again." : search || categoryFilter !== "All" ? "Try another search or category. Your notes are still here." : scope === "archived" ? "Notes you archive will be tucked away here." : "Capture a thought above. It will be waiting here when you need it."}</p>
                {store.storageError && store.isConfigured ? (
                  <button className="brain-empty-action" onClick={() => void store.reload()} type="button"><Clock3 size={14} /> Try loading again</button>
                ) : !search && categoryFilter === "All" && scope === "active" && (
                  <button className="brain-empty-action" disabled={!store.isConfigured} onClick={beginNewNote} type="button"><Plus size={14} /> Write your first note</button>
                )}
              </div>
            ) : (
              <>
                {pinnedNotes.length > 0 && (
                  <div className="brain-notes-group">
                    <div className="brain-group-label"><Pin size={13} /> PINNED FOR LATER <span>{pinnedNotes.length}</span></div>
                    <div className="brain-note-grid">
                      <AnimatePresence mode="popLayout">
                        {pinnedNotes.map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            busy={busyAction === note.id}
                            onConvert={(selected) => { setDialogError(""); setConvertTarget(selected); }}
                            onDelete={(selected) => setDeleteTarget({ note: selected })}
                            onEdit={startEditing}
                            onToggleArchive={(selected) => void toggleArchive(selected)}
                            onTogglePin={(selected) => void togglePin(selected)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
                {regularNotes.length > 0 && (
                  <div className="brain-notes-group">
                    {pinnedNotes.length > 0 && <div className="brain-group-label"><FileText size={13} /> ALL THOUGHTS <span>{regularNotes.length}</span></div>}
                    <div className="brain-note-grid">
                      <AnimatePresence mode="popLayout">
                        {regularNotes.map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            busy={busyAction === note.id}
                            onConvert={(selected) => { setDialogError(""); setConvertTarget(selected); }}
                            onDelete={(selected) => setDeleteTarget({ note: selected })}
                            onEdit={startEditing}
                            onToggleArchive={(selected) => void toggleArchive(selected)}
                            onTogglePin={(selected) => void togglePin(selected)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
                <div className="brain-library-footer"><span>{noteCountLabel}</span><span>Saved privately and synced with Supabase</span></div>
              </>
            )}
          </section>
        </div>
      </main>
      {deleteTarget && (
        <DeleteNoteDialog
          busy={busyAction === deleteTarget.note.id}
          note={deleteTarget.note}
          onCancel={() => { if (!busyAction) setDeleteTarget(null); }}
          onConfirm={() => void deleteNote()}
        />
      )}
      {convertTarget && (
        <ConvertTaskDialog
          busy={busyAction === "convert"}
          error={dialogError}
          note={convertTarget}
          onCancel={() => { if (busyAction !== "convert") setConvertTarget(null); }}
          onConvert={(draft) => void convertNote(draft)}
        />
      )}
      <AnimatePresence>
        {toast && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="brain-toast"
            exit={{ opacity: 0, y: 12 }}
            initial={{ opacity: 0, y: 12 }}
            role="status"
          >
            <Check size={15} /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
