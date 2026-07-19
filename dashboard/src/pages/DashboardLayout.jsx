import { NavLink, Outlet } from 'react-router-dom';

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
      <aside className="w-56 flex-shrink-0 border-r border-border flex flex-col">
        <div className="flex items-center gap-2 font-heading text-lg tracking-[0.2em] px-6 py-5">
          <span className="text-accent text-xl leading-none">•</span>
          <span className="text-primary">CYPHER</span>
        </div>

        <nav className="flex flex-col gap-1 px-3 mt-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 font-body text-sm px-3 py-2 rounded transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-muted hover:text-primary hover:bg-white/[0.04]'
                }`
              }
            >
              <span className="text-xs w-4 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
