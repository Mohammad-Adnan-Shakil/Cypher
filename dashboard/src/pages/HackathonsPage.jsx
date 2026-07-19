import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000';

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

function StatusBadge({ status }) {
  return (
    <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-muted capitalize">
      {status}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="border border-border rounded p-5 space-y-3">
      <div className="flex justify-between items-start gap-2">
        <div className="h-5 bg-white/[0.06] rounded w-3/4 animate-pulse" />
        <div className="h-5 bg-white/[0.06] rounded w-8 animate-pulse" />
      </div>
      <div className="h-3 bg-white/[0.04] rounded w-1/2 animate-pulse" />
      <div className="h-3 bg-white/[0.04] rounded w-full animate-pulse" />
      <div className="h-3 bg-white/[0.04] rounded w-2/3 animate-pulse" />
      <div className="h-3 bg-white/[0.04] rounded w-16 animate-pulse" />
      <div className="h-8 bg-white/[0.06] rounded w-28 animate-pulse" />
    </div>
  );
}

export default function HackathonsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/api/hackathons`)
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
        <h2 className="font-heading text-xl font-bold mb-6">Hackathons</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="font-heading text-xl font-bold mb-6">Hackathons</h2>
        <div className="border border-border rounded p-8 md:p-10 text-center">
          <div className="font-mono text-accent text-lg mb-3">◇</div>
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
        <h2 className="font-heading text-xl font-bold mb-6">Hackathons</h2>
        <div className="border border-border rounded p-8 md:p-10 text-center">
          <p className="font-body text-muted text-sm">No hackathons found yet.</p>
        </div>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));

  return (
    <div>
      <h2 className="font-heading text-xl font-bold mb-6">Hackathons</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((h) => (
          <div key={h.id} className="border border-border rounded p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-heading text-sm font-bold text-primary leading-snug line-clamp-2 min-w-0">
                {h.title}
              </h3>
              {h.relevance_score != null && <ScoreBadge score={h.relevance_score} />}
            </div>

            <div className="font-body text-xs text-muted">
              {h.deadline ? (
                <>Deadline: {h.deadline}</>
              ) : (
                <span className="italic text-muted/50">No deadline listed</span>
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
                className="font-mono text-xs text-accent/70 hover:text-accent transition-colors"
              >
                View hackathon →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
