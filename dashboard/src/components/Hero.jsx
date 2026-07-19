import { useEffect } from 'react';
import GenerativeArtScene from './GenerativeArtScene';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Architecture', href: '#architecture' },
  { label: 'Agents', href: '#agents' },
  { label: 'GitHub', href: 'https://github.com/Mohammad-Adnan-Shakil/Cypher', external: true },
];

const TECH_BADGES = ['LangGraph', 'Groq', 'PostgreSQL', 'Gmail API', 'Telegram'];

const WORDS = ['Watches.', 'Researches.', 'Drafts.', 'Remembers.', 'Gets', 'smarter.'];

export default function Hero() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="relative min-h-screen bg-surface text-primary overflow-hidden">
      <GenerativeArtScene />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, rgba(10,10,15,0.3) 15%, rgba(10,10,15,0.88) 75%)',
        }}
      />

      <header className="relative z-20">
        <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 font-heading text-lg tracking-[0.2em]">
            <span className="text-accent text-xl leading-none">•</span>
            <span className="text-primary">CYPHER</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-body text-sm text-muted hover:text-primary transition-colors"
                {...(link.external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>
      </header>

      <section className="relative z-20 flex flex-col items-center justify-center px-4 sm:px-6 pt-14 sm:pt-20 pb-20 sm:pb-32 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-heading text-[clamp(1.75rem,4.5vw,5rem)] leading-[1.1] font-bold mb-5">
            {WORDS.map((word, i) => (
              <span
                key={word}
                className="inline-block animate-word"
                style={{ animationDelay: `${i * 0.18}s`, opacity: 0 }}
              >
                {i > 0 ? '\u00A0' : ''}{word}
              </span>
            ))}
          </h1>

          <p className="font-body text-muted text-[clamp(1rem,1.6vw,1.25rem)] max-w-2xl mx-auto mb-10 leading-relaxed">
            A multi-agent system that watches job boards, researches founders, drafts outreach, and gets smarter from what I approve.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <a
              href="https://github.com/Mohammad-Adnan-Shakil/Cypher"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 font-body text-sm font-medium bg-accent text-white hover:opacity-90 transition-opacity"
            >
              View on GitHub
            </a>
            <a
              href="#architecture"
              className="inline-flex items-center gap-2 px-6 py-3 font-body text-sm font-medium text-primary border border-border hover:bg-border/30 transition-colors"
            >
              See how it works
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {TECH_BADGES.map((badge) => (
              <span
                key={badge}
                className="font-mono text-xs tracking-wide px-3 py-1.5 text-muted border border-border"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
