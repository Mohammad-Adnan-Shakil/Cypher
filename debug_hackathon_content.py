from tools.search import search_hackathons

results = search_hackathons(max_results=8)

for r in results:
    raw = r.get("raw_content")
    content = r.get("content")
    print(f"Title: {r['title']}")
    print(f"  raw_content length: {len(raw) if raw else 0}")
    print(f"  content (snippet) length: {len(content) if content else 0}")
    print(f"  raw_content preview: {(raw or '')[:200]}")
    print()