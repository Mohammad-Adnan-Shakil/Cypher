import { useState, useEffect } from 'react';

const API_BASE = 'https://cypher-rbw6.onrender.com';

function SkeletonBar() {
  return (
    <div className="h-3 bg-white/[0.06] rounded animate-pulse" />
  );
}

function SkeletonCard({ className }) {
  return (
    <div className={`border border-border rounded p-6 ${className || ''}`}>
      <SkeletonBar />
      <div className="h-7 bg-white/[0.06] rounded w-1/2 mt-3 animate-pulse" />
      <div className="h-3 bg-white/[0.04] rounded w-1/4 mt-2 animate-pulse" />
    </div>
  );
}

function StatCard({ title, value, subtitle, mono, className }) {
  return (
    <div className={`border border-border rounded p-6 ${className || ''}`}>
      <div className="font-body text-xs text-muted uppercase tracking-wider mb-2">{title}</div>
      <div className={`${mono !== false ? 'font-mono' : 'font-heading'} text-3xl text-primary leading-tight`}>
        {value}
      </div>
      {subtitle && (
        <div className="font-mono text-xs text-muted mt-1.5">{subtitle}</div>
      )}
    </div>
  );
}

function SourceBar({ name, count, maxCount }) {
  const width = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="font-body text-sm text-primary w-36 flex-shrink-0 truncate">{name}</span>
      <div className="flex-1 h-5 bg-white/[0.06] rounded-sm overflow-hidden">
        <div
          className="h-full bg-accent/60 rounded-sm transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="font-mono text-sm text-muted w-10 text-right flex-shrink-0">{count}</span>
    </div>
  );
}

export default function StatsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

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

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div>
        <h2 className="font-heading text-xl font-bold mb-6">Stats</h2>
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
      <div>
        <h2 className="font-heading text-xl font-bold mb-6">Stats</h2>
        <div className="border border-border rounded p-8 md:p-10 text-center">
          <div className="font-mono text-accent text-lg mb-3">◈</div>
          <p className="font-body text-muted text-sm mb-1">
            Can't reach the Cypher API — is it running on localhost:8000?
          </p>
          <p className="font-mono text-xs text-muted/60">{error}</p>
        </div>
      </div>
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
    <div>
      <h2 className="font-heading text-xl font-bold mb-6">Stats</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Opportunities"
          value={data.total_opportunities?.toLocaleString() ?? '—'}
          className="sm:col-span-2"
        />

        <StatCard
          title="Emails Sent"
          value={data.emails_sent?.toLocaleString() ?? '—'}
        />

        <StatCard
          title="Reply Rate"
          value={`${replyRate}%`}
          subtitle={`${data.emails_replied ?? 0} replied of ${data.emails_sent ?? 0} sent`}
        />

        <StatCard
          title="This Week"
          value={data.opportunities_this_week?.toLocaleString() ?? '—'}
        />

        <StatCard
          title="This Month"
          value={data.opportunities_this_month?.toLocaleString() ?? '—'}
        />

        <StatCard
          title="Avg Fit Score"
          value={data.average_fit_score != null ? `${data.average_fit_score.toFixed(1)} / 10` : '—'}
          mono={false}
        />
      </div>

      {sourceEntries.length > 0 ? (
        <div className="border border-border rounded p-5 mt-6">
          <h3 className="font-heading text-sm font-bold text-primary mb-5 uppercase tracking-wider">
            Opportunities by Source
          </h3>
          <div className="flex flex-col gap-3">
            {sourceEntries.map(([name, count]) => (
              <SourceBar
                key={name}
                name={name.charAt(0).toUpperCase() + name.slice(1)}
                count={count}
                maxCount={maxSourceCount}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-border rounded p-5 mt-6">
          <h3 className="font-heading text-sm font-bold text-primary mb-5 uppercase tracking-wider">
            Opportunities by Source
          </h3>
          <p className="font-body text-sm text-muted">No data yet.</p>
        </div>
      )}
    </div>
  );
}
