import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Command,
  Compass,
  Goal,
  Heart,
  LayoutDashboard,
  ListTodo,
  Menu,
  NotebookPen,
  PanelsTopLeft,
  Settings,
  Sparkles,
  Timer,
  X,
} from "lucide-react";
import type { WorkspacePage } from "../data/navigation";

type DashboardSidebarProps = {
  activePage: WorkspacePage;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
  onOpenWelcome: () => void;
  onNavigate: (page: WorkspacePage) => void;
};

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, page: "dashboard" as const },
  { label: "My Tasks", icon: ListTodo, page: "tasks" as const },
  { label: "Brain Dump", icon: NotebookPen, page: "brainDump" as const },
  { label: "Smart Planner", icon: Compass, page: "planner" as const },
  { label: "Focus Room", icon: Timer, page: "focus" as const },
  { label: "Habits", icon: Heart, page: "habits" as const },
  { label: "Goals", icon: Goal, page: "goals" as const },
  { label: "Productivity Center", icon: PanelsTopLeft, page: "productivity" as const },
  { label: "Calendar", icon: CalendarDays, page: "calendar" as const },
  { label: "Insights", icon: BarChart3, page: "insights" as const },
];

export function DashboardSidebar({
  activePage,
  collapsed,
  mobileOpen,
  onToggle,
  onCloseMobile,
  onOpenWelcome,
  onNavigate,
}: DashboardSidebarProps) {
  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          type="button"
        />
      )}
      <aside
        className={`dashboard-sidebar${collapsed ? " is-collapsed" : ""}${mobileOpen ? " is-mobile-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-brand-row">
          <button
            aria-label="Return to MINDSPACE introduction"
            className="sidebar-brand"
            onClick={onOpenWelcome}
            type="button"
          >
            <span className="sidebar-brand-mark"><Sparkles size={17} /></span>
            {!collapsed && <span>MINDSPACE</span>}
          </button>
          <button
            aria-label={mobileOpen ? "Close navigation" : "Collapse navigation"}
            className="sidebar-toggle"
            onClick={mobileOpen ? onCloseMobile : onToggle}
            type="button"
          >
            <span className="desktop-toggle">
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </span>
            <span className="mobile-toggle"><X size={17} /></span>
          </button>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-avatar">M</span>
          {!collapsed && (
            <>
              <span className="workspace-copy">
                <strong>Your space</strong>
                <small>Personal workspace</small>
              </span>
              <ChevronRight className="workspace-chevron" size={15} />
            </>
          )}
        </div>

        <div className="sidebar-section-label">{!collapsed && "WORKSPACE"}</div>
        <nav className="sidebar-navigation">
          {navigation.map(({ label, icon: Icon, page }) => {
            const active = page === activePage;
            const available = page !== undefined;
            return (
            <button
              aria-current={active ? "page" : undefined}
              aria-label={collapsed ? label : undefined}
              className={`nav-item${active ? " is-active" : ""}${!available ? " is-unavailable" : ""}`}
              disabled={!available}
              key={label}
              onClick={available ? () => { onNavigate(page); onCloseMobile(); } : undefined}
              title={collapsed ? label : !available ? `${label} — coming in a future stage` : undefined}
              type="button"
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.8} />
              {!collapsed && <span>{label}</span>}
              {!collapsed && active && <span className="nav-active-indicator" />}
              {!available && <span className="nav-coming-soon">{collapsed ? "" : "SOON"}</span>}
            </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-section-label">{!collapsed && "PREFERENCES"}</div>
          <button
            aria-label={collapsed ? "Settings (coming soon)" : undefined}
            className="nav-item is-unavailable"
            disabled
            title={collapsed ? "Settings — coming in a future stage" : undefined}
            type="button"
          >
            <Settings size={18} strokeWidth={1.8} />
            {!collapsed && <span>Settings</span>}
            <span className="nav-coming-soon">{collapsed ? "" : "SOON"}</span>
          </button>
          {!collapsed && (
            <div className="sidebar-upgrade">
              <div className="upgrade-icon"><Command size={15} /></div>
              <strong>A little space to grow</strong>
              <span>Your day, with more intention.</span>
              <div className="upgrade-progress"><span /></div>
              <small>YOUR SPACE IS TAKING SHAPE</small>
            </div>
          )}
          <div className="sidebar-profile">
            <span className="profile-avatar">M</span>
            {!collapsed && (
              <>
                <span className="profile-copy"><strong>Your profile</strong><small>Private workspace</small></span>
                <Menu size={17} className="profile-menu-icon" />
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
