import { NavLink, Outlet, Link } from 'react-router-dom';
import LogoMark from '../components/LogoMark';

const NAV_ITEMS = [
  { to: '/dashboard/stats', label: 'Stats', icon: '◈' },
  { to: '/dashboard/opportunities', label: 'Opportunities', icon: '◉' },
  { to: '/dashboard/outreach', label: 'Outreach', icon: '◌' },
  { to: '/dashboard/hackathons', label: 'Hackathons', icon: '◇' },
  { to: '/dashboard/memory', label: 'Memory', icon: '◆' },
];

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-surface text-primary">
      <aside className="w-16 md:w-56 flex-shrink-0 border-r border-border flex flex-col">
        <Link to="/dashboard/stats" className="flex items-center justify-center md:justify-start gap-2 font-heading text-lg tracking-[0.2em] px-0 md:px-6 py-5">
          <LogoMark size={20} />
          <span className="text-primary hidden md:inline">CYPHER</span>
        </Link>

        <nav className="flex flex-col gap-1 px-1 md:px-3 mt-2 items-center md:items-stretch">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-center md:justify-start gap-3 font-body text-sm px-2 md:px-3 py-2 rounded transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-muted hover:text-primary hover:bg-white/[0.04]'
                }`
              }
            >
              <span className="text-xs w-4 text-center flex-shrink-0">{item.icon}</span>
              <span className="hidden md:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
