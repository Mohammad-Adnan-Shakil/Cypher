import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, XCircle, HelpCircle, ExternalLink, ChevronDown } from 'lucide-react';

const API_BASE = 'https://cypher-rbw6.onrender.com';

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const relative = diffDays === 0 ? 'today' : diffDays === 1 ? 'yesterday' : `${diffDays}d ago`;
    const absolute = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return { relative, absolute };
  } catch {
    return null;
  }
}

function OutcomeBadge({ outcome }) {
  let bg = 'bg-white/10 text-muted';
  let icon = HelpCircle;
  if (outcome === 'positive' || outcome === 'meeting_booked') {
    bg = 'bg-accent/20 text-accent';
    icon = CheckCircle;
  } else if (outcome === 'negative') {
    bg = 'bg-white/5 text-muted/60';
    icon = XCircle;
  }

  const Icon = icon;
  const label = outcome ? outcome.replace(/_/g, ' ') : 'unknown';

  return (
    <span className={`inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded capitalize ${bg}`}>
      <Icon size={10} />
      {label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-6 px-4 py-3 border-b border-border">
      <div className="h-4 skeleton-shimmer rounded w-28" />
      <div className="h-4 skeleton-shimmer rounded w-24" />
      <div className="h-4 skeleton-shimmer rounded w-36" />
      <div className="h-4 skeleton-shimmer rounded w-24" />
      <div className="h-4 skeleton-shimmer rounded w-16" />
      <div className="h-4 skeleton-shimmer rounded w-12" />
    </div>
  );
}

export default function OutreachPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  function fetchData() {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/outreach`)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json) => { setData(json); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/outreach`)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json) => { if (!cancelled) { setData(json); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const toggleExpand = (id) => { setExpandedId(expandedId === id ? null : id); };

  if (loading) {
    return (
      <div className="border border-border rounded-lg overflow-hidden bg-surface-elevated">
        <div className="flex items-center gap-6 px-4 py-2 bg-surface-hover border-b border-border">
          <div className="h-3 skeleton-shimmer rounded w-28" />
          <div className="h-3 skeleton-shimmer rounded w-24" />
          <div className="h-3 skeleton-shimmer rounded w-36" />
          <div className="h-3 skeleton-shimmer rounded w-24" />
          <div className="h-3 skeleton-shimmer rounded w-16" />
          <div className="h-3 skeleton-shimmer rounded w-12" />
        </div>
        {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
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
          <Mail size={32} className="text-muted-lighter mb-3" />
        </motion.div>
        <p className="font-body text-sm text-muted">No outreach sent yet.</p>
      </motion.div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface-elevated">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-hover border-b border-border">
              <th className="font-body text-xs text-muted uppercase tracking-wider text-left px-4 py-3 font-medium sticky top-0 bg-surface-hover z-10">Company</th>
              <th className="font-body text-xs text-muted uppercase tracking-wider text-left px-4 py-3 font-medium sticky top-0 bg-surface-hover z-10">Founder</th>
              <th className="font-body text-xs text-muted uppercase tracking-wider text-left px-4 py-3 font-medium sticky top-0 bg-surface-hover z-10">Sent To</th>
              <th className="font-body text-xs text-muted uppercase tracking-wider text-left px-4 py-3 font-medium sticky top-0 bg-surface-hover z-10">Sent Date</th>
              <th className="font-body text-xs text-muted uppercase tracking-wider text-left px-4 py-3 font-medium sticky top-0 bg-surface-hover z-10">Status</th>
              <th className="font-body text-xs text-muted uppercase tracking-wider text-left px-4 py-3 font-medium sticky top-0 bg-surface-hover z-10">Days Since Sent</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const isStale = row.stale;
              const isExpanded = expandedId === row.id;
              const hasReply = !!row.reply_content;
              const dateInfo = formatDate(row.email_sent_at);

              return (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.02, ease: [0.16, 1, 0.3, 1] }}
                >
                  <td colSpan={6} className="p-0">
                    <div
                      className={`border-b border-border transition-colors ${isStale ? 'border-l-[3px] border-l-warning bg-warning/[0.02]' : ''} ${hasReply ? 'cursor-pointer hover:bg-surface-hover' : ''}`}
                      onClick={() => hasReply && toggleExpand(row.id)}
                    >
                      <div className="flex items-center gap-6 px-4 py-3">
                        <div className="w-[200px] flex-shrink-0 font-heading text-sm font-bold text-primary truncate">
                          {row.company || '—'}
                        </div>
                        <div className="w-[180px] flex-shrink-0 font-body text-sm text-muted truncate">
                          {row.founder_name || '—'}
                        </div>
                        <div className="w-36 flex-shrink-0 font-mono text-xs text-muted truncate">
                          {row.email_to || '—'}
                        </div>
                        <div className="w-24 flex-shrink-0 font-body text-sm text-muted">
                          {dateInfo ? (
                            <span title={dateInfo.absolute}>
                              {dateInfo.relative}
                            </span>
                          ) : (
                            <span className="text-muted-lighter">Not sent</span>
                          )}
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <OutcomeBadge outcome={row.outcome} />
                        </div>
                        <div className="flex-1 flex items-center gap-2 font-mono text-sm text-muted min-w-0">
                          {row.days_since_sent != null ? (
                            <>
                              <span>{row.days_since_sent}d</span>
                              {isStale && (
                                <span className="font-mono text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded tracking-wider">STALE</span>
                              )}
                            </>
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                        {hasReply && (
                          <ChevronDown size={14} className={`text-muted-lighter flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                      {isExpanded && hasReply && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 pl-8">
                            <div className="border-l-2 border-border pl-4 py-2">
                              <div className="font-body text-xs text-muted/70 whitespace-pre-wrap leading-relaxed">
                                {row.reply_content}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
