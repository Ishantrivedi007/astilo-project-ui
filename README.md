# astilo-project-be

CherryPy API backend for Astilo (movies / anime / music / store hub).

## Setup

```
pip install -r requirements.txt
copy .env.example .env
python main.py
```

Server runs at `http://localhost:8080`. Tables are created automatically on
first run (SQLite file `astilo.db`).

## Endpoints

- `POST /api/auth/register` `{name, email, password}`
- `POST /api/auth/login` `{email, password}`
- `GET /api/users/me` (auth) — current profile
- `GET /api/users` (auth, admin) — list users
- `GET /api/favorites?media_type=movie|anime|track` (auth)
- `POST /api/favorites` `{mediaType, mediaId, title, posterUrl}` (auth)
- `DELETE /api/favorites/<id>` (auth)
- `GET /api/playlists` / `GET /api/playlists/<id>` (auth)
- `POST /api/playlists` `{name}` (auth)
- `POST /api/playlists/<id>/tracks` `{trackId, title, artist, artworkUrl}` (auth)
- `DELETE /api/playlists/<id>` or `/api/playlists/<id>/tracks/<trackId>` (auth)
- `GET /api/store/products?category=` — public catalog
- `POST /api/store/products` (auth, admin) — add product
- `POST /api/store/orders` `{items: [{productId, quantity}]}` (auth) — checkout
- `GET /api/store/orders` / `GET /api/store/orders/<id>` (auth)

All protected routes expect `Authorization: Bearer <token>`.

## Notes

- Runs on Python 3.13+ via the `legacy-cgi` shim (CherryPy 18.x still imports
  the stdlib `cgi` module, which was removed in 3.13).
- Movies/anime/lyrics stay client-side (TMDB/Jikan/Genius, per the frontend's
  `.env`) — this backend owns accounts, favorites, playlists, and the store.
- Switching to Postgres: set `DATABASE_URL` in `.env` and
  `pip install -r requirements-postgres.txt`.
