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


def find_email_format(company_domain: str) -> dict:
    """
    Searches for the likely email format used at a company
    (e.g. first.last@domain.com vs firstinitial+last@domain.com).
    This is a best-effort guess — email_confidence should reflect
    that this is inferred, not verified.
    """
    results = web_search(f'"{company_domain}" email format contact', max_results=3)

    # Common pattern: firstname.lastname@domain, first initial + lastname@domain
    combined = " ".join(r.get("content", "") for r in results)
    pattern_match = re.search(
        r"[a-z]+\.[a-z]+@" + re.escape(company_domain),
        combined,
        re.IGNORECASE,
    )

    if pattern_match:
        return {
            "likely_format": "first.last@domain",
            "example_found": pattern_match.group(0),
            "confidence": 0.6,
        }

    return {
        "likely_format": "first.last@domain",  # most common default fallback
        "example_found": None,
        "confidence": 0.2,
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