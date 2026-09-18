"""One-off seed for the Admin Dashboard's "Team members" table demo data.

Run from the astilo-project-be directory:
    python -m scripts.seed_demo_users

Inserts a handful of realistic user rows (skipping any email that already
exists) so the dashboard table shown to the user is backed by real DB rows
instead of a hardcoded frontend array.
"""

import datetime
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.auth import hash_password  # noqa: E402
from app.db import get_session, init_db  # noqa: E402
from app.models import User  # noqa: E402

DEMO_PASSWORD = "Password123!"

# (name, email, role, avatar url, bio, location, joined)
DEMO_USERS = [
    (
        "Aya Nakamura",
        "aya.nakamura@astilo.io",
        "user",
        "https://randomuser.me/api/portraits/women/44.jpg",
        "Content editor covering Movies & Anime.",
        "Paris, France",
        datetime.datetime(2026, 3, 12),
    ),
    (
        "John Legend",
        "john.legend@astilo.io",
        "user",
        "https://randomuser.me/api/portraits/men/75.jpg",
        "Just here for the music player.",
        "Cincinnati, USA",
        datetime.datetime(2026, 4, 3),
    ),
    (
        "Adele Adkins",
        "adele.adkins@astilo.io",
        "user",
        "https://randomuser.me/api/portraits/women/68.jpg",
        "Playlist curator and occasional reviewer.",
        "London, UK",
        datetime.datetime(2026, 5, 18),
    ),
    (
        "Louis Armstrong",
        "louis.armstrong@astilo.io",
        "user",
        "https://randomuser.me/api/portraits/men/11.jpg",
        "",
        "New Orleans, USA",
        datetime.datetime(2026, 6, 2),
    ),
    (
        "Stephen Bishop",
        "stephen.bishop@astilo.io",
        "admin",
        "https://randomuser.me/api/portraits/men/54.jpg",
        "Store catalogue manager.",
        "Austin, USA",
        datetime.datetime(2026, 7, 9),
    ),
    (
        "Nadia Rowe",
        "nadia.rowe@astilo.io",
        "user",
        "https://randomuser.me/api/portraits/women/21.jpg",
        "Binge-watches anime on weekends.",
        "Toronto, Canada",
        datetime.datetime(2026, 8, 1),
    ),
    (
        "Marcus Feld",
        "marcus.feld@astilo.io",
        "admin",
        "https://randomuser.me/api/portraits/men/91.jpg",
        "Handles order fulfilment and support.",
        "Berlin, Germany",
        datetime.datetime(2026, 8, 21),
    ),
    (
        "Priya Sharma",
        "priya.sharma@astilo.io",
        "user",
        "https://randomuser.me/api/portraits/women/12.jpg",
        "Movie buff, mostly here for the watchlist.",
        "Mumbai, India",
        datetime.datetime(2026, 9, 5),
    ),
]


def main():
    init_db()
    created = 0
    with get_session() as session:
        for name, email, role, avatar, bio, location, joined in DEMO_USERS:
            if session.query(User).filter_by(email=email).first():
                print(f"skip (exists): {email}")
                continue
            user = User(
                name=name,
                email=email,
                password_hash=hash_password(DEMO_PASSWORD),
                role=role,
                avatar=avatar,
                bio=bio or None,
                location=location,
                created_at=joined,
            )
            session.add(user)
            created += 1
            print(f"created: {email}")
    print(f"\nDone — {created} user(s) added.")


if __name__ == "__main__":
    main()
