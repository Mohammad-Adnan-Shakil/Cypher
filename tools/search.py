"""
Tavily-based web search tools for Founder Researcher (Agent 2) and
Tech Pulse (Agent 4).

Tavily is a search API built for LLM agents — results come back as
clean summarized snippets (not raw HTML), which is why we use it
instead of scraping search engines directly. This also satisfies the
"no direct LinkedIn scraping" rule: Tavily indexes/summarizes,
we never fetch linkedin.com ourselves.
"""
import re

from tavily import TavilyClient

from config import settings

_client = TavilyClient(api_key=settings.tavily_api_key)


def web_search(query: str, max_results: int = 5) -> list[dict]:
    """Raw Tavily search — returns list of {title, url, content} dicts."""
    response = _client.search(query=query, max_results=max_results)
    return response.get("results", [])


def find_founder(company: str) -> dict | None:
    """
    Searches for the founder/CEO of a company. Returns the best-guess
    candidate with name + LinkedIn URL, or None if nothing usable found.

    Heuristic: look for LinkedIn profile URLs in results, since those
    reliably indicate an actual person (vs. a news article mentioning
    the company generically).
    """
    results = web_search(f"{company} founder CEO", max_results=5)

    for r in results:
        if "linkedin.com/in/" in r.get("url", ""):
            # Title is usually "Name - Title - Company | LinkedIn"
            name = r["title"].split(" - ")[0].split(" | ")[0].strip()
            return {
                "name": name,
                "linkedin_url": r["url"],
                "source_snippet": r.get("content", "")[:300],
            }

    return None


def get_company_info(company: str) -> dict:
    """
    Searches for company stage, funding, and tech stack signals.
    Returns raw text findings — parsing into structured fields happens
    via LLM later if needed; for now this is descriptive, not exact.
    """
    results = web_search(f"{company} startup funding stage tech stack", max_results=4)

    combined_content = "\n\n".join(
        f"[{r['title']}]: {r.get('content', '')[:300]}" for r in results
    )

    return {
        "company": company,
        "raw_findings": combined_content,
        "sources": [r["url"] for r in results],
    }


def find_verified_email(founder_name: str, company: str, company_domain: str) -> dict:
    """
    Attempts to find a real email address for a founder via targeted
    Tavily searches, rather than just guessing a format blindly.

    Tries multiple search angles (direct email search, contact page,
    press releases which often list founder emails) and has an LLM
    read the actual results to extract a real address if one is
    publicly listed. Falls back to a format guess only if nothing
    real is found -- and marks that clearly via confidence score.

    Returns {"email": str|None, "confidence": float, "source": str,
    "method": "found"|"guessed"|"none"}
    """
    # Try a few different angles -- founders' emails often surface in
    # press coverage, "contact us" pages, or conference speaker bios
    # rather than a single obvious search.
    queries = [
        f'"{founder_name}" "{company}" email contact',
        f"{company} founder contact email press",
        f"{founder_name} {company_domain} email",
    ]

    all_results = []
    for q in queries:
        all_results.extend(web_search(q, max_results=3))

    combined_content = "\n\n".join(
        f"[{r['title']}]: {r.get('content', '')[:400]}" for r in all_results
    )

    return _extract_email_from_content(founder_name, company_domain, combined_content)


def _extract_email_from_content(founder_name: str, company_domain: str, content: str) -> dict:
    """LLM reads search result content and extracts a real email if genuinely present."""
    import json
    import httpx
    from config import settings

    resp = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {settings.groq_api_key}"},
        json={
            "model": "openai/gpt-oss-120b",
            "messages": [
                {
                    "role": "system",
                    "content": (
                        f"Search for a real, explicitly stated email address for "
                        f"'{founder_name}' at domain '{company_domain}' in the content below. "
                        "Only extract an email if it is LITERALLY written in the text -- "
                        "do not invent or guess one. Respond ONLY with JSON: "
                        '{"email": "<found email or null>", "found_explicitly": bool}'
                    ),
                },
                {"role": "user", "content": content[:3000]},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.0,
        },
        timeout=30,
    )
    resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"]

    try:
        parsed = json.loads(raw)
        if parsed.get("found_explicitly") and parsed.get("email"):
            return {
                "email": parsed["email"],
                "confidence": 0.85,
                "method": "found",
            }
    except (json.JSONDecodeError, KeyError):
        pass

    # Nothing real found -- fall back to a format guess, honestly
    # labeled as low-confidence since it's unverified.
    TITLES = {"dr", "dr.", "mr", "mr.", "mrs", "mrs.", "ms", "ms.", "prof", "prof."}
    name_parts = [p for p in founder_name.split() if p.lower().strip(".") not in TITLES] if founder_name else []

    first_name = name_parts[0].lower().strip(".") if name_parts else "unknown"
    last_name = name_parts[-1].lower().strip(".") if len(name_parts) > 1 else ""
    guessed = f"{first_name}.{last_name}@{company_domain}" if last_name else None

    return {
        "email": guessed,
        "confidence": 0.15,
        "method": "guessed",
    }

def search_ai_news(max_results: int = 5) -> list[dict]:
    """AI/ML news search — general industry pulse."""
    return web_search("latest AI ML news this week", max_results=max_results)


def search_india_startup_news(max_results: int = 5) -> list[dict]:
    """India startup ecosystem news — relevant to Bengaluru-based opportunities."""
    return web_search("India startup funding news this week", max_results=max_results)

def search_hackathons(max_results: int = 8) -> list[dict]:
    """
    Searches for individual hackathon event pages, biased toward
    currently-open events. Generic "hackathon 2026" queries surface
    mostly already-completed hackathons (verified empirically — first
    attempt returned 8/8 expired events). Adding "open registration"
    and "August 2026" (next month from whenever this runs) biases
    results toward genuinely upcoming events.
    """
    from datetime import datetime, timezone
    current_month_year = datetime.now(timezone.utc).strftime("%B %Y")

    response = _client.search(
        query=f"hackathon open registration accepting submissions {current_month_year}",
        max_results=max_results,
        include_domains=["devpost.com", "unstop.com"],
        include_raw_content=True,
    )
    return response.get("results", [])


def classify_hackathon(title: str, content: str, stack_context: str) -> dict:
    """
    Replaces naive keyword matching (which missed cases like
    "participants from any location are welcome" not containing the
    literal word "online") with LLM judgment against the full page
    content. Also filters out hackathons whose deadline has passed —
    search results include expired events with no built-in filtering.

    Adnan's rule: online hackathons are always eligible; onsite ones
    are only eligible if held in Bangalore/Bengaluru.
    """
    resp = httpx.post(
        GROQ_ENDPOINT,
        headers={"Authorization": f"Bearer {settings.groq_api_key}"},
        json={
            "model": MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        f"Today's date is {datetime.now(timezone.utc).strftime('%B %d, %Y')}. "
                        f"Evaluate this hackathon for a candidate with this stack: {stack_context}. "
                        "Rules: (1) if the deadline/submission date has already passed relative to "
                        "today, eligible=false, reason='expired'. (2) if it's online/virtual/remote "
                        "or open to any location, eligible=true. (3) if it's in-person/onsite, "
                        "eligible=true ONLY if the city is Bangalore or Bengaluru, India — otherwise false. "
                        "(4) also give a stack_relevance_score 1-10 for how well it matches the candidate's "
                        "tech stack. Respond ONLY with JSON: "
                        '{"eligible": bool, "reason": "<short phrase>", "stack_relevance_score": <int 1-10>, '
                        '"deadline_found": "<date or null>"}'
                    ),
                },
                {"role": "user", "content": f"Title: {title}\n\nContent: {content[:3000]}"},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
        },
        timeout=30,
    )
    resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"]

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"Hackathon classify parse failed: {e}")
        return {"eligible": False, "reason": f"parse error: {e}", "stack_relevance_score": 0, "deadline_found": None}