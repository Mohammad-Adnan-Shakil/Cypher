import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ExternalLink, Search, AlertCircle } from 'lucide-react';

const API_BASE = 'https://cypher-rbw6.onrender.com';
const STATUSES = ['new', 'researched', 'drafted', 'sent', 'replied', 'ignored', 'rejected'];

const STATUS_COLORS = {
  new: { border: '#ff2d78', badge: 'bg-accent-subtle text-accent' },
  researched: { border: '#60a5fa', badge: 'bg-blue-500/10 text-blue-400' },
  drafted: { border: '#fbbf24', badge: 'bg-yellow-500/10 text-yellow-400' },
  sent: { border: '#34d399', badge: 'bg-emerald-500/10 text-emerald-400' },
  replied: { border: '#3dff8f', badge: 'bg-green-500/10 text-green-400' },
  ignored: { border: '#6b7280', badge: 'bg-gray-500/10 text-gray-400' },
  rejected: { border: '#ff4757', badge: 'bg-red-500/10 text-red-400' },
};

function SkeletonColumn() {
  return (
    <div className="w-72 flex-shrink-0">
      <div className="h-5 skeleton-shimmer rounded w-24 mb-4" />
      <div className="space-y-3">
        <div className="border border-border rounded-lg p-4 bg-surface-elevated space-y-2">
          <div className="h-4 skeleton-shimmer rounded w-3/4" />
          <div className="h-3 skeleton-shimmer rounded w-1/2" />
          <div className="h-3 skeleton-shimmer rounded w-full" />
          <div className="h-3 skeleton-shimmer rounded w-2/3" />
        </div>
        <div className="border border-border rounded-lg p-4 bg-surface-elevated space-y-2">
          <div className="h-4 skeleton-shimmer rounded w-2/3" />
          <div className="h-3 skeleton-shimmer rounded w-1/2" />
          <div className="h-3 skeleton-shimmer rounded w-full" />
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ score }) {
  let bg = 'bg-white/5 text-muted/60';
  if (score >= 8) bg = 'bg-accent/20 text-accent shadow-[0_0_8px_rgba(255,45,120,0.15)]';
  else if (score >= 5) bg = 'bg-white/10 text-muted';

  return (
    <span className={`font-mono text-xs px-2 py-0.5 rounded ${bg}`}>
      {score}
    </span>
  );
}

function OpportunityCard({ opp }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="border border-border rounded-lg p-4 space-y-2 bg-surface-elevated hover:bg-surface-hover transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-heading text-sm font-bold text-primary leading-tight min-w-0 flex items-center gap-2">
          {opp.status === 'new' && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse flex-shrink-0" />
          )}
          {opp.company || 'Unknown'}
        </div>
        {opp.fit_score != null && <ScoreBadge score={opp.fit_score} />}
      </div>
      {opp.role_type && (
        <div className="font-body text-xs text-muted">{opp.role_type}</div>
      )}
      <div className="flex items-center gap-1">
        <div className={`font-body text-xs leading-relaxed flex-1 ${expanded ? '' : 'line-clamp-2'} text-muted/80`}>
          {opp.fit_reasoning}
        </div>
        <ChevronDown
          size={14}
          className={`text-muted-lighter flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </div>
      {opp.url && (
        <a
          href={opp.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="group inline-flex items-center gap-1.5 font-mono text-xs text-accent/70 hover:text-accent transition-colors"
        >
          <ExternalLink size={10} />
          <span className="truncate max-w-[200px]">{opp.url}</span>
        </a>
      )}
    </motion.div>
  );
}

function StatusColumn({ status, opportunities }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.ignored;

  return (
    <div className="w-72 flex-shrink-0">
      <div className="flex items-center justify-between mb-4 px-1 relative">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors.border }} />
          <h3 className="font-heading text-sm font-bold text-primary capitalize">{status}</h3>
        </div>
        <span className={`font-mono text-xs px-2 py-0.5 rounded ${colors.badge}`}>
          {opportunities.length}
        </span>
      </div>
      <div className="space-y-3">
        {opportunities.length > 0 ? (
          <AnimatePresence>
            {opportunities.map((opp, i) => (
              <motion.div
                key={opp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-lg"
                  style={{ backgroundColor: colors.border }}
                />
                <OpportunityCard opp={opp} />
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <p className="font-body text-xs text-muted-lighter px-1">No opportunities</p>
        )}
      </div>
    </div>
  );
}

export default function OpportunitiesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  function fetchData() {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/opportunities`)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json) => { setData(json); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/opportunities`)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json) => { if (!cancelled) { setData(json); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex gap-5 overflow-x-auto pb-4">
        {STATUSES.map((s) => (<SkeletonColumn key={s} />))}
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="border border-border rounded-lg p-8 md:p-10 text-center bg-surface-elevated"
      >
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-accent-subtle flex items-center justify-center">
            <AlertCircle size={20} className="text-accent" />
          </div>
        </div>
        <p className="font-body text-muted text-sm mb-1">Can't reach the Cypher API</p>
        <p className="font-mono text-xs text-muted-lighter mb-4">{error}</p>
        <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white text-sm font-body hover:opacity-90 transition-opacity">Retry</button>
      </motion.div>
    );
  }

  if (!data) return null;

  const grouped = {};
  for (const status of STATUSES) { grouped[status] = []; }
  for (const opp of data) {
    const s = opp.status || 'new';
    if (grouped[s]) grouped[s].push(opp);
    else grouped[s] = [opp];
  }

  if (data.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-16">
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Search size={32} className="text-muted-lighter mb-3" />
        </motion.div>
        <p className="font-body text-sm text-muted">No opportunities found yet.</p>
        <p className="font-body text-xs text-muted-lighter mt-1">Opportunities will appear here once the daily pipeline runs.</p>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      <div className="flex gap-5 overflow-x-auto pb-4">
        {STATUSES.map((status) => (
          <StatusColumn key={status} status={status} opportunities={grouped[status] || []} />
        ))}
      </div>
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-surface to-transparent" />
    </div>
  );
}
