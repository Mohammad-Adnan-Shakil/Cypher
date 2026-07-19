import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000';
const STATUSES = ['new', 'researched', 'drafted', 'sent', 'replied', 'ignored', 'rejected'];

function SkeletonColumn() {
  return (
    <div className="w-72 flex-shrink-0">
      <div className="h-5 bg-white/[0.06] rounded w-24 mb-4 animate-pulse" />
      <div className="space-y-3">
        <div className="border border-border rounded p-4 space-y-2">
          <div className="h-4 bg-white/[0.06] rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded w-1/2 animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded w-full animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded w-2/3 animate-pulse" />
        </div>
        <div className="border border-border rounded p-4 space-y-2">
          <div className="h-4 bg-white/[0.06] rounded w-2/3 animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded w-1/2 animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded w-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ score }) {
  let bg = 'bg-white/5 text-muted/60';
  if (score >= 8) bg = 'bg-accent/20 text-accent';
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
    <div className="border border-border rounded p-4 space-y-2 hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-heading text-sm font-bold text-primary leading-tight min-w-0">
          {opp.company || 'Unknown'}
        </div>
        {opp.fit_score != null && <ScoreBadge score={opp.fit_score} />}
      </div>
      {opp.role_type && (
        <div className="font-body text-xs text-muted">{opp.role_type}</div>
      )}
      {opp.fit_reasoning && (
        <div className={`font-body text-xs text-muted/80 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
          {opp.fit_reasoning}
        </div>
      )}
      {opp.url && (
        <a
          href={opp.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="block font-mono text-xs text-accent/70 hover:text-accent truncate transition-colors"
        >
          {opp.url}
        </a>
      )}
    </div>
  );
}

function StatusColumn({ status, opportunities }) {
  return (
    <div className="w-72 flex-shrink-0">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="font-heading text-sm font-bold text-primary capitalize">
          {status}
        </h3>
        <span className="font-mono text-xs text-muted bg-white/[0.06] px-2 py-0.5 rounded">
          {opportunities.length}
        </span>
      </div>
      <div className="space-y-3">
        {opportunities.length > 0 ? (
          opportunities.map((opp) => (
            <OpportunityCard key={opp.id} opp={opp} />
          ))
        ) : (
          <p className="font-body text-xs text-muted/50 px-1">No opportunities</p>
        )}
      </div>
    </div>
  );
}

export default function OpportunitiesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/api/opportunities`)
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

  if (loading) {
    return (
      <div>
        <h2 className="font-heading text-xl font-bold mb-6">Opportunities</h2>
        <div className="flex gap-5 overflow-x-auto pb-4">
          {STATUSES.map((s) => (
            <SkeletonColumn key={s} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="font-heading text-xl font-bold mb-6">Opportunities</h2>
        <div className="border border-border rounded p-10 text-center">
          <div className="font-mono text-accent text-lg mb-3">◉</div>
          <p className="font-body text-muted text-sm mb-1">
            Can't reach the Cypher API — is it running on localhost:8000?
          </p>
          <p className="font-mono text-xs text-muted/60">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const grouped = {};
  for (const status of STATUSES) {
    grouped[status] = [];
  }
  for (const opp of data) {
    const s = opp.status || 'new';
    if (grouped[s]) {
      grouped[s].push(opp);
    } else {
      grouped[s] = [opp];
    }
  }

  return (
    <div>
      <h2 className="font-heading text-xl font-bold mb-6">Opportunities</h2>
      <div className="flex gap-5 overflow-x-auto pb-4">
        {STATUSES.map((status) => (
          <StatusColumn
            key={status}
            status={status}
            opportunities={grouped[status] || []}
          />
        ))}
      </div>
    </div>
  );
}
