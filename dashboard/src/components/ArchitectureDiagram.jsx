export default function ArchitectureDiagram({ className = '' }) {
  return (
    <svg width="100%" viewBox="0 0 680 504" className={className} role="img" xmlns="http://www.w3.org/2000/svg">
      <title>Cypher daily pipeline architecture</title>
      <desc>A five-step sequential flow: Reply Tracker checks overnight replies, Opportunity Scout scrapes and scores postings, Auto research and draft triggers for opportunities scoring 8 or higher, Tech Pulse and Hackathons gather data in parallel, and finally everything compiles into one Telegram digest.</desc>

      <defs>
        <marker id="a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="var(--color-muted, #a0a0a8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      {/* Connecting arrows */}
      <line x1="340" y1="96" x2="340" y2="128" stroke="var(--color-muted, #a0a0a8)" strokeWidth="1.5" markerEnd="url(#a)" />
      <line x1="340" y1="188" x2="340" y2="220" stroke="var(--color-muted, #a0a0a8)" strokeWidth="1.5" markerEnd="url(#a)" />
      <line x1="340" y1="280" x2="340" y2="312" stroke="var(--color-muted, #a0a0a8)" strokeWidth="1.5" markerEnd="url(#a)" />
      <line x1="340" y1="372" x2="340" y2="404" stroke="var(--color-muted, #a0a0a8)" strokeWidth="1.5" markerEnd="url(#a)" />

      {/* Box 1 — Reply Tracker */}
      <rect x="210" y="40" width="260" height="56" rx="6" fill="var(--color-surface, #0a0a0f)" stroke="var(--color-border, rgba(255,255,255,0.1))" strokeWidth="1" />
      <text x="340" y="62" textAnchor="middle" fill="var(--color-primary, #f0f0f0)" fontFamily="Space Grotesk, sans-serif" fontSize="14" fontWeight="700">Reply Tracker</text>
      <text x="340" y="80" textAnchor="middle" fill="var(--color-muted, #a0a0a8)" fontFamily="Inter, sans-serif" fontSize="12">Checks overnight replies via Gmail API</text>

      {/* Box 2 — Opportunity Scout */}
      <rect x="210" y="132" width="260" height="56" rx="6" fill="var(--color-surface, #0a0a0f)" stroke="var(--color-border, rgba(255,255,255,0.1))" strokeWidth="1" />
      <text x="340" y="154" textAnchor="middle" fill="var(--color-primary, #f0f0f0)" fontFamily="Space Grotesk, sans-serif" fontSize="14" fontWeight="700">Opportunity Scout</text>
      <text x="340" y="172" textAnchor="middle" fill="var(--color-muted, #a0a0a8)" fontFamily="Inter, sans-serif" fontSize="12">Scrapes HN hiring threads, batch-scores via LLM</text>

      {/* Box 3 — Auto research + draft (accent) */}
      <rect x="210" y="224" width="260" height="56" rx="6" fill="rgba(255,45,120,0.08)" stroke="rgba(255,45,120,0.25)" strokeWidth="1" strokeDasharray="4 3" />
      <text x="340" y="246" textAnchor="middle" fill="var(--color-accent, #ff2d78)" fontFamily="Space Grotesk, sans-serif" fontSize="14" fontWeight="700">Auto Research &amp; Draft</text>
      <text x="340" y="264" textAnchor="middle" fill="var(--color-accent, #ff2d78)" fontFamily="Inter, sans-serif" fontSize="12" opacity="0.7">Triggers for opportunities scoring 8+</text>

      {/* Box 4 — Tech Pulse + Hackathons */}
      <rect x="210" y="316" width="260" height="56" rx="6" fill="var(--color-surface, #0a0a0f)" stroke="var(--color-border, rgba(255,255,255,0.1))" strokeWidth="1" />
      <text x="340" y="338" textAnchor="middle" fill="var(--color-primary, #f0f0f0)" fontFamily="Space Grotesk, sans-serif" fontSize="14" fontWeight="700">Tech Pulse &amp; Hackathon Scout</text>
      <text x="340" y="356" textAnchor="middle" fill="var(--color-muted, #a0a0a8)" fontFamily="Inter, sans-serif" fontSize="12">Pull news and open events in parallel</text>

      {/* Box 5 — Compile + send */}
      <rect x="210" y="408" width="260" height="56" rx="6" fill="var(--color-surface, #0a0a0f)" stroke="var(--color-border, rgba(255,255,255,0.1))" strokeWidth="1" />
      <text x="340" y="430" textAnchor="middle" fill="var(--color-primary, #f0f0f0)" fontFamily="Space Grotesk, sans-serif" fontSize="14" fontWeight="700">Compile &amp; Send</text>
      <text x="340" y="448" textAnchor="middle" fill="var(--color-muted, #a0a0a8)" fontFamily="Inter, sans-serif" fontSize="12">Bundles everything into one Telegram digest</text>
    </svg>
  );
}
