import { Link, NavLink, Outlet } from 'react-router-dom';

interface AppShellProps {
  appName: string;
  username: string | null;
  onLogout: () => void;
}

export function AppShell({ appName, username, onLogout }: AppShellProps) {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__brand">
          <Link to="/" className="brand-link">
            <span className="brand-link__mark">PS</span>
            <span>
              <strong>{appName}</strong>
              <span className="muted">Personal comic library</span>
            </span>
          </Link>
          <nav className="topbar__nav">
            <NavLink to="/" end className="topbar__nav-link">
              Library
            </NavLink>
          </nav>
        </div>
        <div className="topbar__actions">
          {username ? <span className="muted">Signed in as {username}</span> : null}
          {username ? (
            <button type="button" className="button button--ghost" onClick={onLogout}>
              Log out
            </button>
          ) : null}
        </div>
      </header>
      <main className="shell__content">
        <Outlet />
      </main>
    </div>
  );
}
