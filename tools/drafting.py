"""
Outreach Drafter's email-writing tool.

Takes an Opportunity + Founder pair and writes a personalized cold
email using Adnan's verified profile facts. Explicitly instructed to
avoid generic template language — validate_email() (next) checks for
this before the draft is saved.
"""
import httpx

from config import settings
from tools.profile import get_profile_summary_text

GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "openai/gpt-oss-120b"

SYSTEM_PROMPT = f"""You are writing a cold outreach email on behalf of this candidate:

{get_profile_summary_text()}

Rules:
- Address the founder by name if given.
- Reference something SPECIFIC about their company (from the research
  notes provided) — not generic flattery like "I love what you're building".
- Mention 1-2 of the candidate's projects that are MOST relevant to
  what this specific company does — not all four every time.
- Keep it under 150 words. No corporate buzzwords ("synergy", "passionate",
  "leverage"). Sound like a direct, competent student, not a marketing email.
- End with a clear, low-friction ask (e.g. "open to a 15-min call this week?").
- Do NOT invent metrics, experience, or claims not in the profile above.
- Output ONLY the email body text. No subject line, no "Subject:", no
  markdown, no explanation — just the raw email text.
"""


def draft_email(
    company: str,
    founder_name: str | None,
    role_type: str | None,
    opportunity_description: str,
    company_research: str,
) -> str:
    """Generates a personalized cold email draft."""
    user_prompt = (
        f"Company: {company}\n"
        f"Founder: {founder_name or 'Unknown — use a general greeting like Hi team'}\n"
        f"Role posted: {role_type or 'not specified'}\n"
        f"Job posting text: {opportunity_description[:1000]}\n\n"
        f"Company research notes: {company_research[:1000]}"
    )

    resp = httpx.post(
        GROQ_ENDPOINT,
        headers={"Authorization": f"Bearer {settings.groq_api_key}"},
        json={
            "model": MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.5,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def validate_email(draft: str) -> dict:
    """
    Basic template-language check — flags drafts that sound generic
    despite instructions. Not a hard gate, just a warning signal for
    the Telegram digest to show alongside the draft.
    """
    red_flags = [
        "i am writing to", "i hope this email finds you",
        "i am passionate about", "leverage my skills",
        "i believe i would be a great fit", "to whom it may concern",
    ]
    lower = draft.lower()
    found = [flag for flag in red_flags if flag in lower]

    return {
        "looks_generic": len(found) > 0,
        "flagged_phrases": found,
        "word_count": len(draft.split()),
    }