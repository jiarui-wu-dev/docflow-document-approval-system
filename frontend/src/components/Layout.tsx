import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  Blocks,
  ChevronRight,
  Command,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  ShieldCheck,
  X,
} from "lucide-react";
import { Brand } from "./common";
import { useAuth } from "@/lib/auth";
export function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 760px)").matches,
  );
  const location = useLocation();
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const change = () => setMobile(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!mobile || !open) return;
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    sidebar?.querySelector<HTMLElement>(".mobile-close")?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        document.querySelector<HTMLElement>(".menu-toggle")?.focus();
      }
      if (event.key === "Tab") {
        const focusable = sidebar?.querySelectorAll<HTMLElement>(
          "a[href], button:not(:disabled)",
        );
        if (!focusable?.length) return;
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [mobile, open]);
  useEffect(() => {
    setOpen(false);
    document.getElementById("main-content")?.focus();
  }, [location.pathname]);
  if (!user) return null;
  const links = [
    { path: "/", label: "Overview", icon: LayoutDashboard },
    { path: "/documents", label: "All documents", icon: FileText },
    ...(user.role !== "SUBMITTER"
      ? [{ path: "/reviews", label: "Review workspace", icon: ShieldCheck }]
      : []),
    ...(user.role === "ADMIN"
      ? [{ path: "/admin", label: "Admin workspace", icon: Blocks }]
      : []),
  ];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {open && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        inert={mobile && !open}
        className={`sidebar ${open ? "sidebar-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-brand">
          <Brand />
          <button
            className="mobile-close"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-avatar">
            <Command size={18} />
          </span>
          <span>
            Document workspace
            <small>
              {user.role === "ADMIN"
                ? "Organization access"
                : "Personal workspace"}
            </small>
          </span>
          <ChevronRight size={14} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {links.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              {label}
              <span className="nav-indicator" />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a
            className="sidebar-api"
            href="/swagger-ui/index.html"
            target="_blank"
            rel="noreferrer"
          >
            API documentation <ArrowUpRight size={13} />
          </a>
          <div className="user-profile">
            <span className="avatar">
              {user.username.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0">
              <strong>{user.username}</strong>
              <small>{user.role.toLowerCase()}</small>
            </span>
            <button onClick={logout} title="Sign out" aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button
              className="menu-toggle"
              onClick={() => setOpen(!open)}
              aria-label="Open navigation"
              aria-expanded={open}
            >
              <Menu size={21} />
            </button>
            <PanelLeftClose className="desktop-icon" size={18} />
            <span className="breadcrumb">
              Workspace <ChevronRight size={13} />{" "}
              <b>
                {location.pathname === "/"
                  ? "Overview"
                  : location.pathname.startsWith("/reviews")
                    ? "Review workspace"
                    : location.pathname.startsWith("/admin")
                      ? "Admin workspace"
                      : "Documents"}
              </b>
            </span>
          </div>
          <div className="topbar-right">
            <span className="session-tag">
              <i />
              Memory-only session
            </span>
            <span className="topbar-divider" />
            <span className="avatar avatar-small">
              {user.username.slice(0, 2).toUpperCase()}
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer>
          <span>
            DOCFLOW <span className="text-muted">/</span> Document review &amp;
            approval
          </span>
          <span>
            <span className="live-dot" /> HTTP Basic · {user.role.toLowerCase()}
          </span>
        </footer>
      </div>
    </div>
  );
}
