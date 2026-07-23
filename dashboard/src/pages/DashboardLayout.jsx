import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import LogoMark from '../components/LogoMark';

const NAV_ITEMS = [
  { to: '/dashboard/stats', label: 'Stats', icon: '◈' },
  { to: '/dashboard/opportunities', label: 'Opportunities', icon: '◉' },
  { to: '/dashboard/outreach', label: 'Outreach', icon: '◌' },
  { to: '/dashboard/hackathons', label: 'Hackathons', icon: '◇' },
  { to: '/dashboard/memory', label: 'Memory', icon: '◆' },
];

const PAGE_TITLES = {
  '/dashboard/stats': 'Stats',
  '/dashboard/opportunities': 'Opportunities',
  '/dashboard/outreach': 'Outreach',
  '/dashboard/hackathons': 'Hackathons',
  '/dashboard/memory': 'Memory',
};

export default function DashboardLayout() {
  const location = useLocation();
  const currentTitle = PAGE_TITLES[location.pathname] || 'Dashboard';

  return (
    <div className="flex min-h-screen bg-surface text-primary">
      <aside className="w-16 md:w-56 flex-shrink-0 bg-surface-elevated border-r border-border flex flex-col transition-all duration-300">
        <Link
          to="/dashboard/stats"
          className="flex items-center justify-center md:justify-start gap-2 font-heading text-lg tracking-[0.2em] px-0 md:px-6 py-5"
        >
          <LogoMark size={20} />
          <span className="text-primary hidden md:inline">CYPHER</span>
        </Link>

        <nav className="flex flex-col gap-1 px-1 md:px-3 mt-2 items-center md:items-stretch">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-center md:justify-start gap-3 font-body text-sm px-2 md:px-3 py-2.5 rounded-md transition-all duration-200 relative ${
                  isActive
                    ? 'bg-accent-subtle text-accent font-medium shadow-[inset_0_0_12px_rgba(255,45,120,0.06)]'
                    : 'text-muted hover:text-primary hover:bg-surface-hover'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-accent rounded-r-full" />
                  )}
                  <span className="text-xs w-4 text-center flex-shrink-0">{item.icon}</span>
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="md:hidden absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-surface-elevated border border-border text-[11px] text-primary whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-auto relative">
        <div
          className="pointer-events-none absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full opacity-[0.015]"
          style={{
            background: 'radial-gradient(circle, #ff2d78 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10">
          <header className="flex items-center justify-between mb-6">
            <h1 className="font-heading text-xl font-bold text-primary">{currentTitle}</h1>
          </header>

          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
