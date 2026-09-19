"""Creates real notification records for meaningful application events —
something was actually added (a ticket, project, sprint, research item,
calendar event) — not a login/view log and not a computed reminder (that's
Astilo Pulse's job). Call this inside the same session as the write that
triggered it, right before the caller's own session.flush()/commit.
"""

from app.models import Notification


def notify(session, user_id: int, module: str, title: str, body: str | None = None, link: str | None = None):
    session.add(Notification(user_id=user_id, module=module, title=title, body=body, link=link))
