"""
Gmail tools for Reply Tracker (Agent 5).

check_email_inbox(): searches/lists messages matching a query.
classify_reply(): uses Groq to classify a reply's sentiment/intent.

NOTE: there is currently no send_email() tool anywhere in this project.
Outreach Drafter creates drafts, Telegram lets you approve them, but
nothing here actually sends via Gmail yet. Reply Tracker can search
inbox generically, but matching "this message is a reply to MY outreach"
requires either (a) we build send_email() so we control the thread_id,
or (b) heuristic matching on sender address / subject line against
founders.email. Flagging this gap — not solved in this step.
"""
import json

import httpx
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from config import settings

GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "openai/gpt-oss-120b"


def _get_gmail_service():
    creds = Credentials(
        token=None,
        refresh_token=settings.gmail_refresh_token,
        client_id=settings.gmail_client_id,
        client_secret=settings.gmail_client_secret,
        token_uri="https://oauth2.googleapis.com/token",
    )
    return build("gmail", "v1", credentials=creds)


def check_email_inbox(query: str = "in:inbox", max_results: int = 10) -> list[dict]:
    """
    Searches Gmail using Gmail's search query syntax
    (e.g. "from:someone@company.com", "is:unread", "newer_than:7d").
    Returns list of {id, thread_id, from, subject, snippet, date}.
    """
    service = _get_gmail_service()
    results = service.users().messages().list(
        userId="me", q=query, maxResults=max_results
    ).execute()

    message_refs = results.get("messages", [])
    messages = []

    for ref in message_refs:
        msg = service.users().messages().get(
            userId="me", id=ref["id"], format="metadata",
            metadataHeaders=["From", "Subject", "Date"],
        ).execute()

        headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
        messages.append({
            "id": msg["id"],
            "thread_id": msg["threadId"],
            "from": headers.get("From", ""),
            "subject": headers.get("Subject", ""),
            "snippet": msg.get("snippet", ""),
            "date": headers.get("Date", ""),
        })

    return messages


def classify_reply(email_content: str) -> dict:
    """
    Classifies a reply's intent using Groq.
    Returns {"classification": "positive"|"negative"|"meeting_request", "reasoning": str}.
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
                        "Classify this email reply to a job outreach message. "
                        "Respond with ONLY valid JSON: "
                        '{"classification": "positive"|"negative"|"meeting_request", '
                        '"reasoning": "<one sentence>"}'
                    ),
                },
                {"role": "user", "content": email_content[:1500]},
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
        print(f"Classification parse failed: {e} | raw: {raw[:200]}")
        return {"classification": None, "reasoning": f"Parse error: {e}"}
    
"""
Below: sending capability, added in Step 20 once the send scope was
authorized. Kept in this file alongside check_email_inbox/classify_reply
since all three are Gmail-API-backed tools for the same agent (Reply
Tracker reads; this function is invoked by Outreach Drafter's approval
flow, but the Gmail client logic belongs together here).
"""
import base64
from email.mime.text import MIMEText


def send_email(to: str, subject: str, body: str) -> dict:
    """
    Sends an email via Gmail API. Returns {"message_id": str, "thread_id": str}.
    Raises on failure — caller should catch and handle (e.g. notify
    user via Telegram that a send failed) rather than fail silently.
    """
    service = _get_gmail_service()

    message = MIMEText(body)
    message["to"] = to
    message["subject"] = subject

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    result = service.users().messages().send(userId="me", body={"raw": raw}).execute()

    return {"message_id": result["id"], "thread_id": result["threadId"]}

def check_thread_for_reply(thread_id: str) -> dict | None:
    """
    Checks a specific Gmail thread (from Outreach.gmail_thread_id) for
    a reply. Returns the latest message's content if the thread has
    more than one message (meaning someone replied to our sent email),
    or None if it's still just our original outbound message.

    More precise than a broad inbox search -- ties directly to a known
    sent thread instead of heuristically matching sender/subject.
    """
    service = _get_gmail_service()
    thread = service.users().threads().get(userId="me", id=thread_id, format="full").execute()

    messages = thread.get("messages", [])
    if len(messages) <= 1:
        return None  # no reply yet -- only our original message exists

    latest = messages[-1]
    headers = {h["name"]: h["value"] for h in latest["payload"]["headers"]}

    # Extract plain text body -- Gmail payloads can be multi-part
    body = ""
    payload = latest["payload"]
    if "parts" in payload:
        for part in payload["parts"]:
            if part.get("mimeType") == "text/plain":
                data = part["body"].get("data", "")
                if data:
                    body = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
                    break
    else:
        data = payload.get("body", {}).get("data", "")
        if data:
            body = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")

    return {
        "from": headers.get("From", ""),
        "date": headers.get("Date", ""),
        "content": body[:2000],
        "snippet": latest.get("snippet", ""),
    }