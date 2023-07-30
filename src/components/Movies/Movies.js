import React from "react";
import MovieCarousel from "./MovieCarousel";
import MovieCard from "./MovieCard";

const Movies = () => {
  const movies = [
    { title: "Movie 1", image: "/wallpaperflare.com_wallpaper.jpg" },
    { title: "Movie 2", image: "/LOTR.jpg" },
    { title: "Movie 3", image: "/JL.jpg" },
    // Add more movies here
  ];

  return (
    <>
      <div>
        <MovieCarousel movies={movies} />
      </div>
      <div
        style={{
          display: "flex",
          gap: "50px",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <MovieCard />
        <MovieCard />
        <MovieCard />
        <MovieCard />
      </div>
    </>
  );
};

export default Movies;
