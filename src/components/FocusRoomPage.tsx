import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AudioLines,
  CheckCircle2,
  Clock3,
  Menu,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Timer,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { DashboardTask } from "../data/dashboard";
import type { FocusSessionDraft, PlannerSettings } from "../data/productivity";
import type { WorkspacePage } from "../data/navigation";
import { useFocusSessions } from "../hooks/useFocusSessions";
import { defaultPlannerSettings, getPlannerSettings, savePlannerSettings } from "../services/plannerService";
import { dateKey } from "../utils/smartPlanner";
import { DashboardSidebar } from "./DashboardSidebar";

type ActiveTimer = {
  durationMinutes: number;
  elapsedSeconds: number;
  startedAt: string;
  runningSince: number | null;
  taskId: string | null;
  taskTitle: string | null;
  mode: "focus" | "short-break" | "long-break";
};

const TIMER_STORAGE_KEY = "mindspace.focus.active.v1";
const focusPresets = [25, 45, 60, 90];
const breakModes = {
  "short-break": { duration: 5, label: "Short reset" },
  "long-break": { duration: 15, label: "Long reset" },
} as const;

function readTimer(): ActiveTimer | null {
  try {
    const raw = window.localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const timer = value as Partial<ActiveTimer>;
    if (
      typeof timer.durationMinutes !== "number" ||
      !Number.isInteger(timer.durationMinutes) ||
      timer.durationMinutes < 1 ||
      timer.durationMinutes > 240 ||
      typeof timer.elapsedSeconds !== "number" ||
      !Number.isFinite(timer.elapsedSeconds) ||
      timer.elapsedSeconds < 0 ||
      typeof timer.startedAt !== "string" ||
      !Number.isFinite(Date.parse(timer.startedAt)) ||
      !(typeof timer.runningSince === "number" || timer.runningSince === null) ||
      !(typeof timer.taskId === "string" || timer.taskId === null) ||
      !(typeof timer.taskTitle === "string" || timer.taskTitle === null) ||
      !["focus", "short-break", "long-break"].includes(String(timer.mode))
    ) return null;
    return timer as ActiveTimer;
  } catch {
    return null;
  }
}

function formatDuration(seconds: number): string {
  const clamped = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

function todayKey(): string {
  return dateKey(new Date());
}

function elapsedFor(timer: ActiveTimer, now: number): number {
  return timer.elapsedSeconds + (timer.runningSince === null ? 0 : Math.max(0, Math.floor((now - timer.runningSince) / 1000)));
}

function playAmbientTone(): (() => void) | null {
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) return null;
  const context = new AudioContextConstructor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 110;
  gain.gain.value = 0.012;
  oscillator.connect(gain);
  gain.connect(context.destination);
  void context.resume();
  oscillator.start();
  return () => {
    oscillator.stop();
    void context.close();
  };
}

export function FocusRoomPage({
  tasks,
  onNavigate,
  onOpenWelcome,
}: {
  tasks: DashboardTask[];
  onNavigate: (page: WorkspacePage) => void;
  onOpenWelcome: () => void;
}) {
  const { sessions, isLoading, error, reload, recordSession, isConfigured } = useFocusSessions();
  const [timer, setTimer] = useState<ActiveTimer | null>(() => readTimer());
  const [clock, setClock] = useState(Date.now());
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [customDuration, setCustomDuration] = useState(25);
  const [durationSaving, setDurationSaving] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<PlannerSettings>(defaultPlannerSettings);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundStopper = useRef<(() => void) | null>(null);
  const finishInProgress = useRef(false);

  const currentTask = tasks.find((task) => task.id === selectedTaskId);
  const elapsed = timer ? elapsedFor(timer, clock) : 0;
  const remaining = timer ? Math.max(0, timer.durationMinutes * 60 - elapsed) : customDuration * 60;
  const todaySessions = useMemo(() => sessions.filter((session) => dateKey(new Date(session.startedAt)) === todayKey()), [sessions]);
  const completedFocusMinutes = todaySessions
    .filter((session) => session.status === "completed")
    .reduce((sum, session) => sum + session.actualDurationMinutes, 0);
  const completedCount = todaySessions.filter((session) => session.status === "completed").length;
  const progress = timer ? Math.min(1, elapsed / (timer.durationMinutes * 60)) : 0;

  useEffect(() => {
    let active = true;
    void getPlannerSettings().then((next) => {
      if (!active) return;
      setSettings(next);
      setCustomDuration(next.focusDurationMinutes);
    }).catch((error: unknown) => {
      if (active) setMessage(error instanceof Error ? error.message : "Focus preferences could not be loaded.");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!timer?.runningSince) return;
    const id = window.setInterval(() => setClock(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [timer?.runningSince]);

  useEffect(() => {
    try {
      if (timer) window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
      else window.localStorage.removeItem(TIMER_STORAGE_KEY);
    } catch {
      setMessage("The active timer could not be saved in this browser. Keep this tab open to preserve it.");
    }
  }, [timer]);

  useEffect(() => () => {
    soundStopper.current?.();
  }, []);

  const saveSession = useCallback(async (status: FocusSessionDraft["status"], active: ActiveTimer, actualSeconds: number) => {
    if (actualSeconds < 30 && status === "interrupted") return;
    const completedAt = new Date().toISOString();
    await recordSession({
      taskId: active.taskId,
      taskTitle: active.taskTitle,
      plannedDurationMinutes: active.durationMinutes,
      actualDurationMinutes: status === "completed"
        ? active.durationMinutes
        : Math.max(1, Math.floor(actualSeconds / 60)),
      startedAt: active.startedAt,
      completedAt: status === "completed" ? completedAt : null,
      status,
    });
  }, [recordSession]);

  useEffect(() => {
    if (!timer || remaining > 0 || timer.runningSince === null) return;
    if (finishInProgress.current) return;
    finishInProgress.current = true;
    let cancelled = false;
    const completed = timer.mode === "focus";
    void (completed ? saveSession("completed", timer, elapsed) : Promise.resolve()).then(() => {
      if (!cancelled) {
        setTimer(null);
        setMessage(completed ? "Focus session complete. Take a moment to reset." : "Your break is complete. Return refreshed.");
      }
    }).catch((error: unknown) => {
      if (!cancelled) {
        setTimer({ ...timer, elapsedSeconds: timer.durationMinutes * 60, runningSince: null });
        setMessage(error instanceof Error ? error.message : "The completed session could not be saved. Retry from the paused timer.");
      }
    }).finally(() => {
      finishInProgress.current = false;
    });
    return () => { cancelled = true; };
  }, [elapsed, remaining, saveSession, timer]);

  function start(mode: ActiveTimer["mode"], durationMinutes: number) {
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 240) {
      setMessage("Choose a timer duration from 1 to 240 minutes.");
      return;
    }
    const selected = mode === "focus" ? currentTask : undefined;
    const now = Date.now();
    setTimer({
      durationMinutes,
      elapsedSeconds: 0,
      startedAt: new Date(now).toISOString(),
      runningSince: now,
      taskId: selected?.id ?? null,
      taskTitle: selected?.title ?? null,
      mode,
    });
    setMessage("");
  }

  function pause() {
    if (!timer) return;
    setTimer({ ...timer, elapsedSeconds: elapsed, runningSince: null });
  }

  function resume() {
    if (!timer || timer.runningSince !== null) return;
    setTimer({ ...timer, runningSince: Date.now() });
    setClock(Date.now());
  }

  async function reset() {
    if (!timer) return;
    const seconds = elapsed;
    if (timer.mode !== "focus") {
      setTimer(null);
      setMessage("Break timer reset.");
      return;
    }
    try {
      await saveSession("interrupted", timer, seconds);
      setTimer(null);
      setMessage(seconds >= 30 ? "Interrupted session saved to your history." : "Timer reset.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The session could not be saved, so the timer remains available.");
    }
  }

  async function saveDuration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isInteger(customDuration) || customDuration < 1 || customDuration > 240) {
      setMessage("Choose a focus duration from 1 to 240 minutes.");
      return;
    }
    const next = { ...settings, focusDurationMinutes: customDuration };
    setDurationSaving(true);
    setMessage("");
    try {
      const saved = await savePlannerSettings(next);
      setSettings(saved);
      setMessage("Default focus duration saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Focus duration could not be saved.");
    } finally {
      setDurationSaving(false);
    }
  }

  function toggleSound() {
    if (soundEnabled) {
      soundStopper.current?.();
      soundStopper.current = null;
      setSoundEnabled(false);
      return;
    }
    soundStopper.current = playAmbientTone();
    if (!soundStopper.current) {
      setMessage("Ambient audio is not supported by this browser.");
      return;
    }
    setSoundEnabled(true);
  }

  const modeTitle = timer?.mode === "short-break" ? "Short reset"
    : timer?.mode === "long-break" ? "Long reset"
      : "Focus in progress";

  return (
    <div className="dashboard-shell">
      <DashboardSidebar
        activePage="focus"
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onNavigate={onNavigate}
        onOpenWelcome={onOpenWelcome}
        onToggle={() => setCollapsed((value) => !value)}
      />
      <main className="dashboard-main focus-main">
        <header className="dashboard-topbar"><div className="topbar-leading"><button aria-label="Open navigation" className="mobile-menu-button" onClick={() => setMobileOpen(true)} type="button"><Menu size={20} /></button><div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Focus Room</strong></div></div></header>
        <div className="focus-page-content">
          {(error || message) && <div className="focus-alert" role="status"><AlertCircle size={15} />{message || error}</div>}
          <header className="focus-page-heading">
            <div className="dashboard-eyebrow"><span className="eyebrow-line" /> A LITTLE SPACE FOR DEEP WORK</div>
            <h1>Focus <span>Room</span></h1>
            <p>One thing at a time. Give it your full attention.</p>
          </header>
          {!isConfigured ? (
            <section className="focus-connect-state"><Timer size={25} /><h2>Connect your private workspace</h2><p>Focus sessions and history are saved securely to your Supabase account. Configure Supabase to begin.</p></section>
          ) : (
            <div className="focus-layout">
              <section className="focus-timer-panel">
                <div className="focus-mode-label"><span className={timer ? "is-live" : ""} />{timer ? modeTitle : "READY WHEN YOU ARE"}</div>
                <motion.div className="focus-timer-ring" style={{ "--focus-progress": progress } as CSSProperties}>
                  <div className="focus-timer-inner">
                    <span className="focus-clock">{formatDuration(remaining)}</span>
                    <span className="focus-clock-caption">{timer?.taskTitle ?? (timer ? breakModes[timer.mode as keyof typeof breakModes]?.label ?? "Focus session" : "minutes of focus")}</span>
                  </div>
                </motion.div>
                {timer ? (
                  <div className="focus-controls">
                    {timer.runningSince === null
                      ? <button className="focus-primary-button" onClick={resume} type="button"><Play size={16} /> Resume</button>
                      : <button className="focus-primary-button" onClick={pause} type="button"><Pause size={16} /> Pause</button>}
                    <button className="focus-secondary-button" onClick={() => void reset()} type="button"><RotateCcw size={15} /> Reset</button>
                  </div>
                ) : (
                  <>
                    <label className="focus-task-select"><span>Focus on</span><select value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)}><option value="">Choose a task (optional)</option>{tasks.filter((task) => task.status !== "Completed").map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
                    <div className="focus-presets">{focusPresets.map((minutes) => <button className={minutes === customDuration ? "is-selected" : ""} key={minutes} onClick={() => setCustomDuration(minutes)} type="button">{minutes} min</button>)}</div>
                    <form className="focus-custom-form" onSubmit={(event) => void saveDuration(event)}>
                      <label><span>Custom minutes</span><input max="240" min="1" onChange={(event) => setCustomDuration(Number(event.target.value))} type="number" value={customDuration} /></label>
                      <button disabled={durationSaving} type="submit">{durationSaving ? "Saving…" : "Save default"}</button>
                    </form>
                    <button className="focus-primary-button focus-start-button" onClick={() => start("focus", customDuration)} type="button"><Play size={16} /> Start focus</button>
                  </>
                )}
                {!timer && <div className="focus-break-actions"><button onClick={() => start("short-break", settings.shortBreakMinutes)} type="button">Short break · {settings.shortBreakMinutes}m</button><button onClick={() => start("long-break", settings.longBreakMinutes)} type="button">Long break · {settings.longBreakMinutes}m</button></div>}
              </section>
              <aside className="focus-side-column">
                <section className="focus-stat-card"><div className="focus-panel-title"><Clock3 size={15} /><h2>Today, so far</h2></div><div className="focus-stat-row"><strong>{(completedFocusMinutes / 60).toFixed(1)}<small>h</small></strong><span>Focused time</span></div><div className="focus-stat-row"><strong>{completedCount}</strong><span>Completed sessions</span></div></section>
                <section className="focus-sound-card"><div className="focus-panel-title"><AudioLines size={15} /><h2>Ambient sound</h2></div><p>A soft, original synthesized tone. No external audio or tracks.</p><button aria-pressed={soundEnabled} onClick={toggleSound} type="button">{soundEnabled ? <VolumeX size={15} /> : <Volume2 size={15} />}{soundEnabled ? "Turn sound off" : "Play soft tone"}</button></section>
              </aside>
              <section className="focus-history-panel">
                <div className="focus-panel-title"><CheckCircle2 size={15} /><h2>Recent sessions</h2><button aria-label="Refresh focus history" disabled={isLoading} onClick={() => void reload()} type="button"><RefreshCw size={13} /></button></div>
                {isLoading ? <div className="focus-history-empty">Loading focus history…</div> : sessions.length === 0 ? <div className="focus-history-empty">Your completed sessions will appear here. Start with one focused interval.</div> : (
                  <div className="focus-session-list">{sessions.slice(0, 8).map((session) => <article className="focus-session-row" key={session.id}><span className="focus-session-mark">{session.status === "completed" ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}</span><span><strong>{session.taskTitle ?? "Focus session"}</strong><small>{new Date(session.startedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{session.status === "interrupted" ? " · Interrupted" : ""}</small></span><b>{session.actualDurationMinutes}m</b></article>)}</div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
      <AnimatePresence>{timer && timer.runningSince !== null && remaining <= 0 && <motion.div className="focus-complete-toast" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><CheckCircle2 size={16} /> Session complete</motion.div>}</AnimatePresence>
    </div>
  );
}
