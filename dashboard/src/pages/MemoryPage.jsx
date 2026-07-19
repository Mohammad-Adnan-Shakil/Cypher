import { useState, useEffect } from 'react';

const API_BASE = 'https://cypher-rbw6.onrender.com';

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

function ProportionBar({ approved, skipped, ignored }) {
  const total = approved + skipped + ignored;
  if (total === 0) {
    return <div className="h-2.5 bg-border rounded-sm w-full" />;
  }
  const aW = (approved / total) * 100;
  const sW = (skipped / total) * 100;
  const iW = (ignored / total) * 100;

  return (
    <div className="h-2.5 rounded-sm w-full flex overflow-hidden bg-border">
      {approved > 0 && <div className="h-full bg-accent" style={{ width: `${aW}%` }} />}
      {skipped > 0 && <div className="h-full bg-white/20" style={{ width: `${sW}%` }} />}
      {ignored > 0 && <div className="h-full bg-white/[0.07]" style={{ width: `${iW}%` }} />}
    </div>
  );
}

function PreferenceCard({ category, stats }) {
  const total = (stats?.approved ?? 0) + (stats?.skipped ?? 0) + (stats?.ignored ?? 0);

  return (
    <div className="border border-border rounded p-5 space-y-4">
      <div className="font-heading text-sm font-bold text-primary truncate">{category}</div>
      <div className="flex gap-6">
        <div>
          <div className="font-mono text-lg text-accent">{stats?.approved ?? 0}</div>
          <div className="font-body text-[11px] text-muted/70 uppercase tracking-wider mt-0.5">Approved</div>
        </div>
        <div>
          <div className="font-mono text-lg text-muted">{stats?.skipped ?? 0}</div>
          <div className="font-body text-[11px] text-muted/70 uppercase tracking-wider mt-0.5">Skipped</div>
        </div>
        <div>
          <div className="font-mono text-lg text-muted/50">{stats?.ignored ?? 0}</div>
          <div className="font-body text-[11px] text-muted/70 uppercase tracking-wider mt-0.5">Ignored</div>
        </div>
      </div>
      <ProportionBar
        approved={stats?.approved ?? 0}
        skipped={stats?.skipped ?? 0}
        ignored={stats?.ignored ?? 0}
      />
      <div className="font-mono text-[11px] text-muted/40">
        {total} {total === 1 ? 'decision' : 'decisions'}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="border border-border rounded p-5 space-y-4">
      <div className="h-4 bg-white/[0.06] rounded w-2/3 animate-pulse" />
      <div className="flex gap-6">
        <div className="space-y-1">
          <div className="h-6 bg-white/[0.06] rounded w-8 animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded w-14 animate-pulse" />
        </div>
        <div className="space-y-1">
          <div className="h-6 bg-white/[0.06] rounded w-8 animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded w-14 animate-pulse" />
        </div>
        <div className="space-y-1">
          <div className="h-6 bg-white/[0.06] rounded w-8 animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded w-14 animate-pulse" />
        </div>
      </div>
      <div className="h-2 bg-white/[0.06] rounded animate-pulse" />
    </div>
  );
}

export default function MemoryPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/api/memory`)
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
        <h2 className="font-heading text-xl font-bold mb-6">Memory</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="font-heading text-xl font-bold mb-6">Memory</h2>
        <div className="border border-border rounded p-10 text-center">
          <div className="font-mono text-accent text-lg mb-3">◆</div>
          <p className="font-body text-muted text-sm mb-1">
            Can't reach the Cypher API — is it running on localhost:8000?
          </p>
          <p className="font-mono text-xs text-muted/60">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const lastUpdated = formatDate(data.last_updated);
  const patterns = data.preference_patterns ?? {};
  const patternEntries = Object.entries(patterns);
  const hasPatterns = patternEntries.length > 0;

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-6">
        <h2 className="font-heading text-xl font-bold text-primary">Memory</h2>
        <span className="font-body text-xs text-muted">
          Last updated: {lastUpdated || 'Never'}
        </span>
      </div>

      {/* Preference Patterns */}
      <div className="mb-8">
        <h3 className="font-heading text-sm font-bold text-primary mb-4 uppercase tracking-wider">
          Preference Patterns
        </h3>
        {hasPatterns ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {patternEntries.map(([category, stats]) => (
              <PreferenceCard key={category} category={category} stats={stats} />
            ))}
          </div>
        ) : (
        <div className="border border-border rounded p-8 md:p-10 text-center">
          <p className="font-body text-muted text-sm">
            Cypher hasn't learned any preferences yet — approve or skip opportunities in Telegram to start building this.
          </p>
          </div>
        )}
      </div>

      {/* Learned Weights */}
      <div className="mb-8">
        <h3 className="font-heading text-sm font-bold text-primary mb-4 uppercase tracking-wider">
          Learned Weights
        </h3>
        <div className="border border-border rounded p-5">
          <p className="font-body text-sm text-muted italic">
            Not yet computed
          </p>
        </div>
      </div>

      {/* Reply Rate by Type */}
      <div>
        <h3 className="font-heading text-sm font-bold text-primary mb-4 uppercase tracking-wider">
          Reply Rate by Type
        </h3>
        <div className="border border-border rounded p-5">
          <p className="font-body text-sm text-muted italic">
            Not yet computed
          </p>
        </div>
      </div>
    </div>
  );
}
