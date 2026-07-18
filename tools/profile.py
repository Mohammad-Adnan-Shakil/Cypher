"""
Single source of truth for Adnan's verified profile facts. Used by
Outreach Drafter (to write accurate emails) and can retroactively
replace the hardcoded CANDIDATE_PROFILE in tools/scoring.py.

RULE (from project spec): only verified metrics — no invented numbers.
If a fact isn't in here, agents should not claim it.
"""

PROFILE = {
    "name": "Mohammad Adnan Shakil",
    "role_targeting": (
        "Part-time ML Engineer / Backend Engineer at AI-first startups, "
        "remote or Bengaluru-based"
    ),
    "education": "2nd-year CSE student, Presidency University Bengaluru",
    "stack": [
        "Java", "Spring Boot", "Python", "FastAPI", "React", "Node.js",
        "AWS Lambda", "PostgreSQL", "XGBoost", "Random Forest",
        "LangGraph", "Google ADK",
    ],
    "key_projects": [
        {
            "name": "DeltaBox",
            "description": "F1 AI prediction platform",
            "verified_metrics": "79.6% Top-3 accuracy, R^2 0.62, 13.4ms inference",
        },
        {
            "name": "Bengaluru Commute Agent",
            "description": "Multi-agent AI system (Google ADK)",
            "verified_metrics": "Top 100, Google AI Agent Builder Series 2026",
        },
        {
            "name": "Internship — Production Voice AI Pipeline",
            "description": "Serverless AWS pipeline: HubSpot -> API Gateway -> Lambda -> ElevenLabs -> DynamoDB",
            "verified_metrics": None,
        },
        {
            "name": "FakeOut AI",
            "description": "Audio deepfake detection (wav2vec2 + XGBoost ensemble)",
            "verified_metrics": "FusionX Hackathon 2026, scored 20/20 on Review-1",
        },
    ],
    "links": {
        "github": "github.com/Mohammad-Adnan-Shakil",
        "portfolio": "portfolio-p2jh.vercel.app",
        "linkedin": "linkedin.com/in/mohammadadnanshakil",
    },
}


def get_my_profile() -> dict:
    """Returns the full verified profile dict."""
    return PROFILE


def get_profile_summary_text() -> str:
    """
    Returns a compact plain-text version for LLM prompts — keeps
    the drafter/scorer prompts from bloating with the full structured dict.
    """
    projects_text = "\n".join(
        f"- {p['name']}: {p['description']}"
        + (f" ({p['verified_metrics']})" if p["verified_metrics"] else "")
        for p in PROFILE["key_projects"]
    )
    return (
        f"Name: {PROFILE['name']}\n"
        f"Targeting: {PROFILE['role_targeting']}\n"
        f"Background: {PROFILE['education']}\n"
        f"Stack: {', '.join(PROFILE['stack'])}\n"
        f"Key projects:\n{projects_text}\n"
        f"GitHub: {PROFILE['links']['github']}\n"
        f"Portfolio: {PROFILE['links']['portfolio']}"
    )