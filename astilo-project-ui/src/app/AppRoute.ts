export const AppRoute = {
  // Public — no auth, no app navbar
  landing: "/",
  login: "/login",
  signup: "/signup",
  // Authenticated app
  home: "/home",
  store: "/store",
  music: "/music",
  movies: "/movies",
  moviesWatch: "/movies/watch",
  moviesSearch: "/movies/search",
  moviesWatchlist: "/movies/watchlist",
  moviesPlaylists: "/movies/playlists",
  moviesCategory: "/movies/category",
  anime: "/anime",
  animeWatch: "/anime/watch",
  animeSearch: "/anime/search",
  animeWatchlist: "/anime/watchlist",
  animePlaylists: "/anime/playlists",
  animeCategory: "/anime/category",
  customize: "/customize",
  admin: "/admin",
} as const;
