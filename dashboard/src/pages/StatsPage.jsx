import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Mail, Activity, Calendar, BarChart3, Target, ExternalLink } from 'lucide-react';

const API_BASE = 'https://cypher-rbw6.onrender.com';

function AnimatedNumber({ value, duration = 800 }) {
  const nodeRef = useRef(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value == null) return;
    let startTime = null;
    const startValue = 0;
    const endValue = value;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startValue + (endValue - startValue) * eased));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, [value, duration]);

  return <span ref={nodeRef}>{display.toLocaleString()}</span>;
}

const STAT_ICONS = {
  'Total Opportunities': BarChart3,
  'Emails Sent': Mail,
  'Reply Rate': Activity,
  'This Week': Calendar,
  'This Month': Calendar,
  'Avg Fit Score': Target,
};

function StatCard({ title, value, subtitle, mono, className, icon: Icon }) {
  const numericValue = typeof value === 'string' && value.endsWith('%')
    ? parseFloat(value)
    : typeof value === 'string'
      ? parseFloat(value.replace(/,/g, ''))
      : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`border border-border rounded-lg p-5 bg-surface-elevated shadow-[0_1px_2px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-shadow ${className || ''}`}
    >
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={14} className="text-muted" />}
        <div className="font-body text-xs text-muted uppercase tracking-wider">{title}</div>
      </div>
      <div className={`${mono !== false ? 'font-mono' : 'font-heading'} text-3xl text-primary leading-tight`}>
        {numericValue != null && !isNaN(numericValue)
          ? <AnimatedNumber value={Math.round(numericValue)} />
          : value}
        {typeof value === 'string' && value.endsWith('%') && <span className="text-muted text-lg ml-0.5">%</span>}
      </div>
      {subtitle && (
        <div className="font-mono text-xs text-muted mt-1.5">{subtitle}</div>
      )}
    </motion.div>
  );
}

function SourceBar({ name, count, maxCount, index }) {
  const width = maxCount > 0 ? (count / maxCount) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0.3 + index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3"
    >
      <span className="font-body text-sm text-primary w-36 flex-shrink-0 truncate">{name}</span>
      <div className="flex-1 h-5 bg-surface-hover rounded-sm overflow-hidden">
        <motion.div
          className="h-full rounded-sm"
          style={{
            background: 'linear-gradient(90deg, #ff2d78 0%, rgba(255,45,120,0.6) 100%)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.6, delay: 0.4 + index * 0.06, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span className="font-mono text-sm text-muted w-10 text-right flex-shrink-0">{count}</span>
    </motion.div>
  );
}

function SkeletonBar() {
  return <div className="h-3 skeleton-shimmer rounded" />;
}

function SkeletonCard({ className }) {
  return (
    <div className={`border border-border rounded-lg p-5 bg-surface-elevated ${className || ''}`}>
      <SkeletonBar />
      <div className="h-7 skeleton-shimmer rounded w-1/2 mt-3" />
      <div className="h-3 skeleton-shimmer rounded w-1/4 mt-2" />
    </div>
  );
}

export default function StatsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  function fetchData() {
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/stats`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }

  useEffect(() => {
    let cancelled = false;
    const originalSetData = setData;
    const originalSetError = setError;
    const originalSetLoading = setLoading;

    fetch(`${API_BASE}/api/stats`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonCard className="sm:col-span-2" />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard className="sm:col-span-3 h-32" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="border border-border rounded-lg p-8 md:p-10 text-center bg-surface-elevated"
      >
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-accent-subtle flex items-center justify-center">
            <ExternalLink size={20} className="text-accent" />
          </div>
        </div>
        <p className="font-body text-muted text-sm mb-1">
          Can't reach the Cypher API
        </p>
        <p className="font-mono text-xs text-muted-lighter mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white text-sm font-body hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </motion.div>
    );
  }

  if (!data) return null;

  const sourceEntries = data.opportunities_by_source
    ? Object.entries(data.opportunities_by_source)
    : [];
  const maxSourceCount = sourceEntries.length
    ? Math.max(...sourceEntries.map(([, c]) => c), 1)
    : 1;
  const replyRate =
    data.emails_sent > 0
      ? ((data.emails_replied / data.emails_sent) * 100).toFixed(1)
      : '0.0';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Opportunities"
          value={data.total_opportunities?.toLocaleString() ?? '—'}
          className="sm:col-span-2"
          icon={STAT_ICONS['Total Opportunities']}
        />

        <StatCard
          title="Emails Sent"
          value={data.emails_sent?.toLocaleString() ?? '—'}
          icon={STAT_ICONS['Emails Sent']}
        />

        <StatCard
          title="Reply Rate"
          value={`${replyRate}%`}
          subtitle={`${data.emails_replied ?? 0} replied of ${data.emails_sent ?? 0} sent`}
          icon={STAT_ICONS['Reply Rate']}
        />

        <StatCard
          title="This Week"
          value={data.opportunities_this_week?.toLocaleString() ?? '—'}
          icon={STAT_ICONS['This Week']}
        />

        <StatCard
          title="This Month"
          value={data.opportunities_this_month?.toLocaleString() ?? '—'}
          icon={STAT_ICONS['This Month']}
        />

        <StatCard
          title="Avg Fit Score"
          value={data.average_fit_score != null ? `${data.average_fit_score.toFixed(1)} / 10` : '—'}
          mono={false}
          icon={STAT_ICONS['Avg Fit Score']}
        />
      </div>

      {sourceEntries.length > 0 ? (
        <div className="border border-border rounded-lg p-5 mt-6 bg-surface-elevated">
          <h3 className="font-heading text-sm font-bold text-primary mb-5 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 size={14} className="text-muted" />
            Opportunities by Source
          </h3>
          <div className="flex flex-col gap-3">
            {sourceEntries.map(([name, count], i) => (
              <SourceBar
                key={name}
                name={name.charAt(0).toUpperCase() + name.slice(1)}
                count={count}
                maxCount={maxSourceCount}
                index={i}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-border rounded-lg p-5 mt-6 bg-surface-elevated">
          <h3 className="font-heading text-sm font-bold text-primary mb-5 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 size={14} className="text-muted" />
            Opportunities by Source
          </h3>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center py-6"
          >
            <BarChart3 size={24} className="text-muted-lighter mb-2" />
            <p className="font-body text-sm text-muted">No data yet.</p>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
