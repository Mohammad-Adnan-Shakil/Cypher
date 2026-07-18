"""
Opportunity Scout's scraper tools.

HN "Who is Hiring" mechanics:
  1. Find the current month's "Ask HN: Who is hiring?" story via
     search_by_date on tag=story.
  2. Fetch its comments via search_by_date on tags=comment,story_<id>.
  3. Top-level job postings are comments where parent_id == the
     thread's own objectID (nested replies/discussion have a
     different parent_id and are excluded).
  4. comment_text is HTML-escaped with <p> tags for paragraphs and
     <a href> for links — strip before parsing.

No API key needed. Rate limit is generous (10k req/hr).
"""
from datetime import datetime, timezone

import httpx
from bs4 import BeautifulSoup

ALGOLIA_BASE = "https://hn.algolia.com/api/v1"

RELEVANT_KEYWORDS = [
    "part-time", "part time", "contract", "intern", "internship",
    "remote", "ml engineer", "machine learning", "backend", "ai engineer",
    "python", "fastapi", "langchain", "llm",
]


def _strip_html(raw: str) -> str:
    """HN comment_text is HTML — convert to plain text, preserve paragraph breaks."""
    soup = BeautifulSoup(raw.replace("<p>", "\n\n"), "html.parser")
    return soup.get_text().strip()


def find_hiring_thread(client: httpx.Client) -> dict | None:
    """
    Finds the most recent 'Ask HN: Who is hiring?' story.
    Filtered by author (the 'whoishiring' bot account posts these
    threads every month) rather than text search — text search on
    "who is hiring" gets buried by unrelated recent stories that
    happen to share those words, since the actual thread can be
    weeks old by the time we query it.
    """
    resp = client.get(
        f"{ALGOLIA_BASE}/search_by_date",
        params={"tags": "story,author_whoishiring", "hitsPerPage": 5},
        timeout=15,
    )
    resp.raise_for_status()
    hits = resp.json().get("hits", [])

    for hit in hits:
        title = hit.get("title", "")
        if title.startswith("Ask HN: Who is hiring?"):
            return {
                "objectID": hit["objectID"],
                "title": title,
                "created_at": hit.get("created_at"),
            }
    return None

def fetch_hiring_thread_comments(client: httpx.Client, thread_id: str) -> list[dict]:
    """Fetches all top-level comments (job postings) from a hiring thread."""
    resp = client.get(
        f"{ALGOLIA_BASE}/search_by_date",
        params={"tags": f"comment,story_{thread_id}", "hitsPerPage": 1000},
        timeout=20,
    )
    resp.raise_for_status()
    hits = resp.json().get("hits", [])

    top_level = [h for h in hits if str(h.get("parent_id")) == str(thread_id)]
    return top_level


def _parse_posting(comment_text_plain: str) -> dict:
    """
    Heuristic parse of a job posting. First line is conventionally
    'Company | Location | Role | Remote/Onsite' but format isn't enforced.
    """
    first_line = comment_text_plain.split("\n")[0].strip()
    parts = [p.strip() for p in first_line.split("|")]

    company = parts[0] if parts else None
    role_type = parts[2] if len(parts) > 2 else None

    return {
        "company": company[:200] if company else None,
        "role_type": role_type[:100] if role_type else None,
        "description": comment_text_plain[:3000],
    }


def search_hackernews_jobs(keywords: list[str] | None = None) -> list[dict]:
    """
    Main entry point for Agent 1 (Opportunity Scout).
    Returns list of: {source, title, company, role_type, description, url, found_at}
    """
    keywords = keywords or RELEVANT_KEYWORDS
    results = []

    with httpx.Client(headers={"User-Agent": "Cypher/1.0 (personal job agent)"}) as client:
        thread = find_hiring_thread(client)
        if thread is None:
            return results

        comments = fetch_hiring_thread_comments(client, thread["objectID"])

        for c in comments:
            raw_text = c.get("comment_text") or ""
            if not raw_text:
                continue

            plain = _strip_html(raw_text)
            lower = plain.lower()

            if not any(kw in lower for kw in keywords):
                continue

            parsed = _parse_posting(plain)
            results.append({
                "source": "hackernews",
                "title": parsed["role_type"] or thread["title"][:300],
                "company": parsed["company"],
                "role_type": parsed["role_type"],
                "description": parsed["description"],
                "url": f"https://news.ycombinator.com/item?id={c['objectID']}",
                "found_at": datetime.now(timezone.utc),
            })

    return results

def fetch_hackernews_top(limit: int = 10) -> list[dict]:
    """
    Fetches current top stories from HN's front page (not job postings —
    general tech news). Uses HN's Firebase API, separate from the
    Algolia search used for the hiring thread.
    """
    with httpx.Client(headers={"User-Agent": "Cypher/1.0"}) as client:
        ids_resp = client.get("https://hacker-news.firebaseio.com/v0/topstories.json", timeout=15)
        ids_resp.raise_for_status()
        top_ids = ids_resp.json()[:limit]

        stories = []
        for story_id in top_ids:
            story_resp = client.get(
                f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json", timeout=10
            )
            story_resp.raise_for_status()
            item = story_resp.json()
            if item and item.get("type") == "story":
                stories.append({
                    "title": item.get("title", ""),
                    "url": item.get("url", f"https://news.ycombinator.com/item?id={story_id}"),
                    "score": item.get("score", 0),
                    "hn_id": story_id,
                })

        return stories