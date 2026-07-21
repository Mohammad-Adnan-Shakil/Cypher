from db.models import get_session, Hackathon
from sqlalchemy import select

with get_session() as session:
    rows = session.execute(select(Hackathon).order_by(Hackathon.found_at)).scalars().all()
    print(f"{len(rows)} hackathons in DB\n")
    for h in rows:
        print(f"found_at={h.found_at} | deadline={h.deadline} | {h.title[:50]}")