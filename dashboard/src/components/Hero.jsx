import { useEffect } from 'react';
import GenerativeArtScene from './GenerativeArtScene';
import LogoMark from './LogoMark';
import ArchitectureDiagram from './ArchitectureDiagram';

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
    <>
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
            <LogoMark size={22} />
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

    <section id="architecture" className="bg-surface text-primary border-t border-border py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-heading text-3xl font-bold mb-14">How it works</h2>

        <ArchitectureDiagram className="mb-8" />

        <p className="font-body text-sm text-muted/60 mt-12 border-t border-border pt-6">
          Runs automatically every morning via GitHub Actions — no manual trigger needed.
        </p>
      </div>
    </section>

    <section id="agents" className="bg-surface text-primary border-t border-border py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-heading text-3xl font-bold mb-14">The agents</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { num: '1', name: 'Opportunity Scout', desc: 'Scrapes HN\'s hiring threads, scores fit via LLM, dedupes, persists' },
            { num: '2', name: 'Founder Researcher', desc: 'Finds the founder, researches the company, guesses email format' },
            { num: '3', name: 'Outreach Drafter', desc: 'Writes a personalized cold email from verified profile facts' },
            { num: '4', name: 'Tech Pulse', desc: 'Pulls relevant tech news filtered against my stack' },
            { num: '5', name: 'Reply Tracker', desc: 'Checks sent outreach threads, classifies replies, alerts via Telegram' },
          ].map((agent) => (
            <div key={agent.num} className="border border-border rounded p-5 flex flex-col gap-2 relative">
              <span className="font-mono text-[11px] text-accent tracking-widest self-end">AGENT {agent.num}</span>
              <h3 className="font-heading text-sm font-bold text-primary">{agent.name}</h3>
              <p className="font-body text-sm text-muted leading-relaxed">{agent.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
    </>
  );
}
