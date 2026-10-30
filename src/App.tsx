import { lazy, Suspense, useState } from "react";
import { CalendarPage } from "./components/CalendarPage";
import { DashboardPage } from "./components/DashboardPage";
import { TaskManagementPage } from "./components/TaskManagementPage";
import { useTimeBlocks } from "./hooks/useTimeBlocks";
import { useTasks } from "./hooks/useTasks";
import { WelcomePage } from "./WelcomePage";
import type { WorkspacePage } from "./data/navigation";

const BrainDumpPage = lazy(async () => {
  const module = await import("./components/BrainDumpPage");
  return { default: module.BrainDumpPage };
});
const SmartPlannerPage = lazy(async () => {
  const module = await import("./components/SmartPlannerPage");
  return { default: module.SmartPlannerPage };
});
const FocusRoomPage = lazy(async () => {
  const module = await import("./components/FocusRoomPage");
  return { default: module.FocusRoomPage };
});
const HabitsPage = lazy(async () => {
  const module = await import("./components/HabitsPage");
  return { default: module.HabitsPage };
});
const GoalsPage = lazy(async () => {
  const module = await import("./components/GoalsPage");
  return { default: module.GoalsPage };
});
const ProductivityCenterPage = lazy(async () => {
  const module = await import("./components/ProductivityCenterPage");
  return { default: module.ProductivityCenterPage };
});
const InsightsPage = lazy(async () => {
  const module = await import("./components/InsightsPage");
  return { default: module.InsightsPage };
});

function App() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [activePage, setActivePage] = useState<WorkspacePage>("dashboard");
  const taskStore = useTasks();
  const timeBlockStore = useTimeBlocks();

  if (showWelcome) {
    return <WelcomePage onOpenDashboard={() => setShowWelcome(false)} />;
  }

  if (activePage === "brainDump") {
    return (
      <Suspense fallback={<div className="brain-page-loading" role="status">Opening your Brain Dump…</div>}>
        <BrainDumpPage
          onCreateTask={taskStore.createTask}
          onOpenCalendar={() => setActivePage("calendar")}
          onOpenPlanner={() => setActivePage("planner")}
          onOpenDashboard={() => setActivePage("dashboard")}
          onOpenTasks={() => setActivePage("tasks")}
          onOpenWelcome={() => setShowWelcome(true)}
          onNavigate={setActivePage}
        />
      </Suspense>
    );
  }

  if (activePage === "calendar") {
    return (
      <CalendarPage
        blocks={timeBlockStore.blocks}
        blockStorageError={timeBlockStore.storageError}
        onCreateBlock={timeBlockStore.createBlock}
        onDeleteBlock={timeBlockStore.deleteBlock}
        onOpenBrainDump={() => setActivePage("brainDump")}
        onOpenPlanner={() => setActivePage("planner")}
        onOpenDashboard={() => setActivePage("dashboard")}
        onOpenTasks={() => setActivePage("tasks")}
        onOpenWelcome={() => setShowWelcome(true)}
        onUpdateBlock={timeBlockStore.updateBlock}
        onNavigate={setActivePage}
        onUpdateTask={taskStore.updateTask}
        taskStorageError={taskStore.storageError}
        tasks={taskStore.tasks}
      />
    );
  }

  if (activePage === "tasks") {
    return (
      <TaskManagementPage
        onAddSubtask={taskStore.addSubtask}
        onCreateTask={taskStore.createTask}
        onDeleteSubtask={taskStore.deleteSubtask}
        onDeleteTask={taskStore.deleteTask}
        onDuplicateTask={(id) => taskStore.duplicateTask(id)}
        onOpenBrainDump={() => setActivePage("brainDump")}
        onOpenPlanner={() => setActivePage("planner")}
        onOpenDashboard={() => setActivePage("dashboard")}
        onOpenCalendar={() => setActivePage("calendar")}
        onOpenWelcome={() => setShowWelcome(true)}
        onUpdateSubtask={taskStore.updateSubtask}
        onUpdateTask={taskStore.updateTask}
        onNavigate={setActivePage}
        storageError={taskStore.storageError}
        tasks={taskStore.tasks}
      />
    );
  }

  if (activePage === "planner") {
    return (
      <Suspense fallback={<div className="brain-page-loading" role="status">Opening Smart Planner…</div>}>
       <SmartPlannerPage
        onOpenBrainDump={() => setActivePage("brainDump")}
        onOpenCalendar={() => setActivePage("calendar")}
        onOpenDashboard={() => setActivePage("dashboard")}
        onOpenPlanner={() => setActivePage("planner")}
        onOpenTasks={() => setActivePage("tasks")}
        onOpenWelcome={() => setShowWelcome(true)}
        onUpdateTask={taskStore.updateTask}
        storageError={taskStore.storageError}
        tasks={taskStore.tasks}
        onNavigate={setActivePage}
       />
      </Suspense>
    );
  }

  if (activePage === "focus") {
    return (
      <Suspense fallback={<div className="brain-page-loading" role="status">Opening Focus Room…</div>}>
       <FocusRoomPage
        onNavigate={setActivePage}
        onOpenWelcome={() => setShowWelcome(true)}
        tasks={taskStore.tasks}
       />
      </Suspense>
    );
  }

  if (activePage === "habits") {
    return <Suspense fallback={<div className="brain-page-loading" role="status">Opening Habits…</div>}><HabitsPage onNavigate={setActivePage} onOpenWelcome={() => setShowWelcome(true)} /></Suspense>;
  }

  if (activePage === "goals") {
    return <Suspense fallback={<div className="brain-page-loading" role="status">Opening Goals…</div>}><GoalsPage onNavigate={setActivePage} onOpenWelcome={() => setShowWelcome(true)} tasks={taskStore.tasks} /></Suspense>;
  }

  if (activePage === "productivity") {
    return (
      <Suspense fallback={<div className="brain-page-loading" role="status">Opening Productivity Center…</div>}>
      <ProductivityCenterPage
        onNavigate={setActivePage}
        onOpenWelcome={() => setShowWelcome(true)}
        onUpdateTask={taskStore.updateTask}
        tasks={taskStore.tasks}
      />
      </Suspense>
    );
  }

  if (activePage === "insights") {
    return <Suspense fallback={<div className="brain-page-loading" role="status">Opening Insights…</div>}><InsightsPage onNavigate={setActivePage} onOpenWelcome={() => setShowWelcome(true)} /></Suspense>;
  }

  return (
    <DashboardPage
      onCreateTask={taskStore.createTask}
      onOpenWelcome={() => setShowWelcome(true)}
      onUpdateTask={taskStore.updateTask}
      storageError={taskStore.storageError}
      tasks={taskStore.tasks}
      onNavigate={setActivePage}
    />
  );
}

export default App;
