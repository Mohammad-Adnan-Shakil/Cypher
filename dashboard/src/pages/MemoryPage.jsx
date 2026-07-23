import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, Activity } from 'lucide-react';

const API_BASE = 'https://cypher-rbw6.onrender.com';

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return null; }
}

function AnimatedProportionBar({ approved, skipped, ignored }) {
  const total = approved + skipped + ignored;

  return (
    <div className="h-2.5 rounded-sm w-full flex overflow-hidden bg-surface-hover">
      {total > 0 && (
        <>
          {approved > 0 && (
            <motion.div
              className="h-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${(approved / total) * 100}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
          {skipped > 0 && (
            <motion.div
              className="h-full bg-white/20"
              initial={{ width: 0 }}
              animate={{ width: `${(skipped / total) * 100}%` }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
          {ignored > 0 && (
            <motion.div
              className="h-full bg-white/[0.07]"
              initial={{ width: 0 }}
              animate={{ width: `${(ignored / total) * 100}%` }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
        </>
      )}
    </div>
  );
}

function PreferenceCard({ category, stats }) {
  const total = (stats?.approved ?? 0) + (stats?.skipped ?? 0) + (stats?.ignored ?? 0);
  const approved = stats?.approved ?? 0;
  const skipped = stats?.skipped ?? 0;
  const ignored = stats?.ignored ?? 0;
  const approvalRate = total > 0 ? (approved / total) * 100 : 0;
  const trend = approvalRate >= 50 ? 'up' : 'down';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="border border-border rounded-lg p-5 space-y-4 bg-surface-elevated hover:bg-surface-hover transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="font-heading text-sm font-bold text-primary truncate">{category}</div>
        {total > 0 && (
          <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-success' : 'text-muted-lighter'}`}>
            {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span className="font-mono">{Math.round(approvalRate)}%</span>
          </div>
        )}
      </div>
      <div className="flex gap-6">
        <div>
          <div className="font-mono text-lg text-accent">{approved}</div>
          <div className="font-body text-[11px] text-muted/70 uppercase tracking-wider mt-0.5">Approved</div>
        </div>
        <div>
          <div className="font-mono text-lg text-muted">{skipped}</div>
          <div className="font-body text-[11px] text-muted/70 uppercase tracking-wider mt-0.5">Skipped</div>
        </div>
        <div>
          <div className="font-mono text-lg text-muted/50">{ignored}</div>
          <div className="font-body text-[11px] text-muted/70 uppercase tracking-wider mt-0.5">Ignored</div>
        </div>
      </div>
      <AnimatedProportionBar approved={approved} skipped={skipped} ignored={ignored} />
      <div className="font-mono text-[11px] text-muted/40">{total} {total === 1 ? 'decision' : 'decisions'}</div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="border border-border rounded-lg p-5 bg-surface-elevated space-y-4">
      <div className="h-4 skeleton-shimmer rounded w-2/3" />
      <div className="flex gap-6">
        <div className="space-y-1"><div className="h-6 skeleton-shimmer rounded w-8" /><div className="h-3 skeleton-shimmer rounded w-14" /></div>
        <div className="space-y-1"><div className="h-6 skeleton-shimmer rounded w-8" /><div className="h-3 skeleton-shimmer rounded w-14" /></div>
        <div className="space-y-1"><div className="h-6 skeleton-shimmer rounded w-8" /><div className="h-3 skeleton-shimmer rounded w-14" /></div>
      </div>
      <div className="h-2 skeleton-shimmer rounded" />
    </div>
  );
}

export default function MemoryPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  function fetchData() {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/memory`)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json) => { setData(json); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/memory`)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json) => { if (!cancelled) { setData(json); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="border border-border rounded-lg p-8 md:p-10 text-center bg-surface-elevated">
        <div className="flex items-center justify-center mb-4"><div className="w-12 h-12 rounded-full bg-accent-subtle flex items-center justify-center"><Brain size={20} className="text-accent" /></div></div>
        <p className="font-body text-muted text-sm mb-1">Can't reach the Cypher API</p>
        <p className="font-mono text-xs text-muted-lighter mb-4">{error}</p>
        <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white text-sm font-body hover:opacity-90 transition-opacity">Retry</button>
      </motion.div>
    );
  }

  if (!data) return null;

  const lastUpdated = formatDate(data.last_updated);
  const patterns = data.preference_patterns ?? {};
  const patternEntries = Object.entries(patterns);
  const hasPatterns = patternEntries.length > 0;

  const totalDecisions = patternEntries.reduce((sum, [, s]) => sum + (s?.approved ?? 0) + (s?.skipped ?? 0) + (s?.ignored ?? 0), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-baseline gap-3 mb-6">
        <h2 className="font-heading text-xl font-bold text-primary hidden">Memory</h2>
        <span className="font-body text-xs text-muted">Last updated: {lastUpdated || 'Never'}</span>
        {hasPatterns && (
          <span className="font-mono text-[11px] text-muted-lighter bg-surface-hover px-2 py-0.5 rounded">
            {patternEntries.length} {patternEntries.length === 1 ? 'category' : 'categories'} · {totalDecisions} {totalDecisions === 1 ? 'decision' : 'decisions'}
          </span>
        )}
      </div>

      <div className="mb-8">
        <h3 className="font-heading text-sm font-bold text-primary mb-4 uppercase tracking-wider flex items-center gap-2">
          <Activity size={14} className="text-muted" />
          Preference Patterns
        </h3>
        {hasPatterns ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {patternEntries.map(([category, stats]) => (
              <PreferenceCard key={category} category={category} stats={stats} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-border rounded-lg p-8 md:p-10 text-center bg-surface-elevated"
          >
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="flex flex-col items-center"
            >
              <Activity size={28} className="text-muted-lighter mb-3" />
              <p className="font-body text-muted text-sm">
                Cypher hasn't learned any preferences yet
              </p>
              <p className="font-body text-xs text-muted-lighter mt-1">
                Approve or skip opportunities in Telegram to start building this.
              </p>
            </motion.div>
          </motion.div>
        )}
      </div>

      <div className="mb-8">
        <h3 className="font-heading text-sm font-bold text-primary mb-4 uppercase tracking-wider">Learned Weights</h3>
        <div className="border border-border rounded-lg p-5 bg-surface-elevated">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-2 h-2 rounded-full bg-accent"
            />
            <p className="font-body text-sm text-muted italic">Not yet computed — accumulating more data.</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-heading text-sm font-bold text-primary mb-4 uppercase tracking-wider">Reply Rate by Type</h3>
        <div className="border border-border rounded-lg p-5 bg-surface-elevated">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              className="w-2 h-2 rounded-full bg-accent"
            />
            <p className="font-body text-sm text-muted italic">Not yet computed — accumulating more data.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
