# Cypher — Personal Agentic Job Intelligence System

> Watches. Researches. Drafts. Remembers. Gets smarter.

**Live:** [Dashboard](https://cypher-navy.vercel.app) · [API](https://cypher-rbw6.onrender.com)

Cypher is a multi-agent system that autonomously finds part-time ML/backend
opportunities, researches the people behind them, drafts personalized
outreach, tracks replies, and learns from what I approve or skip — so my
only manual input is reading a Telegram digest and replying `send <n>` or
`skip <n>`.

Named after Valorant's surveillance agent: watches everything, feeds intel,
never forgets.

---

## Architecture

The orchestrator (LangGraph, sequential) runs these steps in order:

1. **Opportunity Scout** (Agent 1) — scrapes and scores job postings
2. For any opportunity scoring 8+, automatically runs:
   - **Founder Researcher** (Agent 2) — finds the founder, researches the company
   - **Outreach Drafter** (Agent 3) — drafts a personalized email
3. **Tech Pulse** (Agent 4) — pulls and filters relevant tech news
4. **Hackathon Scout** (part of Agent 1) — finds eligible open hackathons
5. Compiles everything into one Telegram digest and sends it

Every Telegram approve/skip you send updates `cypher_memory` — a
feedback loop intended to bias future scoring toward what you actually
approve.

**Reply Tracker** (Agent 5) exists as a set of tools — `check_email_inbox`,
`classify_reply`, `send_email` — all built and tested individually, but
not yet wired into the daily orchestrator run.

All state persists in PostgreSQL (Neon). Delivery and interaction happen
entirely through Telegram.

## Agents

| # | Agent | Status | What it does |
|---|-------|--------|---------------|
| 1 | Opportunity Scout | ✅ Working | Scrapes HN "Who is Hiring", batch-scores fit via LLM, dedupes, persists |
| 1b | Hackathon Scout | ✅ Working | Finds open hackathons via Tavily (Devpost/Unstop), batch-classifies eligibility (online, or Bangalore onsite) + stack relevance |
| 2 | Founder Researcher | ✅ Working | Finds founder via Tavily search, researches company, guesses email format |
| 3 | Outreach Drafter | ✅ Working | Drafts personalized cold email from verified profile facts, validates against generic-template language |
| 4 | Tech Pulse | ✅ Working | Pulls HN top stories + AI/India startup news, filters by stack relevance |
| 5 | Reply Tracker | ✅ Working | Checks sent outreach threads for replies via Gmail thread IDs, classifies sentiment/intent, updates DB, sends Telegram alert. Wired into daily orchestrator run. |

## Tech Stack

- **Agent orchestration:** LangGraph (sequential graph, not yet fully agentic tool-calling)
- **LLM:** Groq (`openai/gpt-oss-120b`), batched calls (~15-20 items per call instead of one call per item) to stay within free-tier token limits at production volume
- **Web search:** Tavily API
- **Database:** PostgreSQL (Neon), SQLAlchemy 2.0 ORM, Alembic migrations
- **Delivery/interaction:** Telegram Bot API (digest, draft review, approve/skip listener)
- **Email:** Gmail API (OAuth2, read + send scopes)
- **Scraping:** HN Algolia API (jobs), HN Firebase API (top stories) — no direct HTML scraping/LinkedIn scraping anywhere
- **Scheduling/deployment:** GitHub Actions (cron-triggered daily workflow, no server infrastructure)

## Database Schema

5 tables: `opportunities`, `founders`, `outreach`, `tech_updates`, `cypher_memory`.
Full schema in `db/models.py`. `cypher_memory` is a singleton JSON-based
feedback store — every Telegram approve/skip updates
`preference_patterns`, intended to eventually bias future scoring.

## Current Status

Every agent above has been tested individually against **real data** — real
HN postings, a real founder (LinkedIn profile + company funding data), a
real drafted email, a real Telegram approve flow, a real Gmail send. The
LangGraph orchestrator runs the full sequence end-to-end
(Scout → auto-research/draft for score ≥8 → Tech Pulse → Hackathons →
compiled Telegram digest) and **runs automatically every morning**, no
manual trigger required.

**Known gaps / not yet built:**
- No dashboard yet (planned: React + 21st.dev components, dark theme + neon pink accent, light mode toggle)

## Deployment

Runs automatically every day at **7:00 AM IST** via **GitHub Actions**
(`.github/workflows/daily_run.yml`), triggered on a cron schedule
(`30 1 * * *` UTC). No server, no AWS/Render infrastructure required —
GitHub's hosted runners check out the repo, install dependencies, and
execute the full pipeline, then exit. Secrets (API keys, DB credentials,
tokens) are stored in the repo's encrypted Actions secrets vault, never
committed to `.env` or version control.

Can also be triggered manually via the Actions tab (`workflow_dispatch`)
for on-demand runs or testing.

## Setup

1. Clone the repo, `pip install -r requirements.txt`
2. Copy `.env.example` to `.env`, fill in: `GROQ_API_KEY`, `TAVILY_API_KEY`,
   `DATABASE_URL` (Neon Postgres), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
   `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
3. `python -c "from db.models import init_db; init_db()"` to create tables
4. `python -c "from orchestrator import run_daily_pipeline; run_daily_pipeline()"` to run once manually
5. For automated daily runs: add the same secrets to GitHub repo Settings →
   Secrets and variables → Actions, then the existing workflow handles the rest

## Testing

```powershell
python -m pytest tests/ -v
```

A small regression suite covering real bugs found during development
(not coverage padding) — malformed LLM response handling, email-guess
title-stripping, and the SQLAlchemy shallow-copy dirty-check bug that
silently capped the feedback loop at one update per category.

## Author

Mohammad Adnan Shakil — [GitHub](https://github.com/Mohammad-Adnan-Shakil) · [Portfolio](https://portfolio-p2jh.vercel.app)
