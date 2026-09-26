import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db import Base


def utcnow():
    return datetime.datetime.utcnow()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="user")  # user | admin
    created_at = Column(DateTime, default=utcnow)

    # Profile details — all optional, editable by the user themselves via
    # PUT /api/users/me.
    avatar = Column(Text, nullable=True)  # base64 data URL
    bio = Column(Text, nullable=True)
    phone = Column(String(30), nullable=True)
    location = Column(String(120), nullable=True)
    date_of_birth = Column(String(10), nullable=True)  # plain "YYYY-MM-DD"
    gender = Column(String(20), nullable=True)
    website = Column(String(255), nullable=True)

    # Global per-user switch for the Git/code links feature on tickets — off
    # by default; when off, the frontend hides the feature entirely and the
    # backend rejects new links from this user (existing links other users
    # added remain visible, since this is a personal on/off preference, not
    # project-wide moderation).
    git_links_enabled = Column(Boolean, nullable=False, default=False)

    # Sidebar personalization: which moduleNav.ts module ids to show. None
    # means "show everything" (the default, unmodified experience) — an
    # empty list is a deliberate "hide everything" choice, distinct from
    # never having customized it.
    pinned_modules = Column(JSON, nullable=True)

    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    cosmos_saved_items = relationship("CosmosSavedItem", back_populates="user", cascade="all, delete-orphan")
    nimrose_projects = relationship("NimroseProject", back_populates="user", cascade="all, delete-orphan")
    nimrose_tasks = relationship("NimroseTask", back_populates="user", cascade="all, delete-orphan")
    nimrose_calendar_events = relationship("NimroseCalendarEvent", back_populates="user", cascade="all, delete-orphan")
    nimrose_tickets = relationship("NimroseTicket", cascade="all, delete-orphan", foreign_keys="NimroseTicket.user_id")
    nimrose_notes = relationship("NimroseNote", cascade="all, delete-orphan")
    nimrose_browser_spaces = relationship("NimroseBrowserSpace", cascade="all, delete-orphan")
    nimrose_bookmarks = relationship("NimroseBookmark", cascade="all, delete-orphan")
    nimrose_history_entries = relationship("NimroseHistoryEntry", cascade="all, delete-orphan")
    playlists = relationship("Playlist", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")
    login_events = relationship("LoginEvent", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "avatar": self.avatar,
            "bio": self.bio,
            "phone": self.phone,
            "location": self.location,
            "dateOfBirth": self.date_of_birth,
            "gender": self.gender,
            "website": self.website,
            "gitLinksEnabled": bool(self.git_links_enabled),
            "pinnedModules": self.pinned_modules,
        }


class Favorite(Base):
    """A saved movie/anime/track, keyed by the external provider's id (TMDB, Jikan, etc)."""

    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "media_type", "media_id", name="uq_favorite"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    media_type = Column(String(20), nullable=False)  # movie | anime | track
    media_id = Column(String(64), nullable=False)  # external id from TMDB/Jikan/etc
    title = Column(String(255))
    poster_url = Column(String(500))
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="favorites")

    def to_dict(self):
        return {
            "id": self.id,
            "mediaType": self.media_type,
            "mediaId": self.media_id,
            "title": self.title,
            "posterUrl": self.poster_url,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(120), nullable=False)
    type = Column(String(20), nullable=False, default="music")  # music | movie
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="playlists")
    tracks = relationship("PlaylistTrack", back_populates="playlist", cascade="all, delete-orphan")

    def to_dict(self, include_tracks=False):
        data = {
            "id": self.id,
            "name": self.name,
            "type": self.type or "music",
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
        if include_tracks:
            data["tracks"] = [t.to_dict() for t in self.tracks]
        return data


class PlaylistTrack(Base):
    """An item in a playlist — a music track, or (when the parent playlist's
    `type` is "movie") a movie/TV title keyed by its TMDB id."""

    __tablename__ = "playlist_tracks"

    id = Column(Integer, primary_key=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id"), nullable=False)
    track_id = Column(String(64), nullable=False)  # external id (music provider or TMDB id)
    media_type = Column(String(10), nullable=False, default="track")  # track | movie | tv
    title = Column(String(255))
    artist = Column(String(255))
    artwork_url = Column(String(500))
    position = Column(Integer, default=0)

    playlist = relationship("Playlist", back_populates="tracks")

    def to_dict(self):
        return {
            "id": self.id,
            "trackId": self.track_id,
            "mediaType": self.media_type or "track",
            "title": self.title,
            "artist": self.artist,
            "artworkUrl": self.artwork_url,
            "position": self.position,
        }


class Product(Base):
    """Store catalog item."""

    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    price = Column(Float, nullable=False)
    image_url = Column(String(500))
    category = Column(String(100))
    stock = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow)
    # Amazon-style categorized spec sheet: [{"group": "Display", "items":
    # [{"label": "Screen size", "value": "6.7 in"}, ...]}, ...]. Optional —
    # a product with no specs just skips that section on the detail page.
    specs = Column(JSON, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "imageUrl": self.image_url,
            "category": self.category,
            "stock": self.stock,
            "specs": self.specs,
        }


class ProductPriceHistory(Base):
    """One row per price the product has ever been set to. Written whenever
    a product is created or its price changes (see store_controller.py) —
    never edited or backfilled otherwise, so this is the real history, not a
    derived snapshot."""

    __tablename__ = "product_price_history"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    price = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=utcnow)

    def to_dict(self):
        return {
            "price": self.price,
            "recordedAt": self.recorded_at.isoformat() if self.recorded_at else None,
        }


class WishlistItem(Base):
    __tablename__ = "wishlist_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_wishlist_item"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    added_at = Column(DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "productId": self.product_id,
            "addedAt": self.added_at.isoformat() if self.added_at else None,
        }


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), nullable=False, default="pending")  # pending | paid | shipped | delivered | cancelled
    total = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime, default=utcnow)
    paid_at = Column(DateTime, nullable=True)
    shipped_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "status": self.status,
            "total": self.total,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "paidAt": self.paid_at.isoformat() if self.paid_at else None,
            "shippedAt": self.shipped_at.isoformat() if self.shipped_at else None,
            "deliveredAt": self.delivered_at.isoformat() if self.delivered_at else None,
            "items": [i.to_dict() for i in self.items],
        }


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")

    def to_dict(self):
        return {
            "id": self.id,
            "productId": self.product_id,
            "productName": self.product.name if self.product else None,
            "quantity": self.quantity,
            "unitPrice": self.unit_price,
        }


class Song(Base):
    """A track downloaded via yt-dlp for the Music tab's Search Song feature."""

    __tablename__ = "songs"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    artist = Column(String(255))
    audio_url = Column(String(500), nullable=False)
    cover_url = Column(String(500))
    duration_seconds = Column(Integer)
    youtube_id = Column(String(64))
    source_url = Column(String(500))
    media_type = Column(String(10), nullable=False, default="audio")  # audio | video
    bitrate_kbps = Column(Integer)
    quality_label = Column(String(20))
    created_at = Column(DateTime, default=utcnow)
    # Lyrics synced to this specific song from the Lyrics tab search — takes
    # priority over the live lyrics lookup once set.
    lyrics_text = Column(Text, nullable=True)
    lyrics_synced = Column(Text, nullable=True)  # raw LRC, when the source has timings

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "artist": self.artist,
            "audioUrl": self.audio_url,
            "coverUrl": self.cover_url,
            "durationSeconds": self.duration_seconds,
            "youtubeId": self.youtube_id,
            "sourceUrl": self.source_url,
            "mediaType": self.media_type,
            "bitrateKbps": self.bitrate_kbps,
            "qualityLabel": self.quality_label,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "lyrics": self.lyrics_text,
            "syncedLyrics": self.lyrics_synced,
        }


class LyricsCache(Base):
    """Cached lyrics (Genius or lrclib) so repeat lookups skip the network call."""

    __tablename__ = "lyrics_cache"

    id = Column(Integer, primary_key=True)
    genius_song_id = Column(String(64), unique=True, nullable=False)  # "genius:<id>" or "lrclib:<id>"
    artist = Column(String(255))
    title = Column(String(255))
    genius_url = Column(String(500))
    thumbnail_url = Column(String(500))
    lyrics_text = Column(Text)
    source = Column(String(20))  # genius | lrclib
    hit_count = Column(Integer, default=1)
    fetched_at = Column(DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "geniusSongId": self.genius_song_id,
            "artist": self.artist,
            "title": self.title,
            "geniusUrl": self.genius_url,
            "thumbnailUrl": self.thumbnail_url,
            "lyricsText": self.lyrics_text,
            "source": self.source,
            "fetchedAt": self.fetched_at.isoformat() if self.fetched_at else None,
            "hitCount": self.hit_count,
        }


class CosmosCache(Base):
    """Cached responses from external astronomy APIs (JPL, NASA Exoplanet
    Archive, MAST, etc.) keyed by source + a hash of the request params, so
    repeat lookups skip the (often slow) upstream call."""

    __tablename__ = "cosmos_cache"

    id = Column(Integer, primary_key=True)
    cache_key = Column(String(255), unique=True, nullable=False)  # "<source>:<sha256 of params>"
    source = Column(String(40), nullable=False)  # jpl_sbdb | jpl_horizons | jpl_cad | exoplanet_archive | mast | nasa_apod | nasa_neows | nasa_donki | nasa_images
    payload_json = Column(JSON, nullable=False)
    fetched_at = Column(DateTime, default=utcnow)


class CosmosSavedItem(Base):
    """A user's Cosmos Library entry — a planet, asteroid, exoplanet,
    telescope image, etc. saved for later, with the source provenance kept
    alongside it (never just the display fields) so the record stays
    traceable back to where it came from."""

    __tablename__ = "cosmos_saved_items"
    __table_args__ = (UniqueConstraint("user_id", "object_type", "external_id", name="uq_cosmos_saved_item"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    object_type = Column(String(30), nullable=False)  # planet | asteroid | exoplanet | star | observation | image | galaxy | supernova
    external_id = Column(String(255), nullable=False)  # e.g. SBDB spkid, exoplanet pl_name, MAST obsid
    collection = Column(String(40), nullable=False, default="favorites")  # favorites | research | discoveries | ...
    title = Column(String(255))
    source = Column(String(80))  # e.g. "JPL Small-Body Database", "NASA Exoplanet Archive"
    source_dataset = Column(String(80))
    image_url = Column(String(500))
    data_json = Column(JSON)  # normalized snapshot at save time
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    # Set only for collection="research" items — the linked Nimrose project
    # (for its notes/tasks/browser Space) and the automated research brief
    # (real Wikipedia-sourced summary + key points + further-research
    # checklist — see app/research_brief.py), regenerable on demand rather
    # than baked once into note text.
    research_project_id = Column(Integer, ForeignKey("nimrose_projects.id"), nullable=True)
    research_brief_json = Column(JSON, nullable=True)
    research_images_json = Column(JSON, nullable=True)  # list[{url, caption, source}] user-curated gallery
    research_sources_json = Column(JSON, nullable=True)  # list[{title, url, snippet, source, externalId}] — Wikidata/arXiv/PubMed/OpenAlex/Crossref/Open Library citations

    user = relationship("User", back_populates="cosmos_saved_items")

    def to_dict(self):
        return {
            "id": self.id,
            "objectType": self.object_type,
            "externalId": self.external_id,
            "collection": self.collection,
            "title": self.title,
            "source": self.source,
            "sourceDataset": self.source_dataset,
            "imageUrl": self.image_url,
            "data": self.data_json,
            "notes": self.notes,
            "researchProjectId": self.research_project_id,
            "researchBrief": self.research_brief_json,
            "images": self.research_images_json or [],
            "sources": self.research_sources_json or [],
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class HubbleMonitorState(Base):
    """Last-known MAST observation count per Hubble catalog target — the
    persisted baseline app/cosmos/hubble.py::check_for_new_observations
    diffs against to report genuinely new observations between polls,
    rather than fabricating live activity. One row per target, updated
    in place as each gets checked."""

    __tablename__ = "hubble_monitor_state"

    id = Column(Integer, primary_key=True)
    target_id = Column(String(80), unique=True, nullable=False)
    last_obs_count = Column(Integer, nullable=False, default=0)
    last_checked_at = Column(DateTime, default=utcnow)


class DeepSpaceMonitorState(Base):
    """Last-known science-data marker (a CDAWeb coverage-end timestamp or a
    PDS product LID) per deep-space probe — the persisted baseline
    app/cosmos/deep_space.py::check_for_new_probe_data diffs against to
    report genuinely new archived data between polls."""

    __tablename__ = "deep_space_monitor_state"

    id = Column(Integer, primary_key=True)
    probe_id = Column(String(40), unique=True, nullable=False)
    last_seen_timestamp = Column(String(255), nullable=True)
    last_checked_at = Column(DateTime, default=utcnow)


class LoginEvent(Base):
    """One row per successful login/register — powers the profile's
    sign-in history. Auth is stateless JWT (no server-side session table),
    so "active" is only ever inferred from the token's expiry window, not
    tracked/revocable server-side."""

    __tablename__ = "login_events"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ip_address = Column(String(64))
    user_agent = Column(String(500))
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="login_events")

    def to_dict(self):
        return {
            "id": self.id,
            "ipAddress": self.ip_address,
            "userAgent": self.user_agent,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class NimroseProject(Base):
    """A lightweight project grouping for Nimrose tasks/events. Kept minimal
    here — Kanban/sprints (a later Nimrose phase) will extend this rather
    than replace it."""

    __tablename__ = "nimrose_projects"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(150), nullable=False)
    color = Column(String(20), nullable=True)
    # Ticket key prefix, e.g. "AST" for AST-1, AST-2... — auto-derived from
    # the project name if not given explicitly.
    key_prefix = Column(String(10), nullable=True)
    ticket_sequence = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="nimrose_projects")
    tasks = relationship("NimroseTask", back_populates="project")
    events = relationship("NimroseCalendarEvent", back_populates="project")
    sprints = relationship("NimroseSprint", back_populates="project", cascade="all, delete-orphan")
    phases = relationship("NimrosePhase", back_populates="project", cascade="all, delete-orphan", order_by="NimrosePhase.position")
    tickets = relationship("NimroseTicket", back_populates="project", cascade="all, delete-orphan")
    board_columns = relationship(
        "NimroseBoardColumn", back_populates="project", cascade="all, delete-orphan",
        order_by="NimroseBoardColumn.position",
    )
    members = relationship("NimroseProjectMember", back_populates="project", cascade="all, delete-orphan")
    activity = relationship(
        "NimroseProjectActivity", back_populates="project", cascade="all, delete-orphan",
        order_by="NimroseProjectActivity.created_at.desc()",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "color": self.color,
            "keyPrefix": self.key_prefix,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


PROJECT_MEMBER_ROLES = ("owner", "editor", "viewer")


class NimroseProjectMember(Base):
    """Grants another user access to a Nimrose project's shared data (tasks,
    notes, tickets, calendar events, files) without transferring ownership.
    The project's own `user_id` owner is NOT duplicated here as a row —
    app/nimrose_access.py treats `NimroseProject.user_id == user_id` as an
    implicit "owner" role, so this table only holds *additional* members."""

    __tablename__ = "nimrose_project_members"
    __table_args__ = (UniqueConstraint("project_id", "user_id", name="uq_nimrose_project_member"),)

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("nimrose_projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(20), nullable=False, default="viewer")  # owner | editor | viewer
    invited_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    project = relationship("NimroseProject", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "projectId": self.project_id,
            "userId": self.user_id,
            "userName": self.user.name if self.user else None,
            "userEmail": self.user.email if self.user else None,
            "role": self.role,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class NimroseProjectActivity(Base):
    """A project-wide activity feed (Tasks/Notes/Tickets/Sprints/Phases/
    Members/Files), distinct from NimroseTicketActivity which is scoped to
    one ticket's own history and drives the ticket detail modal. Populated
    additively alongside that existing logging, not replacing it."""

    __tablename__ = "nimrose_project_activity"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("nimrose_projects.id"), nullable=False)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(40), nullable=False)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    project = relationship("NimroseProject", back_populates="activity")
    actor = relationship("User", foreign_keys=[actor_user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "projectId": self.project_id,
            "actorUserId": self.actor_user_id,
            "actorName": self.actor.name if self.actor else None,
            "action": self.action,
            "detail": self.detail,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


TASK_STATUSES = ("inbox", "planned", "in_progress", "waiting", "completed")
TASK_PRIORITIES = ("low", "medium", "high", "critical")


class NimroseTask(Base):
    """A Nimrose to-do item. Subtasks/checklist/attachments/comments/
    dependencies are intentionally deferred to a later phase — this covers
    the core fields the Tasks view and Calendar linking need now."""

    __tablename__ = "nimrose_tasks"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("nimrose_projects.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="inbox")  # inbox | planned | in_progress | waiting | completed
    priority = Column(String(20), nullable=False, default="medium")  # low | medium | high | critical
    start_date = Column(String(10), nullable=True)  # "YYYY-MM-DD"
    due_date = Column(String(10), nullable=True)
    labels = Column(JSON, nullable=True)  # list[str]
    estimated_minutes = Column(Integer, nullable=True)
    actual_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="nimrose_tasks")
    project = relationship("NimroseProject", back_populates="tasks")
    calendar_events = relationship("NimroseCalendarEvent", back_populates="related_task")

    def to_dict(self):
        return {
            "id": self.id,
            "projectId": self.project_id,
            "projectName": self.project.name if self.project else None,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "startDate": self.start_date,
            "dueDate": self.due_date,
            "labels": self.labels or [],
            "estimatedMinutes": self.estimated_minutes,
            "actualMinutes": self.actual_minutes,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


class NimroseCalendarEvent(Base):
    """A Nimrose calendar event — optionally linked to a task/project so the
    calendar isn't an isolated feature (per the "smart relationship" idea:
    a meeting can point at the project/task it's about)."""

    __tablename__ = "nimrose_calendar_events"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("nimrose_projects.id"), nullable=True)
    related_task_id = Column(Integer, ForeignKey("nimrose_tasks.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_at = Column(DateTime, nullable=False)
    end_at = Column(DateTime, nullable=True)
    location = Column(String(255), nullable=True)
    category = Column(String(50), nullable=True)
    color = Column(String(20), nullable=True)
    reminder_minutes_before = Column(Integer, nullable=True)
    recurrence = Column(String(50), nullable=True)  # "none" | "daily" | "weekly" | "monthly" (simple rule, no RRULE yet)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="nimrose_calendar_events")
    project = relationship("NimroseProject", back_populates="events")
    related_task = relationship("NimroseTask", back_populates="calendar_events")

    def to_dict(self):
        return {
            "id": self.id,
            "projectId": self.project_id,
            "projectName": self.project.name if self.project else None,
            "relatedTaskId": self.related_task_id,
            "relatedTaskTitle": self.related_task.title if self.related_task else None,
            "title": self.title,
            "description": self.description,
            "startAt": self.start_at.isoformat() if self.start_at else None,
            "endAt": self.end_at.isoformat() if self.end_at else None,
            "location": self.location,
            "category": self.category,
            "color": self.color,
            "reminderMinutesBefore": self.reminder_minutes_before,
            "recurrence": self.recurrence,
            "notes": self.notes,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


SPRINT_STATUSES = ("planned", "active", "completed")


class NimroseSprint(Base):
    __tablename__ = "nimrose_sprints"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("nimrose_projects.id"), nullable=False)
    name = Column(String(150), nullable=False)
    goal = Column(Text, nullable=True)
    start_date = Column(String(10), nullable=True)
    end_date = Column(String(10), nullable=True)
    status = Column(String(20), nullable=False, default="planned")  # planned | active | completed
    created_at = Column(DateTime, default=utcnow)

    project = relationship("NimroseProject", back_populates="sprints")
    tickets = relationship("NimroseTicket", back_populates="sprint")

    def to_dict(self):
        return {
            "id": self.id,
            "projectId": self.project_id,
            "name": self.name,
            "goal": self.goal,
            "startDate": self.start_date,
            "endDate": self.end_date,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class NimrosePhase(Base):
    """A project delivery phase (e.g. "Phase 1: Design", "Phase 2: Build")
    — a coarser grouping than a Sprint, for organizing work across the
    project's overall timeline rather than a fixed iteration window."""

    __tablename__ = "nimrose_phases"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("nimrose_projects.id"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(String(10), nullable=True)
    end_date = Column(String(10), nullable=True)
    status = Column(String(20), nullable=False, default="planned")  # planned | active | completed
    position = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=utcnow)

    project = relationship("NimroseProject", back_populates="phases")
    tickets = relationship("NimroseTicket", back_populates="phase")

    def to_dict(self):
        return {
            "id": self.id,
            "projectId": self.project_id,
            "name": self.name,
            "description": self.description,
            "startDate": self.start_date,
            "endDate": self.end_date,
            "status": self.status,
            "position": self.position,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


TICKET_TYPES = ("feature", "bug", "task", "improvement", "integration", "research", "design", "documentation")
TICKET_PRIORITIES = ("low", "medium", "high", "critical")
TICKET_STATUSES = ("backlog", "todo", "in_progress", "review", "done")
TICKET_LINK_RELATIONS = ("blocks", "blocked_by", "depends_on", "related_to", "duplicate", "parent", "child")
# Each relation's inverse, so creating a link auto-creates the mirror on the
# other ticket ("blocks" on A implies "blocked_by" on B) rather than making
# the user create both directions by hand.
TICKET_LINK_INVERSE = {
    "blocks": "blocked_by",
    "blocked_by": "blocks",
    "depends_on": "related_to",
    "related_to": "related_to",
    "duplicate": "duplicate",
    "parent": "child",
    "child": "parent",
}


class NimroseTicket(Base):
    """A Kanban ticket — Jira-style ticket key, type, priority, sprint
    assignment, story points. Subtasks are modeled as "child" links to
    other tickets rather than a separate subtask entity, so the same
    relationship system covers both."""

    __tablename__ = "nimrose_tickets"
    __table_args__ = (UniqueConstraint("project_id", "ticket_key", name="uq_ticket_key_per_project"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("nimrose_projects.id"), nullable=False)
    sprint_id = Column(Integer, ForeignKey("nimrose_sprints.id"), nullable=True)
    phase_id = Column(Integer, ForeignKey("nimrose_phases.id"), nullable=True)
    ticket_key = Column(String(30), nullable=False)  # e.g. "AST-1"
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    ticket_type = Column(String(20), nullable=False, default="task")
    status = Column(String(20), nullable=False, default="backlog")
    priority = Column(String(20), nullable=False, default="medium")
    assignee_name = Column(String(120), nullable=True)
    reporter_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    labels = Column(JSON, nullable=True)  # list[str]
    due_date = Column(String(10), nullable=True)
    story_points = Column(Integer, nullable=True)
    estimate_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    project = relationship("NimroseProject", back_populates="tickets")
    sprint = relationship("NimroseSprint", back_populates="tickets")
    phase = relationship("NimrosePhase", back_populates="tickets")
    reporter = relationship("User", foreign_keys=[reporter_user_id])
    comments = relationship("NimroseTicketComment", back_populates="ticket", cascade="all, delete-orphan")
    activity = relationship(
        "NimroseTicketActivity", back_populates="ticket", cascade="all, delete-orphan",
        order_by="NimroseTicketActivity.created_at.desc()",
    )
    links = relationship(
        "NimroseTicketLink", back_populates="ticket", cascade="all, delete-orphan",
        foreign_keys="NimroseTicketLink.ticket_id",
    )
    attachments = relationship("NimroseTicketAttachment", back_populates="ticket", cascade="all, delete-orphan")
    git_links = relationship("NimroseTicketGitLink", back_populates="ticket", cascade="all, delete-orphan")

    def to_dict(self, include_links=False, include_attachments=False, include_git_links=False):
        data = {
            "id": self.id,
            "projectId": self.project_id,
            "projectName": self.project.name if self.project else None,
            "sprintId": self.sprint_id,
            "sprintName": self.sprint.name if self.sprint else None,
            "phaseId": self.phase_id,
            "phaseName": self.phase.name if self.phase else None,
            "key": self.ticket_key,
            "title": self.title,
            "description": self.description,
            "type": self.ticket_type,
            "status": self.status,
            "priority": self.priority,
            "assignee": self.assignee_name,
            "reporter": self.reporter.name if self.reporter else None,
            "labels": self.labels or [],
            "dueDate": self.due_date,
            "storyPoints": self.story_points,
            "estimateMinutes": self.estimate_minutes,
            "commentCount": len(self.comments) if self.comments is not None else 0,
            "attachmentCount": len(self.attachments) if self.attachments is not None else 0,
            "gitLinkCount": len(self.git_links) if self.git_links is not None else 0,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_links:
            data["links"] = [link.to_dict() for link in self.links]
        if include_attachments:
            data["attachments"] = [a.to_dict() for a in self.attachments]
        if include_git_links:
            data["gitLinks"] = [g.to_dict() for g in self.git_links]
        return data


GIT_LINK_TYPES = ("commit", "pull_request", "issue", "branch", "other")


class NimroseTicketGitLink(Base):
    """A manually-pasted commit/PR/issue/branch URL attached to a ticket —
    not a live GitHub/GitLab/Bitbucket integration (no OAuth, no API calls,
    no webhooks). provider/link_type/label are parsed from the URL once at
    creation time for display only; the link is just stored data after
    that. Gated behind User.git_links_enabled — see nimrose_controller.py's
    NimroseTicketGitLinksController."""

    __tablename__ = "nimrose_ticket_git_links"

    id = Column(Integer, primary_key=True)
    ticket_id = Column(Integer, ForeignKey("nimrose_tickets.id"), nullable=False)
    url = Column(String(1000), nullable=False)
    provider = Column(String(20), nullable=False, default="other")  # github | gitlab | bitbucket | other
    link_type = Column(String(20), nullable=False, default="other")  # commit | pull_request | issue | branch | other
    label = Column(String(255), nullable=True)  # parsed display text, e.g. "owner/repo#42"
    added_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    ticket = relationship("NimroseTicket", back_populates="git_links")
    added_by = relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "ticketId": self.ticket_id,
            "url": self.url,
            "provider": self.provider,
            "linkType": self.link_type,
            "label": self.label,
            "addedBy": self.added_by.name if self.added_by else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class NimroseTicketComment(Base):
    """A Slack-style comment thread on a ticket — author + timestamp, plain
    text (Markdown rendering can be layered on the frontend later)."""

    __tablename__ = "nimrose_ticket_comments"

    id = Column(Integer, primary_key=True)
    ticket_id = Column(Integer, ForeignKey("nimrose_tickets.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    ticket = relationship("NimroseTicket", back_populates="comments")
    user = relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "ticketId": self.ticket_id,
            "authorName": self.user.name if self.user else None,
            "body": self.body,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class NimroseTicketActivity(Base):
    """Auto-logged activity feed per ticket — created, status changes,
    assignment changes, comments — so a ticket's history is always visible
    without the user having to maintain it by hand."""

    __tablename__ = "nimrose_ticket_activity"

    id = Column(Integer, primary_key=True)
    ticket_id = Column(Integer, ForeignKey("nimrose_tickets.id"), nullable=False)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(40), nullable=False)  # created | status_changed | priority_changed | assigned | commented | linked | field_updated
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    ticket = relationship("NimroseTicket", back_populates="activity")
    actor = relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "ticketId": self.ticket_id,
            "actorName": self.actor.name if self.actor else None,
            "action": self.action,
            "detail": self.detail,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class NimroseTicketLink(Base):
    """A directed relationship from one ticket to another (blocks, depends
    on, parent/child, etc). Creating one auto-creates the inverse link on
    the target ticket so both sides stay consistent."""

    __tablename__ = "nimrose_ticket_links"
    __table_args__ = (UniqueConstraint("ticket_id", "linked_ticket_id", "relation", name="uq_ticket_link"),)

    id = Column(Integer, primary_key=True)
    ticket_id = Column(Integer, ForeignKey("nimrose_tickets.id"), nullable=False)
    linked_ticket_id = Column(Integer, ForeignKey("nimrose_tickets.id"), nullable=False)
    relation = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=utcnow)

    ticket = relationship("NimroseTicket", back_populates="links", foreign_keys=[ticket_id])
    linked_ticket = relationship("NimroseTicket", foreign_keys=[linked_ticket_id])

    def to_dict(self):
        return {
            "id": self.id,
            "relation": self.relation,
            "linkedTicketId": self.linked_ticket_id,
            "linkedTicketKey": self.linked_ticket.ticket_key if self.linked_ticket else None,
            "linkedTicketTitle": self.linked_ticket.title if self.linked_ticket else None,
            "linkedTicketStatus": self.linked_ticket.status if self.linked_ticket else None,
        }


class NimroseNote(Base):
    """A Nimrose note — Markdown content, an optional folder (a plain
    string rather than a separate entity, matching how labels/projects
    are kept lightweight elsewhere in Nimrose), and tags. Backlinks are a
    documented future addition, not built here."""

    __tablename__ = "nimrose_notes"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)  # Markdown/HTML source, or a JSON string for sheet/slides kinds
    content_format = Column(String(10), nullable=False, default="markdown")  # markdown | html
    kind = Column(String(10), nullable=False, default="note")  # note | sheet | slides | code — the Office suite's document type
    language = Column(String(30), nullable=True)  # only meaningful for kind="code" (e.g. "python", "typescript")
    folder = Column(String(100), nullable=True)
    tags = Column(JSON, nullable=True)  # list[str]
    pinned = Column(Integer, nullable=False, default=0)  # 0/1
    project_id = Column(Integer, ForeignKey("nimrose_projects.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "contentFormat": self.content_format or "markdown",
            "kind": self.kind or "note",
            "language": self.language,
            "folder": self.folder,
            "tags": self.tags or [],
            "pinned": bool(self.pinned),
            "projectId": self.project_id,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


DEFAULT_BROWSER_SPACES = ("Work", "Research", "Entertainment", "Shopping", "Personal")


class NimroseBrowserSpace(Base):
    """A browser Space — its own tab set and bookmarks, per the spec's
    "each Space maintains its own tabs/bookmarks where technically
    possible." History is kept global (per user) rather than per-space,
    since a page visited from one Space is still something the user did."""

    __tablename__ = "nimrose_browser_spaces"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(60), nullable=False)
    position = Column(Integer, nullable=False, default=0)
    project_id = Column(Integer, ForeignKey("nimrose_projects.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    tabs = relationship("NimroseBrowserTab", back_populates="space", cascade="all, delete-orphan", order_by="NimroseBrowserTab.position")
    bookmarks = relationship("NimroseBookmark", back_populates="space", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "position": self.position,
            "projectId": self.project_id,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class NimroseBrowserTab(Base):
    __tablename__ = "nimrose_browser_tabs"

    id = Column(Integer, primary_key=True)
    space_id = Column(Integer, ForeignKey("nimrose_browser_spaces.id"), nullable=False)
    url = Column(String(1000), nullable=False)
    title = Column(String(255), nullable=True)
    position = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=utcnow)

    space = relationship("NimroseBrowserSpace", back_populates="tabs")

    def to_dict(self):
        return {
            "id": self.id,
            "spaceId": self.space_id,
            "url": self.url,
            "title": self.title,
            "position": self.position,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class NimroseBookmark(Base):
    """A saved page. `read_later` doubles this table as the spec's Reading
    List, rather than standing up a separate entity for what's really the
    same shape (a saved URL + title) with one extra flag."""

    __tablename__ = "nimrose_bookmarks"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    space_id = Column(Integer, ForeignKey("nimrose_browser_spaces.id"), nullable=True)
    url = Column(String(1000), nullable=False)
    title = Column(String(255), nullable=True)
    read_later = Column(Integer, nullable=False, default=0)  # 0/1
    created_at = Column(DateTime, default=utcnow)

    space = relationship("NimroseBrowserSpace", back_populates="bookmarks")

    def to_dict(self):
        return {
            "id": self.id,
            "spaceId": self.space_id,
            "spaceName": self.space.name if self.space else None,
            "url": self.url,
            "title": self.title,
            "readLater": bool(self.read_later),
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class NimroseHistoryEntry(Base):
    __tablename__ = "nimrose_history_entries"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    url = Column(String(1000), nullable=False)
    title = Column(String(255), nullable=True)
    visited_at = Column(DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "url": self.url,
            "title": self.title,
            "visitedAt": self.visited_at.isoformat() if self.visited_at else None,
        }


class NimroseTicketAttachment(Base):
    """A file (image or otherwise) attached to a ticket. Stored on disk
    under config.ATTACHMENTS_DIR, served back by NimroseAttachmentsController
    — not in the database, which is fine for text-sized payloads (like
    User.avatar) but not for arbitrary uploaded files."""

    __tablename__ = "nimrose_ticket_attachments"

    id = Column(Integer, primary_key=True)
    ticket_id = Column(Integer, ForeignKey("nimrose_tickets.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("nimrose_projects.id"), nullable=True)  # set when uploaded directly to a project's Files tab, not via a ticket
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    file_name = Column(String(255), nullable=False)  # original filename, shown to the user
    stored_name = Column(String(100), nullable=False)  # random on-disk filename, unique() implied by generation
    content_type = Column(String(120), nullable=True)
    size_bytes = Column(Integer, nullable=False, default=0)
    is_image = Column(Integer, nullable=False, default=0)  # 0/1
    created_at = Column(DateTime, default=utcnow)

    ticket = relationship("NimroseTicket", back_populates="attachments")
    uploaded_by = relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "ticketId": self.ticket_id,
            "projectId": self.project_id,
            "fileName": self.file_name,
            "contentType": self.content_type,
            "sizeBytes": self.size_bytes,
            "isImage": bool(self.is_image),
            "uploadedBy": self.uploaded_by.name if self.uploaded_by else None,
            "url": f"/api/nimrose/ticket-attachment-file/{self.id}",
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class NimroseContextBubble(Base):
    """A named, restorable snapshot of "where I was" in Nimrose — the
    current section plus its query params (project/ticket/sprint/etc, as
    the URL already encodes them). Strictly owner-only, never shared —
    bubbles are a personal browsing-state convenience, not project data."""

    __tablename__ = "nimrose_context_bubbles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(120), nullable=False)
    icon = Column(String(20), nullable=True)
    snapshot_json = Column(JSON, nullable=False)  # {"section": "kanban", "params": {"project": "12", "ticket": "45"}}
    created_at = Column(DateTime, default=utcnow)
    last_restored_at = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "icon": self.icon,
            "snapshot": self.snapshot_json,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "lastRestoredAt": self.last_restored_at.isoformat() if self.last_restored_at else None,
        }


class NimroseBoardColumn(Base):
    """A Kanban column for a project — user-defined and reorderable, rather
    than a fixed backlog/todo/in_progress/review/done enum, so a project can
    add steps like "Testing" or "QA" to its own workflow. `slug` is what
    NimroseTicket.status actually stores; `is_done` marks which column(s)
    count as complete for sprint/backlog progress math instead of a
    hardcoded status == "done" check."""

    __tablename__ = "nimrose_board_columns"
    __table_args__ = (UniqueConstraint("project_id", "slug", name="uq_board_column_slug"),)

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("nimrose_projects.id"), nullable=False)
    name = Column(String(50), nullable=False)
    slug = Column(String(50), nullable=False)
    position = Column(Integer, nullable=False, default=0)
    is_done = Column(Integer, nullable=False, default=0)  # 0/1
    wip_limit = Column(Integer, nullable=True)  # soft cap — UI warns past it, never blocks
    created_at = Column(DateTime, default=utcnow)

    project = relationship("NimroseProject", back_populates="board_columns")

    def to_dict(self):
        return {
            "id": self.id,
            "projectId": self.project_id,
            "name": self.name,
            "slug": self.slug,
            "position": self.position,
            "isDone": bool(self.is_done),
            "wipLimit": self.wip_limit,
        }


DEFAULT_BOARD_COLUMNS = (
    ("Backlog", "backlog", False),
    ("To Do", "todo", False),
    ("In Progress", "in_progress", False),
    ("Review", "review", False),
    ("Done", "done", True),
)


NOTIFICATION_MODULES = (
    "kanban", "research", "calendar", "nimrose", "cosmos", "markets", "library",
    "store", "vault", "messenger", "office",
)


class Notification(Base):
    """A real, persisted record of something that happened — created when
    the event happens (a ticket/project/sprint/research item/calendar event
    is added), not computed on the fly like Astilo Pulse's due-date
    reminders. Read here, not inferred from other tables, so "read" state
    is durable and a dedicated Notifications page can list/filter real
    history instead of a live recomputation."""

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    module = Column(String(20), nullable=False)  # one of NOTIFICATION_MODULES
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=True)
    link = Column(String(255), nullable=True)  # frontend route to open when clicked
    read = Column(Integer, nullable=False, default=0)  # 0/1
    created_at = Column(DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "module": self.module,
            "title": self.title,
            "body": self.body,
            "link": self.link,
            "read": bool(self.read),
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


BOT_NAME = "Astilo Bot"


class ChatChannel(Base):
    """A Slack-style channel within a user's own workspace — this app has
    no cross-account real-time messaging infra, so channels are personal
    organizational threads (e.g. #general, #random) rather than shared
    team channels. The bot is the one other "participant"."""

    __tablename__ = "chat_channels"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_chat_channel_name"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(80), nullable=False)
    topic = Column(String(255), nullable=True)
    archived = Column(Integer, nullable=False, default=0)  # 0/1
    created_at = Column(DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "topic": self.topic,
            "archived": bool(self.archived),
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True)
    channel_id = Column(Integer, ForeignKey("chat_channels.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author_name = Column(String(120), nullable=False)
    is_bot = Column(Integer, nullable=False, default=0)  # 0/1
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow)
    edited_at = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "channelId": self.channel_id,
            "authorName": self.author_name,
            "isBot": bool(self.is_bot),
            "body": self.body,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "editedAt": self.edited_at.isoformat() if self.edited_at else None,
        }


class Conversation(Base):
    """A real 1:1 (or group) conversation between actual Astilo accounts —
    unlike Nimrose Chat (channels within one user's own workspace, plus a
    bot), Messenger is genuine cross-account messaging using the real
    Users table."""

    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True)
    is_group = Column(Integer, nullable=False, default=0)  # 0/1
    name = Column(String(120), nullable=True)  # group name; null for 1:1
    created_at = Column(DateTime, default=utcnow)

    participants = relationship("ConversationParticipant", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("DirectMessage", back_populates="conversation", cascade="all, delete-orphan")


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"
    __table_args__ = (UniqueConstraint("conversation_id", "user_id", name="uq_conversation_participant"),)

    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=utcnow)

    conversation = relationship("Conversation", back_populates="participants")
    user = relationship("User")


class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    kind = Column(String(10), nullable=False, default="text")  # text | image | file | contact | sticker
    attachment_file_name = Column(String(255), nullable=True)
    attachment_stored_name = Column(String(80), nullable=True)
    attachment_content_type = Column(String(120), nullable=True)
    attachment_size_bytes = Column(Integer, nullable=True)
    contact_payload_json = Column(Text, nullable=True)  # shared-contact card: {"userId","name","email","avatar"}
    created_at = Column(DateTime, default=utcnow)
    edited_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)  # set when the *other* participant(s) have seen it

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User")

    def to_dict(self):
        import json

        return {
            "id": self.id,
            "conversationId": self.conversation_id,
            "senderId": self.sender_id,
            "senderName": self.sender.name if self.sender else None,
            "body": self.body,
            "kind": self.kind or "text",
            "attachment": (
                {
                    "fileName": self.attachment_file_name,
                    "contentType": self.attachment_content_type,
                    "sizeBytes": self.attachment_size_bytes,
                    "url": f"/messenger/attachment-file/{self.id}",
                }
                if self.attachment_stored_name
                else None
            ),
            "contact": json.loads(self.contact_payload_json) if self.contact_payload_json else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "editedAt": self.edited_at.isoformat() if self.edited_at else None,
            "readAt": self.read_at.isoformat() if self.read_at else None,
        }


class PersonalContact(Base):
    """A Messenger contact the user explicitly added (by email, phone, or
    QR/connect code), with an optional nickname — distinct from the raw
    Users roster, which lists every Astilo account whether or not you've
    "added" them."""

    __tablename__ = "personal_contacts"
    __table_args__ = (UniqueConstraint("owner_id", "contact_id", name="uq_personal_contact"),)

    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    nickname = Column(String(120), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    contact = relationship("User", foreign_keys=[contact_id])

    def to_dict(self):
        return {
            "id": self.id,
            "contactId": self.contact_id,
            "name": self.nickname or (self.contact.name if self.contact else None),
            "realName": self.contact.name if self.contact else None,
            "email": self.contact.email if self.contact else None,
            "avatar": self.contact.avatar if self.contact else None,
            "nickname": self.nickname,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


LIBRARY_SHELVES = ("want_to_read", "reading", "finished")


class LibraryEntry(Base):
    """A book the user has added to their own Library from Project
    Gutenberg (via Gutendex) — which shelf it's on, and real reading
    progress (last chapter index actually opened), not a fabricated
    percentage."""

    __tablename__ = "library_entries"
    __table_args__ = (UniqueConstraint("user_id", "gutenberg_id", name="uq_library_entry"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    gutenberg_id = Column(Integer, nullable=False)
    title = Column(String(500), nullable=False)
    authors = Column(JSON, nullable=True)  # list[str]
    cover_url = Column(String(500), nullable=True)
    text_url = Column(String(500), nullable=True)
    shelf = Column(String(20), nullable=False, default="want_to_read")
    last_chapter_index = Column(Integer, nullable=False, default=0)
    total_chapters = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    added_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "gutenbergId": self.gutenberg_id,
            "title": self.title,
            "authors": self.authors or [],
            "coverUrl": self.cover_url,
            "textUrl": self.text_url,
            "shelf": self.shelf,
            "lastChapterIndex": self.last_chapter_index,
            "totalChapters": self.total_chapters,
            "progressPercent": (
                round((self.last_chapter_index / self.total_chapters) * 100)
                if self.total_chapters
                else None
            ),
            "notes": self.notes,
            "addedAt": self.added_at.isoformat() if self.added_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


# -- Trading — simulated stock/crypto trading against real, live market
# prices (via the same Yahoo Finance / CoinGecko adapters Markets uses).
# The cash and P&L are entirely make-believe; the prices trades execute at
# are real. Starting balance is a flat, clearly-fake $100,000.

TRADING_STARTING_BALANCE = 100000.0
TRADE_SIDES = ("buy", "sell")
TRADE_ASSET_TYPES = ("stock", "crypto")


class TradingAccount(Base):
    __tablename__ = "trading_accounts"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    cash_balance = Column(Float, nullable=False, default=TRADING_STARTING_BALANCE)
    created_at = Column(DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "cashBalance": self.cash_balance,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class TradingHolding(Base):
    __tablename__ = "trading_holdings"
    __table_args__ = (UniqueConstraint("account_id", "symbol", "asset_type", name="uq_trading_holding"),)

    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, ForeignKey("trading_accounts.id"), nullable=False)
    symbol = Column(String(40), nullable=False)
    asset_type = Column(String(10), nullable=False)
    name = Column(String(200), nullable=True)
    quantity = Column(Float, nullable=False, default=0)
    avg_cost = Column(Float, nullable=False, default=0)  # weighted average price paid per unit

    def to_dict(self):
        return {
            "id": self.id,
            "symbol": self.symbol,
            "assetType": self.asset_type,
            "name": self.name,
            "quantity": self.quantity,
            "avgCost": self.avg_cost,
        }


TRADE_ORDER_TYPES = ("market", "limit", "stop")
TRADE_ORDER_STATUSES = ("pending", "filled", "cancelled")


class TradingOrder(Base):
    """A pending limit/stop order — market orders never become a row here;
    they execute immediately and only ever produce a TradingTransaction.
    Pending orders are checked lazily (there is no background scheduler)
    whenever the account/orders endpoints are hit, since the frontend
    already polls /trading/account every 30s."""

    __tablename__ = "trading_orders"

    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, ForeignKey("trading_accounts.id"), nullable=False)
    symbol = Column(String(40), nullable=False)
    asset_type = Column(String(10), nullable=False)
    name = Column(String(200), nullable=True)
    side = Column(String(4), nullable=False)  # buy | sell
    order_type = Column(String(10), nullable=False)  # limit | stop
    quantity = Column(Float, nullable=False)
    limit_price = Column(Float, nullable=True)
    stop_price = Column(Float, nullable=True)
    status = Column(String(10), nullable=False, default="pending")  # pending | filled | cancelled
    created_at = Column(DateTime, default=utcnow)
    filled_at = Column(DateTime, nullable=True)
    filled_price = Column(Float, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "symbol": self.symbol,
            "assetType": self.asset_type,
            "name": self.name,
            "side": self.side,
            "orderType": self.order_type,
            "quantity": self.quantity,
            "limitPrice": self.limit_price,
            "stopPrice": self.stop_price,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "filledAt": self.filled_at.isoformat() if self.filled_at else None,
            "filledPrice": self.filled_price,
            "cancelledAt": self.cancelled_at.isoformat() if self.cancelled_at else None,
        }


class TradingTransaction(Base):
    __tablename__ = "trading_transactions"

    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, ForeignKey("trading_accounts.id"), nullable=False)
    symbol = Column(String(40), nullable=False)
    asset_type = Column(String(10), nullable=False)
    name = Column(String(200), nullable=True)
    side = Column(String(4), nullable=False)  # buy | sell
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    realized_pnl = Column(Float, nullable=True)  # only set on sell
    created_at = Column(DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "symbol": self.symbol,
            "assetType": self.asset_type,
            "name": self.name,
            "side": self.side,
            "quantity": self.quantity,
            "price": self.price,
            "total": self.total,
            "realizedPnl": self.realized_pnl,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"
    __table_args__ = (UniqueConstraint("user_id", "symbol", "asset_type", name="uq_watchlist_item"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String(40), nullable=False)
    asset_type = Column(String(10), nullable=False)
    name = Column(String(200), nullable=True)
    notes = Column(String(500), nullable=True)
    added_at = Column(DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "symbol": self.symbol,
            "assetType": self.asset_type,
            "name": self.name,
            "notes": self.notes,
            "addedAt": self.added_at.isoformat() if self.added_at else None,
        }


PRICE_ALERT_CONDITIONS = ("above", "below")
PRICE_ALERT_STATUSES = ("active", "triggered", "cancelled")


class PriceAlert(Base):
    """Time-based, but this app has no background scheduler — active alerts
    are checked lazily whenever PriceAlertsController.GET is polled, the
    same "lazy check on poll" pattern trading_controller.py uses for pending
    limit/stop orders."""

    __tablename__ = "price_alerts"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String(40), nullable=False)
    asset_type = Column(String(10), nullable=False)
    name = Column(String(200), nullable=True)
    condition = Column(String(10), nullable=False)  # above | below
    target_price = Column(Float, nullable=False)
    status = Column(String(10), nullable=False, default="active")  # active | triggered | cancelled
    created_at = Column(DateTime, default=utcnow)
    triggered_at = Column(DateTime, nullable=True)
    triggered_price = Column(Float, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "symbol": self.symbol,
            "assetType": self.asset_type,
            "name": self.name,
            "condition": self.condition,
            "targetPrice": self.target_price,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "triggeredAt": self.triggered_at.isoformat() if self.triggered_at else None,
            "triggeredPrice": self.triggered_price,
            "cancelledAt": self.cancelled_at.isoformat() if self.cancelled_at else None,
        }


class VaultItem(Base):
    """Astilo Vault — a generalized "save this" for anything in the app,
    not just books (Library) or products (Wishlist). Deliberately freeform:
    item_type/source_module are plain strings rather than a fixed enum
    since the whole point is covering content the rest of the schema
    doesn't have a dedicated table for (a Cosmos image, a Markets note, a
    plain link) alongside content that does. `metadata_json` carries
    whatever shape that source needs (price, authors, a symbol, ...);
    `related_ids` is a lightweight same-table link list (no join table) for
    "these saved items go together"."""

    __tablename__ = "vault_items"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(300), nullable=False)
    item_type = Column(String(40), nullable=False, default="link")  # link | note | image | product | article | ...
    content = Column(Text, nullable=True)
    url = Column(String(1000), nullable=True)
    thumbnail_url = Column(String(1000), nullable=True)
    source_module = Column(String(40), nullable=True)  # e.g. "store", "cosmos", "markets", "manual"
    tags = Column(JSON, nullable=True)  # list[str]
    metadata_json = Column(JSON, nullable=True)  # freeform dict, shape depends on source_module
    related_ids = Column(JSON, nullable=True)  # list[int] — other VaultItem ids
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "itemType": self.item_type,
            "content": self.content,
            "url": self.url,
            "thumbnailUrl": self.thumbnail_url,
            "sourceModule": self.source_module,
            "tags": self.tags or [],
            "metadata": self.metadata_json or {},
            "relatedIds": self.related_ids or [],
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


class NimroseNoteVersion(Base):
    """Astilo Code's local "Git" — a snapshot of a NimroseNote's content at
    a point in time. Only ever written for kind="code" notes, one row per
    save that actually changed the content (see NimroseNotesController.PUT
    in nimrose_controller.py). No remote/branches/commits — local version
    history and revert, exactly the scope asked for."""

    __tablename__ = "nimrose_note_versions"

    id = Column(Integer, primary_key=True)
    note_id = Column(Integer, ForeignKey("nimrose_notes.id"), nullable=False)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "noteId": self.note_id,
            "content": self.content,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class ApiStudioRequest(Base):
    """A saved request in Astilo Code's API Studio — Postman-style request
    collection, scoped to the owning user."""

    __tablename__ = "api_studio_requests"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    method = Column(String(10), nullable=False, default="GET")
    url = Column(String(2000), nullable=False)
    headers = Column(JSON, nullable=True)  # dict[str, str]
    body = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "method": self.method,
            "url": self.url,
            "headers": self.headers or {},
            "body": self.body,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


class SavedSqlQuery(Base):
    """A saved SQL file in Astilo Code's Database Explorer — multiple named
    query files per user, same spirit as ApiStudioRequest. Deliberately
    does NOT store a connection string: DatabaseTablesController/
    DatabaseQueryController persist nothing server-side by design (the
    string round-trips from the caller each request), and a connection
    string can embed real DB credentials — saving one here would quietly
    turn this into a credential store. The client keeps whichever
    connection is currently active in its own state instead."""

    __tablename__ = "saved_sql_queries"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    sql = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "sql": self.sql,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
