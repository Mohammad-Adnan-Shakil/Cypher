import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000';

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

function OutcomeBadge({ outcome }) {
  let bg = 'bg-white/10 text-muted';
  if (outcome === 'positive' || outcome === 'meeting_booked') bg = 'bg-accent/20 text-accent';
  else if (outcome === 'negative') bg = 'bg-white/5 text-muted/60';

  const label = outcome
    ? outcome.replace(/_/g, ' ')
    : 'unknown';

  return (
    <span className={`font-mono text-xs px-2 py-0.5 rounded capitalize ${bg}`}>
      {label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
      <div className="h-4 bg-white/[0.06] rounded w-28 animate-pulse" />
      <div className="h-4 bg-white/[0.06] rounded w-24 animate-pulse" />
      <div className="h-4 bg-white/[0.06] rounded w-36 animate-pulse" />
      <div className="h-4 bg-white/[0.06] rounded w-24 animate-pulse" />
      <div className="h-4 bg-white/[0.06] rounded w-16 animate-pulse" />
      <div className="h-4 bg-white/[0.06] rounded w-12 animate-pulse" />
    </div>
  );
}

export default function OutreachPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/api/outreach`)
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

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div>
        <h2 className="font-heading text-xl font-bold mb-6">Outreach</h2>
        <div className="border border-border rounded overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-2 bg-white/[0.03] border-b border-border">
            <div className="h-3 bg-white/[0.06] rounded w-28" />
            <div className="h-3 bg-white/[0.06] rounded w-24" />
            <div className="h-3 bg-white/[0.06] rounded w-36" />
            <div className="h-3 bg-white/[0.06] rounded w-24" />
            <div className="h-3 bg-white/[0.06] rounded w-16" />
            <div className="h-3 bg-white/[0.06] rounded w-12" />
          </div>
          {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="font-heading text-xl font-bold mb-6">Outreach</h2>
        <div className="border border-border rounded p-8 md:p-10 text-center">
          <div className="font-mono text-accent text-lg mb-3">◌</div>
          <p className="font-body text-muted text-sm mb-1">
            Can't reach the Cypher API — is it running on localhost:8000?
          </p>
          <p className="font-mono text-xs text-muted/60">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div>
        <h2 className="font-heading text-xl font-bold mb-6">Outreach</h2>
        <div className="border border-border rounded p-8 md:p-10 text-center">
          <p className="font-body text-muted text-sm">No outreach sent yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-heading text-xl font-bold mb-6">Outreach</h2>
      <div className="border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.03] border-b border-border">
                <th className="font-body text-xs text-muted uppercase tracking-wider text-left px-4 py-3 font-medium">Company</th>
                <th className="font-body text-xs text-muted uppercase tracking-wider text-left px-4 py-3 font-medium">Founder</th>
                <th className="font-body text-xs text-muted uppercase tracking-wider text-left px-4 py-3 font-medium">Sent To</th>
                <th className="font-body text-xs text-muted uppercase tracking-wider text-left px-4 py-3 font-medium">Sent Date</th>
                <th className="font-body text-xs text-muted uppercase tracking-wider text-left px-4 py-3 font-medium">Status</th>
                <th className="font-body text-xs text-muted uppercase tracking-wider text-left px-4 py-3 font-medium">Days Since Sent</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const isStale = row.stale;
                const isExpanded = expandedId === row.id;
                const hasReply = !!row.reply_content;

                return (
                  <tr key={row.id}>
                    <td colSpan={6} className="p-0">
                      <div
                        className={`border-b border-border ${isStale ? 'border-l-2 border-l-accent' : ''} ${hasReply ? 'cursor-pointer' : ''}`}
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
                            {formatDate(row.email_sent_at) || <span className="text-muted/50">Not sent</span>}
                          </div>
                          <div className="w-20 flex-shrink-0">
                            <OutcomeBadge outcome={row.outcome} />
                          </div>
                          <div className="flex-1 flex items-center gap-2 font-mono text-sm text-muted min-w-0">
                            {row.days_since_sent != null ? (
                              <>
                                <span>{row.days_since_sent}d</span>
                                {isStale && (
                                  <span className="font-mono text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded tracking-wider">STALE</span>
                                )}
                              </>
                            ) : (
                              <span>—</span>
                            )}
                          </div>
                        </div>
                        {isExpanded && hasReply && (
                          <div className="px-4 pb-3 pl-8">
                            <div className="border-l-2 border-border pl-4 py-2">
                              <div className="font-body text-xs text-muted/70 whitespace-pre-wrap leading-relaxed">
                                {row.reply_content}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
