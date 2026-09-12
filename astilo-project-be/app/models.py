import datetime

from sqlalchemy import (
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

    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    playlists = relationship("Playlist", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
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
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="playlists")
    tracks = relationship("PlaylistTrack", back_populates="playlist", cascade="all, delete-orphan")

    def to_dict(self, include_tracks=False):
        data = {
            "id": self.id,
            "name": self.name,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
        if include_tracks:
            data["tracks"] = [t.to_dict() for t in self.tracks]
        return data


class PlaylistTrack(Base):
    __tablename__ = "playlist_tracks"

    id = Column(Integer, primary_key=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id"), nullable=False)
    track_id = Column(String(64), nullable=False)  # external id (e.g. from a music provider)
    title = Column(String(255))
    artist = Column(String(255))
    artwork_url = Column(String(500))
    position = Column(Integer, default=0)

    playlist = relationship("Playlist", back_populates="tracks")

    def to_dict(self):
        return {
            "id": self.id,
            "trackId": self.track_id,
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

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "imageUrl": self.image_url,
            "category": self.category,
            "stock": self.stock,
        }


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), nullable=False, default="pending")  # pending | paid | shipped | cancelled
    total = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "status": self.status,
            "total": self.total,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
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
