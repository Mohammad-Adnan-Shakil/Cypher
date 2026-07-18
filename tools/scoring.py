from datetime import datetime, timezone
"""
Opportunity Scout's scoring tool â€” uses Groq to rate how well a
scraped posting fits Adnan's target profile, returning a 1-10
fit_score and reasoning.

MODEL NOTE: Groq deprecated llama-3.3-70b-versatile on June 17, 2026.
Using openai/gpt-oss-120b (current recommended replacement) instead â€”
if this stops working, check https://console.groq.com/docs/deprecations
before assuming it's a bug in this code.

TODO: once tools/profile.py exists (Phase 5, Step 18), replace the
hardcoded CANDIDATE_PROFILE below with a call to get_my_profile().
"""
import json

import httpx

from config import settings

GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "openai/gpt-oss-120b"

import time


_last_call_time = [0.0]
MIN_CALL_INTERVAL = 3.0  # seconds -- keeps us safely under Groq free tier's 30 RPM / 8K TPM


def _call_groq(payload: dict, max_retries: int = 3) -> dict:
    """
    Wraps Groq API calls with retry-on-429 (rate limit) logic.
    Free tier hits rate limits under bursty usage (e.g. scoring many
    hackathons/opportunities back-to-back) - without this, the
    orchestrator (Phase 9) would crash mid-run on a transient limit
    instead of just waiting a moment and continuing.
    """
    elapsed = time.time() - _last_call_time[0]
    if elapsed < MIN_CALL_INTERVAL:
        time.sleep(MIN_CALL_INTERVAL - elapsed)
    _last_call_time[0] = time.time()

    for attempt in range(max_retries):
        resp = httpx.post(
            GROQ_ENDPOINT,
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            json=payload,
            timeout=30,
        )
        if resp.status_code == 429:
            wait = 2 ** attempt * 5
            print(f"Groq rate limited, waiting {wait}s (attempt {attempt + 1}/{max_retries})...")
            print(f"  Response body: {resp.text[:400]}")
            time.sleep(wait)
            continue
        resp.raise_for_status()
        return resp.json()

    raise RuntimeError(f"Groq rate limit exceeded after {max_retries} retries")


CANDIDATE_PROFILE = (
    "2nd-year CSE student targeting part-time ML/Backend roles at AI "
    "startups, remote or Bengaluru. NOT senior/staff/3+yr roles. "
    "Stack: Python, FastAPI, Java/Spring Boot, AWS Lambda, PostgreSQL, "
    "XGBoost, LangGraph, Google ADK, React."
)

SYSTEM_PROMPT = f"""You are scoring job postings for fit against this candidate profile:
{CANDIDATE_PROFILE}

Score each posting 1-10 on fit_score:
- 8-10: Strong fit â€” part-time/intern/contract friendly, AI/ML/backend focus, matches stack, remote or Bengaluru
- 5-7: Moderate fit â€” some overlap but wrong seniority, wrong stack, or unclear part-time availability
- 1-4: Poor fit â€” full-time only requiring years of experience, unrelated domain, or senior/staff level

Respond with ONLY valid JSON, no other text, no markdown formatting:
{{"fit_score": <int 1-10>, "fit_reasoning": "<one sentence, max 25 words>"}}
"""


def score_opportunity(opportunity: dict, memory_patterns: dict | None = None) -> dict:
    """
    Scores a single scraped opportunity dict (from search_hackernews_jobs()
    or similar). Returns {"fit_score": int, "fit_reasoning": str}.

    memory_patterns (optional): cypher_memory.preference_patterns dict,
    passed in later once the feedback loop is wired into scoring â€”
    not used yet, accepted now so the signature doesn't need to change
    when Step 13 (feedback loop -> scoring) is built.
    """
    posting_text = (
        f"Company: {opportunity.get('company') or 'unknown'}\n"
        f"Role: {opportunity.get('role_type') or 'unknown'}\n"
        f"Description: {opportunity.get('description', '')[:1500]}"
    )

    result = _call_groq({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": posting_text},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
    })
    raw_content = result["choices"][0]["message"]["content"]

    try:
        parsed = json.loads(raw_content)
        if not isinstance(parsed, dict) or "fit_score" not in parsed:
            raise ValueError(f"Response wasn't a valid score dict: {raw_content[:200]}")
        return {
            "fit_score": int(parsed["fit_score"]),
            "fit_reasoning": str(parsed["fit_reasoning"])[:500],
        }
    except (json.JSONDecodeError, KeyError, ValueError, TypeError) as e:
        # Fail loud but don't crash the whole scoring batch â€” caller
        # (Opportunity Scout agent) should skip/retry on None.
        print(f"Scoring parse failed: {e} | raw: {raw_content[:200]}")
        return {"fit_score": None, "fit_reasoning": f"Parse error: {e}"}
    
def summarize_and_filter(items: list[dict], stack_context: str) -> list[dict]:
    """
    Takes raw news/story items (from HN top stories or Tavily search)
    and returns each with a relevance_score (1-10) against the
    candidate's tech stack, plus a 3-bullet summary. Filters out
    items scoring below 4 automatically â€” no point cluttering the
    digest with irrelevant news.
    """
    results = []

    for item in items:
        title = item.get("title", "")
        content = item.get("content") or item.get("url", "")

        result = _call_groq({
            "model": MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        f"Rate this tech news item's relevance (1-10) to someone "
                        f"working with: {stack_context}. Respond ONLY with JSON: "
                        '{"relevance_score": <int>, "summary": "<max 3 short bullet points, '
                        'joined by newlines>"}'
                    ),
                },
                {"role": "user", "content": f"Title: {title}\nContent: {content[:500]}"},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        })
        raw = result["choices"][0]["message"]["content"]

        try:
            parsed = json.loads(raw)
            score = int(parsed["relevance_score"])
            if score >= 4:
                results.append({
                    "title": title,
                    "url": item.get("url", ""),
                    "relevance_score": score,
                    "summary": parsed["summary"],
                })
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            print(f"Tech Pulse summarize parse failed: {e}")
            continue

    return results

def classify_hackathon(title: str, content: str, stack_context: str) -> dict:
    """
    Replaces naive keyword matching (which missed cases like
    "participants from any location are welcome" not containing the
    literal word "online") with LLM judgment against the full page
    content. Also filters out hackathons whose deadline has passed â€”
    search results include expired events with no built-in filtering.

    Adnan's rule: online hackathons are always eligible; onsite ones
    are only eligible if held in Bangalore/Bengaluru.
    """
    result = _call_groq({
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
                    "eligible=true ONLY if the city is Bangalore or Bengaluru, India - otherwise false. "
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
    })
    raw = result["choices"][0]["message"]["content"]

    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, dict) or "eligible" not in parsed:
            raise ValueError(f"Response wasn't a valid verdict dict: {raw[:200]}")
        return parsed
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Hackathon classify parse failed: {e}")
        return {"eligible": False, "reason": f"parse error: {e}", "stack_relevance_score": 0, "deadline_found": None}

def score_opportunities_batch(opportunities: list[dict], batch_size: int = 15) -> list[dict]:
    """
    Batched version of score_opportunity() -- scores multiple postings
    per LLM call instead of one call per posting. Cuts both request
    count and redundant system-prompt token overhead by ~batch_size x.

    Built after hitting Groq's free-tier daily token ceiling (200K TPD)
    during testing -- 219 sequential single-posting calls was the root
    cause, not a provider limitation. This is the actual fix.

    Returns list of {"fit_score": int|None, "fit_reasoning": str},
    same order and length as input -- failed items get fit_score=None
    so the caller's existing None-check logic still works unchanged.

    NOTE: no response_format json_object here -- Groq's structured
    output mode requires a top-level JSON object, not an array, so
    the array response is parsed manually with defensive markdown-fence
    stripping instead.
    """
    all_results = []

    for i in range(0, len(opportunities), batch_size):
        batch = opportunities[i:i + batch_size]

        postings_text = "\n\n".join(
            f"[{idx}] Company: {opp.get('company') or 'unknown'}\n"
            f"Role: {opp.get('role_type') or 'unknown'}\n"
            f"Description: {opp.get('description', '')[:800]}"
            for idx, opp in enumerate(batch)
        )

        batch_prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            f"Score EACH of the following {len(batch)} postings (indexed [0] to [{len(batch)-1}]). "
            f"Respond with ONLY a JSON array, same length and order as input, no other text, no markdown:\n"
            f'[{{"fit_score": <int>, "fit_reasoning": "<reason>"}}, ...]'
        )

        try:
            result = _call_groq({
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": batch_prompt},
                    {"role": "user", "content": postings_text},
                ],
                "temperature": 0.2,
            })
        except RuntimeError as e:
            print(f"Batch scoring failed entirely for batch starting at {i}: {e}")
            all_results.extend([{"fit_score": None, "fit_reasoning": f"Batch call failed: {e}"}] * len(batch))
            continue

        raw = result["choices"][0]["message"]["content"]

        try:
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("```")[1]
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:]
            parsed = json.loads(cleaned)

            if not isinstance(parsed, list) or len(parsed) != len(batch):
                raise ValueError(f"Expected list of {len(batch)}, got {type(parsed)} len={len(parsed) if isinstance(parsed, list) else 'n/a'}")

            for item in parsed:
                all_results.append({
                    "fit_score": int(item["fit_score"]),
                    "fit_reasoning": str(item["fit_reasoning"])[:500],
                })
        except (json.JSONDecodeError, KeyError, ValueError, TypeError) as e:
            print(f"Batch parse failed for batch starting at {i}: {e} | raw: {raw[:300]}")
            all_results.extend([{"fit_score": None, "fit_reasoning": f"Batch parse error: {e}"}] * len(batch))

    return all_results