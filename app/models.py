import datetime

from sqlalchemy import (
    JSON,
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

    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    cosmos_saved_items = relationship("CosmosSavedItem", back_populates="user", cascade="all, delete-orphan")
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
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }

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
