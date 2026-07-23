import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Trophy, Calendar } from 'lucide-react';

const API_BASE = 'https://cypher-rbw6.onrender.com';

function ScoreBadge({ score }) {
  let bg = 'bg-white/5 text-muted/60';
  let glow = '';
  if (score >= 8) {
    bg = 'bg-accent/20 text-accent';
    glow = 'shadow-[0_0_8px_rgba(255,45,120,0.15)]';
  } else if (score >= 5) {
    bg = 'bg-white/10 text-muted';
  }

  return (
    <span className={`font-mono text-xs px-2 py-0.5 rounded ${bg} ${glow}`}>
      {score}
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-muted capitalize">
      {status}
    </span>
  );
}

function DeadlineDot({ deadline }) {
  if (!deadline) return null;
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffDays = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

  let color = 'bg-success';
  if (diffDays <= 7) color = 'bg-error';
  else if (diffDays <= 14) color = 'bg-warning';

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      <span className="font-mono text-xs text-muted">{diffDays > 0 ? `${diffDays}d left` : 'Past due'}</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="border border-border rounded-lg p-5 bg-surface-elevated space-y-3">
      <div className="flex justify-between items-start gap-2">
        <div className="h-5 skeleton-shimmer rounded w-3/4" />
        <div className="h-5 skeleton-shimmer rounded w-8" />
      </div>
      <div className="h-3 skeleton-shimmer rounded w-1/2" />
      <div className="h-3 skeleton-shimmer rounded w-full" />
      <div className="h-3 skeleton-shimmer rounded w-2/3" />
      <div className="h-3 skeleton-shimmer rounded w-16" />
      <div className="h-8 skeleton-shimmer rounded w-28" />
    </div>
  );
}

export default function HackathonsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  function fetchData() {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/hackathons`)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json) => { setData(json); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/hackathons`)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json) => { if (!cancelled) { setData(json); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="border border-border rounded-lg p-8 md:p-10 text-center bg-surface-elevated">
        <div className="flex items-center justify-center mb-4"><div className="w-12 h-12 rounded-full bg-accent-subtle flex items-center justify-center"><ExternalLink size={20} className="text-accent" /></div></div>
        <p className="font-body text-muted text-sm mb-1">Can't reach the Cypher API</p>
        <p className="font-mono text-xs text-muted-lighter mb-4">{error}</p>
        <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white text-sm font-body hover:opacity-90 transition-opacity">Retry</button>
      </motion.div>
    );
  }

  if (!data) return null;

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-16">
        <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
          <Trophy size={32} className="text-muted-lighter mb-3" />
        </motion.div>
        <p className="font-body text-sm text-muted">No hackathons found yet.</p>
      </motion.div>
    );
  }

  const sorted = [...data].sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((h, i) => (
          <motion.div
            key={h.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            className={`border border-border rounded-lg p-5 flex flex-col gap-3 bg-surface-elevated hover:bg-surface-hover transition-colors ${
              (h.relevance_score ?? 0) >= 8 ? 'shadow-[0_0_12px_rgba(255,45,120,0.08)]' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-heading text-sm font-bold text-primary leading-snug line-clamp-2 min-w-0">
                {h.title}
              </h3>
              {h.relevance_score != null && <ScoreBadge score={h.relevance_score} />}
            </div>

            <div className="flex items-center justify-between">
              {h.deadline ? (
                <DeadlineDot deadline={h.deadline} />
              ) : (
                <span className="font-body text-xs text-muted italic flex items-center gap-1">
                  <Calendar size={10} />
                  No deadline
                </span>
              )}
            </div>

            {h.eligibility_reason && (
              <div className="font-body text-xs text-muted/70 leading-relaxed line-clamp-2">
                {h.eligibility_reason}
              </div>
            )}

            <div className="mt-auto flex items-center justify-between pt-1">
              {h.status ? <StatusBadge status={h.status} /> : <span />}
              <a
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs text-accent/70 hover:text-accent transition-colors"
              >
                View <ExternalLink size={10} />
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
