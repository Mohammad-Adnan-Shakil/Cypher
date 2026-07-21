from tools.search import search_hackathons

results = search_hackathons(max_results=8)

for r in results:
    raw = r.get("raw_content") or ""
    idx = raw.lower().find("deadline")
    print(f"{r['title'][:50]}")
    if idx == -1:
        print("  'deadline' not found anywhere in raw_content")
    else:
        print(f"  'deadline' first appears at character position: {idx}")
        print(f"  (batch classifier only sends first 1500 chars per item)")
    print()